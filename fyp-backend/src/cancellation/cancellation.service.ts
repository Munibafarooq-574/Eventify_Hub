// fyp-backend/src/cancellation/cancellation.service.ts
import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { BookingPolicySnapshot, VendorOrder } from 'src/schemas/vendor-order.schema';
import { Order } from 'src/schemas/order.schema';
import { Payment } from 'src/schemas/payment.schema';
import { Refund } from 'src/schemas/refund.schema';
import { VendorPenalty } from 'src/schemas/vendor-penalty.schema';
import { CancellationPolicyConfig } from 'src/schemas/cancellation-policy.schema';
import { User } from 'src/schemas/user.schema';
import { RescheduleRequest } from 'src/schemas/reschedule-request.schema';
import { CancellationPolicySettingsDto, UpdateCancellationPolicyDto } from './dto/cancellation-policy.dto';
import { RefundCalculationResult } from './cancellation.types';

@Injectable()
export class CancellationService {
    constructor(
        @InjectModel(VendorOrder.name)
        private readonly vendorOrderModel: Model<VendorOrder>,

        @InjectModel(Order.name)
        private readonly orderModel: Model<Order>,

        @InjectModel(Payment.name)
        private readonly paymentModel: Model<Payment>,

        @InjectModel(Refund.name)
        private readonly refundModel: Model<Refund>,

        @InjectModel(VendorPenalty.name)
        private readonly vendorPenaltyModel: Model<VendorPenalty>,

        @InjectModel(CancellationPolicyConfig.name)
        private readonly policyConfigModel: Model<CancellationPolicyConfig>,

        @InjectModel(User.name)
        private readonly userModel: Model<User>,

        @InjectModel(RescheduleRequest.name)
        private readonly rescheduleRequestModel: Model<RescheduleRequest>,
    ) {}

    // Admin settings also supply Step 3 snapshots; current cancellation/payment behavior stays unchanged.
    async getPolicyConfig() {
        let config = await this.policyConfigModel.findOne();
        if (!config) config = await this.policyConfigModel.create({});
        if (!config.policySettings) {
            const tiers = [
                { minHoursBeforeEvent: 0, percentage: config.penaltyEventDay },
                { minHoursBeforeEvent: 24, percentage: config.penaltyUnder7Days },
                { minHoursBeforeEvent: 168, percentage: config.penalty7to14Days },
                { minHoursBeforeEvent: 360, percentage: config.penalty15to29Days },
                { minHoursBeforeEvent: 720, percentage: config.penalty30PlusDays },
            ];
            const configuredHold = Number(process.env.BOOKING_HOLD_HOURS);
            await this.policyConfigModel.updateOne(
                { _id: config._id, policySettings: { $exists: false } },
                { $set: { policyRevision: 0, policySettings: {
                    clientRefunds: {
                        refundable: [{ minHoursBeforeEvent: 0, percentage: 100 }],
                        partiallyRefundable: tiers.map(tier => ({ ...tier, percentage: 100 - tier.percentage })),
                        nonRefundable: [{ minHoursBeforeEvent: 0, percentage: 0 }],
                    },
                    vendorCausedClientRefunds: [{ minHoursBeforeEvent: 0, percentage: 100 }],
                    vendorPenalties: tiers,
                    paymentHoldHours: Number.isInteger(configuredHold) && configuredHold >= 1 && configuredHold <= 8760 ? configuredHold : 24,
                    // Initial editable draft value, not an active reporting restriction.
                    postServiceIssueWindowHours: 72,
                } } },
            );
            return this.policyConfigModel.findById(config._id).orFail();
        }
        return config;
    }

    async updatePolicyConfig(dto: UpdateCancellationPolicyDto) {
        const config = await this.getPolicyConfig();
        if (dto.policySettings) {
            if (dto.expectedRevision === undefined) throw new BadRequestException('expectedRevision is required for policy settings.');
            if (Object.keys(dto).some(key => !['policySettings', 'expectedRevision'].includes(key))) {
                throw new BadRequestException('Save new policy settings separately from legacy penalty settings.');
            }
            const settings = dto.policySettings;
            this.validatePolicySettings(settings);
            const updated = await this.policyConfigModel.findOneAndUpdate(
                { _id: config._id, policyRevision: dto.expectedRevision },
                { $set: { policySettings: settings }, $inc: { policyRevision: 1 } },
                { new: true, runValidators: true },
            );
            if (!updated) throw new ConflictException('Policy changed. Reload before saving.');
            return updated;
        }
        if (dto.expectedRevision !== undefined) throw new BadRequestException('policySettings is required with expectedRevision.');
        // Preserve the existing legacy Admin API without mass assignment.
        const changes: Record<string, number> = {};
        for (const key of ['penalty30PlusDays', 'penalty15to29Days', 'penalty7to14Days', 'penaltyUnder7Days', 'penaltyEventDay'] as const) {
            if (dto[key] !== undefined) changes[key] = dto[key]!;
        }
        return this.policyConfigModel.findByIdAndUpdate(config._id, { $set: changes }, { new: true, runValidators: true }).orFail();
    }

