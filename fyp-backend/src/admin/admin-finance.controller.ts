// fyp-backend/src/admin/admin-finance.controller.ts

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';

import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import {
  AdminFinanceService,
} from './admin-finance.service';

import {
  JwtAuthGuard,
} from '../auth/jwt-auth.guard';

import {
  AdminRoleGuard,
} from '../auth/admin-role.guard';

class UpdateRefundStatusDto {
  @IsOptional() @IsString() @MaxLength(500)
  rejectionReason?: string;

  @IsIn([
    'PENDING',
    'PROCESSING',
    'REFUNDED',
    'REJECTED',
    'NO_REFUND_DUE',
  ])
  status!:
    | 'PENDING'
    | 'PROCESSING'
    | 'REFUNDED'
    | 'REJECTED'
    | 'NO_REFUND_DUE';
}

class ReviewSubscriptionPaymentDto {
  @IsIn([
    'PAID',
    'FAILED',
  ])
  status!:
    | 'PAID'
    | 'FAILED';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

@Controller(
  'admin/finance',
)
@UseGuards(
  JwtAuthGuard,
  AdminRoleGuard,
)
export class AdminFinanceController {
  constructor(
    private readonly service:
      AdminFinanceService,
  ) {}

  // =========================================================
  // BOOKING PAYMENTS
  // =========================================================

   @Get('overview')
getFinanceOverview(
  @Query('from') from?: string,
  @Query('to') to?: string,
) {
  return this.service.getFinanceOverview(from, to);
}

@Get('transactions')
getRecentTransactions(
  @Query('from') from?: string,
  @Query('to') to?: string,
  @Query('status') status?: string,
  @Query('type') type?: string,
  @Query('search') search?: string,
  @Query('page') page?: string,
  @Query('limit') limit?: string,
) {
  return this.service.getRecentTransactions({
    from,
    to,
    status,
    type,
    search,
    page,
    limit,
  });
}

  @Get('payments')
  getPayments(
    @Query('status')
    status?: string,

    @Query('limit')
    limit = 20,

    @Query('skip')
    skip = 0,
  ) {
    return this.service
      .getPayments(
        status,
        limit,
        skip,
      );
  }

  // =========================================================
  // REFUNDS
  // =========================================================

  @Get('refunds')
  getRefunds(
    @Query('status')
    status?: string,

    @Query('limit')
    limit = 20,

    @Query('skip')
    skip = 0,
  ) {
    return this.service
      .getRefunds(
        status,
        limit,
        skip,
      );
  }

  @Patch(
    'refunds/:id/status',
  )
  updateRefundStatus(
    @Param('id')
    id: string,

    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    dto: UpdateRefundStatusDto,
    @Req() req: any,
  ) {
    return this.service
      .updateRefundStatus(
        id,
        dto.status,
        req.user.id,
        dto.rejectionReason,
      );
  }

  // =========================================================
  // SUBSCRIPTION PAYMENTS
  // =========================================================

  @Get(
    'subscription-payments',
  )
  getSubscriptionPayments(
    @Query('status')
    status?: string,

    @Query('plan')
    plan?: string,

    @Query('limit')
    limit = 20,

    @Query('skip')
    skip = 0,
  ) {
    return this.service
      .getSubscriptionPayments(
        status,
        plan,
        limit,
        skip,
      );
  }

  @Patch(
    'subscription-payments/:id/status',
  )
  reviewSubscriptionPayment(
    @Param('id')
    id: string,

    @Body()
    dto: ReviewSubscriptionPaymentDto,

    @Req()
    req: any,
  ) {
    return this.service
      .reviewSubscriptionPayment(
        id,
        dto.status,
        String(
          req.user.id,
        ),
        dto.reason,
      );
  }

  // =========================================================
  // LEGACY PAYOUTS
  // =========================================================

  @Get('payouts')
  getPayouts(
    @Query('status')
    status?: string,

    @Query('limit')
    limit = 20,

    @Query('skip')
    skip = 0,
  ) {
    return this.service
      .getPayouts(
        status,
        limit,
        skip,
      );
  }
}