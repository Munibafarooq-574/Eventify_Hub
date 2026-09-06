// fyp-backend/src/cancellation/cancellation.controller.ts
import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CancellationService } from './cancellation.service';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { UpdateCancellationPolicyDto } from './dto/cancellation-policy.dto';

@Controller('cancellation')
export class CancellationController {
    constructor(private readonly cancellationService: CancellationService) {}

    // Admin config
    @Get('policy-config')
    getPolicyConfig() {
        return this.cancellationService.getPolicyConfig();
    }

    @Patch('policy-config')
    updatePolicyConfig(@Body() dto: UpdateCancellationPolicyDto) {
        return this.cancellationService.updatePolicyConfig(dto);
    }

    // Preview refund before actually cancelling
    @Get('vendor-order/:id/calculate-refund')
    calculateRefund(@Param('id') vendorOrderId: string) {
        return this.cancellationService.calculateRefund(vendorOrderId);
    }

    // Organizer cancels a confirmed booking
    @Patch('vendor-order/:id/organizer-cancel-confirmed')
    organizerCancel(
        @Param('id') vendorOrderId: string,
        @Body() dto: CancelBookingDto,
    ) {
        return this.cancellationService.organizerCancelConfirmedBooking(
            vendorOrderId,
            dto.reason,
        );
    }

    // Vendor cancels a confirmed booking
    @Patch('vendor-order/:id/vendor-cancel-confirmed')
    vendorCancel(
        @Param('id') vendorOrderId: string,
        @Body() dto: CancelBookingDto,
    ) {
        return this.cancellationService.vendorCancelConfirmedBooking(
            vendorOrderId,
            dto.reason,
        );
    }

    @Get('vendor/:vendorId/penalties')
    getVendorPenalties(@Param('vendorId') vendorId: string) {
        return this.cancellationService.getVendorPenalties(vendorId);
    }
}