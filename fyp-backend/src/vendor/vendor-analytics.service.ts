// fyp-backend/src/vendor/vendor-analytics.service.ts
//
// NEW FILE. Add this to VendorModule's `providers` array and export it if
// needed elsewhere. It reuses the existing Order / VendorOrder / Review /
// Message / Conversation schemas — no new collections, no duplicated
// business logic, no fake data.
//
// Wiring required in vendor.module.ts:
//   imports: [
//     MongooseModule.forFeature([
//       { name: User.name, schema: UserSchema },
//       { name: Order.name, schema: OrderSchema },
//       { name: VendorOrder.name, schema: VendorOrderSchema },
//       { name: Review.name, schema: ReviewSchema },
//       { name: Message.name, schema: MessageSchema },
//       { name: Conversation.name, schema: ConversationSchema },
//       { name: Category.name, schema: CategorySchema },
//     ]),
//   ],
//   providers: [VendorService, VendorAnalyticsService, FileUploadService],
//   controllers: [VendorController],

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order } from 'src/schemas/order.schema';
import { VendorOrder } from 'src/schemas/vendor-order.schema';
import { Review } from 'src/schemas/review.schema';
import { Message } from 'src/schemas/message.schema';
import { Conversation } from 'src/schemas/conversation.schema';
import { User } from 'src/schemas/user.schema';

export interface VendorAnalytics {
    // Order overview (cancelled only — totalOrders/processing/completed
    // already come from the existing GET /orders/stats endpoint, reused
    // as-is on the frontend).
    cancelledOrders: number;
    cancellationRate: number | null; // % of all orders, null if no orders yet

    // Revenue
    totalRevenue: number;
    monthlyRevenue: number;
    previousMonthRevenue: number;
    monthlyRevenueChangePct: number | null; // null if previous month had 0 revenue

    // Rating
    averageRating: number | null; // null = "No reviews yet"
    totalReviews: number;

    // Response time (minutes). null = "Not enough data"
    responseTimeMinutes: number | null;

    // Popular package
    popularPackage: {
        name: string;
        bookingCount: number;
    } | null;

    // Repeat customers
    repeatCustomers: number;
    newCustomers: number;
    repeatCustomerRate: number | null; // null if no completed orders yet

    // Small 6-month sparkline for the Monthly Revenue card (reuses the
    // same window as the existing Sales Statistics chart).
    monthlyRevenueTrend: { month: number; year: number; revenue: number }[];
}

@Injectable()
export class VendorAnalyticsService {
    constructor(
        @InjectModel(Order.name) private readonly orderModel: Model<Order>,
        @InjectModel(VendorOrder.name) private readonly vendorOrderModel: Model<VendorOrder>,
        @InjectModel(Review.name) private readonly reviewModel: Model<Review>,
        @InjectModel(Message.name) private readonly messageModel: Model<Message>,
        @InjectModel(Conversation.name) private readonly conversationModel: Model<Conversation>,
        @InjectModel(User.name) private readonly userModel: Model<User>,
    ) { }

    async getVendorAnalytics(vendorId: string): Promise<VendorAnalytics> {
        const vendorObjId = new Types.ObjectId(vendorId);

        const [
            orderAndRevenue,
            ratingSummary,
            responseTimeMinutes,
            popularPackage,
            customerInsights,
        ] = await Promise.all([
            this.computeOrdersAndRevenue(vendorObjId),
            this.computeAverageRating(vendorObjId),
            this.computeResponseTime(vendorId),
            this.computePopularPackage(vendorObjId),
            this.computeCustomerInsights(vendorObjId),
        ]);

        return {
            ...orderAndRevenue,
            ...ratingSummary,
            responseTimeMinutes,
            popularPackage,
            ...customerInsights,
        };
    }

