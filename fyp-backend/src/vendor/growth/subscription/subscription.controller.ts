// fyp-backend/src/vendor/growth/subscription/subscription.controller.ts
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { ActivateDemoSubscriptionDto } from './dto/activate-demo-subscription.dto';

// Mounted at: /vendor/growth/subscription  (see VendorGrowthModule)
@Controller('vendor/growth/subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  // GET /vendor/growth/subscription/plans
  // Public plan list for the SubscriptionScreen — Free / Growth / Premium
  // with their features + limits, straight from plan-config.ts.
  @Get('plans')
  getPlans() {
    return this.subscriptionService.getPlans();
  }

  // GET /vendor/growth/subscription/current/:vendorId
  // The vendor's active subscription (auto-expires + falls back to Free
  // if endDate has passed).
  @Get('current/:vendorId')
  getCurrent(@Param('vendorId') vendorId: string) {
    return this.subscriptionService.getCurrentSubscription(vendorId);
  }

  // GET /vendor/growth/subscription/history/:vendorId
  @Get('history/:vendorId')
  getHistory(@Param('vendorId') vendorId: string) {
    return this.subscriptionService.getSubscriptionHistory(vendorId);
  }

  // POST /vendor/growth/subscription/activate-demo?vendorId=...
  // Body: { "plan": "growth" }  or  { "plan": "premium" }
  //
  // This is a DEMO/MANUAL activation — no real payment gateway is called.
  // The response's paymentStatus/paymentProvider will always read
  // "demo" so the frontend can label it clearly (never "Payment Successful").
  @Post('activate-demo')
  activateDemo(
    @Query('vendorId') vendorId: string,
    @Body() dto: ActivateDemoSubscriptionDto,
  ) {
    return this.subscriptionService.activateDemoPlan(vendorId, dto.plan);
  }

  // POST /vendor/growth/subscription/cancel?vendorId=...
  // Cancels the current paid plan and drops the vendor back to Free.
  @Post('cancel')
  cancel(@Query('vendorId') vendorId: string, @Body('reason') reason?: string) {
    return this.subscriptionService.cancelSubscription(vendorId, reason);
  }
}