    private validatePolicySettings(settings: CancellationPolicySettingsDto) {
        const errors = validateSync(plainToInstance(CancellationPolicySettingsDto, settings), {
            whitelist: true, forbidNonWhitelisted: true,
        });
        if (errors.length) throw new BadRequestException('Admin cancellation policy settings are incomplete or invalid.');
        for (const tiers of [settings.clientRefunds.refundable, settings.clientRefunds.partiallyRefundable,
            settings.clientRefunds.nonRefundable, settings.vendorCausedClientRefunds, settings.vendorPenalties]) {
            // Each threshold begins a range ending at the next threshold.
            // Requiring 0 and strictly ascending thresholds prevents gaps/overlaps.
            if (tiers[0].minHoursBeforeEvent !== 0 || tiers.some((tier, index) => index > 0 && tier.minHoursBeforeEvent <= tiers[index - 1].minHoursBeforeEvent)) {
                throw new BadRequestException('Each tier list must start at 0 hours with strictly increasing thresholds.');
            }
        }
    }

    // Uses the existing business-policy source, never a client-supplied label/rate.
    // Pure copy: no booking writes and no reference to the mutable Admin document.
    buildBookingPolicySnapshot(vendorUser: any, config: CancellationPolicyConfig): BookingPolicySnapshot {
        if (!config.policySettings || !Number.isInteger(config.policyRevision) || config.policyRevision < 0 || !config._id) {
            throw new ConflictException('Cancellation policy is not configured for new bookings.');
        }
        const settings: CancellationPolicySettingsDto = JSON.parse(JSON.stringify(config.policySettings));
        this.validatePolicySettings(settings);
        const rawLabel = this.getVendorCancellationPolicy(vendorUser, true);
        if (typeof rawLabel !== 'string') throw new ConflictException('Vendor cancellation policy is invalid.');
        const label = rawLabel
            .trim().toUpperCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
        const selectedPolicy = label === 'NON REFUNDABLE' ? 'NON-REFUNDABLE' : label;
        if (!['REFUNDABLE', 'PARTIALLY REFUNDABLE', 'NON-REFUNDABLE'].includes(selectedPolicy)) {
            throw new ConflictException('Vendor cancellation policy is invalid. Ask the vendor to update their business details.');
        }
        return {
            schemaVersion: 1,
            policyConfigId: String(config._id),
            policyRevision: config.policyRevision,
            capturedAt: new Date(),
            selectedPolicy,
            settings,
        };
    }

    // ===== Reusable: how many whole days before the event is "now"? =====
    private daysBeforeEvent(eventStartDateTime: Date): number {
        const now = new Date();
        const diffMs = eventStartDateTime.getTime() - now.getTime();
        return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }

    // ===== Reusable: pick the penalty tier % for a given days-remaining =====
    private getPenaltyPercentage(daysBeforeEvent: number, config: any): {
        tier: string;
        percentage: number;
    } {
        if (daysBeforeEvent <= 0) {
            return { tier: 'Event day', percentage: config.penaltyEventDay };
        }
        if (daysBeforeEvent < 7) {
            return { tier: '<7 days', percentage: config.penaltyUnder7Days };
        }
        if (daysBeforeEvent <= 14) {
            return { tier: '7-14 days', percentage: config.penalty7to14Days };
        }
        if (daysBeforeEvent <= 29) {
            return { tier: '15-29 days', percentage: config.penalty15to29Days };
        }
        return { tier: '30+ days', percentage: config.penalty30PlusDays };
    }

    // ===== Total amount organizer has actually paid so far (down + remaining) =====
    private async getAmountPaid(vendorOrderId: any): Promise<number> {
        const payments = await this.paymentModel.find({
            vendorOrderId,
            status: 'SUCCESS',
        });
        return payments.reduce((sum, p) => sum + p.amount, 0);
    }

