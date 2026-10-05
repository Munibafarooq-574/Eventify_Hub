// fyp-backend/src/payment/payment.controller.ts
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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/admin-role.guard';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { RetryPaymentDto } from './dto/retry-payment.dto';

@Controller('payment')
@UseGuards(JwtAuthGuard)
export class PaymentController {
    constructor(private readonly paymentService: PaymentService) {}

    @Get('vendor-order/:id')
getStatus(
    @Param('id') vendorOrderId: string,
    @Request() req: any,
) {
    return this.paymentService.getPaymentStatus(
        vendorOrderId,
        req.user.id,
    );
}

  @Post('vendor-order/:id/initiate')
initiate(
    @Param('id') vendorOrderId: string,
    @Body() dto: CreatePaymentDto,
    @Request() req: any,
) {
    return this.paymentService.initiatePayment(
        vendorOrderId,
        dto.method,
        req.user.id,
    );
}

 @Post('vendor-order/:id/retry')
retry(
    @Param('id') vendorOrderId: string,
    @Body() dto: RetryPaymentDto,
    @Request() req: any,
) {
    return this.paymentService.retryPayment(
        vendorOrderId,
        dto.method,
        req.user.id,
    );
}

@Post('vendor-order/:id/remaining/initiate')
initiateRemaining(
    @Param('id') vendorOrderId: string,
    @Body() dto: CreatePaymentDto,
    @Request() req: any,
) {
    return this.paymentService.initiateRemainingPayment(
        vendorOrderId,
        dto.method,
        req.user.id,
    );
}

@Get('vendor-order/:id/financials')
getFinancials(
    @Param('id') vendorOrderId: string,
    @Request() req: any,
) {
    return this.paymentService.getBookingFinancials(
        vendorOrderId,
        req.user.id,
    );
}

@Patch(':paymentId/confirm')
@UseGuards(AdminRoleGuard)
 confirm(
     @Param('paymentId') paymentId: string,
     @Body('transactionRef') ref?: string,
) {
return this.paymentService.confirmPayment(
         paymentId,
        ref,
         );
}

 @Patch(':paymentId/fail')
@UseGuards(AdminRoleGuard)
fail(
    @Param('paymentId') paymentId: string,
    @Body('reason') reason?: string,
) {
    return this.paymentService.failPayment(
        paymentId,
        reason,
    );
}
}