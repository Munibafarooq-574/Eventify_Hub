// fyp-backend/src/admin/admin-analytics.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { VendorOrder } from 'src/schemas/vendor-order.schema';
import { Payment } from 'src/schemas/payment.schema';
import { Payout } from 'src/schemas/payout.schema';
import { User } from 'src/schemas/user.schema';

@Injectable()
export class AdminAnalyticsService {
    constructor(
        @InjectModel(VendorOrder.name) private readonly vendorOrderModel: Model<VendorOrder>,
        @InjectModel(Payment.name) private readonly paymentModel: Model<Payment>,
        @InjectModel(Payout.name) private readonly payoutModel: Model<Payout>,
        @InjectModel(User.name) private readonly userModel: Model<User>,
    ) {}

    async getMonthlyRevenue(months = 6) {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

        const payments = await this.paymentModel.aggregate([
            { $match: { status: 'SUCCESS', createdAt: { $gte: start } } },
            {
                $group: {
                    _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
                    totalBookingValue: { $sum: '$amount' },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]);

        const payouts = await this.payoutModel.aggregate([
            { $match: { createdAt: { $gte: start } } },
            {
                $group: {
                    _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
                    commission: { $sum: { $subtract: ['$grossAmount', '$payoutAmount'] } },
                },
            },
        ]);

        const commissionMap = new Map(
            payouts.map((p) => [`${p._id.year}-${p._id.month}`, p.commission]),
        );

        const result = [];
        for (let i = 0; i < months; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - (months - 1) + i, 1);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const key = `${year}-${month}`;

            const bookingStat = payments.find((p) => p._id.year === year && p._id.month === month);

            result.push({
                year,
                month,
                monthlyBookingValue: bookingStat?.totalBookingValue || 0,
                platformCommission: commissionMap.get(key) || 0,
            });
        }

        return result;
    }

    async getPopularServices() {
        const result = await this.vendorOrderModel.aggregate([
            { $match: { status: { $ne: 'cancelled' } } },
            { $group: { _id: '$serviceName', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
        ]);

        return result.map((r) => ({ service: r._id, bookings: r.count }));
    }

    async getVendorPerformance() {
        const grouped = await this.vendorOrderModel.aggregate([
            {
                $group: {
                    _id: '$vendorId',
                    totalBookings: { $sum: 1 },
                    completed: {
                        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
                    },
                    cancelledByVendor: {
                        $sum: { $cond: [{ $eq: ['$status', 'cancelled_by_vendor'] }, 1, 0] },
                    },
                    revenue: { $sum: '$price' },
                },
            },
            { $sort: { revenue: -1 } },
            { $limit: 20 },
        ]);

        const vendorIds = grouped.map((g) => g._id);
        const vendors = await this.userModel
            .find({ _id: { $in: vendorIds } })
            .select('name contactDetails')
            .lean();
        const vendorMap = new Map(vendors.map((v) => [v._id.toString(), v]));

        return grouped.map((g) => {
            const vendor = vendorMap.get(g._id.toString());
            const cancellationRate =
                g.totalBookings > 0 ? Math.round((g.cancelledByVendor / g.totalBookings) * 1000) / 10 : 0;

            return {
                vendorId: g._id,
                vendorName: (vendor as any)?.contactDetails?.brandName || (vendor as any)?.name || 'N/A',
                totalBookings: g.totalBookings,
                completed: g.completed,
                cancellationRate,
                revenue: g.revenue,
            };
        });
    }

    // Business insight: demand vs vendor supply, grouped by city + category
    async getDemandInsights() {
        // Booking demand: group VendorOrder by vendor's city + category
        const vendorOrders = await this.vendorOrderModel
            .find({ status: { $ne: 'cancelled' } })
            .populate('vendorId', 'city buisnessCategory')
            .lean();

        const demandMap = new Map<string, number>();
        const supplyMap = new Map<string, Set<string>>();

        for (const vo of vendorOrders) {
            const vendor = vo.vendorId as any;
            if (!vendor?.city || !vendor?.buisnessCategory) continue;

            const key = `${vendor.city}::${vendor.buisnessCategory}`;
            demandMap.set(key, (demandMap.get(key) || 0) + 1);

            if (!supplyMap.has(key)) supplyMap.set(key, new Set());
            supplyMap.get(key)!.add(vendor._id.toString());
        }

        const insights = [];
        for (const [key, demand] of demandMap.entries()) {
            const [city, categoryId] = key.split('::');
            const supply = supplyMap.get(key)?.size || 0;
            const demandSupplyRatio = supply > 0 ? Math.round((demand / supply) * 10) / 10 : demand;

            insights.push({ city, categoryId, demand, supply, demandSupplyRatio });
        }

        // Highest ratio = highest unmet demand = best onboarding opportunity
        insights.sort((a, b) => b.demandSupplyRatio - a.demandSupplyRatio);

        return insights.slice(0, 20);
    }
}