    // ===== Reusable refund calculation, used by both cancel paths =====
    async calculateRefund(vendorOrderId: string): Promise<RefundCalculationResult> {
        const vendorOrder = await this.vendorOrderModel.findById(vendorOrderId);
        if (!vendorOrder) {
            throw new NotFoundException('Vendor order not found');
        }
        if (!vendorOrder.eventStartDateTime) {
            throw new ConflictException('Event start time not set for this booking.');
        }

        const config = await this.getPolicyConfig();
        const daysBeforeEvent = this.daysBeforeEvent(vendorOrder.eventStartDateTime);
        const { tier, percentage } = this.getPenaltyPercentage(daysBeforeEvent, config);

        const amountPaid = await this.getAmountPaid(vendorOrder._id);
        const withheldAmount = Math.round((amountPaid * percentage) / 100);
        const refundAmount = amountPaid - withheldAmount;

        return {
            daysBeforeEvent,
            tier,
            penaltyPercentage: percentage,
            amountPaid,
            refundAmount,
            withheldAmount,
        };
    }

    // ===== Get vendor's own cancellationPolicy label (reused, not duplicated) =====
    private getVendorCancellationPolicy(vendorUser: any, includeGeneric = false): string {
        const businessDetails =
            vendorUser?.photographerBusinessDetails ||
            vendorUser?.cateringBusinessDetails ||
            vendorUser?.venueBusinessDetails ||
            vendorUser?.salonBusinessDetails ||
            vendorUser?.cakeBusinessDetails ||
            vendorUser?.mehndiBusinessDetails ||
            vendorUser?.soundBusinessDetails ||
            (includeGeneric ? vendorUser?.genericBusinessDetails : undefined);

        return (
            businessDetails?.cancellationPolicy ||
            businessDetails?.covidRefundPolicy || // photographer uses this name
            'PARTIALLY REFUNDABLE'
        );
    }

    // ================================================================
    // PATH 1: Organizer cancels a CONFIRMED (paid) booking
    // ================================================================
    async organizerCancelConfirmedBooking(vendorOrderId: string, reason?: string) {
        const vendorOrder = await this.vendorOrderModel.findById(vendorOrderId);
        if (!vendorOrder) {
            throw new NotFoundException('Vendor order not found');
        }

        if (!['accepted', 'completed'].includes(vendorOrder.status)) {
            throw new ConflictException(
                'Only a confirmed (accepted) booking can be cancelled this way.',
            );
        }
        if (vendorOrder.status === 'completed') {
            throw new ConflictException('Completed bookings cannot be cancelled.');
        }

        const vendorUser = await this.userModel.findById(vendorOrder.vendorId).lean();
        const policy = this.getVendorCancellationPolicy(vendorUser);

        let refundCalc: RefundCalculationResult;

        if (policy === 'NON-REFUNDABLE') {
            const amountPaid = await this.getAmountPaid(vendorOrder._id);
            refundCalc = {
                daysBeforeEvent: vendorOrder.eventStartDateTime
                    ? this.daysBeforeEvent(vendorOrder.eventStartDateTime)
                    : 0,
                tier: 'NON-REFUNDABLE policy',
                penaltyPercentage: 100,
                amountPaid,
                refundAmount: 0,
                withheldAmount: amountPaid,
            };
        } else if (policy === 'REFUNDABLE') {
            const amountPaid = await this.getAmountPaid(vendorOrder._id);
            refundCalc = {
                daysBeforeEvent: vendorOrder.eventStartDateTime
                    ? this.daysBeforeEvent(vendorOrder.eventStartDateTime)
                    : 0,
                tier: 'REFUNDABLE policy',
                penaltyPercentage: 0,
                amountPaid,
                refundAmount: amountPaid,
                withheldAmount: 0,
            };
        } else {
            // PARTIALLY REFUNDABLE — use the tiered days-based calculation
            refundCalc = await this.calculateRefund(vendorOrderId);
        }

        vendorOrder.status = 'cancelled';
        vendorOrder.cancelledBy = 'organizer';
        vendorOrder.cancelledAt = new Date();
        vendorOrder.cancellationReason = reason || null;
        await vendorOrder.save();

        const order = await this.orderModel.findOne({ vendorOrders: vendorOrder._id });

        const refund = await this.refundModel.create({
            vendorOrderId: vendorOrder._id,
            orderId: order?._id,
            organizerId: order?.organizerId,
            vendorId: vendorOrder.vendorId,
            amountPaid: refundCalc.amountPaid,
            refundAmount: refundCalc.refundAmount,
            withheldAmount: refundCalc.withheldAmount,
            initiatedBy: 'ORGANIZER_CANCELLED',
            daysBeforeEvent: refundCalc.daysBeforeEvent,
            cancellationPolicyApplied: policy,
            status: 'PENDING',
        });

        return { vendorOrder, refund, refundCalc };
    }

