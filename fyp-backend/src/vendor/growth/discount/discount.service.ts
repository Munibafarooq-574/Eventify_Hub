// fyp-backend/src/vendor/growth/discount/discount.service.ts
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { VendorDiscount } from '../../../schemas/vendor-discount.schema';
import {
  DiscountAudience,
  DiscountCalculation,
  DiscountEntryType,
  DiscountKind,
  DiscountStatus,
} from './discount.types';
import { VendorOrder } from '../../../schemas/vendor-order.schema';
import { Order } from '../../../schemas/order.schema';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { FeatureAccessService } from '../feature-access.service';
import { FeatureKey, LimitKey } from '../subscription/subscription.types';
import { User } from 'src/schemas/user.schema';
import { CreateDiscountCodeDto } from './dto/create-discount-code.dto';
import { NotificationService } from '../../../notifications/notifications.service';
import * as nodemailer from 'nodemailer';
import axios from 'axios';
import { buildDiscountOfferEmail } from './discount-email.template';
import { DiscountRedemption } from '../../../schemas/discount-redemption.schema';

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
  audience?: DiscountAudience;
  selectedClientIds?: string[];
}

@Injectable()
export class DiscountService {
  constructor(
    @InjectModel(VendorDiscount.name)
private readonly discountModel: Model<VendorDiscount>,

@InjectModel(User.name)
private readonly userModel: Model<User>,

@InjectModel(VendorOrder.name)
private readonly vendorOrderModel: Model<VendorOrder>,

@InjectModel(Order.name)
private readonly orderModel: Model<Order>,

@InjectModel(DiscountRedemption.name)
private readonly redemptionModel: Model<DiscountRedemption>,

private readonly featureAccessService: FeatureAccessService,

private readonly notificationService: NotificationService,
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

  async getPublicCoupons(
  vendorId: string,
  packageId?: string,
): Promise<VendorDiscount[]> {
  this.assertValidId(vendorId);

  const hasAccess =
    await this.featureAccessService.hasActiveSubscription(
      vendorId,
    );

  if (!hasAccess) {
    return [];
  }

  const now = new Date();

  const filter: any = {
    vendorId: new Types.ObjectId(vendorId),
    type: DiscountEntryType.COUPON,
    status: DiscountStatus.ACTIVE,
    startDate: { $lte: now },
    endDate: { $gte: now },
    $expr: {
      $lt: ['$usedCount', '$usageLimit'],
    },
  };

  if (packageId) {
    filter.$and = [
      {
        $or: [
          { packageId: null },
          { packageId },
        ],
      },
    ];
  } else {
    filter.packageId = null;
  }

  return this.discountModel
    .find(filter)
    .sort({ createdAt: -1 })
    .exec();
}

async getPublicDashboardCoupons(
  limit = 10,
): Promise<VendorDiscount[]> {
  const safeLimit = Math.min(
    Math.max(Number(limit) || 10, 1),
    20,
  );

  const now = new Date();

  const coupons = await this.discountModel
    .find({
      type: DiscountEntryType.COUPON,
      status: DiscountStatus.ACTIVE,
      startDate: { $lte: now },
      endDate: { $gte: now },
      $expr: {
        $lt: ['$usedCount', '$usageLimit'],
      },
    })
    .sort({ createdAt: -1 })
    .limit(safeLimit * 3)
    .exec();

  const usableCoupons: any[] = [];

  for (const coupon of coupons) {
    const hasAccess =
      await this.featureAccessService.hasActiveSubscription(
        coupon.vendorId.toString(),
      );

    if (!hasAccess) {
  continue;
}

const vendor = await this.userModel
  .findOne({
    _id: coupon.vendorId,
    role: 'Vendor',
  })
  .select(
  'name contactDetails buisnessCategory businessCityId serviceLocationCityIds city',
)
  .populate('buisnessCategory', 'name')
  .populate('businessCityId', 'name')
  .populate('serviceLocationCityIds', 'name')
  .lean();

if (!vendor) {
  continue;
}

const couponObject =
  typeof (coupon as any).toObject === 'function'
    ? (coupon as any).toObject()
    : coupon;

usableCoupons.push({
  ...couponObject,

  vendorId: {
  _id: String((vendor as any)._id),

  name:
    (vendor as any).name ||
    '',

  brandName:
    (vendor as any).contactDetails?.brandName ||
    (vendor as any).name ||
    '',

  categoryName:
    (vendor as any).buisnessCategory?.name ||
    '',

  businessCity:
    (vendor as any).businessCityId?.name ||
    '',

  serviceLocationCityIds:
    Array.isArray(
      (vendor as any).serviceLocationCityIds,
    )
      ? (vendor as any).serviceLocationCityIds.map(
          (city: any) => ({
            _id: String(city?._id || ''),
            name: city?.name || '',
          }),
        )
      : [],
},
});

    if (usableCoupons.length >= safeLimit) {
      break;
    }
  }

  return usableCoupons;
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

async createDiscountCode(vendorId: string, dto: CreateDiscountCodeDto): Promise<VendorDiscount> {
    return this.createDiscountEntry(vendorId, DiscountEntryType.DISCOUNT_CODE, dto, {
      featureKey: FeatureKey.DISCOUNT_CODES,
      limitKey: LimitKey.DISCOUNT_CODE_LIMIT,
      noun: 'discount code',
    });
  }

  async getVendorDiscountCodes(vendorId: string): Promise<VendorDiscount[]> {
    return this.getVendorDiscountEntries(vendorId, DiscountEntryType.DISCOUNT_CODE);
  }

  async searchVendorClients(
  vendorId: string,
  page = 1,
  limit = 20,
  search = '',
) {
  this.assertValidId(vendorId);

  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(
    Math.max(Number(limit) || 20, 1),
    50,
  );

  const vendorObjectId = new Types.ObjectId(vendorId);

  const vendorOrders = await this.vendorOrderModel
    .find({
      vendorId: vendorObjectId,
    })
    .select('orderId')
    .lean();

  if (vendorOrders.length === 0) {
    return {
      clients: [],
      pagination: {
        page: safePage,
        limit: safeLimit,
        total: 0,
        totalPages: 0,
      },
    };
  }

  const orderIds = [
    ...new Set(
      vendorOrders.map((vendorOrder) =>
        vendorOrder.orderId.toString(),
      ),
    ),
  ].map((id) => new Types.ObjectId(id));

  const clientIds = await this.orderModel.distinct(
    'organizerId',
    {
      _id: { $in: orderIds },
    },
  );

  if (clientIds.length === 0) {
    return {
      clients: [],
      pagination: {
        page: safePage,
        limit: safeLimit,
        total: 0,
        totalPages: 0,
      },
    };
  }

  const trimmedSearch = search.trim();

  const userFilter: any = {
    _id: { $in: clientIds },
  };

  if (trimmedSearch) {
    const escapedSearch = trimmedSearch.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&',
    );

    userFilter.$or = [
      {
        name: {
          $regex: escapedSearch,
          $options: 'i',
        },
      },
      {
        email: {
          $regex: escapedSearch,
          $options: 'i',
        },
      },
    ];
  }

  const total = await this.userModel.countDocuments(
    userFilter,
  );

  const clients = await this.userModel
    .find(userFilter)
    .select('_id name email')
    .sort({ name: 1, _id: 1 })
    .skip((safePage - 1) * safeLimit)
    .limit(safeLimit)
    .lean();

  return {
    clients: clients.map((client: any) => ({
      clientId: client._id.toString(),
      name: client.name ?? '',
      email: client.email ?? '',
    })),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
}

async notifySelectedClients(
  vendorId: string,
  discountCodeId: string,
) {
  this.assertValidId(vendorId);
  this.assertValidId(discountCodeId);

  const discountCode = await this.discountModel
    .findOne({
      _id: new Types.ObjectId(discountCodeId),
      vendorId: new Types.ObjectId(vendorId),
      type: DiscountEntryType.DISCOUNT_CODE,
    })
    .exec();

  if (!discountCode) {
    throw new NotFoundException(
      'Discount code not found',
    );
  }

  if (
    discountCode.audience !==
    DiscountAudience.SELECTED_CLIENTS
  ) {
    throw new BadRequestException(
      'Notifications are only available for selected-client discount codes.',
    );
  }

  const selectedClientIds =
    discountCode.selectedClientIds || [];

  if (!selectedClientIds.length) {
    throw new BadRequestException(
      'No selected clients found for this discount code.',
    );
  }

  const discountText =
    discountCode.discountType ===
    DiscountKind.PERCENTAGE
      ? `${discountCode.discountValue}% OFF`
      : `Rs. ${Number(
          discountCode.discountValue,
        ).toLocaleString()} OFF`;

  const validTill = new Date(
    discountCode.endDate,
  ).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });

  const title = 'Exclusive Discount Code';

  const body =
    `${discountText} on Eventify Hub. ` +
    `Use code: ${discountCode.code}. ` +
    `Valid till ${validTill}.`;

  const vendor = await this.userModel
  .findById(vendorId)
  .select('contactDetails.brandName')
  .lean();

const vendorBrandName =
  vendor?.contactDetails?.brandName ||
  'Eventify Hub Vendor';

const selectedClients = await this.userModel
  .find({
    _id: {
      $in: selectedClientIds,
    },
  })
  .select('_id email')
  .lean();

const clientEmailMap = new Map(
  selectedClients.map((client) => [
    String(client._id),
    client.email,
  ]),
);

let notifiedCount = 0;
let skippedCount = 0;
let emailedCount = 0;
let emailSkippedCount = 0;

for (const clientId of selectedClientIds) {
    try {
      await this.notificationService
        .sendPushNotification(
          title,
          body,
          String(clientId),
        );

      notifiedCount += 1;
    } catch {
      // A client may not have a push token.
      // Do not stop notifications for other clients.
      skippedCount += 1;
    }

    const clientEmail =
  clientEmailMap.get(String(clientId));

if (clientEmail) {
  try {
    await this.sendDiscountOfferEmail(
      clientEmail,
      vendorBrandName,
      discountCode,
    );

    emailedCount += 1;
  } catch {
    emailSkippedCount += 1;
  }
} else {
  emailSkippedCount += 1;
}
  }

  return {
  success: true,
  notifiedCount,
  skippedCount,
  emailedCount,
  emailSkippedCount,
};
}

private escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

private formatEmailDate(value: Date | string): string {
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

private async sendDiscountOfferEmail(
  recipientEmail: string,
  vendorName: string,
  discountCode: VendorDiscount,
): Promise<void> {
  const discountText =
    discountCode.discountType === DiscountKind.PERCENTAGE
      ? `${discountCode.discountValue}% OFF`
      : `Rs. ${Number(
          discountCode.discountValue,
        ).toLocaleString()} OFF`;

  const minimumOrder =
    Number(discountCode.minimumOrderAmount || 0);

  const startDate =
    this.formatEmailDate(discountCode.startDate);

  const endDate =
    this.formatEmailDate(discountCode.endDate);


 const html = buildDiscountOfferEmail({
  vendorBrandName: vendorName,
  code: discountCode.code,
  discountText,
  minimumOrder,
  startDate,
  endDate,
});

   try {
    await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: {
          name: vendorName,
          email: process.env.MAIL_FROM_EMAIL,
        },
        to: [{ email: recipientEmail }],
        subject: 'A special discount is waiting for you',
        htmlContent: html,
      },
      {
        headers: {
          'api-key': process.env.BREVO_API_KEY as string,
          'Content-Type': 'application/json',
          accept: 'application/json',
        },
        timeout: 20000,
      },
    );
  } catch (e: any) {
    throw new Error(
      e?.response?.data?.message || e?.message || 'Email send failed',
    );
  }
}

