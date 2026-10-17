// fyp-backend/src/cancellation/cancellation.controller.ts
import { Body, Controller, Get, Param, Patch, UseGuards, ValidationPipe, Request, Header } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/admin-role.guard';
import { CancellationService } from './cancellation.service';
import { CancelBookingDto, ConfirmClientCancellationDto } from './dto/cancel-booking.dto';
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
    @UseGuards(JwtAuthGuard, AdminRoleGuard)
    updatePolicyConfig(@Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })) dto: UpdateCancellationPolicyDto) {
        return this.cancellationService.updatePolicyConfig(dto);
    }

    @Get('refunds')
    @Header('Cache-Control', 'private, no-store')
    @UseGuards(JwtAuthGuard)
    getClientRefunds(@Request() req: any) {
        return this.cancellationService.getClientRefunds(req.user);
    }

    // Preview refund before actually cancelling
    @Get('vendor-order/:id/calculate-refund')
    @UseGuards(JwtAuthGuard)
    calculateRefund(@Param('id') vendorOrderId: string, @Request() req: any) {
        return this.cancellationService.calculateRefund(vendorOrderId, req.user);
    }

    // Organizer cancels a confirmed booking
    @Patch('vendor-order/:id/organizer-cancel-confirmed')
    @UseGuards(JwtAuthGuard)
    organizerCancel(
        @Param('id') vendorOrderId: string,
        @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })) dto: ConfirmClientCancellationDto,
        @Request() req: any,
    ) {
        return this.cancellationService.organizerCancelConfirmedBooking(
            vendorOrderId,
            req.user,
            dto,
        );
    }

    // Vendor cancels a confirmed booking
    @Patch('vendor-order/:id/vendor-cancel-confirmed')
    @UseGuards(JwtAuthGuard)
    vendorCancel(
        @Param('id') vendorOrderId: string,
        @Body() dto: CancelBookingDto,
        @Request() req: any,
    ) {
        return this.cancellationService.vendorCancelConfirmedBooking(
            vendorOrderId,
            dto.reason,
            req.user,
        );
    }

    @Get('vendor/:vendorId/penalties')
    @UseGuards(JwtAuthGuard)
    getVendorPenalties(@Param('vendorId') vendorId: string, @Request() req: any) {
        return this.cancellationService.getVendorPenalties(vendorId, req.user);
    }
}