    // ================================================================
    // PATH 2: Vendor cancels a CONFIRMED booking (incurs penalty)
    // ================================================================
    async vendorCancelConfirmedBooking(vendorOrderId: string, reason?: string) {
        const vendorOrder = await this.vendorOrderModel.findById(vendorOrderId);
        if (!vendorOrder) {
            throw new NotFoundException('Vendor order not found');
        }

        if (vendorOrder.status !== 'accepted') {
            throw new ConflictException(
                'Only a confirmed (accepted) booking can be cancelled by the vendor this way.',
            );
        }

        if (!vendorOrder.eventStartDateTime) {
            throw new ConflictException('Event start time not set for this booking.');
        }

        // Vendor cancellation => organizer gets FULL refund of whatever was
        // paid (vendor's fault), regardless of the vendor's own refund policy.
        const amountPaid = await this.getAmountPaid(vendorOrder._id);
        const daysBeforeEvent = this.daysBeforeEvent(vendorOrder.eventStartDateTime);

        vendorOrder.status = 'cancelled_by_vendor' as any;
        vendorOrder.cancelledBy = 'vendor';
        vendorOrder.cancelledAt = new Date();
        vendorOrder.cancellationReason = reason || null;
        await vendorOrder.save();

        // If the vendor cancels while an event date/time change is awaiting
        // their response, close that request immediately. The already accepted
        // responses from other vendors remain untouched and the client can
        // continue through the existing replacement flow.
        const pendingReschedule: any = await this.rescheduleRequestModel.findOne({
            vendorOrderId: vendorOrder._id,
            status: 'CHANGE_REQUESTED',
        });
        if (pendingReschedule) {
            pendingReschedule.status = 'CANCELLED_BY_VENDOR';
            pendingReschedule.respondedAt = new Date();
            pendingReschedule.responseMessage =
                'This vendor cancelled the booking before responding to the schedule change.';
            pendingReschedule.resolutionStatus = 'REPLACEMENT_REQUIRED';
            pendingReschedule.resolvedAt = new Date();
            await pendingReschedule.save();

            // Keep the whole request group in the same replacement-required
            // state without changing any vendor's accepted response.
            await this.rescheduleRequestModel.updateMany(
                { requestGroupId: pendingReschedule.requestGroupId },
                { $set: { resolutionStatus: 'REPLACEMENT_REQUIRED', resolvedAt: new Date() } },
            );
        }

        const order = await this.orderModel.findOne({ vendorOrders: vendorOrder._id });

        const refund = await this.refundModel.create({
            vendorOrderId: vendorOrder._id,
            orderId: order?._id,
            organizerId: order?.organizerId,
            vendorId: vendorOrder.vendorId,
            amountPaid,
            refundAmount: amountPaid, // full refund — vendor's fault
            withheldAmount: 0,
            initiatedBy: 'VENDOR_CANCELLED',
            daysBeforeEvent,
            cancellationPolicyApplied: 'FULL_REFUND_VENDOR_FAULT',
            status: 'PENDING',
        });

        // Vendor penalty — uses the same tiered config, but as a PENALTY
        // against the vendor (not a refund calculation).
        const config = await this.getPolicyConfig();
        const { tier, percentage } = this.getPenaltyPercentage(daysBeforeEvent, config);
        const penaltyAmount = Math.round((vendorOrder.price * percentage) / 100);

        const penalty = await this.vendorPenaltyModel.create({
            vendorId: vendorOrder.vendorId,
            vendorOrderId: vendorOrder._id,
            penaltyPercentage: percentage,
            penaltyAmount,
            daysBeforeEvent,
            reason: reason || `Vendor cancelled with ${tier} notice`,
        });

        return { vendorOrder, refund, penalty };
    }

    // ===== Vendor penalty history / reliability inputs =====
    async getVendorPenalties(vendorId: string) {
        return this.vendorPenaltyModel
            .find({ vendorId })
            .sort({ issuedAt: -1 })
            .lean();
    }
}