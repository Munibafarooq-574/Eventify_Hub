import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { getModelToken } from '@nestjs/mongoose';
import { User } from 'src/auth/schemas/user.schema';
import { Order } from 'src/auth/schemas/order.schema';
import { VendorOrder } from 'src/auth/schemas/vendor-order.schema';
import { Notification } from 'src/auth/schemas/notification.schema';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OrderService - Unit Tests', () => {
    let service: OrderService;
    let userModel: any;
    let orderModel: any;
    let vendorOrderModel: any;
    let notificationModel: any;
    const validObjectId = '507f191e810c19729de860ea';

    beforeEach(async () => {
        userModel = {
            findById: jest.fn().mockReturnValue({
                select: jest.fn().mockResolvedValue({ pushToken: 'expoToken' }),
            }),
        };

        orderModel = {
            findById: jest.fn().mockResolvedValue({ status: 'pending', save: jest.fn() }),
            findByIdAndUpdate: jest.fn().mockResolvedValue({ organizerId: validObjectId }),
            countDocuments: jest.fn().mockResolvedValue(5),
            deleteOne: jest.fn().mockResolvedValue({}),
            find: jest.fn().mockReturnValue({
                skip: () => ({
                    limit: () => ({
                        populate: () => ({
                            populate: () => ({
                                exec: jest.fn().mockResolvedValue([]),
                            }),
                        }),
                    }),
                }),
            }),
            aggregate: jest.fn().mockResolvedValue([]),
        };

        vendorOrderModel = {
            find: jest.fn().mockResolvedValue([{ _id: validObjectId }]),
            deleteMany: jest.fn().mockResolvedValue({}),
        };

        notificationModel = {
            create: jest.fn().mockResolvedValue({}),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OrderService,
                { provide: getModelToken(User.name), useValue: userModel },
                { provide: getModelToken(Order.name), useValue: orderModel },
                { provide: getModelToken(VendorOrder.name), useValue: vendorOrderModel },
                { provide: getModelToken(Notification.name), useValue: notificationModel },
            ],
        }).compile();

        service = module.get<OrderService>(OrderService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should get user push token', async () => {
        const token = await service.getUserPushToken(validObjectId);
        expect(token).toBe('expoToken');
    });

    it('should throw if user push token not found', async () => {
        userModel.findById = jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue(null),
        });
        await expect(service.getUserPushToken(validObjectId)).rejects.toThrow();
    });

    it('should update order status', async () => {
        const updated = await service.updateStatus('o123', { status: 'completed' });
        expect(updated.organizerId).toBe(validObjectId);
    });

    it('should get order stats', async () => {
        const stats = await service.getOrderStats('Organizer', validObjectId);
        expect(stats.totalOrders).toBe(5);
    });

    it('should get orders for organizer', async () => {
        const orders = await service.getOrders('Organizer', validObjectId);
        expect(Array.isArray(orders)).toBe(true);
    });

    it('should delete order', async () => {
        orderModel.findById = jest.fn().mockResolvedValue({});
        const result = await service.deleteOrder('o123');
        expect(result).toEqual({});
    });

    it('should confirm order completion', async () => {
        const result = await service.confirmOrderCompletion('o123');
        expect(result).toHaveProperty('organizerId');
    });

    it('should throw if order not found for completion', async () => {
        orderModel.findById = jest.fn().mockResolvedValue(null);
        await expect(service.completeOrder('invalid')).rejects.toThrow();
    });

    it('should return monthly stats (empty case)', async () => {
        const result = await service.getOrderStatsForVendor(validObjectId);
        expect(result.length).toBe(6);
    });
});
