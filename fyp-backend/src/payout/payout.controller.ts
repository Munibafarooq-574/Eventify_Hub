// fyp-backend/src/payout/payout.controller.ts
import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { PayoutService } from './payout.service';
import { UpdatePayoutStatusDto } from './dto/update-payout-status.dto';

@Controller('payout')
export class PayoutController {
    constructor(private readonly payoutService: PayoutService) {}

    @Post('vendor-order/:id/create')
    create(@Param('id') vendorOrderId: string) {
        return this.payoutService.createPayoutIfEligible(vendorOrderId);
    }

    @Get('vendor-order/:id')
    getStatus(@Param('id') vendorOrderId: string) {
        return this.payoutService.getPayoutStatus(vendorOrderId);
    }

    @Get()
    getForVendor(@Query('vendorId') vendorId: string) {
        return this.payoutService.getPayoutsForVendor(vendorId);
    }

    @Patch(':payoutId/status')
    updateStatus(
        @Param('payoutId') payoutId: string,
        @Body() dto: UpdatePayoutStatusDto,
    ) {
        return this.payoutService.updatePayoutStatus(payoutId, dto);
    }
}