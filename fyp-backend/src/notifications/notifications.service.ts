// notification.service.ts
import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import axios from 'axios';
import { Order } from '../schemas/order.schema';
import { Model, Types } from 'mongoose';
import { User } from 'src/schemas/user.schema';
import { Notification } from 'src/schemas/notification.schema';

@Injectable()
export class NotificationService {
    constructor(@InjectModel(User.name) private userModel: Model<User>, @InjectModel(Notification.name) private notificationModel: Model<Notification>, @Optional() @InjectModel(Order.name) private orderModel?: Model<Order>) {

    }
    async sendExpoPush(token: string, title: string, body: string) {
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
            return response.data;
        } catch (error) {
            console.error('Expo push error:', error);
            throw error;
        }
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

    async sendPushNotification(title: string, body: string, userId: string, timeout?: number) {
        const token = await this.getUserPushToken(userId);
        const message = {
            to: token,
            sound: 'default',
            title,
            body,
        };

        try {
            const response = await axios.post('https://exp.host/--/api/v2/push/send', message, {
                ...(timeout ? { timeout } : {}),
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            return response.data;
        } catch (error) {
            console.error('Expo push error:', error);
            throw error;
        }
    }

    // Keep the in-app update even when a device has no push token or Expo is unavailable.
    async notifyUser(userId: string, title: string, body: string, type: string, booking?: { orderId?: string; vendorOrderId?: string }) {
        const notification = await this.notificationModel.create({ userId, title, body, type, ...(booking ? { orderId: booking.orderId, vendorOrderId: booking.vendorOrderId } : {}) });
        try { await this.sendPushNotification(title, body, userId, 10000); }
        catch { /* The persisted notification remains available in the app. */ }
        return notification;
    }

    async getNotificationsByUserId(userId: string) {
        const records = await this.notificationModel.find({ userId }).sort({ createdAt: -1 });
        const ids = [...new Set(records.map(record => record.orderId).filter((id): id is string => !!id && Types.ObjectId.isValid(id)))];
        if (!ids.length || !this.orderModel) return records;
        const orders = await this.orderModel.find({ _id: { $in: ids } })
            .select('eventCityId').populate({ path: 'eventCityId', select: 'timeZone' }).lean();
        const zones = new Map(orders.map(order => [String(order._id), (order.eventCityId as any)?.timeZone || 'UTC']));
        return records.map(record => ({ ...record.toObject(), eventTimeZone: zones.get(String(record.orderId)) || 'UTC' }));
    }
}
