// fyp-backend/src/vendor/growth/discount/discount.controller.ts
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { DiscountService } from './discount.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { CreateDiscountCodeDto } from './dto/create-discount-code.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';

// Mounted at: /vendor/growth/discount
@Controller('vendor/growth/discount')
export class DiscountController {
  constructor(private readonly discountService: DiscountService) {}

  // ----- Coupons (Phase 6) — vendor-facing -----

  // POST /vendor/growth/discount/coupon?vendorId=...
  @Post('coupon')
  createCoupon(@Query('vendorId') vendorId: string, @Body() dto: CreateCouponDto) {
    return this.discountService.createCoupon(vendorId, dto);
  }

  // GET /vendor/growth/discount/coupon/mine/:vendorId
  @Get('coupon/mine/:vendorId')
  getMyCoupons(@Param('vendorId') vendorId: string) {
    return this.discountService.getVendorCoupons(vendorId);
  }

  // PATCH /vendor/growth/discount/coupon/:couponId?vendorId=...
  @Patch('coupon/:couponId')
  updateCoupon(
    @Param('couponId') couponId: string,
    @Query('vendorId') vendorId: string,
    @Body() dto: UpdateCouponDto,
  ) {
    return this.discountService.updateCoupon(vendorId, couponId, dto);
  }

  
  // DELETE /vendor/growth/discount/coupon/:couponId?vendorId=...
  // Soft-deletes (status -> cancelled) — history is kept, same as
  // subscriptions/promotions.
  @Delete('coupon/:couponId')
  cancelCoupon(@Param('couponId') couponId: string, @Query('vendorId') vendorId: string) {
    return this.discountService.cancelCoupon(vendorId, couponId);
  }

  // ----- Discount Codes (Phase 7) — vendor-facing -----

  // POST /vendor/growth/discount/discount-code?vendorId=...
  @Post('discount-code')
createDiscountCode(
  @Query('vendorId') vendorId: string,
  @Body() dto: CreateDiscountCodeDto,
) {
  return this.discountService.createDiscountCode(vendorId, dto);
}

  // GET /vendor/growth/discount/discount-code/mine/:vendorId
  @Get('discount-code/mine/:vendorId')
  getMyDiscountCodes(@Param('vendorId') vendorId: string) {
    return this.discountService.getVendorDiscountCodes(vendorId);
  }

  // PATCH /vendor/growth/discount/discount-code/:discountCodeId?vendorId=...
  @Patch('discount-code/:discountCodeId')
  updateDiscountCode(
    @Param('discountCodeId') discountCodeId: string,
    @Query('vendorId') vendorId: string,
    @Body() dto: UpdateCouponDto,
  ) {
    return this.discountService.updateDiscountCode(vendorId, discountCodeId, dto);
  }

  // DELETE /vendor/growth/discount/discount-code/:discountCodeId?vendorId=...
  @Delete('discount-code/:discountCodeId')
  cancelDiscountCode(@Param('discountCodeId') discountCodeId: string, @Query('vendorId') vendorId: string) {
    return this.discountService.cancelDiscountCode(vendorId, discountCodeId);
  }

  // ----- Checkout (customer-facing, called from your checkout flow) -----

  // POST /vendor/growth/discount/coupon/validate?vendorId=...
  // Body: { "code": "WEDDING20", "orderAmount": 20000 }
  // Works for BOTH Coupons and Discount Codes — checkout doesn't need to
  // know which type a code was created as. Read-only, doesn't consume a use.
  @Post('coupon/validate')
  validateCoupon(@Query('vendorId') vendorId: string, @Body() dto: ValidateCouponDto) {
    return this.discountService.validateCoupon(vendorId, dto.code, dto.orderAmount);
  }

  // POST /vendor/growth/discount/coupon/redeem?vendorId=...
  // Body: { "code": "WEDDING20" }
  // Call this from your EXISTING order/booking creation flow once the
  // booking is actually confirmed — this is what increments usedCount.
  // Also works for both types.
  @Post('coupon/redeem')
  redeemCoupon(@Query('vendorId') vendorId: string, @Body('code') code: string) {
    return this.discountService.redeemCoupon(vendorId, code);
  }
}