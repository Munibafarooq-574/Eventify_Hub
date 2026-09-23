// fyp-backend/src/admin/admin-analytics.service.ts

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VendorOrder } from 'src/schemas/vendor-order.schema';
import { Payment } from 'src/schemas/payment.schema';
import { Payout } from 'src/schemas/payout.schema';
import { User } from 'src/schemas/user.schema';
import { Order } from 'src/schemas/order.schema';
import { VendorSubscription } from 'src/schemas/vendor-subscription.schema';

@Injectable()
export class AdminAnalyticsService {
    constructor(
        @InjectModel(VendorOrder.name)
        private readonly vendorOrderModel: Model<VendorOrder>,

        @InjectModel(Payment.name)
        private readonly paymentModel: Model<Payment>,

        @InjectModel(Payout.name)
        private readonly payoutModel: Model<Payout>,

        @InjectModel(User.name)
        private readonly userModel: Model<User>,

        @InjectModel(Order.name)
        private readonly orderModel: Model<Order>,

        @InjectModel(VendorSubscription.name)
        private readonly subscriptionModel: Model<VendorSubscription>,
    ) {}

    async getMonthlyRevenue(months = 6) {
        const now = new Date();

        const start = new Date(
            now.getFullYear(),
            now.getMonth() - (months - 1),
            1,
        );

        const payments = await this.paymentModel.aggregate([
            {
                $match: {
                    status: 'SUCCESS',
                    createdAt: {
                        $gte: start,
                    },
                },
            },
            {
                $group: {
                    _id: {
                        year: {
                            $year: '$createdAt',
                        },
                        month: {
                            $month: '$createdAt',
                        },
                    },
                    totalBookingValue: {
                        $sum: '$amount',
                    },
                },
            },
            {
                $sort: {
                    '_id.year': 1,
                    '_id.month': 1,
                },
            },
        ]);

        const payouts = await this.payoutModel.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: start,
                    },
                },
            },
            {
                $group: {
                    _id: {
                        year: {
                            $year: '$createdAt',
                        },
                        month: {
                            $month: '$createdAt',
                        },
                    },
                    commission: {
                        $sum: {
                            $subtract: [
                                '$grossAmount',
                                '$payoutAmount',
                            ],
                        },
                    },
                },
            },
        ]);

        const commissionMap = new Map(
            payouts.map((p) => [
                `${p._id.year}-${p._id.month}`,
                p.commission,
            ]),
        );

        const result = [];

        for (let i = 0; i < months; i++) {
            const date = new Date(
                now.getFullYear(),
                now.getMonth() - (months - 1) + i,
                1,
            );

            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const key = `${year}-${month}`;

            const bookingStat = payments.find(
                (p) =>
                    p._id.year === year &&
                    p._id.month === month,
            );

            result.push({
                year,
                month,

                monthlyBookingValue:
                    bookingStat?.totalBookingValue || 0,

                platformCommission:
                    commissionMap.get(key) || 0,
            });
        }

        return result;
    }

    async getPopularServices() {
        const result = await this.vendorOrderModel.aggregate([
            {
                $match: {
                    status: {
                        $ne: 'cancelled',
                    },
                },
            },
            {
                $group: {
                    _id: '$serviceName',
                    count: {
                        $sum: 1,
                    },
                },
            },
            {
                $sort: {
                    count: -1,
                },
            },
            {
                $limit: 10,
            },
        ]);

        return result.map((r) => ({
            service: r._id,
            bookings: r.count,
        }));
    }

    async getVendorPerformance() {
        const grouped = await this.vendorOrderModel.aggregate([
            {
                $group: {
                    _id: '$vendorId',

                    totalBookings: {
                        $sum: 1,
                    },

                    completed: {
                        $sum: {
                            $cond: [
                                {
                                    $eq: [
                                        '$status',
                                        'completed',
                                    ],
                                },
                                1,
                                0,
                            ],
                        },
                    },

                    cancelledByVendor: {
                        $sum: {
                            $cond: [
                                {
                                    $eq: [
                                        '$status',
                                        'cancelled_by_vendor',
                                    ],
                                },
                                1,
                                0,
                            ],
                        },
                    },

                    revenue: {
                        $sum: '$price',
                    },
                },
            },

            {
                $sort: {
                    revenue: -1,
                },
            },

            {
                $limit: 20,
            },
        ]);

        const vendorIds = grouped
            .map((group) => group._id)
            .filter(Boolean);

        const vendors = await this.userModel
            .find({
                _id: {
                    $in: vendorIds,
                },
            })
            .select(
                [
                    'name',
                    'email',
                    'phone_number',
                    'city',
                    'role',
                    'contactDetails',
                    'buisnessCategory',
                    'categoryId',
                ].join(' '),
            )
            .lean();

        const vendorMap = new Map(
            vendors.map((vendor: any) => [
                vendor._id.toString(),
                vendor,
            ]),
        );

        return grouped.map((group) => {
            const vendorId =
                group._id?.toString?.() || '';

            const vendor = vendorMap.get(
                vendorId,
            ) as any;

            const cancellationRate =
                group.totalBookings > 0
                    ? Math.round(
                          (group.cancelledByVendor /
                              group.totalBookings) *
                              1000,
                      ) / 10
                    : 0;

            return {
                vendorId: group._id,

                vendorName:
                    vendor?.name?.trim?.() ||
                    'N/A',

                brandName:
                    vendor?.contactDetails?.brandName?.trim?.() ||
                    'N/A',

                email:
                    vendor?.email ||
                    'N/A',

                phoneNumber:
                    vendor?.phone_number ||
                    'N/A',

                city:
                vendor?.contactDetails?.city?.trim?.() ||
                vendor?.city?.trim?.() ||
                'N/A',

                businessCategoryId:
                    vendor?.categoryId ||
                    vendor?.buisnessCategory ||
                    null,

                totalBookings:
                    group.totalBookings || 0,

                completed:
                    group.completed || 0,

                cancellationRate,

                revenue:
                    Number(group.revenue || 0),
            };
        });
    }

    // Business insight:
    // demand vs vendor supply, grouped by city + category
    async getDemandInsights() {
        const vendorOrders =
            await this.vendorOrderModel
                .find({
                    status: {
                        $ne: 'cancelled',
                    },
                })
                .populate(
                    'vendorId',
                    'city buisnessCategory',
                )
                .lean();

        const demandMap =
            new Map<string, number>();

        const supplyMap =
            new Map<string, Set<string>>();

        for (const vo of vendorOrders) {
            const vendor = vo.vendorId as any;

            if (
                !vendor?.city ||
                !vendor?.buisnessCategory
            ) {
                continue;
            }

            const key =
                `${vendor.city}::${vendor.buisnessCategory}`;

            demandMap.set(
                key,
                (demandMap.get(key) || 0) + 1,
            );

            if (!supplyMap.has(key)) {
                supplyMap.set(
                    key,
                    new Set(),
                );
            }

            supplyMap
                .get(key)!
                .add(
                    vendor._id.toString(),
                );
        }

        const insights = [];

        for (
            const [key, demand]
            of demandMap.entries()
        ) {
            const [
                city,
                categoryId,
            ] = key.split('::');

            const supply =
                supplyMap.get(key)?.size || 0;

            const demandSupplyRatio =
                supply > 0
                    ? Math.round(
                          (demand / supply) *
                              10,
                      ) / 10
                    : demand;

            insights.push({
                city,
                categoryId,
                demand,
                supply,
                demandSupplyRatio,
            });
        }

        insights.sort(
            (a, b) =>
                b.demandSupplyRatio -
                a.demandSupplyRatio,
        );

        return insights.slice(0, 20);
    }

    // =========================================================
    // PHASE 6 - STEP 3: PLATFORM ANALYTICS
    // Revenue remains in existing Finance/Revenue analytics.
    // =========================================================
    async getPlatformAnalytics(months = 6) {
        const safeMonths =
            Number.isInteger(months) &&
            months >= 1 &&
            months <= 24
                ? months
                : 6;

        const now = new Date();

        const trendStart = new Date(
            now.getFullYear(),
            now.getMonth() - (safeMonths - 1),
            1,
        );

        const [
            totalClients,
            totalVendors,
            totalBookings,
            completedBookings,
            cancelledBookings,
            currentSubscriptions,
            bookingTrendRaw,
            subscriptionTrendRaw,
            categoryPerformance,
        ] = await Promise.all([
            this.userModel.countDocuments({
                role: {
                    $in: [
                        /^Organizer$/i,
                        /^Client$/i,
                    ],
                },
            }),

            this.userModel.countDocuments({
                role: /^Vendor$/i,
            }),

            this.orderModel.countDocuments(),

            this.orderModel.countDocuments({
                status: 'completed',
            }),

            this.orderModel.countDocuments({
                status: 'cancelled',
            }),

            this.subscriptionModel
                .find({
                    isCurrent: true,
                })
                .select(
                    'plan status startDate endDate isCurrent createdAt',
                )
                .lean(),

            this.orderModel.aggregate([
                {
                    $match: {
                        createdAt: {
                            $gte: trendStart,
                        },
                    },
                },
                {
                    $group: {
                        _id: {
                            year: {
                                $year: '$createdAt',
                            },
                            month: {
                                $month: '$createdAt',
                            },
                        },

                        total: {
                            $sum: 1,
                        },

                        completed: {
                            $sum: {
                                $cond: [
                                    {
                                        $eq: [
                                            '$status',
                                            'completed',
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },

                        cancelled: {
                            $sum: {
                                $cond: [
                                    {
                                        $eq: [
                                            '$status',
                                            'cancelled',
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                    },
                },
                {
                    $sort: {
                        '_id.year': 1,
                        '_id.month': 1,
                    },
                },
            ]),

            this.subscriptionModel.aggregate([
                {
                    $match: {
                        createdAt: {
                            $gte: trendStart,
                        },

                        plan: {
                            $in: [
                                'basic',
                                'growth',
                                'premium',
                            ],
                        },

                        status: {
                            $in: [
                                'trial',
                                'active',
                                'expired',
                                'cancelled',
                            ],
                        },
                    },
                },
                {
                    $group: {
                        _id: {
                            year: {
                                $year: '$createdAt',
                            },
                            month: {
                                $month: '$createdAt',
                            },
                        },

                        total: {
                            $sum: 1,
                        },

                        basic: {
                            $sum: {
                                $cond: [
                                    {
                                        $eq: [
                                            '$plan',
                                            'basic',
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },

                        growth: {
                            $sum: {
                                $cond: [
                                    {
                                        $eq: [
                                            '$plan',
                                            'growth',
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },

                        premium: {
                            $sum: {
                                $cond: [
                                    {
                                        $eq: [
                                            '$plan',
                                            'premium',
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                    },
                },
                {
                    $sort: {
                        '_id.year': 1,
                        '_id.month': 1,
                    },
                },
            ]),

            this.vendorOrderModel.aggregate([
                {
                    $match: {
                        status: {
                            $nin: [
                                'rejected',
                                'expired',
                            ],
                        },
                    },
                },
                {
                    $group: {
                        _id: '$serviceName',

                        totalBookings: {
                            $sum: 1,
                        },

                        completed: {
                            $sum: {
                                $cond: [
                                    {
                                        $eq: [
                                            '$status',
                                            'completed',
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },

                        cancelled: {
                            $sum: {
                                $cond: [
                                    {
                                        $in: [
                                            '$status',
                                            [
                                                'cancelled',
                                                'cancelled_by_vendor',
                                            ],
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                    },
                },
                {
                    $sort: {
                        totalBookings: -1,
                    },
                },
                {
                    $limit: 20,
                },
            ]),
        ]);

        const planDistribution = {
            basic: 0,
            growth: 0,
            premium: 0,
        };

        const statusDistribution = {
            trial: 0,
            active: 0,
            expired: 0,
            cancelled: 0,
        };

        for (
            const record
            of currentSubscriptions as any[]
        ) {
            const plan =
                String(
                    record.plan || '',
                ).toLowerCase();

            if (
                plan === 'basic' ||
                plan === 'growth' ||
                plan === 'premium'
            ) {
                planDistribution[plan] += 1;
            }

            const endDate =
                record.endDate
                    ? new Date(record.endDate)
                    : null;

            const effectiveStatus =
                endDate &&
                endDate.getTime() <=
                    now.getTime()
                    ? 'expired'
                    : String(
                          record.status || '',
                      ).toLowerCase();

            if (
                effectiveStatus === 'trial' ||
                effectiveStatus === 'active' ||
                effectiveStatus === 'expired' ||
                effectiveStatus === 'cancelled'
            ) {
                statusDistribution[
                    effectiveStatus
                ] += 1;
            }
        }

        const bookingTrend = [];
        const subscriptionTrend = [];

        for (
            let index = 0;
            index < safeMonths;
            index++
        ) {
            const date = new Date(
                now.getFullYear(),
                now.getMonth() -
                    (safeMonths - 1) +
                    index,
                1,
            );

            const year =
                date.getFullYear();

            const month =
                date.getMonth() + 1;

            const bookingRecord =
                bookingTrendRaw.find(
                    (item: any) =>
                        item._id.year === year &&
                        item._id.month === month,
                );

            const subscriptionRecord =
                subscriptionTrendRaw.find(
                    (item: any) =>
                        item._id.year === year &&
                        item._id.month === month,
                );

            bookingTrend.push({
                year,
                month,
                total:
                    bookingRecord?.total || 0,
                completed:
                    bookingRecord?.completed || 0,
                cancelled:
                    bookingRecord?.cancelled || 0,
            });

            subscriptionTrend.push({
                year,
                month,
                total:
                    subscriptionRecord?.total || 0,
                basic:
                    subscriptionRecord?.basic || 0,
                growth:
                    subscriptionRecord?.growth || 0,
                premium:
                    subscriptionRecord?.premium || 0,
            });
        }

        return {
            users: {
                totalClients,
                totalVendors,
            },

            bookings: {
                total: totalBookings,
                completed: completedBookings,
                cancelled: cancelledBookings,
            },

            subscriptions: {
                totalCurrent:
                    currentSubscriptions.length,

                planDistribution,
                statusDistribution,
            },

            categoryPerformance:
                categoryPerformance.map(
                    (item: any) => ({
                        category:
                            item._id || 'Unknown',

                        totalBookings:
                            item.totalBookings || 0,

                        completed:
                            item.completed || 0,

                        cancelled:
                            item.cancelled || 0,
                    }),
                ),

            trends: {
                months: safeMonths,
                bookings: bookingTrend,
                subscriptions:
                    subscriptionTrend,
            },
        };
    }
}
