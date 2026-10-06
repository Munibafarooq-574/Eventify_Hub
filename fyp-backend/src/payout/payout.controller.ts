// fyp-backend/src/payout/payout.controller.ts
import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Post,
    Request,
    UseGuards,
} from '@nestjs/common';
import { PayoutService } from './payout.service';
import { UpdatePayoutStatusDto } from './dto/update-payout-status.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/admin-role.guard';

@Controller('payout')
@UseGuards(JwtAuthGuard)
export class PayoutController {
    constructor(private readonly payoutService: PayoutService) {}

   @Post('vendor-order/:id/create')
@UseGuards(AdminRoleGuard)
create(@Param('id') vendorOrderId: string) {
    return this.payoutService.createPayoutIfEligible(
        vendorOrderId,
    );
}

@Get('vendor-order/:id')
getStatus(
    @Param('id') vendorOrderId: string,
    @Request() req: any,
) {
    return this.payoutService.getPayoutStatus(
        vendorOrderId,
        req.user.id,
    );
}

@Get()
getForVendor(
    @Request() req: any,
) {
    return this.payoutService.getPayoutsForVendor(
        req.user.id,
    );
}

    @Patch(':payoutId/status')
@UseGuards(AdminRoleGuard)
updateStatus(
    @Param('payoutId') payoutId: string,
    @Body() dto: UpdatePayoutStatusDto,
) {
    return this.payoutService.updatePayoutStatus(
        payoutId,
        dto,
    );
}
}