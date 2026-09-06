// fyp-backend/src/payment/payment.controller.ts
import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { RetryPaymentDto } from './dto/retry-payment.dto';

@Controller('payment')
export class PaymentController {
    constructor(private readonly paymentService: PaymentService) {}

    @Get('vendor-order/:id')
    getStatus(@Param('id') vendorOrderId: string) {
        return this.paymentService.getPaymentStatus(vendorOrderId);
    }

    @Post('vendor-order/:id/initiate')
    initiate(@Param('id') vendorOrderId: string, @Body() dto: CreatePaymentDto) {
        return this.paymentService.initiatePayment(vendorOrderId, dto.method);
    }

    @Post('vendor-order/:id/retry')
    retry(@Param('id') vendorOrderId: string, @Body() dto: RetryPaymentDto) {
        return this.paymentService.retryPayment(vendorOrderId, dto.method);
    }

        // Phase 7: initiate remaining payment
    @Post('vendor-order/:id/remaining/initiate')
    initiateRemaining(
        @Param('id') vendorOrderId: string,
        @Body() dto: CreatePaymentDto,
    ) {
        return this.paymentService.initiateRemainingPayment(
            vendorOrderId,
            dto.method,
        );
    }

    // Phase 7: get complete booking financial summary
    @Get('vendor-order/:id/financials')
    getFinancials(@Param('id') vendorOrderId: string) {
        return this.paymentService.getBookingFinancials(vendorOrderId);
    }
    
    // Scaffold-only endpoints until a real gateway webhook exists.
    @Patch(':paymentId/confirm')
    confirm(@Param('paymentId') paymentId: string, @Body('transactionRef') ref?: string) {
        return this.paymentService.confirmPayment(paymentId, ref);
    }

    @Patch(':paymentId/fail')
    fail(@Param('paymentId') paymentId: string, @Body('reason') reason?: string) {
        return this.paymentService.failPayment(paymentId, reason);
    }
}