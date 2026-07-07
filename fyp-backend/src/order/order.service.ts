import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import axios from 'axios';
import { Model, Types } from 'mongoose';
import { Order } from 'src/auth/schemas/order.schema';
import { VendorOrder } from 'src/auth/schemas/vendor-order.schema';
import { UpdateOrderStatusDto } from './dto/update-order-status-dto';
import { User } from 'src/auth/schemas/user.schema';
import { Notification } from 'src/auth/schemas/notification.schema';

@Injectable()
export class OrderService {
    constructor(
        @InjectModel(User.name) private readonly userModel: Model<User>,
        @InjectModel(Order.name) private readonly orderModel: Model<Order>,
        @InjectModel(VendorOrder.name) private readonly vendorOrderModel: Model<VendorOrder>,
        @InjectModel(Notification.name) private readonly notificationModel: Model<Notification>
    ) { }

    // Create a new order
    async createOrder(
        organizerId: string,
        eventDate: Date,
        eventTime: string,
        services: { vendorId: string; serviceName: string; price: number }[],
        eventName: string,
        guests: number,
    ): Promise<Order> {
        // Calculate total and final amounts
        const totalAmount = services.reduce((sum, service) => sum + service.price, 0);
        const finalAmount = totalAmount; // Modify this if you want to apply discounts or other adjustments

        // Create the order document
        const order = new this.orderModel({
            organizerId: new Types.ObjectId(organizerId),
            eventDate,
            eventTime,
            eventName,
            guests,
            totalAmount,
            discount: 0, // You can modify this if needed
            finalAmount,
            status: 'pending', // Initial status
        });

        // Save the order document
        const savedOrder = await order.save();

        // Create vendor orders and push the vendorOrder _id to the order's vendorOrders field
        const vendorOrderIds: Types.ObjectId[] = [];

        for (const service of services) {
            const vendorOrder = new this.vendorOrderModel({
                orderId: savedOrder._id,
                vendorId: new Types.ObjectId(service.vendorId),
                serviceName: service.serviceName,
                price: service.price,
                status: 'pending', // Initial vendor order status
            });

            // Save each vendor order and push its _id into the vendorOrders array
            const savedVendorOrder = await vendorOrder.save();
            vendorOrderIds.push(savedVendorOrder._id);
        }


        // Update the order document with the vendorOrder IDs
        savedOrder.vendorOrders = vendorOrderIds;
        await savedOrder.save();
        try {
            for (let index = 0; index < services.length; index++) {
                await this.sendPushNotification("Order", "A new order has been placed", services[index].vendorId, "CREATE_ORDER");
                console.log("Notification sent on create order", services[index].vendorId);
            }
        } catch (error) {
            console.log(error);
        }
        return savedOrder;
    }


    async getOrders(
        type: string,
        userId: string,
        status?: string,
        limit = 10,
        skip = 0,
    ): Promise<Order[]> {
        let userIdObj;
        if (typeof userId === 'string') {
            userIdObj = new Types.ObjectId(userId);  // Convert userId to ObjectId
        }

        const query: any = {
            ...(status && { status }),  // Optional status filter
        };

        // Step 1: Fetch VendorOrders that match the vendorId
        if (type === 'Vendor') {
            const vendorOrders = await this.vendorOrderModel.find({ vendorId: userIdObj });

            // Get the ObjectIds of matched VendorOrders
            const vendorOrderIds = vendorOrders.map(order => order._id);

            // Use the $in operator to query Orders with vendorOrders matching the vendorOrderIds
            query.vendorOrders = { $in: vendorOrderIds };
        } else if (type === 'Organizer') {
            // Step 2: For 'Organizer', filter orders by organizerId
            query.organizerId = userIdObj;  // Filter by organizerId
        }

        console.log('Final query:', query);  // Log the final query for debugging

        // Step 3: Execute the query
        return this.orderModel
            .find(query)
            .skip(skip)
            .limit(limit)
            .populate('organizerId')  // Populate organizer details
            .populate({
                path: 'vendorOrders',  // Populate vendorOrders subdocument
                populate: {
                    path: 'vendorId',  // Populate vendor details inside each vendorOrder
                    model: 'User',  // Specify the 'Vendor' model to populate vendor info
                },
            })
            .exec();
    }


    // Get order stats (pending, processing, completed) for Vendor or Organizer
    async getOrderStats(type: string, userId: string) {
        let userIdObj;
        if (typeof userId === 'string') {
            userIdObj = new Types.ObjectId(userId);  // Convert userId to ObjectId
        }

        const query: any = {};

        // Step 1: Apply filter based on type (Vendor or Organizer)
        if (type === 'Organizer') {
            query.organizerId = userIdObj;  // Filter by organizerId
        } else if (type === 'Vendor') {
            // Fetch VendorOrders that match the vendorId
            const vendorOrders = await this.vendorOrderModel.find({ vendorId: userIdObj });

            // Get the ObjectIds of matched VendorOrders
            const vendorOrderIds = vendorOrders.map(order => order._id);

            // Use the $in operator to query Orders with vendorOrders matching the vendorOrderIds
            query.vendorOrders = { $in: vendorOrderIds };
        }

        // Step 2: Calculate stats based on the query
        const totalOrders = await this.orderModel.countDocuments(query);
        const pending = await this.orderModel.countDocuments({ ...query, status: 'pending' });
        const processing = await this.orderModel.countDocuments({ ...query, status: 'processing' });
        const completed = await this.orderModel.countDocuments({ ...query, status: 'completed' });

        return {
            totalOrders,
            pending,
            processing,
            completed,
        };
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
        try {
            await this.sendPushNotification("Order Update", `Your order has been ${dto.status}`, updated.organizerId.toString(), "ORDER_UPDATE");
        } catch (error) {
            console.log(error);
        }
        return updated;
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
        return vendorOrder.save();
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
