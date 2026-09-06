// fyp-backend/src/booking-change/booking-change.service.ts
import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { VendorOrder } from 'src/schemas/vendor-order.schema';
import { Order } from 'src/schemas/order.schema';
import { BookingChangeRequest } from 'src/schemas/booking-change-request.schema';
import { VendorAvailabilityService } from 'src/vendor-availability/vendor-availability.service';
import { CreateBookingChangeDto } from './dto/create-booking-change.dto';
import { RespondBookingChangeDto } from './dto/respond-booking-change.dto';
import { BookingChangePreview } from './booking-change.types';

@Injectable()
export class BookingChangeService {
    constructor(
        @InjectModel(VendorOrder.name)
        private readonly vendorOrderModel: Model<VendorOrder>,

        @InjectModel(Order.name)
        private readonly orderModel: Model<Order>,

        @InjectModel(BookingChangeRequest.name)
        private readonly changeRequestModel: Model<BookingChangeRequest>,

        private readonly availabilityService: VendorAvailabilityService,
    ) {}

    private buildDateRange(dateStr: string, startTime: string, durationMinutes: number) {
        const [h, m] = startTime.split(':').map(Number);
        const start = new Date(dateStr);
        start.setHours(h, m, 0, 0);
        const end = new Date(start.getTime() + durationMinutes * 60000);
        return { start, end };
    }

    // ================================================================
    // PREVIEW: check availability + compute price/payment diff WITHOUT
    // creating anything yet. Used by the frontend before submitting.
    // ================================================================
    async previewChange(
        vendorOrderId: string,
        dto: CreateBookingChangeDto,
    ): Promise<BookingChangePreview> {
        const vendorOrder = await this.vendorOrderModel.findById(vendorOrderId);
        if (!vendorOrder) {
            throw new NotFoundException('Vendor order not found');
        }

        const { start, end } = this.buildDateRange(
            dto.requestedDate,
            dto.requestedStartTime,
            dto.durationMinutes,
        );

        const availability = await this.availabilityService.checkVendorAvailability(
            vendorOrder.vendorId.toString(),
            start,
            end,
        );

        const currentPrice = vendorOrder.price;
        const requestedPrice = dto.requestedPrice ?? currentPrice;
        const priceDifference = requestedPrice - currentPrice;

        // Payment adjustment mirrors price difference directly — no commission
        // to factor in. Positive = organizer owes more; negative = refund due.
        const paymentAdjustment = priceDifference;

        return {
            availabilityAvailable: availability.available,
            availabilityReason: availability.reason,
            currentPrice,
            requestedPrice,
            priceDifference,
            paymentAdjustment,
        };
    }

    // ================================================================
    // Organizer submits a change request.
    //
    // BEFORE vendor accepts (status === 'pending'): edit directly re-checks
    // availability and updates the vendor order in place — no separate
    // approval workflow needed (per spec: "Re-check Availability").
    //
    // AFTER vendor accepts (status === 'accepted'): creates a
    // CHANGE_REQUESTED record that the vendor must accept/reject.
    // ================================================================
    async requestChange(vendorOrderId: string, dto: CreateBookingChangeDto) {
        const vendorOrder = await this.vendorOrderModel.findById(vendorOrderId);
        if (!vendorOrder) {
            throw new NotFoundException('Vendor order not found');
        }

        if (['cancelled', 'cancelled_by_vendor', 'completed', 'expired'].includes(
            vendorOrder.status,
        )) {
            throw new ConflictException(
                'This booking cannot be edited in its current state.',
            );
        }

        const { start, end } = this.buildDateRange(
            dto.requestedDate,
            dto.requestedStartTime,
            dto.durationMinutes,
        );

        const order = await this.orderModel.findOne({ vendorOrders: vendorOrder._id });
        if (!order) {
            throw new NotFoundException('Parent order not found');
        }

        // ===== CASE 1: still pending (vendor hasn't accepted yet) =====
        if (vendorOrder.status === 'pending') {
            const availability = await this.availabilityService.checkVendorAvailability(
                vendorOrder.vendorId.toString(),
                start,
                end,
            );

            if (!availability.available) {
                throw new ConflictException(
                    availability.reason || 'Vendor is not available for the requested time.',
                );
            }

            vendorOrder.eventStartDateTime = start;
            vendorOrder.eventEndDateTime = end;
            if (dto.requestedPrice != null) {
                vendorOrder.price = dto.requestedPrice;
            }
            await vendorOrder.save();

            return { directUpdate: true, vendorOrder };
        }

        // ===== CASE 2: already accepted — needs vendor approval =====
        if (vendorOrder.status !== 'accepted') {
            throw new ConflictException(
                'Only pending or accepted bookings can be edited.',
            );
        }

        // Don't allow a second pending change request to stack.
        const existingPending = await this.changeRequestModel.findOne({
            vendorOrderId: vendorOrder._id,
            status: 'CHANGE_REQUESTED',
        });
        if (existingPending) {
            throw new ConflictException(
                'A change request is already pending for this booking.',
            );
        }

        const currentPrice = vendorOrder.price;
        const requestedPrice = dto.requestedPrice ?? currentPrice;
        const priceDifference = requestedPrice - currentPrice;
        const paymentAdjustment = priceDifference; // no commission

        const changeRequest = await this.changeRequestModel.create({
            vendorOrderId: vendorOrder._id,
            orderId: order._id,
            organizerId: order.organizerId,
            vendorId: vendorOrder.vendorId,

            currentEventStartDateTime: vendorOrder.eventStartDateTime,
            currentEventEndDateTime: vendorOrder.eventEndDateTime,
            currentPrice,

            requestedEventStartDateTime: start,
            requestedEventEndDateTime: end,
            requestedPrice: dto.requestedPrice ?? null,
            requestedGuests: dto.requestedGuests ?? null,
            requestedLocation: dto.requestedLocation ?? null,
            requestedServiceNote: dto.requestedServiceNote ?? null,

            priceDifference,
            paymentAdjustment,

            status: 'CHANGE_REQUESTED',
            requestedBy: 'organizer',
        });

        return { directUpdate: false, changeRequest };
    }

