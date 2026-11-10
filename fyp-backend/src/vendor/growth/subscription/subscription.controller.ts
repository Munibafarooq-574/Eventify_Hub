import { PLAN_KEY } from './plan-catalog.service';
// fyp-backend/src/vendor/growth/subscription/subscription.controller.ts

import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import {
  IsIn,
  IsString,
  Length,
  Matches,
  IsOptional,
  IsInt,
  IsNumber,
  IsBoolean,
  Min,
} from 'class-validator';

import {
  SubscriptionService,
} from './subscription.service';

import {
  ActivateDemoSubscriptionDto,
} from './dto/activate-demo-subscription.dto';

import {
  PaymentProvider,
  SubscriptionActivationType,
} from './subscription.types';

import {
  JwtAuthGuard,
} from '../../../auth/jwt-auth.guard';

import {
  AdminRoleGuard,
} from '../../../auth/admin-role.guard';

class RequestSubscriptionPaymentDto {
  @IsString()
  @Matches(PLAN_KEY)
  plan!: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  expectedAmount?: number;

  @IsIn([
    PaymentProvider.BANK_TRANSFER,
    PaymentProvider.CARD_TEST,
    PaymentProvider.JAZZCASH,
    PaymentProvider.EASYPAISA,
  ])
  paymentProvider!:
    | PaymentProvider.BANK_TRANSFER
    | PaymentProvider.CARD_TEST
    | PaymentProvider.JAZZCASH
    | PaymentProvider.EASYPAISA;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  paymentReference?: string;

  @IsOptional()
  @IsBoolean()
  sendReceipt?: boolean;

  @IsIn([
    SubscriptionActivationType.IMMEDIATE,
    SubscriptionActivationType.SCHEDULED,
  ])
  activationType!: SubscriptionActivationType;
}

@Controller(
  'vendor/growth/subscription',
)
export class SubscriptionController {
  constructor(
    private readonly subscriptionService:
      SubscriptionService,
  ) {}

  // =========================================================
  // PLANS
  // =========================================================

  @Get('plans')
  getPlans(@Query('vendorId') vendorId: string) {
    return this.subscriptionService.getPlans(vendorId);
  }

  @Get('payment-instructions')
  getPaymentInstructions(@Query('vendorId') vendorId: string) {
    return this.subscriptionService.getPaymentInstructions(vendorId);
  }

  // =========================================================
  // CURRENT
  // =========================================================

  @Get('current/:vendorId')
  getCurrent(
    @Param('vendorId')
    vendorId: string,
  ) {
    return this.subscriptionService
      .getCurrentSubscription(
        vendorId,
      );
  }

  // =========================================================
  // ACCESS STATE
  // =========================================================

  @Get('access/:vendorId')
  getAccessState(
    @Param('vendorId')
    vendorId: string,
  ) {
    return this.subscriptionService
      .getSubscriptionAccessState(
        vendorId,
      );
  }

  // =========================================================
  // HISTORY
  // =========================================================

  @Get('history/:vendorId')
  getHistory(
    @Param('vendorId')
    vendorId: string,
  ) {
    return this.subscriptionService
      .getSubscriptionHistory(
        vendorId,
      );
  }

  // =========================================================
  // REAL/MANUAL SUBSCRIPTION PAYMENT REQUEST
  // =========================================================

  @Post('payment-request')
  @UseGuards(JwtAuthGuard)
  requestPayment(
    @Req()
    req: any,

    @Body()
    dto: RequestSubscriptionPaymentDto,
  ) {
    if (
      String(
        req.user?.role ?? '',
      ).toLowerCase() !==
      'vendor'
    ) {
      throw new ForbiddenException(
        'Only Vendor accounts can purchase a subscription.',
      );
    }

    return this.subscriptionService
      .requestSubscriptionPayment(
        String(req.user.id),
        dto.plan,
        dto.paymentProvider,
        dto.paymentReference,
        dto.activationType,
        dto.expectedAmount,
        dto.sendReceipt,
      );
  }

  // =========================================================
  // DEVELOPMENT-ONLY DEMO ACTIVATION
  // =========================================================

  @Post('activate-demo')
  @UseGuards(
    JwtAuthGuard,
    AdminRoleGuard,
  )
  activateDemo(
    @Query('vendorId')
    vendorId: string,

    @Body()
    dto: ActivateDemoSubscriptionDto,
  ) {
    return this.subscriptionService
      .activateDemoPlan(
        vendorId,
        dto.plan,
      );
  }

  // =========================================================
  // CANCEL RENEWAL
  // =========================================================

  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  cancel(
    @Req()
    req: any,

    @Body('reason')
    reason?: string,
  ) {
    if (
      String(
        req.user?.role ?? '',
      ).toLowerCase() !==
      'vendor'
    ) {
      throw new ForbiddenException(
        'Only Vendor accounts can cancel a Vendor subscription.',
      );
    }

    return this.subscriptionService
      .cancelSubscription(
        String(req.user.id),
        reason,
      );
  }
}