// fyp-backend/src/cancellation/cancellation.service.ts
import {
    BadRequestException,
    ConflictException,
    Injectable,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { NotificationService } from '../notifications/notifications.service';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ClientSession, Connection, Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
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
import { CancellationActor, ClientCancellationPreview } from './cancellation.types';
import { ConfirmClientCancellationDto } from './dto/cancel-booking.dto';

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
        private readonly configService: ConfigService,
        @InjectConnection() private readonly connection: Connection,
        private readonly notifications?: NotificationService,
    ) {}

    // Admin settings supply new booking snapshots; existing snapshots remain authoritative.
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

    // Select once for refund and penalty using exact hours, including threshold equality.
    private getSavedVendorTier(hours: number, tiers: CancellationPolicySettingsDto['vendorPenalties']) {
        let selected = tiers[0];
        for (const tier of tiers) if (hours >= tier.minHoursBeforeEvent) selected = tier;
        return selected;
    }

    // ===== Total amount organizer has actually paid so far (down + remaining) =====
    private async getAmountPaid(vendorOrderId: any, session?: ClientSession): Promise<number> {
        const payments = await this.paymentModel.find({
            vendorOrderId,
            status: 'SUCCESS',
        }).session(session ?? null);
        return payments.reduce((sum, p) => sum + p.amount, 0);
    }

    async hasSuccessfulPayment(vendorOrderId: string) {
        return !!await this.paymentModel.exists({ vendorOrderId, status: 'SUCCESS' });
    }

    private requireClient(actor: CancellationActor) {
        if (!actor?.id || !Types.ObjectId.isValid(actor.id) || !['client', 'organizer'].includes(String(actor.role).toLowerCase())) {
            throw new ForbiddenException('Only an authenticated Client can cancel their booking.');
        }
    }

    async getClientRefunds(actor: CancellationActor) {
        const isVendor = String(actor?.role).toLowerCase() === 'vendor';
        if (!isVendor) this.requireClient(actor);
        else if (!actor?.id || !Types.ObjectId.isValid(actor.id)) throw new ForbiddenException('Authenticated Vendor required.');
        const records = await this.refundModel.find({ [isVendor ? 'vendorId' : 'organizerId']: new Types.ObjectId(actor.id) })
            .select('_id vendorOrderId amountPaid refundAmount withheldAmount status processedAt refundedAt paidAt rejectedAt closedAt updatedAt rejectionReason')
            .sort({ createdAt: -1 }).lean();
        const penalties = isVendor ? await this.vendorPenaltyModel.find({ vendorId: new Types.ObjectId(actor.id),
            vendorOrderId: { $in: records.map(record => record.vendorOrderId) },
        }).select('vendorOrderId penaltyAmount penaltyPercentage').lean() : [];
        return records.map(record => ({
            _id: record._id, vendorOrderId: record.vendorOrderId,
            ...(isVendor ? { vendorPenalty: penalties.filter(p => String(p.vendorOrderId) === String(record.vendorOrderId))
                .map(p => ({ amount: p.penaltyAmount, percentage: p.penaltyPercentage })) } : {}),
            amountPaid: record.amountPaid, refundAmount: record.refundAmount,
            withheldAmount: record.withheldAmount, status: record.status,
            processedAt: record.processedAt, refundedAt: record.refundedAt,
            paidAt: record.paidAt, rejectedAt: record.rejectedAt, closedAt: record.closedAt,
            updatedAt: (record as any).updatedAt,
            rejectionReason: record.status === 'REJECTED' ? record.rejectionReason || null : null,
        }));
    }

    // Shared ownership authority for preview, confirmation and pending requests.
    async assertClientBookingOwner(vendorOrderId: string, actor: CancellationActor, session?: ClientSession) {
        this.requireClient(actor);
        if (!Types.ObjectId.isValid(vendorOrderId)) throw new BadRequestException('Invalid vendor booking ID.');
        const vendorOrder = await this.vendorOrderModel.findById(vendorOrderId).session(session ?? null);
        if (!vendorOrder) throw new NotFoundException('Vendor booking not found.');
        const order = vendorOrder.orderId
            ? await this.orderModel.findById(vendorOrder.orderId).session(session ?? null)
            : await this.orderModel.findOne({ vendorOrders: vendorOrder._id }).session(session ?? null);
        if (!order || String(order.organizerId) !== actor.id) throw new ForbiddenException('You do not own this booking.');
        return { vendorOrder, order };
    }

    async assertVendorBookingOwner(vendorOrderId: string, actor: CancellationActor, session?: ClientSession) {
        if (!actor?.id || String(actor.role).toLowerCase() !== 'vendor') throw new ForbiddenException('Vendor access required.');
        if (!Types.ObjectId.isValid(vendorOrderId)) throw new BadRequestException('Invalid vendor booking ID.');
        const booking = await this.vendorOrderModel.findById(vendorOrderId).session(session ?? null);
        if (!booking) throw new NotFoundException('Vendor booking not found.');
        if (String(booking.vendorId) !== actor.id) throw new ForbiddenException('You do not own this vendor booking.');
        return booking;
    }

    private previewSignature(payload: string) {
        return createHmac('sha256', this.configService.getOrThrow<string>('JWT_SECRET'))
            .update(`client-cancellation-preview-v1:${payload}`).digest('base64url');
    }

    private readPreviewToken(token: string, vendorOrderId: string, actor: CancellationActor) {
        if (typeof token !== 'string' || token.length > 2048) throw new BadRequestException('A valid cancellation preview is required.');
        const parts = token.split('.');
        if (parts.length !== 2) throw new BadRequestException('A valid cancellation preview is required.');
        const expected = Buffer.from(this.previewSignature(parts[0]));
        const supplied = Buffer.from(parts[1]);
        if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) throw new BadRequestException('Invalid cancellation preview. Reload the preview.');
        let decoded: { vendorOrderId: string; organizerId: string; fingerprint: string; exp: number };
        try { decoded = JSON.parse(Buffer.from(parts[0], 'base64url').toString()); }
        catch { throw new BadRequestException('Invalid cancellation preview.'); }
        if (decoded.vendorOrderId !== vendorOrderId || decoded.organizerId !== actor.id || typeof decoded.fingerprint !== 'string' || !Number.isFinite(decoded.exp)) {
            throw new BadRequestException('Cancellation preview does not match this booking.');
        }
        return decoded;
    }

    private async clientRefundReview(vendorOrder: VendorOrder, order: Order, now: Date, session?: ClientSession) {
        const payments = await this.paymentModel.find({ vendorOrderId: vendorOrder._id, status: 'SUCCESS' }).session(session ?? null);
        let paidMinor = 0;
        for (const payment of payments) {
            if (!Number.isFinite(payment.amount) || payment.amount < 0 || String(payment.organizerId) !== String(order.organizerId) || String(payment.orderId) !== String(order._id)) {
                throw new ConflictException('Payment records need Support review before cancellation.');
            }
            paidMinor += Math.round(payment.amount * 100);
        }
        if (!Number.isSafeInteger(paidMinor)) throw new ConflictException('Payment total needs Support review.');
        const result: ClientCancellationPreview = {
            vendorOrderId: String(vendorOrder._id), eligible: false, serviceName: vendorOrder.serviceName,
            eventStartDateTime: vendorOrder.eventStartDateTime && Number.isFinite(vendorOrder.eventStartDateTime.getTime()) ? vendorOrder.eventStartDateTime.toISOString() : null,
            amountPaid: paidMinor / 100, refundAmount: null, withheldAmount: null, refundPercentage: null,
            daysBeforeEvent: null, hoursBeforeEvent: null, tier: null,
            cancellationPolicyApplied: vendorOrder.policySnapshot?.selectedPolicy ?? null,
            policyRevision: vendorOrder.policySnapshot?.policyRevision ?? null,
        };
        const blocked = (restrictionCode: string, message: string) => ({ result: { ...result, restrictionCode, message }, fingerprint: '' });
        if (vendorOrder.status === 'completed') return blocked('COMPLETED', 'Completed bookings cannot be cancelled. Contact Support for a service issue.');
        if (vendorOrder.status !== 'accepted') return blocked('NOT_CONFIRMED', 'Only a confirmed booking can be cancelled here.');
        if (vendorOrder.replacementOutcome === 'NO_LONGER_ASSIGNED' || !order.vendorOrders.some(id => String(id) === String(vendorOrder._id))) return blocked('NO_LONGER_ASSIGNED', 'This vendor is no longer assigned to the event.');
        const bookingAmount = Number(vendorOrder.finalAmount ?? vendorOrder.price);
        if (!Number.isFinite(bookingAmount) || bookingAmount < 0) return blocked('PAYMENT_REVIEW', 'Booking amount needs Support review.');
        if (vendorOrder.paymentStatus === 'PAID' || (bookingAmount > 0 && paidMinor >= Math.round(bookingAmount * 100))) return blocked('FULLY_PAID', 'Fully paid bookings require Support review. Normal cancellation is unavailable.');
        if (vendorOrder.paymentStatus !== 'PARTIALLY_PAID') return blocked('NOT_CONFIRMED', 'The required down payment has not secured this booking.');
        const requiredDownPayment = vendorOrder.downPaymentAmount;
        if (typeof requiredDownPayment !== 'number' || !Number.isFinite(requiredDownPayment) || requiredDownPayment < 0 || paidMinor < Math.round(requiredDownPayment * 100)) return blocked('PAYMENT_REVIEW', 'Down payment records need Support review.');
        if (await this.paymentModel.exists({ vendorOrderId: vendorOrder._id, status: 'PENDING' }).session(session ?? null)) return blocked('PAYMENT_PENDING', 'A payment is awaiting confirmation. Resolve it before cancelling.');
        if (await this.refundModel.exists({ vendorOrderId: vendorOrder._id }).session(session ?? null)) return blocked('REFUND_EXISTS', 'This booking already has a refund record. Contact Support.');
        if (await this.rescheduleRequestModel.exists({ orderId: order._id, resolutionStatus: { $in: ['PENDING', 'REPLACEMENT_REQUIRED'] } }).session(session ?? null)) return blocked('RESCHEDULE_PENDING', 'Resolve the date/time change before cancelling this booking.');
        if (!vendorOrder.eventStartDateTime || !Number.isFinite(vendorOrder.eventStartDateTime.getTime())) return blocked('SERVICE_TIME_MISSING', 'Service time is unavailable. Contact Support.');
        const hours = (vendorOrder.eventStartDateTime.getTime() - now.getTime()) / 3600000;
        if (hours <= 0) return blocked('SERVICE_STARTED', 'Service has started. Contact Support instead of cancelling.');
        const snapshot = vendorOrder.policySnapshot;
        if (!snapshot) return blocked('LEGACY_SUPPORT_REQUIRED', 'This booking has no saved refund policy. Contact Support so its original terms can be reviewed.');
        try {
            if (snapshot.schemaVersion !== 1 || !Number.isInteger(snapshot.policyRevision) || snapshot.policyRevision < 0) throw new Error();
            this.validatePolicySettings(JSON.parse(JSON.stringify(snapshot.settings)));
        } catch { return blocked('POLICY_INVALID', 'Saved policy needs Support review.'); }
        const tiers = snapshot.selectedPolicy === 'REFUNDABLE' ? snapshot.settings.clientRefunds.refundable
            : snapshot.selectedPolicy === 'PARTIALLY REFUNDABLE' ? snapshot.settings.clientRefunds.partiallyRefundable
            : snapshot.selectedPolicy === 'NON-REFUNDABLE' ? snapshot.settings.clientRefunds.nonRefundable : null;
        if (!tiers) return blocked('POLICY_INVALID', 'Saved policy needs Support review.');
        let tierIndex = 0;
        for (let index = 1; index < tiers.length; index++) if (hours >= tiers[index].minHoursBeforeEvent) tierIndex = index;
        const tier = tiers[tierIndex];
        const refundMinor = Math.round(paidMinor * tier.percentage / 100);
        Object.assign(result, {
            eligible: true, refundPercentage: tier.percentage, refundAmount: refundMinor / 100,
            withheldAmount: (paidMinor - refundMinor) / 100, hoursBeforeEvent: hours, daysBeforeEvent: Math.floor(hours / 24),
            tier: `${tier.minHoursBeforeEvent} hours${tierIndex + 1 < tiers.length ? ` to under ${tiers[tierIndex + 1].minHoursBeforeEvent} hours` : ' or more'}`,
        });
        const fingerprint = createHash('sha256').update(JSON.stringify({
            vendorOrderId: result.vendorOrderId, organizerId: String(order.organizerId),
            status: vendorOrder.status, paymentStatus: vendorOrder.paymentStatus, eventStart: result.eventStartDateTime,
            amountPaid: result.amountPaid, refundAmount: result.refundAmount, withheldAmount: result.withheldAmount,
            tier: result.tier, snapshot: JSON.parse(JSON.stringify(snapshot)),
        })).digest('hex');
        return { result, fingerprint };
    }

    // Read-only preview: rates and amounts come exclusively from the saved terms and ledger.
    async calculateRefund(vendorOrderId: string, actor: CancellationActor): Promise<ClientCancellationPreview> {
        const { vendorOrder, order } = await this.assertClientBookingOwner(vendorOrderId, actor);
        const now = new Date();
        const { result, fingerprint } = await this.clientRefundReview(vendorOrder, order, now);
        if (result.eligible) {
            const exp = now.getTime() + 5 * 60 * 1000;
            const payload = Buffer.from(JSON.stringify({ vendorOrderId, organizerId: actor.id, fingerprint, exp })).toString('base64url');
            result.previewToken = `${payload}.${this.previewSignature(payload)}`;
            result.expiresAt = new Date(exp).toISOString();
        }
        return result;
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
    async organizerCancelConfirmedBooking(vendorOrderId: string, actor: CancellationActor, dto: ConfirmClientCancellationDto) {
        this.requireClient(actor);
        if (typeof dto.reason !== 'string' || !dto.reason.trim() || dto.reason.trim().length > 500) {
            throw new BadRequestException('A cancellation reason between 1 and 500 characters is required.');
        }
        if (!Types.ObjectId.isValid(vendorOrderId)) throw new BadRequestException('Invalid vendor booking ID.');
        const token = this.readPreviewToken(dto.previewToken, vendorOrderId, actor);
        const confirmationKey = createHash('sha256').update(dto.previewToken).digest('hex');
        const session = await this.connection.startSession();
        try {
            let response: any;
            await session.withTransaction(async () => {
                const { vendorOrder, order } = await this.assertClientBookingOwner(vendorOrderId, actor, session);
                if (vendorOrder.status === 'cancelled' && vendorOrder.cancelledBy === 'organizer') {
                    const existing = await this.refundModel.findOne({ vendorOrderId: vendorOrder._id, initiatedBy: 'ORGANIZER_CANCELLED', confirmationKey }).session(session);
                    if (existing) { response = { vendorOrder, refund: existing, alreadyCancelled: true }; return; }
                }
                if (token.exp <= Date.now()) throw new ConflictException('Cancellation preview expired. Reload it before confirming.');
                const now = new Date();
                const { result, fingerprint } = await this.clientRefundReview(vendorOrder, order, now, session);
                if (!result.eligible) throw new ConflictException(result.message);
                if (fingerprint !== token.fingerprint) throw new ConflictException('Booking, payment or refund terms changed. Review a fresh preview before confirming.');
                const updated = await this.vendorOrderModel.findOneAndUpdate(
                    { _id: vendorOrder._id, status: 'accepted', paymentStatus: 'PARTIALLY_PAID' },
                    { $set: { status: 'cancelled', cancelledBy: 'organizer', cancelledAt: now, cancellationReason: dto.reason?.trim() || null } },
                    { new: true, session },
                );
                if (!updated) throw new ConflictException('Booking changed. Reload the cancellation preview.');
                const [refund] = await this.refundModel.create([{
                    vendorOrderId: vendorOrder._id, orderId: order._id, organizerId: order.organizerId, vendorId: vendorOrder.vendorId,
                    amountPaid: result.amountPaid, refundAmount: result.refundAmount, withheldAmount: result.withheldAmount,
                    initiatedBy: 'ORGANIZER_CANCELLED', daysBeforeEvent: result.daysBeforeEvent,
                    cancellationPolicyApplied: result.cancellationPolicyApplied, policyRevision: result.policyRevision,
                    refundPercentage: result.refundPercentage, policyConfigId: vendorOrder.policySnapshot!.policyConfigId,
                    calculatedAt: now, confirmationKey, status: 'PENDING',
                    notes: result.refundAmount === 0 ? 'No monetary refund is due under the saved policy.' : null,
                }], { session });
                response = { vendorOrder: updated, refund, refundCalc: result, alreadyCancelled: false };
            }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
            return response;
        } catch (error: any) {
            if (error?.code === 11000) throw new ConflictException('A cancellation/refund already exists. Refresh this booking.');
            throw error;
        } finally { await session.endSession(); }
    }

    // ================================================================
    // PATH 2: Vendor cancels a CONFIRMED booking (incurs penalty)
    // ================================================================
    private async vendorCancellationCalculation(vendorOrder: VendorOrder, session?: ClientSession) {
        if (!vendorOrder) {
            throw new NotFoundException('Vendor order not found');
        }

        if (vendorOrder.replacementOutcome === 'NO_LONGER_ASSIGNED') {
            throw new ConflictException('This booking is no longer assigned to you.');
        }

        if (!['pending', 'accepted'].includes(vendorOrder.status)) {
            throw new ConflictException(
                'Only a pending or confirmed booking can be cancelled by the vendor this way.',
            );
        }

        if (!vendorOrder.eventStartDateTime) {
            throw new ConflictException('Event start time not set for this booking.');
        }


        const snapshot = vendorOrder.policySnapshot;
        if (!snapshot) throw new ConflictException('This booking has no saved cancellation policy. Contact Support to review its original terms.');
        try {
            if (snapshot.schemaVersion !== 1 || !Number.isInteger(snapshot.policyRevision) || snapshot.policyRevision < 0) throw new Error();
            this.validatePolicySettings(JSON.parse(JSON.stringify(snapshot.settings)));
        } catch { throw new ConflictException('Saved cancellation policy is invalid. Contact Support.'); }
        const calculatedAt = new Date();
        const serviceTime = new Date(vendorOrder.eventStartDateTime).getTime();
        if (!Number.isFinite(serviceTime)) throw new ConflictException('Service time needs Support review.');
        const hoursBeforeService = (serviceTime - calculatedAt.getTime()) / 3600000;
        const daysBeforeEvent = Math.floor(hoursBeforeService / 24);
        const refundTier = this.getSavedVendorTier(hoursBeforeService, snapshot.settings.vendorCausedClientRefunds);
        const penaltyTier = this.getSavedVendorTier(hoursBeforeService, snapshot.settings.vendorPenalties);
        if (await this.paymentModel.exists({ vendorOrderId: vendorOrder._id, status: 'PENDING' }).session(session ?? null)) {
            throw new ConflictException('A payment is awaiting confirmation. Resolve it before cancelling.');
        }
        const amountPaid = await this.getAmountPaid(vendorOrder._id, session);
        const bookingAmount = Number(vendorOrder.finalAmount ?? vendorOrder.price);
        if (!Number.isFinite(amountPaid) || amountPaid < 0 || !Number.isFinite(bookingAmount) || bookingAmount < 0) {
            throw new ConflictException('Booking payment amounts need Support review.');
        }
        const paidMinor = Math.round(amountPaid * 100);
        const bookingMinor = Math.round(bookingAmount * 100);
        if (!Number.isSafeInteger(paidMinor) || !Number.isSafeInteger(bookingMinor)) throw new ConflictException('Payment amounts need Support review.');
        const refundAmount = Math.round(paidMinor * refundTier.percentage / 100) / 100;
        const penaltyAmount = Math.round(bookingMinor * penaltyTier.percentage / 100) / 100;

        return { snapshot, calculatedAt, daysBeforeEvent, amountPaid, bookingAmount, paidMinor, refundAmount,
            penaltyAmount, refundPercentage: refundTier.percentage, penaltyPercentage: penaltyTier.percentage,
            hoursBeforeService };
    }

    async previewVendorCancellation(vendorOrderId: string, actor: CancellationActor) {
        const booking = await this.assertVendorBookingOwner(vendorOrderId, actor);
        const calculation = await this.vendorCancellationCalculation(booking);
        const payments = await this.paymentModel.find({ vendorOrderId: booking._id, status: 'SUCCESS' })
            .select('amount type method paidAt').lean();
        return {
            payments: payments.map(payment => ({ amount: payment.amount, type: payment.type, method: payment.method, paidAt: payment.paidAt })),
            vendorOrderId: String(booking._id), calculatedAt: calculation.calculatedAt,
            policyRevision: calculation.snapshot.policyRevision, amountPaid: calculation.amountPaid,
            bookingAmount: calculation.bookingAmount, remainingAmount: Math.max(0, calculation.bookingAmount - calculation.amountPaid),
            refundAmount: calculation.refundAmount, withheldAmount: (calculation.paidMinor - Math.round(calculation.refundAmount * 100)) / 100,
            penaltyAmount: calculation.penaltyAmount, refundPercentage: calculation.refundPercentage,
            penaltyPercentage: calculation.penaltyPercentage, hoursBeforeService: calculation.hoursBeforeService,
        };
    }

    async vendorCancelConfirmedBooking(vendorOrderId: string, reason: string | undefined, actor: CancellationActor) {
        if (typeof reason !== 'string' || !reason.trim() || reason.trim().length > 500) {
            throw new BadRequestException('Please enter a cancellation reason (up to 500 characters).');
        }
        reason = reason.trim();
        // A transaction keeps cancellation, refund and penalty atomic and prevents
        // concurrent confirmations from creating duplicate financial records.
        const session = await this.connection.startSession();
        let result: any;
        try {
            await session.withTransaction(async () => {
                const vendorOrder = await this.assertVendorBookingOwner(vendorOrderId, actor, session);
                const { snapshot, calculatedAt, daysBeforeEvent, amountPaid, paidMinor, refundAmount, penaltyAmount,
                    refundPercentage, penaltyPercentage } = await this.vendorCancellationCalculation(vendorOrder, session);

                vendorOrder.status = 'cancelled_by_vendor' as any;
                vendorOrder.cancelledBy = 'vendor';
                vendorOrder.cancelledAt = new Date();
                vendorOrder.cancellationReason = reason || null;
                await vendorOrder.save({ session });

                // If the vendor cancels while an event date/time change is awaiting
                // their response, close that request immediately. The already accepted
                // responses from other vendors remain untouched and the client can
                // continue through the existing replacement flow.
                const pendingReschedule: any = await this.rescheduleRequestModel.findOne({
                    vendorOrderId: vendorOrder._id,
                    status: 'CHANGE_REQUESTED',
                }).session(session);
                if (pendingReschedule) {
                    pendingReschedule.status = 'CANCELLED_BY_VENDOR';
                    pendingReschedule.respondedAt = new Date();
                    pendingReschedule.responseMessage =
                        'This vendor cancelled the booking before responding to the schedule change.';
                    pendingReschedule.resolutionStatus = 'REPLACEMENT_REQUIRED';
                    pendingReschedule.resolvedAt = new Date();
                    await pendingReschedule.save({ session });

                    // Keep the whole request group in the same replacement-required
                    // state without changing any vendor's accepted response.
                    await this.rescheduleRequestModel.updateMany(
                        { requestGroupId: pendingReschedule.requestGroupId },
                        { $set: { resolutionStatus: 'REPLACEMENT_REQUIRED', resolvedAt: new Date() } },
                        { session },
                    );
                }

                const order = await this.orderModel.findOne({ vendorOrders: vendorOrder._id }).session(session);

                const [refund] = await this.refundModel.create([{
                    vendorOrderId: vendorOrder._id,
                    orderId: order?._id,
                    organizerId: order?.organizerId,
                    vendorId: vendorOrder.vendorId,
                    amountPaid,
                    refundAmount,
                    withheldAmount: (paidMinor - Math.round(refundAmount * 100)) / 100,
                    policyRevision: snapshot.policyRevision,
                    policyConfigId: snapshot.policyConfigId,
                    refundPercentage,
                    calculatedAt,
                    initiatedBy: 'VENDOR_CANCELLED',
                    daysBeforeEvent,
                    cancellationPolicyApplied: refundPercentage === 100 ? 'FULL_REFUND_VENDOR_FAULT' : 'SAVED_POLICY_VENDOR_CANCELLED',
                    status: 'PENDING',
                }], { session });

                const [penalty] = await this.vendorPenaltyModel.create([{
                    vendorId: vendorOrder.vendorId,
                    vendorOrderId: vendorOrder._id,
                    penaltyPercentage,
                    penaltyAmount,
                    daysBeforeEvent,
                    reason,
                    policyRevision: snapshot.policyRevision,
                    policyConfigId: snapshot.policyConfigId,
                    penaltyPolicy: snapshot.settings.vendorPenalties,
                    calculatedAt,
                    cancelledAt: vendorOrder.cancelledAt,
                }], { session });

                result = { vendorOrder, refund, penalty, order, refundAmount, penaltyAmount, penaltyPercentage };
            }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
        } finally { await session.endSession(); }
        const { vendorOrder, refund, penalty, order, refundAmount, penaltyAmount, penaltyPercentage } = result;
        // Notify only after cancellation and financial records have been saved.
        // A failed push must not undo cancellation or block the other recipient.
        if (this.notifications) {
            const recipients = [...new Set([order?.organizerId, vendorOrder.vendorId].filter(Boolean).map(String))];
            for (const recipient of recipients) {
                const isVendor = recipient === String(vendorOrder.vendorId);
                try {
                    await this.notifications.notifyUser(recipient, 'Booking cancelled by vendor',
                        `Booking ${String(vendorOrder._id).slice(-8).toUpperCase()}: ${isVendor ? 'You cancelled this booking.' : 'The vendor cancelled this booking.'} Reason: ${reason}. Recorded refund: Rs. ${refundAmount.toLocaleString('en-PK')} (pending review).${isVendor ? ` Vendor penalty: Rs. ${penaltyAmount.toLocaleString('en-PK')} (${penaltyPercentage}%).` : ''}`,
                        'REFUND_UPDATE', { orderId: order?._id ? String(order._id) : undefined, vendorOrderId: String(vendorOrder._id) });
                } catch { /* Settlement remains pending; notifications are best effort. */ }
            }
        }
        return { vendorOrder, refund, penalty };
    }

    // ===== Vendor penalty history / reliability inputs =====
    async getVendorPenalties(vendorId: string, actor: CancellationActor) {
        if (!actor?.id || !((String(actor.role).toLowerCase() === 'vendor' && actor.id === vendorId) || String(actor.role).toLowerCase() === 'admin')) {
            throw new ForbiddenException('You cannot view this vendor penalty history.');
        }
        if (!Types.ObjectId.isValid(vendorId)) throw new BadRequestException('Invalid vendor ID.');
        return this.vendorPenaltyModel
            .find({ vendorId })
            .sort({ issuedAt: -1 })
            .lean();
    }
}