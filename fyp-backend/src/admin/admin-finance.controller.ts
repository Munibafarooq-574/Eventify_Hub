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
  @IsIn([
    'PENDING',
    'PROCESSING',
    'REFUNDED',
    'REJECTED',
  ])
  status!:
    | 'PENDING'
    | 'PROCESSING'
    | 'REFUNDED'
    | 'REJECTED';
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

    @Body()
    dto: UpdateRefundStatusDto,
  ) {
    return this.service
      .updateRefundStatus(
        id,
        dto.status,
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