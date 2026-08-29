// fyp-backend/src/vendor/growth/discount/discount.service.ts
// fyp-backend/src/vendor/growth/discount/discount.service.ts
//
// Phase 6 (Coupons) built this generically enough that Phase 7 (Discount
// Codes) is just: a second FeatureKey/LimitKey pair and two thin public
// methods (createDiscountCode / getVendorDiscountCodes) wrapping the same
// generic core — createCoupon/getVendorCoupons/updateCoupon/cancelCoupon
// from Phase 6 keep their exact same signatures and behavior.
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { VendorDiscount } from '../../../schemas/vendor-discount.schema';
import { DiscountCalculation, DiscountEntryType, DiscountKind, DiscountStatus } from './discount.types';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { FeatureAccessService } from '../feature-access.service';
import { FeatureKey, LimitKey } from '../subscription/subscription.types';
import { User } from 'src/schemas/user.schema';

interface DiscountEntryPayload {
  code: string;
  discountType: DiscountKind;
  discountValue: number;
  minimumOrderAmount?: number;
  maximumDiscountAmount?: number;
  packageId?: string;
  startDate: string;
  endDate: string;
  usageLimit: number;
}

@Injectable()
export class DiscountService {
  constructor(
    @InjectModel(VendorDiscount.name) private readonly discountModel: Model<VendorDiscount>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly featureAccessService: FeatureAccessService,
  ) {}

  // ---------------------------------------------------------------
  // Coupons (Phase 6) — vendor-facing
  // ---------------------------------------------------------------

  async createCoupon(vendorId: string, dto: CreateCouponDto): Promise<VendorDiscount> {
    return this.createDiscountEntry(vendorId, DiscountEntryType.COUPON, dto, {
      featureKey: FeatureKey.COUPONS,
      limitKey: LimitKey.COUPON_LIMIT,
      noun: 'coupon',
    });
  }

  async getVendorCoupons(vendorId: string): Promise<VendorDiscount[]> {
    return this.getVendorDiscountEntries(vendorId, DiscountEntryType.COUPON);
  }

  async updateCoupon(vendorId: string, couponId: string, dto: UpdateCouponDto): Promise<VendorDiscount> {
    return this.updateDiscountEntry(vendorId, couponId, dto, 'coupon');
  }

  async cancelCoupon(vendorId: string, couponId: string): Promise<VendorDiscount> {
    return this.cancelDiscountEntry(vendorId, couponId, 'coupon');
  }

  // ---------------------------------------------------------------
  // Discount Codes (Phase 7) — vendor-facing
  //
  // Mechanically identical to Coupons (same schema, same validation, same
  // checkout flow) — the spec treats them as two vendor-facing labels on
  // the same underlying concept, not two systems. Separate FeatureKey/
  // LimitKey so their plan limits are tracked independently (a vendor
  // could be at their Coupon limit but still have Discount Code slots
  // free, and vice versa).
  // ---------------------------------------------------------------

  async createDiscountCode(vendorId: string, dto: CreateCouponDto): Promise<VendorDiscount> {
    return this.createDiscountEntry(vendorId, DiscountEntryType.DISCOUNT_CODE, dto, {
      featureKey: FeatureKey.DISCOUNT_CODES,
      limitKey: LimitKey.DISCOUNT_CODE_LIMIT,
      noun: 'discount code',
    });
  }

  async getVendorDiscountCodes(vendorId: string): Promise<VendorDiscount[]> {
    return this.getVendorDiscountEntries(vendorId, DiscountEntryType.DISCOUNT_CODE);
  }

  async updateDiscountCode(vendorId: string, discountCodeId: string, dto: UpdateCouponDto): Promise<VendorDiscount> {
    return this.updateDiscountEntry(vendorId, discountCodeId, dto, 'discount code');
  }

  async cancelDiscountCode(vendorId: string, discountCodeId: string): Promise<VendorDiscount> {
    return this.cancelDiscountEntry(vendorId, discountCodeId, 'discount code');
  }

  // ---------------------------------------------------------------
  // Checkout — used by the customer-facing checkout flow.
  //
  // Deliberately NOT filtered by type: from a customer's point of view,
  // "enter a code, get a discount" works the same whether the vendor
  // created it as a Coupon or a Discount Code — the distinction only
  // matters for the vendor's own limits/management screens.
  // ---------------------------------------------------------------

  /**
   * Validates a code and computes the discount WITHOUT consuming a use.
   * Safe to call repeatedly (e.g. while the customer is still editing
   * their cart) — nothing here mutates usedCount.
   */
  async validateCoupon(vendorId: string, code: string, orderAmount: number): Promise<DiscountCalculation> {
    this.assertValidId(vendorId);

    const entry = await this.findActiveEntryByCode(vendorId, code);

    if (orderAmount < entry.minimumOrderAmount) {
      throw new BadRequestException(
        `This code requires a minimum order of Rs. ${entry.minimumOrderAmount}`,
      );
    }

    const discountAmount = this.computeDiscountAmount(entry, orderAmount);

    return {
      valid: true,
      discountEntryId: entry._id.toString(),
      code: entry.code,
      discountType: entry.discountType,
      discountAmount,
      finalAmount: Math.max(orderAmount - discountAmount, 0),
    };
  }

