//fyp-backend/src/order/order.service.ts
import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import axios from 'axios';
import { Connection, Model, Types } from 'mongoose';
import { Order } from 'src/schemas/order.schema';
import { VendorOrder } from 'src/schemas/vendor-order.schema';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { User } from 'src/schemas/user.schema';
import { Notification } from 'src/schemas/notification.schema';
import { VendorAvailabilityService } from 'src/vendor-availability/vendor-availability.service';

// Phase 5 scaffold: how long a vendor's acceptance holds the slot before
// payment is required. Configurable via env, not hardcoded.
const DEFAULT_HOLD_HOURS = Number(process.env.BOOKING_HOLD_HOURS) || 24;

@Injectable()
export class OrderService {
    constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,

    @InjectModel(Order.name)
    private readonly orderModel: Model<Order>,

    @InjectModel(VendorOrder.name)
    private readonly vendorOrderModel: Model<VendorOrder>,

    @InjectModel(Notification.name)
    private readonly notificationModel: Model<Notification>,

    @InjectConnection()
    private readonly connection: Connection,

    private readonly availabilityService: VendorAvailabilityService,
) { }

            // Create a new order
    async createOrder(
    organizerId: string,
    eventDate: Date,
    eventTime: string,
    services: { vendorId: string; serviceName: string; price: number }[],
    eventName: string,
    guests: number,
    eventType?: string,
    durationMinutes = 60,
): Promise<Order> {
      // Calculate event start/end datetime
const [h, m] = (eventTime || '00:00').split(':').map(Number);

const eventStartDateTime = new Date(eventDate);

eventStartDateTime.setHours(
    h || 0,
    m || 0,
    0,
    0,
);

const eventEndDateTime = new Date(
    eventStartDateTime.getTime() + durationMinutes * 60000,
);

const session = await this.connection.startSession();

try {
    let savedOrder: Order;

    await session.withTransaction(async () => {

        // Check every selected vendor before creating anything
        const results = await this.availabilityService.checkMany(
            services.map((service) => service.vendorId),
            eventStartDateTime,
            eventEndDateTime,
        );

        const unavailable = results.find(
            (result) => !result.available,
        );

        if (unavailable) {
            throw new ConflictException(
                'This vendor is no longer available for the selected time.',
            );
        }

        // Calculate total
        const totalAmount = services.reduce(
            (sum, service) => sum + service.price,
            0,
        );

        // Create main Order
        const [order] = await this.orderModel.create(
            [
                {
                    organizerId: new Types.ObjectId(organizerId),
                    eventDate,
                    eventTime,
                    eventName,
                    eventType,
                    guests,

                    totalAmount,
                    discount: 0,
                    finalAmount: totalAmount,

                    status: 'pending',

                    eventStartDateTime,
                    eventEndDateTime,
                    eventDurationMinutes: durationMinutes,
                },
            ],
            { session },
        );

        // Create VendorOrders
        const vendorOrderIds: Types.ObjectId[] = [];

        for (const service of services) {

            const [vendorOrder] =
                await this.vendorOrderModel.create(
                    [
                        {
                            orderId: order._id,
                            vendorId: new Types.ObjectId(
                                service.vendorId,
                            ),
                            serviceName: service.serviceName,
                            price: service.price,
                            status: 'pending',

                            eventStartDateTime,
                            eventEndDateTime,
                        },
                    ],
                    { session },
                );

            vendorOrderIds.push(vendorOrder._id);
        }

        // Attach VendorOrders to main Order
        order.vendorOrders = vendorOrderIds;

        await order.save({ session });

        savedOrder = order;
    });

    // Notifications AFTER successful transaction
    try {
        for (const service of services) {
            await this.sendPushNotification(
                'Order',
                'A new order has been placed',
                service.vendorId,
                'CREATE_ORDER',
            );

            console.log(
                'Notification sent on create order',
                service.vendorId,
            );
        }
    } catch (error) {
        console.log(error);
    }

    return savedOrder!;

} finally {
    await session.endSession();
}
    }


   async getOrders(
    type: string,
    userId: string,
    status?: string,
    limit = 10,
    skip = 0,
): Promise<any[]> {
    const userIdObj = new Types.ObjectId(userId);

    const query: any = {
        ...(status && { status }),
    };

    if (type === 'Vendor') {
        const vendorOrders = await this.vendorOrderModel.find({
            vendorId: userIdObj,
        });

        const vendorOrderIds = vendorOrders.map(order => order._id);

        query.vendorOrders = { $in: vendorOrderIds };
    } else if (type === 'Organizer') {
        query.organizerId = userIdObj;
    }

    console.log('Final query:', query);

    const orders = await this.orderModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(Number(skip))
        .limit(Number(limit))
        .populate({
            path: 'organizerId',
            select: 'name email phone contactDetails',
        })
        .populate({
            path: 'vendorOrders',
            populate: {
                path: 'vendorId',
                model: 'User',
                select: 'name email phone contactDetails',
            },
        })
        .lean()
        .exec();

        if (type === 'Vendor') {
        // Fetch the vendor's own down payment config once (reused field,
        // no duplicate). Only needed for the vendor's own request list.
        const vendorUser = await this.userModel.findById(userId).lean();
        const downPaymentConfig = this.getDownPaymentConfig(vendorUser);

        return orders.map((order: any) => {
            order.vendorOrders = (order.vendorOrders || [])
                .filter((vo: any) => {
                    const vendorIdOnItem = vo.vendorId?._id ?? vo.vendorId;
                    return vendorIdOnItem?.toString() === userId;
                })
                .map((vo: any) => {
                    if (!downPaymentConfig) {
                        return vo;
                    }

                    const downPaymentAmount =
                        downPaymentConfig.type === 'PERCENTAGE'
                            ? Math.round((vo.price * downPaymentConfig.value) / 100)
                            : downPaymentConfig.value;

                    return {
                        ...vo,
                        downPaymentType: downPaymentConfig.type,
                        downPaymentPercentage:
                            downPaymentConfig.type === 'PERCENTAGE' ? downPaymentConfig.value : null,
                        downPaymentAmount,
                        remainingAmount: vo.price - downPaymentAmount,
                    };
                });

            return order;
        });
    }

    return orders;
}


       async getOrderStats(type: string, userId: string) {
    let userIdObj;
    if (typeof userId === 'string') {
        userIdObj = new Types.ObjectId(userId);
    }

    // Vendor stats now read straight from VendorOrder.status —
    // the same source vendor-analytics.service.ts already uses,
    // so cards + analytics stay consistent.
    // NOTE: VendorOrder schema uses 'accepted' (not 'processing') for the
    // "vendor confirmed, work in progress" state — this must match the
    // mapping used in updateStatus() below.
    if (type === 'Vendor') {
        const vQuery = { vendorId: userIdObj };
        const totalOrders = await this.vendorOrderModel.countDocuments(vQuery);
        const pending = await this.vendorOrderModel.countDocuments({ ...vQuery, status: 'pending' });
        const processing = await this.vendorOrderModel.countDocuments({ ...vQuery, status: 'accepted' });
        const completed = await this.vendorOrderModel.countDocuments({ ...vQuery, status: 'completed' });
        const cancelled = await this.vendorOrderModel.countDocuments({ ...vQuery, status: 'cancelled' });

        return { totalOrders, pending, processing, completed, cancelled };
    }

    // Organizer path — Order schema uses 'confirmed' (not 'processing') for
    // the "vendor confirmed, work in progress" state.
    const query: any = { organizerId: userIdObj };
    const totalOrders = await this.orderModel.countDocuments(query);
    const pending = await this.orderModel.countDocuments({ ...query, status: 'pending' });
    const processing = await this.orderModel.countDocuments({ ...query, status: 'confirmed' });
    const completed = await this.orderModel.countDocuments({ ...query, status: 'completed' });
    const cancelled = await this.orderModel.countDocuments({ ...query, status: 'cancelled' });

    return { totalOrders, pending, processing, completed, cancelled };
}


    // Update the status of an order to "completed"
    async completeOrder(orderId: string): Promise<Order> {
        const order = await this.orderModel.findById(orderId);

        if (!order) {
            throw new NotFoundException(`Order with ID ${orderId} not found`);
        }

        order.status = 'completed';
        return order.save();
    }

       async updateStatus(orderId: string, dto: UpdateOrderStatusDto) {
        const updated = await this.orderModel.findByIdAndUpdate(
            orderId,
            { status: dto.status },
            { new: true },
        );

        if (!updated) {
            throw new NotFoundException('Order not found');
        }

        // Keep VendorOrder.status in sync with Order.status so that
        // dashboard analytics (which reads from VendorOrder) reflects
        // the same state as the Order Summary screen.
        const vendorOrderStatusMap: Record<string, string> = {
            pending: 'pending',
            confirmed: 'accepted',
            completed: 'completed',
            cancelled: 'cancelled',
        };
        const mappedStatus = vendorOrderStatusMap[dto.status];
        if (mappedStatus) {
            await this.vendorOrderModel.updateMany(
                { _id: { $in: updated.vendorOrders } },
                { $set: { status: mappedStatus } },
            );
        }

        try {
            await this.sendPushNotification("Order Update", `Your order has been ${dto.status}`, updated.organizerId.toString(), "ORDER_UPDATE");
        } catch (error) {
            console.log(error);
        }
        return updated;
    }

    async updateVendorOrderStatus(
    vendorOrderId: string,
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled',
) {
    const statusMap: Record<
        'pending' | 'confirmed' | 'completed' | 'cancelled',
        'pending' | 'accepted' | 'completed' | 'cancelled'
    > = {
        pending: 'pending',
        confirmed: 'accepted',
        completed: 'completed',
        cancelled: 'cancelled',
    };

    const mappedStatus = statusMap[status];

    const vendorOrder = await this.vendorOrderModel.findByIdAndUpdate(
        vendorOrderId,
        { status: mappedStatus },
        { new: true },
    );

    if (!vendorOrder) {
        throw new NotFoundException('Vendor order not found');
    }

    // Find the parent Order
    const order = await this.orderModel.findOne({
        vendorOrders: vendorOrder._id,
    });

    if (order) {
        // Get all vendor orders belonging to this parent order
        const siblings = await this.vendorOrderModel.find({
            _id: { $in: order.vendorOrders },
        });

        const allCompleted =
            siblings.length > 0 &&
            siblings.every((vendor) => vendor.status === 'completed');

        const anyActive = siblings.some(
            (vendor) =>
                vendor.status === 'accepted' ||
                vendor.status === 'completed',
        );

        const newOrderStatus = allCompleted
            ? 'completed'
            : anyActive
                ? 'confirmed'
                : order.status;

        // Only update parent Order if its overall status actually changed
        if (newOrderStatus !== order.status) {
            await this.orderModel.findByIdAndUpdate(
                order._id,
                { status: newOrderStatus },
            );
        }
    }

    return vendorOrder;
}

    // Update vendor order status (accepted/rejected)
    async updateVendorResponse(vendorOrderId: string, status: 'accepted' | 'rejected', message?: string) {
        const vendorOrder = await this.vendorOrderModel.findById(vendorOrderId);

        if (!vendorOrder) {
            throw new NotFoundException(`Vendor Order with ID ${vendorOrderId} not found`);
        }

        vendorOrder.status = status;
        if (message) {
            vendorOrder.message = message;
        }

        if (status === 'accepted') {
            const now = new Date();
            vendorOrder.acceptedAt = now;
            vendorOrder.holdExpiresAt = new Date(
                now.getTime() + DEFAULT_HOLD_HOURS * 60 * 60000,
            );
        }

        const saved = await vendorOrder.save();

        // Notify organizer (reuses existing notification pipeline)
        try {
            const order = await this.orderModel.findOne({ vendorOrders: vendorOrder._id });
            if (order) {
                const title = status === 'accepted' ? 'Booking request accepted' : 'Booking request rejected';
                const body = status === 'accepted'
                    ? `Your request for ${vendorOrder.serviceName} was accepted.`
                    : `Your request for ${vendorOrder.serviceName} was rejected.`;
                await this.sendPushNotification(title, body, order.organizerId.toString(), 'VENDOR_RESPONSE');
            }
        } catch (error) {
            console.log(error);
        }

        return saved;
    }

    // ===== NEW (Phase 4): organizer cancels a still-REQUESTED (pending) item =====
    async cancelVendorOrderByOrganizer(vendorOrderId: string, reason?: string) {
        const vendorOrder = await this.vendorOrderModel.findById(vendorOrderId);

        if (!vendorOrder) {
            throw new NotFoundException(`Vendor Order with ID ${vendorOrderId} not found`);
        }

        if (vendorOrder.status !== 'pending') {
            throw new ConflictException(
                'Only a requested (pending) booking can be cancelled by the organizer this way.',
            );
        }

        vendorOrder.status = 'cancelled';
        vendorOrder.cancelledBy = 'organizer';
        vendorOrder.cancelledAt = new Date();
        vendorOrder.cancellationReason = reason || null;

        const saved = await vendorOrder.save();

        try {
            await this.sendPushNotification(
                'Booking request cancelled',
                `The organizer cancelled their request for ${vendorOrder.serviceName}.`,
                vendorOrder.vendorId.toString(),
                'ORGANIZER_CANCELLED_REQUEST',
            );
        } catch (error) {
            console.log(error);
        }

        return saved;
    }

    // ===== NEW (Phase 5 scaffold): expire stale accepted-but-unpaid holds =====
    // Not wired to a cron job yet — call manually / via admin endpoint until
    // Phase 6 (payment) exists, so no currently-accepted booking is affected
    // unintentionally.
    async expireStaleHolds() {
        const now = new Date();

        const stale = await this.vendorOrderModel.find({
            status: 'accepted',
            holdExpiresAt: { $ne: null, $lt: now },
        });

        for (const vendorOrder of stale) {
            vendorOrder.status = 'expired';
            await vendorOrder.save();

            try {
                const order = await this.orderModel.findOne({ vendorOrders: vendorOrder._id });
                if (order) {
                    await this.sendPushNotification(
                        'Booking hold expired',
                        `Your accepted request for ${vendorOrder.serviceName} expired before payment.`,
                        order.organizerId.toString(),
                        'HOLD_EXPIRED',
                    );
                }
            } catch (error) {
                console.log(error);
            }
        }

        return { expiredCount: stale.length };
    }

    // ===== NEW (Phase 4): down payment info for vendor request details =====
    // Reuses the EXISTING per-category downPayment field — no duplicate field.
    private getDownPaymentConfig(vendorUser: any): { type: string; value: number } | null {
        const businessDetails =
            vendorUser?.photographerBusinessDetails ||
            vendorUser?.cateringBusinessDetails ||
            vendorUser?.venueBusinessDetails ||
            vendorUser?.salonBusinessDetails ||
            vendorUser?.cakeBusinessDetails ||
            vendorUser?.mehndiBusinessDetails ||
            vendorUser?.soundBusinessDetails;

        if (!businessDetails || businessDetails.downPayment == null) {
            return null;
        }

        return {
            type: businessDetails.downPaymentType || 'PERCENTAGE',
            value: businessDetails.downPayment,
        };
    }

    // Mark a vendor order as completed
    async completeVendorOrder(vendorOrderId: string) {
        const vendorOrder = await this.vendorOrderModel.findById(vendorOrderId);

        if (!vendorOrder) {
            throw new NotFoundException(`Vendor Order with ID ${vendorOrderId} not found`);
        }

        vendorOrder.status = 'completed';
        return vendorOrder.save();
    }

    // Delete an order from the database
    async deleteOrder(orderId: string): Promise<any> {
        const order = await this.orderModel.findById(orderId);
        if (!order) {
            throw new NotFoundException(`Order with ID ${orderId} not found`);
        }

        // Delete associated vendor orders
        await this.vendorOrderModel.deleteMany({ orderId });

        return this.orderModel.deleteOne({ _id: orderId });
    }

    async confirmOrderCompletion(orderId: string) {
        return this.orderModel.findByIdAndUpdate(orderId, { status: 'completed' }, { new: true });
    }

    async getOrderStatsForVendor(vendorId: string) {
        const now = new Date();
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1); // start of 6 months ago

        // Step 1: Fetch real data
        const rawStats = await this.orderModel.aggregate([
            {
                $match: {
                    createdAt: { $gte: sixMonthsAgo },
                },
            },
            {
                $lookup: {
                    from: 'vendororders', // <- make sure this matches your MongoDB collection name (plural, lowercase!)
                    localField: 'vendorOrders',
                    foreignField: '_id',
                    as: 'vendorOrderDetails',
                },
            },
            {
                $match: {
                    'vendorOrderDetails.vendorId': new Types.ObjectId(vendorId),
                },
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                    },
                    totalAmount: { $sum: '$finalAmount' },
                    orderCount: { $sum: 1 },
                },
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1 },
            },
            {
                $project: {
                    year: '$_id.year',
                    month: '$_id.month',
                    totalAmount: 1,
                    orderCount: 1,
                    _id: 0,
                },
            },
        ]);


        // Step 2: Fill in missing months
        const result = [];
        const rawMap = new Map(
            rawStats.map(stat => [`${stat.year}-${stat.month}`, stat])
        );

        for (let i = 0; i < 6; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;

            const key = `${year}-${month}`;
            const stat = rawMap.get(key);

            result.push({
                year,
                month,
                totalAmount: stat?.totalAmount || 0,
                orderCount: stat?.orderCount || 0,
            });
        }

        // ✅ RETURN THE RESULT
        return result;
    }

    async getUserPushToken(userId: string): Promise<string> {
        const user = await this.userModel.findById(userId).select('pushToken');

        if (!user) {
            throw new NotFoundException(`User with ID ${userId} not found`);
        }

        if (!user.pushToken) {
            throw new NotFoundException(`Push token not found for user ID ${userId}`);
        }

        return user.pushToken;
    }

    async sendPushNotification(title: string, body: string, userId: string, type: string) {
        const token = await this.getUserPushToken(userId);
        const message = {
            to: token,
            sound: 'default',
            title,
            body,
        };

        try {
            const response = await axios.post('https://exp.host/--/api/v2/push/send', message, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            await this.saveNotification(userId, title, body, type);
            return response.data;
        } catch (error) {
            console.error('Expo push error:', error);
            throw error;
        }
    }

    async saveNotification(userId: string, title: string, body: string, type: string) {
        const notification = new this.notificationModel({
            userId,
            title,
            body,
            type,
        });
        return await notification.save();
    }
}