    // ================================================================
    // Vendor accepts/rejects a pending change request.
    // ================================================================
    async respondToChange(changeRequestId: string, dto: RespondBookingChangeDto) {
        const changeRequest = await this.changeRequestModel.findById(changeRequestId);
        if (!changeRequest) {
            throw new NotFoundException('Change request not found');
        }

        if (changeRequest.status !== 'CHANGE_REQUESTED') {
            throw new ConflictException('This change request has already been resolved.');
        }

        if (dto.decision === 'rejected') {
            changeRequest.status = 'REJECTED';
            changeRequest.rejectionReason = dto.rejectionReason || null;
            changeRequest.respondedAt = new Date();
            await changeRequest.save();
            return changeRequest;
        }

        // ===== ACCEPTED: re-check availability at accept time (things may
        // have changed since the request was submitted), then apply. =====
        const vendorOrder = await this.vendorOrderModel.findById(
            changeRequest.vendorOrderId,
        );
        if (!vendorOrder) {
            throw new NotFoundException('Vendor order not found');
        }

        const availability = await this.availabilityService.checkVendorAvailability(
            vendorOrder.vendorId.toString(),
            changeRequest.requestedEventStartDateTime,
            changeRequest.requestedEventEndDateTime,
        );

        if (!availability.available) {
            throw new ConflictException(
                availability.reason ||
                    'Vendor is no longer available for the requested time.',
            );
        }

        vendorOrder.eventStartDateTime = changeRequest.requestedEventStartDateTime;
        vendorOrder.eventEndDateTime = changeRequest.requestedEventEndDateTime;

        if (changeRequest.requestedPrice != null) {
            vendorOrder.price = changeRequest.requestedPrice;

            // If price changed and a down payment was already calculated,
            // recompute remaining amount so it stays consistent. Down
            // payment already collected is NOT retroactively changed —
            // only the outstanding remaining balance shifts.
            if (vendorOrder.downPaymentAmount != null) {
                vendorOrder.remainingAmount =
                    vendorOrder.price - vendorOrder.downPaymentAmount;
            }
        }

        await vendorOrder.save();

        changeRequest.status = 'ACCEPTED';
        changeRequest.respondedAt = new Date();
        await changeRequest.save();

        return { vendorOrder, changeRequest };
    }

    // ===== Organizer withdraws their own pending request =====
    async cancelChangeRequest(changeRequestId: string) {
        const changeRequest = await this.changeRequestModel.findById(changeRequestId);
        if (!changeRequest) {
            throw new NotFoundException('Change request not found');
        }
        if (changeRequest.status !== 'CHANGE_REQUESTED') {
            throw new ConflictException('This request can no longer be withdrawn.');
        }
        changeRequest.status = 'CANCELLED';
        changeRequest.respondedAt = new Date();
        return changeRequest.save();
    }

    // ===== Fetch requests (for either party to view) =====
    async getChangeRequestsForVendorOrder(vendorOrderId: string) {
        return this.changeRequestModel
            .find({ vendorOrderId })
            .sort({ createdAt: -1 })
            .lean();
    }

    async getChangeRequestById(changeRequestId: string) {
        const changeRequest = await this.changeRequestModel.findById(changeRequestId);
        if (!changeRequest) {
            throw new NotFoundException('Change request not found');
        }
        return changeRequest;
    }
}