  /**
   * Consumes one use of a coupon/discount code. Call this from your
   * existing order/booking creation flow ONCE the booking is actually
   * confirmed — not at validation time — otherwise a customer who checks
   * a code and then abandons checkout would still burn a use.
   *
   * Atomic findOneAndUpdate with a `usedCount < usageLimit` guard so two
   * concurrent redemptions can't both slip through and overshoot the
   * usage limit (a plain read-then-write would have that race).
   */
  async redeemCoupon(vendorId: string, code: string): Promise<VendorDiscount> {
    this.assertValidId(vendorId);
    const normalizedCode = code.trim().toUpperCase();
    const now = new Date();

    const updated = await this.discountModel.findOneAndUpdate(
      {
        vendorId: new Types.ObjectId(vendorId),
        code: normalizedCode,
        status: DiscountStatus.ACTIVE,
        startDate: { $lte: now },
        endDate: { $gte: now },
        $expr: { $lt: ['$usedCount', '$usageLimit'] },
      },
      { $inc: { usedCount: 1 } },
      { new: true },
    );

    if (!updated) {
      throw new BadRequestException('Code is invalid, expired, or has reached its usage limit');
    }

    return updated;
  }

  // ---------------------------------------------------------------
  // Generic core — shared by Coupons and Discount Codes
  // ---------------------------------------------------------------

  private async createDiscountEntry(
    vendorId: string,
    type: DiscountEntryType,
    dto: DiscountEntryPayload,
    opts: { featureKey: FeatureKey; limitKey: LimitKey; noun: string },
  ): Promise<VendorDiscount> {
    this.assertValidId(vendorId);

    const allowed = await this.featureAccessService.canUseFeature(vendorId, opts.featureKey);
    if (!allowed) {
      throw new ForbiddenException(
        `Your current plan does not include ${opts.noun === 'coupon' ? 'Coupons' : 'Discount Codes'}. Upgrade to Growth or Premium.`,
      );
    }

    this.validatePayload(dto);

    if (dto.packageId) {
      await this.assertOwnsPackage(vendorId, dto.packageId);
    }

    const code = dto.code.trim().toUpperCase();

    // Expire stale entries across BOTH types before checking uniqueness/
    // limits, so an expired one never blocks a fresh code or counts
    // against the active limit.
    await this.expireStale(vendorId, DiscountEntryType.COUPON);
    await this.expireStale(vendorId, DiscountEntryType.DISCOUNT_CODE);

    // Uniqueness is checked across BOTH types for this vendor — a
    // customer typing a code at checkout can't tell (or care) whether it
    // was created as a Coupon or a Discount Code, so two active entries
    // with the same code would be ambiguous.
    const duplicateActiveCode = await this.discountModel.findOne({
      vendorId: new Types.ObjectId(vendorId),
      code,
      status: DiscountStatus.ACTIVE,
    });
    if (duplicateActiveCode) {
      throw new BadRequestException(`You already have an active code "${code}"`);
    }

    const activeCount = await this.discountModel.countDocuments({
      vendorId: new Types.ObjectId(vendorId),
      type,
      status: DiscountStatus.ACTIVE,
    });

    const limit = await this.featureAccessService.getFeatureLimit(vendorId, opts.limitKey);

    if (activeCount >= limit) {
      throw new BadRequestException(
        `Limit reached (${activeCount}/${limit}). Deactivate an existing one or upgrade your plan.`,
      );
    }

    return this.discountModel.create({
      vendorId: new Types.ObjectId(vendorId),
      type,
      code,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      minimumOrderAmount: dto.minimumOrderAmount ?? 0,
      maximumDiscountAmount: dto.maximumDiscountAmount ?? null,
      packageId: dto.packageId ?? null,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      usageLimit: dto.usageLimit,
      usedCount: 0,
      status: DiscountStatus.ACTIVE,
    });
  }

  private async getVendorDiscountEntries(vendorId: string, type: DiscountEntryType): Promise<VendorDiscount[]> {
    this.assertValidId(vendorId);
    await this.expireStale(vendorId, type);

    return this.discountModel
      .find({ vendorId: new Types.ObjectId(vendorId), type })
      .sort({ createdAt: -1 })
      .exec();
  }

