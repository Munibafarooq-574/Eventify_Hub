// fyp-backend/src/vendor/growth/analytics/analytics.service.ts
//
// Everything here is computed from real collections — VendorOrder, Order,
// User.packages, VendorDiscount, VendorPromotion, VendorViewEvent. Nothing
// is invented. Where the underlying data doesn't exist yet (views, mainly
// — see vendor-view-event.schema.ts), the response says so explicitly
// instead of showing a fake number, per spec section 29 ("if required
// data does not exist, clearly state that instead of inventing it").

import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { VendorOrder } from 'src/schemas/vendor-order.schema';
import { User } from 'src/schemas/user.schema';
import { VendorAnalyticsService } from 'src/vendor/vendor-analytics.service';

import { VendorDiscount } from '../../../schemas/vendor-discount.schema';
import { DiscountEntryType } from '../discount/discount.types';
import { VendorPromotion } from '../../../schemas/vendor-promotion.schema';
import { PromotionType } from '../promotion/promotion.types';
import { VendorViewEvent } from '../../../schemas/vendor-view-event.schema';
import { FeatureAccessService } from '../feature-access.service';
import { FeatureKey } from '../subscription/subscription.types';

import {
  BusinessInsight,
  GrowthAnalytics,
  MonthlyPoint,
  PackageSummary,
  PremiumAnalytics,
  PromotionPerformanceEntry,
  TrackedMetric,
} from './analytics.types';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(VendorOrder.name) private readonly vendorOrderModel: Model<VendorOrder>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(VendorDiscount.name) private readonly discountModel: Model<VendorDiscount>,
    @InjectModel(VendorPromotion.name) private readonly promotionModel: Model<VendorPromotion>,
    @InjectModel(VendorViewEvent.name) private readonly viewEventModel: Model<VendorViewEvent>,
    private readonly vendorAnalyticsService: VendorAnalyticsService,
    private readonly featureAccessService: FeatureAccessService,
  ) {}

  // ---------------------------------------------------------------
  // View tracking — call this from wherever a customer opens a vendor
  // profile or package (not wired into any screen yet, see README).
  // ---------------------------------------------------------------

  async trackView(vendorId: string, packageId?: string): Promise<void> {
    await this.viewEventModel.create({
      vendorId: new Types.ObjectId(vendorId),
      packageId: packageId ?? null,
    });
  }

  // ---------------------------------------------------------------
  // Growth Analytics
  // ---------------------------------------------------------------

  async getGrowthAnalytics(vendorId: string): Promise<GrowthAnalytics> {
    const allowed = await this.featureAccessService.canUseFeature(vendorId, FeatureKey.GROWTH_ANALYTICS);
    if (!allowed) {
      throw new ForbiddenException('Growth Analytics requires the Growth or Premium plan.');
    }
    return this.computeGrowthAnalytics(vendorId);
  }

  // ---------------------------------------------------------------
  // Premium Analytics
  // ---------------------------------------------------------------

  async getPremiumAnalytics(vendorId: string): Promise<PremiumAnalytics> {
    const allowed = await this.featureAccessService.canUseFeature(vendorId, FeatureKey.ADVANCED_ANALYTICS);
    if (!allowed) {
      throw new ForbiddenException('Advanced Analytics requires the Premium plan.');
    }

    const [growth, revenueTrend, bookingTrend, packagePerformance, promotionPerformance] = await Promise.all([
      this.computeGrowthAnalytics(vendorId),
      this.computeRevenueTrend(vendorId),
      this.computeBookingTrend(vendorId),
      this.computePackagePerformance(vendorId),
      this.computePromotionPerformance(vendorId),
    ]);

    return {
      ...growth,
      revenueTrend,
      bookingTrend,
      packagePerformance,
      topPerformingPackages: [...packagePerformance].sort((a, b) => b.revenue - a.revenue).slice(0, 3),
      promotionPerformance,
      topPerformingPromotions: [...promotionPerformance].sort((a, b) => b.usedCount - a.usedCount).slice(0, 3),
    };
  }

  // ---------------------------------------------------------------
  // Business Insights — Premium only. Every insight is conditional on
  // having enough real data to say something meaningful; nothing is
  // shown just to fill space (per spec section 16).
  // ---------------------------------------------------------------

  async getBusinessInsights(vendorId: string): Promise<BusinessInsight[]> {
    const allowed = await this.featureAccessService.canUseFeature(vendorId, FeatureKey.BUSINESS_INSIGHTS);
    if (!allowed) {
      throw new ForbiddenException('Business Insights requires the Premium plan.');
    }

    const insights: BusinessInsight[] = [];
    const vendorObjId = new Types.ObjectId(vendorId);

    const [analytics, popularDay, topPromotion] = await Promise.all([
      this.vendorAnalyticsService.getVendorAnalytics(vendorId),
      this.computeStrongestBookingDay(vendorObjId),
      this.computeTopPromotion(vendorId),
    ]);

    if (analytics.monthlyRevenueChangePct !== null && Math.abs(analytics.monthlyRevenueChangePct) >= 5) {
      const direction = analytics.monthlyRevenueChangePct >= 0 ? 'grew' : 'dropped';
      insights.push({
        id: 'revenue-trend',
        text: `Your revenue ${direction} ${Math.abs(Math.round(analytics.monthlyRevenueChangePct))}% this month compared to last month.`,
      });
    }

    if (popularDay) {
      insights.push({
        id: 'strongest-day',
        text: `${popularDay.dayName} bookings are your strongest, based on your booking history.`,
      });
    }

    if (analytics.popularPackage && analytics.popularPackage.bookingCount >= 3) {
      insights.push({
        id: 'popular-package',
        text: `"${analytics.popularPackage.name}" is your most booked package, with ${analytics.popularPackage.bookingCount} completed bookings.`,
      });
    }

    if (analytics.repeatCustomerRate !== null && analytics.repeatCustomerRate >= 20) {
      insights.push({
        id: 'repeat-customers',
        text: `${Math.round(analytics.repeatCustomerRate)}% of your customers come back for repeat bookings.`,
      });
    }

    if (topPromotion && topPromotion.usedCount >= 3) {
      const noun = topPromotion.type === 'coupon' ? 'coupon' : 'discount code';
      insights.push({
        id: 'top-promotion',
        text: `Your ${noun} "${topPromotion.code}" has been used ${topPromotion.usedCount} times.`,
      });
    }

    return insights;
  }

  // ---------------------------------------------------------------
  // Internal computation
  // ---------------------------------------------------------------

  private async computeGrowthAnalytics(vendorId: string): Promise<GrowthAnalytics> {
    const vendorObjId = new Types.ObjectId(vendorId);

    const [baseAnalytics, orderCounts, packages, promoStats] = await Promise.all([
      this.vendorAnalyticsService.getVendorAnalytics(vendorId),
      this.computeOrderCounts(vendorObjId),
      this.computeGrowthPackageStats(vendorObjId),
      this.computePromotionStats(vendorId),
    ]);

    const averageOrderValue =
      orderCounts.completed > 0 ? Math.round(baseAnalytics.totalRevenue / orderCounts.completed) : null;

    const bookingConversionRate =
      orderCounts.total > 0 ? Math.round((orderCounts.completed / orderCounts.total) * 1000) / 10 : null;

    return {
      sales: {
        totalRevenue: baseAnalytics.totalRevenue,
        monthlyRevenue: baseAnalytics.monthlyRevenue,
        monthlyRevenueChangePct: baseAnalytics.monthlyRevenueChangePct,
        averageOrderValue,
      },
      customers: {
        newCustomers: baseAnalytics.newCustomers,
        repeatCustomers: baseAnalytics.repeatCustomers,
        repeatCustomerRate: baseAnalytics.repeatCustomerRate,
        bookingConversionRate,
      },
      packages: {
        mostBookedPackage: baseAnalytics.popularPackage,
        highestRevenuePackage: packages.highestRevenuePackage,
        mostViewedPackage: packages.mostViewedPackage,
      },
      promotions: promoStats,
    };
  }

  private async computeOrderCounts(vendorObjId: Types.ObjectId) {
    const [total, completed] = await Promise.all([
      this.vendorOrderModel.countDocuments({ vendorId: vendorObjId }),
      this.vendorOrderModel.countDocuments({ vendorId: vendorObjId, status: 'completed' }),
    ]);
    return { total, completed };
  }

  private async computeGrowthPackageStats(vendorObjId: Types.ObjectId) {
    const revenueByService = await this.vendorOrderModel.aggregate([
      { $match: { vendorId: vendorObjId, status: 'completed' } },
      { $group: { _id: '$serviceName', revenue: { $sum: '$price' } } },
      { $sort: { revenue: -1 } },
      { $limit: 1 },
    ]);

    const highestRevenuePackage = revenueByService.length
      ? { name: revenueByService[0]._id, revenue: revenueByService[0].revenue }
      : null;

    const mostViewedPackage = await this.computeMostViewedPackage(vendorObjId);

    return { highestRevenuePackage, mostViewedPackage };
  }

  private async computeMostViewedPackage(vendorObjId: Types.ObjectId) {
    const hasAnyViews = await this.viewEventModel.exists({ vendorId: vendorObjId, packageId: { $ne: null } });
    if (!hasAnyViews) {
      return { tracked: false, value: 0, packageName: null };
    }

    const topViewed = await this.viewEventModel.aggregate([
      { $match: { vendorId: vendorObjId, packageId: { $ne: null } } },
      { $group: { _id: '$packageId', views: { $sum: 1 } } },
      { $sort: { views: -1 } },
      { $limit: 1 },
    ]);

    if (!topViewed.length) {
      return { tracked: true, value: 0, packageName: null };
    }

    const vendor = await this.userModel.findById(vendorObjId).select('packages').lean();
    const pkg = (vendor?.packages || []).find((p: any) => p._id.toString() === topViewed[0]._id);

    return { tracked: true, value: topViewed[0].views, packageName: pkg?.packageName ?? null };
  }

  private async computePromotionStats(vendorId: string) {
    const vendorObjId = new Types.ObjectId(vendorId);

    const [couponAgg, discountCodeAgg, featuredViews] = await Promise.all([
      this.discountModel.aggregate([
        { $match: { vendorId: vendorObjId, type: DiscountEntryType.COUPON } },
        { $group: { _id: null, total: { $sum: '$usedCount' } } },
      ]),
      this.discountModel.aggregate([
        { $match: { vendorId: vendorObjId, type: DiscountEntryType.DISCOUNT_CODE } },
        { $group: { _id: null, total: { $sum: '$usedCount' } } },
      ]),
      this.computeFeaturedVendorViews(vendorId),
    ]);

    return {
      featuredVendorViews: featuredViews,
      couponRedemptions: couponAgg[0]?.total ?? 0,
      discountCodeRedemptions: discountCodeAgg[0]?.total ?? 0,
    };
  }

  /**
   * Sum of profile views recorded during any of this vendor's Featured
   * Vendor campaign windows (active or past — a completed campaign's
   * performance still matters for deciding whether to run another one).
   */
  private async computeFeaturedVendorViews(vendorId: string): Promise<TrackedMetric> {
    const vendorObjId = new Types.ObjectId(vendorId);

    const hasAnyViews = await this.viewEventModel.exists({ vendorId: vendorObjId, packageId: null });
    if (!hasAnyViews) {
      return { tracked: false, value: 0 };
    }

    const campaigns = await this.promotionModel
      .find({ vendorId: vendorObjId, type: PromotionType.FEATURED_VENDOR })
      .select('startDate endDate')
      .lean();

    if (!campaigns.length) {
      return { tracked: true, value: 0 };
    }

    const orConditions = campaigns.map((c) => ({
      viewedAt: { $gte: c.startDate, $lte: c.endDate },
    }));

    const count = await this.viewEventModel.countDocuments({
      vendorId: vendorObjId,
      packageId: null,
      $or: orConditions,
    });

    return { tracked: true, value: count };
  }

  private async computeRevenueTrend(vendorId: string): Promise<MonthlyPoint[]> {
    const analytics = await this.vendorAnalyticsService.getVendorAnalytics(vendorId);
    return analytics.monthlyRevenueTrend.map((p) => ({ year: p.year, month: p.month, value: p.revenue }));
  }

  private async computeBookingTrend(vendorId: string): Promise<MonthlyPoint[]> {
    const vendorObjId = new Types.ObjectId(vendorId);
    const now = new Date();

    const orders = await this.vendorOrderModel
      .find({ vendorId: vendorObjId, status: 'completed' })
      .select('createdAt')
      .lean();

    const bucket = new Map<string, number>();
    orders.forEach((o: any) => {
      const d = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      bucket.set(key, (bucket.get(key) || 0) + 1);
    });

    const trend: MonthlyPoint[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      trend.push({ year: d.getFullYear(), month: d.getMonth() + 1, value: bucket.get(key) || 0 });
    }
    return trend;
  }

  private async computePackagePerformance(vendorId: string): Promise<PackageSummary[]> {
    const vendorObjId = new Types.ObjectId(vendorId);

    const vendor = await this.userModel.findById(vendorObjId).select('packages').lean();
    const packages = vendor?.packages || [];
    if (!packages.length) return [];

    const [bookingsByService, viewsByPackage] = await Promise.all([
      this.vendorOrderModel.aggregate([
        { $match: { vendorId: vendorObjId, status: 'completed' } },
        { $group: { _id: '$serviceName', bookingCount: { $sum: 1 }, revenue: { $sum: '$price' } } },
      ]),
      this.viewEventModel.aggregate([
        { $match: { vendorId: vendorObjId, packageId: { $ne: null } } },
        { $group: { _id: '$packageId', views: { $sum: 1 } } },
      ]),
    ]);

    const bookingByName = new Map(bookingsByService.map((b: any) => [b._id, b]));
    const viewsById = new Map(viewsByPackage.map((v: any) => [v._id, v.views]));
    const anyViewsTracked = viewsByPackage.length > 0;

    return packages.map((pkg: any) => {
      const stats = bookingByName.get(pkg.packageName);
      return {
        packageId: pkg._id.toString(),
        packageName: pkg.packageName,
        bookingCount: stats?.bookingCount ?? 0,
        revenue: stats?.revenue ?? 0,
        views: { tracked: anyViewsTracked, value: viewsById.get(pkg._id.toString()) ?? 0 },
      };
    });
  }

  private async computePromotionPerformance(vendorId: string): Promise<PromotionPerformanceEntry[]> {
    const entries = await this.discountModel
      .find({ vendorId: new Types.ObjectId(vendorId) })
      .select('code type usedCount usageLimit')
      .lean();

    return entries.map((e: any) => ({
      code: e.code,
      type: e.type,
      usedCount: e.usedCount,
      usageLimit: e.usageLimit,
    }));
  }

  private async computeStrongestBookingDay(
    vendorObjId: Types.ObjectId,
  ): Promise<{ dayName: string } | null> {
    const orders = await this.vendorOrderModel
      .find({ vendorId: vendorObjId, status: 'completed' })
      .select('createdAt')
      .lean();

    if (orders.length < 5) return null; // not enough data for a meaningful pattern

    const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const counts = new Array(7).fill(0);
    orders.forEach((o: any) => {
      counts[new Date(o.createdAt).getDay()] += 1;
    });

    const maxCount = Math.max(...counts);
    if (maxCount < 2) return null; // too thin to call it a "pattern"

    const dayIndex = counts.indexOf(maxCount);
    return { dayName: DAY_NAMES[dayIndex] };
  }

  private async computeTopPromotion(
    vendorId: string,
  ): Promise<{ code: string; type: 'coupon' | 'discountCode'; usedCount: number } | null> {
    const top = await this.discountModel
      .findOne({ vendorId: new Types.ObjectId(vendorId), usedCount: { $gt: 0 } })
      .sort({ usedCount: -1 })
      .select('code type usedCount')
      .lean();

    if (!top) return null;
    return { code: (top as any).code, type: (top as any).type, usedCount: (top as any).usedCount };
  }
}