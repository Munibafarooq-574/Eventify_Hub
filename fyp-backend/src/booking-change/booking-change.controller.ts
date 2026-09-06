// fyp-backend/src/booking-change/booking-change.controller.ts
import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { BookingChangeService } from './booking-change.service';
import { CreateBookingChangeDto } from './dto/create-booking-change.dto';
import { RespondBookingChangeDto } from './dto/respond-booking-change.dto';

@Controller('booking-change')
export class BookingChangeController {
    constructor(private readonly bookingChangeService: BookingChangeService) {}

    // Preview availability + price/payment diff before submitting
    @Post('vendor-order/:id/preview')
    preview(
        @Param('id') vendorOrderId: string,
        @Body() dto: CreateBookingChangeDto,
    ) {
        return this.bookingChangeService.previewChange(vendorOrderId, dto);
    }

    // Organizer submits a change request
    @Post('vendor-order/:id/request')
    request(
        @Param('id') vendorOrderId: string,
        @Body() dto: CreateBookingChangeDto,
    ) {
        return this.bookingChangeService.requestChange(vendorOrderId, dto);
    }

    // Vendor accepts/rejects
    @Patch(':changeRequestId/respond')
    respond(
        @Param('changeRequestId') changeRequestId: string,
        @Body() dto: RespondBookingChangeDto,
    ) {
        return this.bookingChangeService.respondToChange(changeRequestId, dto);
    }

    // Organizer withdraws their own pending request
    @Patch(':changeRequestId/cancel')
    cancel(@Param('changeRequestId') changeRequestId: string) {
        return this.bookingChangeService.cancelChangeRequest(changeRequestId);
    }

    @Get('vendor-order/:id')
    getForVendorOrder(@Param('id') vendorOrderId: string) {
        return this.bookingChangeService.getChangeRequestsForVendorOrder(vendorOrderId);
    }

    @Get(':changeRequestId')
    getById(@Param('changeRequestId') changeRequestId: string) {
        return this.bookingChangeService.getChangeRequestById(changeRequestId);
    }
}