async sendDiscountEmail(
  vendorId: string,
  discountCodeId: string,
  recipientEmail: string,
) {
  this.assertValidId(vendorId);
  this.assertValidId(discountCodeId);

  const email = recipientEmail
    .trim()
    .toLowerCase();

  if (
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new BadRequestException(
      'A valid recipient email is required',
    );
  }

  const discountCode = await this.discountModel
    .findOne({
      _id: new Types.ObjectId(discountCodeId),
      vendorId: new Types.ObjectId(vendorId),
      type: DiscountEntryType.DISCOUNT_CODE,
    })
    .exec();

  if (!discountCode) {
    throw new NotFoundException(
      'Discount code not found',
    );
  }

  if (discountCode.status !== DiscountStatus.ACTIVE) {
    throw new BadRequestException(
      'Only active discount codes can be emailed',
    );
  }

const vendor = await this.userModel
  .findById(vendorId)
  .select('contactDetails.brandName')
  .lean();
  if (!vendor) {
    throw new NotFoundException(
      'Vendor not found',
    );
  }

  await this.sendDiscountOfferEmail(
    email,
    vendor?.contactDetails?.brandName ||
  'Eventify Hub Vendor',
    discountCode,
  );

  return {
    success: true,
    message: 'Discount email sent successfully',
  };
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
async validateCoupon(
  vendorId: string,
  code: string,
  orderAmount: number,
  clientId?: string,
  packageId?: string,
): Promise<DiscountCalculation> {
  this.assertValidId(vendorId);

  const hasAccess =
    await this.featureAccessService.hasActiveSubscription(
      vendorId,
    );

  if (!hasAccess) {
    throw new BadRequestException(
      'This vendor is not currently eligible to offer discounts',
    );
  }

    const entry = await this.findActiveEntryByCode(
    vendorId,
    code,
  );

  // Ek client, ek code, sirf ek baar
  if (!clientId || !Types.ObjectId.isValid(clientId)) {
    throw new BadRequestException(
      'A valid clientId is required to use this code',
    );
  }

  const alreadyUsed = await this.redemptionModel.exists({
    discountId: entry._id,
    clientId: new Types.ObjectId(clientId),
  });

  if (alreadyUsed) {
    throw new BadRequestException(
      'You have already used this code',
    );
  }

  if (
    entry.packageId &&
    (!packageId || entry.packageId !== packageId)
  ) {
    throw new BadRequestException(
      'This code is not applicable to this package',
    );
  }

  if (
    entry.type === DiscountEntryType.DISCOUNT_CODE
  ) {
    await this.assertDiscountCodeAudienceEligibility(
      entry,
      vendorId,
      clientId,
    );
  }

  if (orderAmount < entry.minimumOrderAmount) {
    throw new BadRequestException(
      `This code requires a minimum order of Rs. ${entry.minimumOrderAmount}`,
    );
  }

  const discountAmount =
    this.computeDiscountAmount(
      entry,
      orderAmount,
    );

  return {
    valid: true,
    discountEntryId: entry._id.toString(),
    code: entry.code,
    discountType: entry.discountType,
    discountAmount,
    finalAmount: Math.max(
      orderAmount - discountAmount,
      0,
    ),
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
    async redeemCoupon(
    vendorId: string,
    code: string,
    clientId: string,
    orderId?: string,
  ): Promise<VendorDiscount> {
    this.assertValidId(vendorId);

    if (!clientId || !Types.ObjectId.isValid(clientId)) {
      throw new BadRequestException('A valid clientId is required');
    }

    const normalizedCode = code.trim().toUpperCase();
    const now = new Date();

    const entry = await this.discountModel.findOne({
      vendorId: new Types.ObjectId(vendorId),
      code: normalizedCode,
    });

    if (!entry) {
      throw new NotFoundException('Code not found for this vendor');
    }

    // Step A: client ka record pehle likho. Unique index duplicate rok deta hai,
    // is liye do requests ek saath aayen tab bhi sirf ek chalegi.
    let redemption: DiscountRedemption;
    try {
      redemption = await this.redemptionModel.create({
        discountId: entry._id,
        clientId: new Types.ObjectId(clientId),
        vendorId: new Types.ObjectId(vendorId),
        orderId:
          orderId && Types.ObjectId.isValid(orderId)
            ? new Types.ObjectId(orderId)
            : null,
      });
    } catch (e: any) {
      if (e?.code === 11000) {
        throw new BadRequestException('You have already used this code');
      }
      throw e;
    }

    // Step B: usedCount barhao (usage limit guard ke saath)
    const updated = await this.discountModel.findOneAndUpdate(
      {
        _id: entry._id,
        status: DiscountStatus.ACTIVE,
        startDate: { $lte: now },
        endDate: { $gte: now },
        $expr: { $lt: ['$usedCount', '$usageLimit'] },
      },
      { $inc: { usedCount: 1 } },
      { new: true },
    );

    // Agar code expire/full ho gaya, to Step A wala record wapas hata do
    if (!updated) {
      await this.redemptionModel.deleteOne({ _id: redemption._id });
      throw new BadRequestException(
        'Code is invalid, expired, or has reached its usage limit',
      );
    }

    return updated;
  }

  async getShareData(discountCodeId: string) {
  this.assertValidId(discountCodeId);

  const entry = await this.discountModel
    .findById(new Types.ObjectId(discountCodeId))
    .exec();

  if (!entry || entry.status !== DiscountStatus.ACTIVE) {
    throw new NotFoundException('Offer not available');
  }

  const vendor = await this.userModel
    .findById(entry.vendorId)
    .select('contactDetails.brandName')
    .lean();

  const vendorName =
    vendor?.contactDetails?.brandName || 'Eventify Hub Vendor';

  const discountText =
    entry.discountType === DiscountKind.PERCENTAGE
      ? `${entry.discountValue}% OFF`
      : `Rs. ${Number(entry.discountValue).toLocaleString()} OFF`;

  const minimumOrder = Number(entry.minimumOrderAmount || 0);

  const baseUrl =
    process.env.PUBLIC_API_URL || 'https://eventify-hub.onrender.com';

  const pageUrl = `${baseUrl}/vendor/growth/discount/discount-code/share/${discountCodeId}`;

  const startDate = this.formatEmailDate(entry.startDate);
  const endDate = this.formatEmailDate(entry.endDate);

  const firstLine =
    entry.audience === DiscountAudience.NEW_CLIENTS
      ? `Get ${discountText} on your first booking on Eventify Hub.`
      : `Get ${discountText} on your next booking on Eventify Hub.`;

  const minimumText =
  minimumOrder > 0 ? `Rs ${minimumOrder.toLocaleString()}` : 'No minimum';

const validText = `${startDate} to ${endDate}`;

const message = `🎉 Exclusive offer from ${vendorName}\n\n${pageUrl}`;

return {
  code: entry.code,
  vendorName,
  discountText,
  firstLine,
  minimumText,
  validText,
  pageUrl,
  imageUrl: `${pageUrl}/banner.png`,
  message,
};
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

      audience:
        type === DiscountEntryType.DISCOUNT_CODE
          ? dto.audience ?? DiscountAudience.EVERYONE
          : DiscountAudience.EVERYONE,

      selectedClientIds:
        type === DiscountEntryType.DISCOUNT_CODE &&
        dto.audience === DiscountAudience.SELECTED_CLIENTS
          ? (dto.selectedClientIds ?? []).map(
              (id) => new Types.ObjectId(id),
            )
          : [],

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

  private async assertDiscountCodeAudienceEligibility(
  entry: VendorDiscount,
  vendorId: string,
  clientId?: string,
): Promise<void> {
  if (entry.audience === DiscountAudience.EVERYONE) {
    return;
  }

  if (!clientId || !Types.ObjectId.isValid(clientId)) {
    throw new BadRequestException(
      'A valid clientId is required for this discount code',
    );
  }

  if (entry.audience === DiscountAudience.SELECTED_CLIENTS) {
    const allowed = (entry.selectedClientIds || []).some(
      (id) => id.toString() === clientId,
    );

    if (!allowed) {
      throw new ForbiddenException(
        'This discount code is not available for this client',
      );
    }

    return;
  }

  if (entry.audience === DiscountAudience.NEW_CLIENTS) {
    const vendorOrders = await this.vendorOrderModel
      .find({
        vendorId: new Types.ObjectId(vendorId),
        status: {
          $in: ['accepted', 'completed'],
        },
      })
      .select('_id orderId')
      .lean();

    if (vendorOrders.length === 0) {
      return;
    }

    const orderIds = vendorOrders.map(
      (vendorOrder) => vendorOrder.orderId,
    );

    const previousBooking = await this.orderModel
      .exists({
        _id: { $in: orderIds },
        organizerId: new Types.ObjectId(clientId),
        status: {
          $in: ['confirmed', 'completed'],
        },
      });

    if (previousBooking) {
      throw new ForbiddenException(
        'This discount code is only available for new clients of this vendor',
      );
    }
  }
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