  private async updateDiscountEntry(
    vendorId: string,
    entryId: string,
    dto: UpdateCouponDto,
    noun: string,
  ): Promise<VendorDiscount> {
    this.assertValidId(vendorId);
    const entry = await this.findOwnedEntry(vendorId, entryId, noun);

    if (entry.status !== DiscountStatus.ACTIVE) {
      throw new BadRequestException(`Only active ${noun}s can be edited`);
    }

    if (dto.minimumOrderAmount !== undefined) entry.minimumOrderAmount = dto.minimumOrderAmount;
    if (dto.maximumDiscountAmount !== undefined) entry.maximumDiscountAmount = dto.maximumDiscountAmount;
    if (dto.usageLimit !== undefined) {
      if (dto.usageLimit < entry.usedCount) {
        throw new BadRequestException(
          `usageLimit can't be lower than the current usedCount (${entry.usedCount})`,
        );
      }
      entry.usageLimit = dto.usageLimit;
    }
    if (dto.endDate !== undefined) {
      const newEndDate = new Date(dto.endDate);
      if (newEndDate <= entry.startDate) {
        throw new BadRequestException('endDate must be after startDate');
      }
      entry.endDate = newEndDate;
    }

    await entry.save();
    return entry;
  }

  private async cancelDiscountEntry(vendorId: string, entryId: string, noun: string): Promise<VendorDiscount> {
    this.assertValidId(vendorId);
    const entry = await this.findOwnedEntry(vendorId, entryId, noun);

    if (entry.status !== DiscountStatus.ACTIVE) {
      throw new BadRequestException(`This ${noun} is not active`);
    }

    entry.status = DiscountStatus.CANCELLED;
    await entry.save();
    return entry;
  }

  private computeDiscountAmount(entry: VendorDiscount, orderAmount: number): number {
    if (entry.discountType === DiscountKind.PERCENTAGE) {
      let discount = (orderAmount * entry.discountValue) / 100;
      if (entry.maximumDiscountAmount != null) {
        discount = Math.min(discount, entry.maximumDiscountAmount);
      }
      return Math.round(discount);
    }
    // FIXED — never discount more than the order itself
    return Math.min(entry.discountValue, orderAmount);
  }

  private async findActiveEntryByCode(vendorId: string, code: string): Promise<VendorDiscount> {
    const normalizedCode = code.trim().toUpperCase();
    const now = new Date();

    const entry = await this.discountModel.findOne({
      vendorId: new Types.ObjectId(vendorId),
      code: normalizedCode,
    });

    if (!entry) {
      throw new NotFoundException('Code not found for this vendor');
    }
    if (entry.status !== DiscountStatus.ACTIVE) {
      throw new BadRequestException('This code is no longer active');
    }
    if (entry.startDate > now) {
      throw new BadRequestException('This code is not active yet');
    }
    if (entry.endDate < now) {
      throw new BadRequestException('This code has expired');
    }
    if (entry.usedCount >= entry.usageLimit) {
      throw new BadRequestException('This code has reached its usage limit');
    }

    return entry;
  }

  private async findOwnedEntry(vendorId: string, entryId: string, noun: string): Promise<VendorDiscount> {
    if (!Types.ObjectId.isValid(entryId)) {
      throw new BadRequestException('Invalid id');
    }
    const entry = await this.discountModel.findOne({
      _id: entryId,
      vendorId: new Types.ObjectId(vendorId),
    });
    if (!entry) {
      throw new NotFoundException(`${noun[0].toUpperCase()}${noun.slice(1)} not found for this vendor`);
    }
    return entry;
  }

  private validatePayload(dto: DiscountEntryPayload) {
    if (dto.discountType === DiscountKind.PERCENTAGE && dto.discountValue > 100) {
      throw new BadRequestException('Percentage discount cannot exceed 100');
    }
    if (new Date(dto.endDate) <= new Date(dto.startDate)) {
      throw new BadRequestException('endDate must be after startDate');
    }
  }

  private async assertOwnsPackage(vendorId: string, packageId: string): Promise<void> {
    const vendor = await this.userModel.findById(vendorId).select('packages').lean();
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }
    const owns = (vendor.packages || []).some((p: any) => p._id.toString() === packageId);
    if (!owns) {
      throw new BadRequestException('This package does not belong to this vendor');
    }
  }

  private async expireStale(vendorId: string, type: DiscountEntryType): Promise<void> {
    await this.discountModel.updateMany(
      {
        vendorId: new Types.ObjectId(vendorId),
        type,
        status: DiscountStatus.ACTIVE,
        endDate: { $lt: new Date() },
      },
      { $set: { status: DiscountStatus.EXPIRED } },
    );
  }

  /*private assertValidId(vendorId: string) {
    if (!Types.ObjectId.isValid(vendorId)) {
      throw new BadRequestException('Invalid vendorId');
    }
  }*/

private assertValidId(vendorId: string) {
  console.log('DISCOUNT vendorId:', vendorId);
  console.log('DISCOUNT vendorId type:', typeof vendorId);
  console.log('DISCOUNT ObjectId valid:', Types.ObjectId.isValid(vendorId));

  if (!Types.ObjectId.isValid(vendorId)) {
    throw new BadRequestException('Invalid vendorId');
  }
} 
 }