    // ---------------------------------------------------------------
    // Orders / Revenue
    //
    // Revenue is computed from VendorOrder.price (this vendor's own line
    // item), not Order.finalAmount, because a single Order can bundle
    // several vendors' services — Order.finalAmount is the whole booking's
    // total, not this vendor's share.
    // ---------------------------------------------------------------
    private async computeOrdersAndRevenue(vendorObjId: Types.ObjectId) {
        const now = new Date();
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

        const allVendorOrders = await this.vendorOrderModel
            .find({ vendorId: vendorObjId })
            .select('status price createdAt')
            .lean();

        const totalCount = allVendorOrders.length;
        const cancelledOrders = allVendorOrders.filter((vo) => vo.status === 'cancelled').length;
        const completed = allVendorOrders.filter((vo) => vo.status === 'completed');

        const totalRevenue = completed.reduce((sum, vo) => sum + (vo.price || 0), 0);

        const inRange = (date: Date, start: Date, end: Date) => date >= start && date < end;

        const monthlyRevenue = completed
            .filter((vo: any) => inRange(new Date(vo.createdAt), startOfThisMonth, now))
            .reduce((sum, vo) => sum + (vo.price || 0), 0);

        const previousMonthRevenue = completed
            .filter((vo: any) => inRange(new Date(vo.createdAt), startOfLastMonth, startOfThisMonth))
            .reduce((sum, vo) => sum + (vo.price || 0), 0);

        const monthlyRevenueChangePct =
            previousMonthRevenue > 0
                ? ((monthlyRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
                : null;

        // 6-month trend for the sparkline
        const trendMap = new Map<string, number>();
        completed
            .filter((vo: any) => new Date(vo.createdAt) >= sixMonthsAgo)
            .forEach((vo: any) => {
                const d = new Date(vo.createdAt);
                const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
                trendMap.set(key, (trendMap.get(key) || 0) + (vo.price || 0));
            });

        const monthlyRevenueTrend: { month: number; year: number; revenue: number }[] = [];
        for (let i = 0; i < 6; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
            const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
            monthlyRevenueTrend.push({
                year: d.getFullYear(),
                month: d.getMonth() + 1,
                revenue: trendMap.get(key) || 0,
            });
        }

        return {
            cancelledOrders,
            cancellationRate: totalCount > 0 ? (cancelledOrders / totalCount) * 100 : null,
            totalRevenue,
            monthlyRevenue,
            previousMonthRevenue,
            monthlyRevenueChangePct,
            monthlyRevenueTrend,
        };
    }

    // ---------------------------------------------------------------
    // Average rating — reuses the Review collection already used by
    // ReviewsService, just aggregated for one vendor.
    // ---------------------------------------------------------------
    private async computeAverageRating(vendorObjId: Types.ObjectId) {
        const result = await this.reviewModel.aggregate([
            { $match: { vendorId: vendorObjId, rating: { $ne: null } } },
            {
                $group: {
                    _id: '$vendorId',
                    averageRating: { $avg: '$rating' },
                    totalReviews: { $sum: 1 },
                },
            },
        ]);

        if (!result.length) {
            return { averageRating: null, totalReviews: 0 };
        }

        return {
            averageRating: Math.round(result[0].averageRating * 10) / 10,
            totalReviews: result[0].totalReviews,
        };
    }

    // ---------------------------------------------------------------
    // Response time — average minutes between a customer's message and
    // the vendor's next reply in the same conversation, over the last
    // 200 vendor replies (recent-weighted, avoids scanning full history).
    // ---------------------------------------------------------------
    private async computeResponseTime(vendorId: string): Promise<number | null> {
        const conversations = await this.conversationModel
            .find({ participants: vendorId })
            .select('chatId')
            .lean();

        if (!conversations.length) return null;

        const chatIds = conversations.map((c) => c.chatId);

        const messages = await this.messageModel
            .find({ chatId: { $in: chatIds }, isDeletedForEveryone: { $ne: true } })
            .sort({ timestamp: 1 })
            .select('chatId senderId timestamp')
            .limit(5000)
            .lean();

        const byChat = new Map<string, typeof messages>();
        messages.forEach((m: any) => {
            const arr = byChat.get(m.chatId) || [];
            arr.push(m);
            byChat.set(m.chatId, arr);
        });

        const diffsMs: number[] = [];

        byChat.forEach((chatMessages) => {
            let lastCustomerMsgAt: Date | null = null;
            for (const msg of chatMessages as any[]) {
                const isFromVendor = msg.senderId?.toString() === vendorId.toString();
                if (!isFromVendor) {
                    lastCustomerMsgAt = new Date(msg.timestamp);
                } else if (lastCustomerMsgAt) {
                    const diff = new Date(msg.timestamp).getTime() - lastCustomerMsgAt.getTime();
                    // ignore unrealistic gaps (>72h) — likely a stale/abandoned thread
                    if (diff > 0 && diff < 72 * 60 * 60 * 1000) {
                        diffsMs.push(diff);
                    }
                    lastCustomerMsgAt = null;
                }
            }
        });

        if (diffsMs.length < 3) return null; // not enough data for a meaningful average

        const avgMs = diffsMs.reduce((a, b) => a + b, 0) / diffsMs.length;
        return Math.round(avgMs / 60000); // minutes
    }

    // ---------------------------------------------------------------
    // Popular package — the vendor's own service (VendorOrder.serviceName)
    // with the most completed bookings.
    // ---------------------------------------------------------------
    private async computePopularPackage(vendorObjId: Types.ObjectId) {
        const result = await this.vendorOrderModel.aggregate([
            { $match: { vendorId: vendorObjId, status: 'completed' } },
            { $group: { _id: '$serviceName', bookingCount: { $sum: 1 } } },
            { $sort: { bookingCount: -1 } },
            { $limit: 1 },
        ]);

        if (!result.length) return null;

        return { name: result[0]._id, bookingCount: result[0].bookingCount };
    }

    // ---------------------------------------------------------------
    // Repeat customers — organizers with more than one completed order
    // that includes this vendor.
    // ---------------------------------------------------------------
    private async computeCustomerInsights(vendorObjId: Types.ObjectId) {
        const completedVendorOrders = await this.vendorOrderModel
            .find({ vendorId: vendorObjId, status: 'completed' })
            .select('orderId')
            .lean();

        if (!completedVendorOrders.length) {
            return { repeatCustomers: 0, newCustomers: 0, repeatCustomerRate: null };
        }

        const orderIds = completedVendorOrders.map((vo) => vo.orderId);

        const orders = await this.orderModel
            .find({ _id: { $in: orderIds } })
            .select('organizerId')
            .lean();

        const countByOrganizer = new Map<string, number>();
        orders.forEach((o: any) => {
            const key = o.organizerId.toString();
            countByOrganizer.set(key, (countByOrganizer.get(key) || 0) + 1);
        });

        let repeatCustomers = 0;
        let newCustomers = 0;
        countByOrganizer.forEach((count) => {
            if (count > 1) repeatCustomers += 1;
            else newCustomers += 1;
        });

        const totalCustomers = repeatCustomers + newCustomers;

        return {
            repeatCustomers,
            newCustomers,
            repeatCustomerRate: totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : null,
        };
    }
}