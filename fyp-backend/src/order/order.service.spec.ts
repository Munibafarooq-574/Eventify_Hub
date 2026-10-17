// Isolate scheduling: these tests exercise booking logic, not cron registration.
jest.mock('@nestjs/schedule', () => ({ Cron: () => () => undefined }));
import { CancellationService } from '../cancellation/cancellation.service';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { User } from 'src/schemas/user.schema';
import { Order } from 'src/schemas/order.schema';
import { VendorOrder } from 'src/schemas/vendor-order.schema';
import { Notification } from 'src/schemas/notification.schema';
import { CommissionConfig } from 'src/schemas/commission-config.schema';
import { Category } from 'src/schemas/category.schema';
import { RescheduleRequest } from 'src/schemas/reschedule-request.schema';
import { ChatService } from 'src/chat/chat.service';
import { VendorAvailabilityService } from 'src/vendor-availability/vendor-availability.service';
import { PayoutService } from 'src/payout/payout.service';
import { FeatureAccessService } from 'src/vendor/growth/feature-access.service';
import { CityService } from 'src/city/city.service';
import { DiscountService } from 'src/vendor/growth/discount/discount.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OrderService - Unit Tests', () => {
    let service: OrderService;
    let userModel: any;
    let orderModel: any;
    let vendorOrderModel: any;
    let notificationModel: any;
    let cancellation: any;
    const validObjectId = '507f191e810c19729de860ea';

    beforeEach(async () => {
        userModel = {
            findById: jest.fn().mockReturnValue({
                select: jest.fn().mockResolvedValue({ pushToken: 'expoToken' }),
            }),
        };

        const orderFindQuery: any = {
            sort: jest.fn(),
            skip: jest.fn(),
            limit: jest.fn(),
            populate: jest.fn(),
            lean: jest.fn(),
            exec: jest.fn().mockResolvedValue([]),
        };

        orderFindQuery.sort.mockReturnValue(orderFindQuery);
        orderFindQuery.skip.mockReturnValue(orderFindQuery);
        orderFindQuery.limit.mockReturnValue(orderFindQuery);
        orderFindQuery.populate.mockReturnValue(orderFindQuery);
        orderFindQuery.lean.mockReturnValue(orderFindQuery);

        orderModel = {
            findById: jest.fn().mockResolvedValue({
                status: 'pending',
                save: jest.fn(),
            }),
            findByIdAndUpdate: jest.fn().mockResolvedValue({
                organizerId: validObjectId,
                vendorOrders: [],
            }),
            countDocuments: jest.fn().mockResolvedValue(5),
            deleteOne: jest.fn().mockResolvedValue({}),
            find: jest.fn().mockReturnValue(orderFindQuery),
            aggregate: jest.fn().mockResolvedValue([]),
        };

        vendorOrderModel = {
            find: jest.fn().mockResolvedValue([{ _id: validObjectId }]),
            deleteMany: jest.fn().mockResolvedValue({}),
            updateMany: jest.fn().mockResolvedValue({}),
            countDocuments: jest.fn().mockResolvedValue(0),
        };

        notificationModel = {
            create: jest.fn().mockResolvedValue({}),
        };

        cancellation = { hasSuccessfulPayment: jest.fn().mockResolvedValue(false), assertClientBookingOwner: jest.fn() };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OrderService,
                { provide: CancellationService, useValue: cancellation },
                { provide: getModelToken(User.name), useValue: userModel },
                { provide: getModelToken(Order.name), useValue: orderModel },
                { provide: getModelToken(VendorOrder.name), useValue: vendorOrderModel },
                { provide: getModelToken(Notification.name), useValue: notificationModel },
                {
                    provide: getModelToken(CommissionConfig.name),
                    useValue: { findOne: jest.fn().mockResolvedValue(null) },
                },
                {
                    provide: getModelToken(Category.name),
                    useValue: {},
                },
                {
                    provide: getModelToken(RescheduleRequest.name),
                    useValue: {},
                },
                {
                    provide: getConnectionToken(),
                    useValue: {},
                },
                {
                    provide: VendorAvailabilityService,
                    useValue: {},
                },
                {
                    provide: PayoutService,
                    useValue: {
                        createPayoutIfEligible: jest.fn(),
                    },
                },
                {
                    provide: FeatureAccessService,
                    useValue: {},
                },
                {
                    provide: CityService,
                    useValue: {},
                },
                {
                    provide: DiscountService,
                    useValue: {},
                },
                {
                    provide: ChatService,
                    useValue: {
                        createOrGetConversation: jest.fn(),
                        createMessage: jest.fn(),
                    },
                },
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
        jest.spyOn(service, 'sendPushNotification').mockResolvedValue(undefined);
        const updated = await service.updateStatus('o123', { status: 'completed' });
        expect(updated.organizerId).toBe(validObjectId);
    });

    it('blocks event-wide cancellation before any status write', async () => {
        await expect(service.updateStatus(validObjectId, { status: 'cancelled' })).rejects.toThrow('individual vendor');
        expect(orderModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });
    it.each(['PARTIALLY_PAID', 'PAID', 'UNPAID'])('blocks legacy cancellation of a paid %s booking', async paymentStatus => {
        vendorOrderModel.findById = jest.fn(() => ({ lean: async () => ({ status: 'accepted', paymentStatus }) }));
        cancellation.hasSuccessfulPayment.mockResolvedValue(true);
        vendorOrderModel.findByIdAndUpdate = jest.fn();
        await expect(service.updateVendorOrderStatus(validObjectId, 'cancelled')).rejects.toThrow('dedicated cancellation');
        expect(vendorOrderModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });
    it('prevents a pending request race from overwriting acceptance', async () => {
        const booking = { _id: validObjectId, status: 'pending', paymentStatus: 'UNPAID' };
        cancellation.assertClientBookingOwner.mockResolvedValue({ vendorOrder: booking });
        vendorOrderModel.findOneAndUpdate = jest.fn().mockResolvedValue(null);
        await expect(service.cancelVendorOrderByOrganizer(validObjectId, undefined, { id: validObjectId, role: 'client' })).rejects.toThrow('Booking changed');
        expect(vendorOrderModel.findOneAndUpdate.mock.calls[0][0]).toEqual({ _id: validObjectId, status: 'pending', paymentStatus: 'UNPAID' });
    });
    it.each(['cancelled', 'cancelled_by_vendor'])('preserves %s booking history across acceptance and completion', async status => {
        vendorOrderModel.findById = jest.fn().mockResolvedValue({ status });
        await expect(service.updateVendorResponse(validObjectId, 'accepted')).rejects.toThrow('Cancelled bookings');
        await expect(service.completeVendorOrder(validObjectId)).rejects.toThrow('Cancelled bookings');
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
    it('starts a separate 24-hour balance window exactly once at completion', async () => {
        const booking: any = { _id: validObjectId, vendorId: validObjectId, packageId: 'cake', status: 'accepted', paymentStatus: 'PARTIALLY_PAID', eventStartDateTime: new Date(Date.now()-1000), eventEndDateTime: new Date(Date.now()+3600000) };
        vendorOrderModel.findById = jest.fn().mockResolvedValue(booking);
        userModel.findById = jest.fn(() => ({ select: jest.fn().mockResolvedValue({ packages: [{ _id: 'cake', bookingType: 'DELIVERY_BASED' }] }) }));
        vendorOrderModel.findOneAndUpdate = jest.fn(async (_filter, update) => ({ ...booking, ...update.$set }));
        const before = Date.now();
        const result = await service.completeVendorOrder(validObjectId);
        expect(result.paymentDeadline).toBeNull();
        expect(result.remainingPaymentDeadline!.getTime()).toBeGreaterThanOrEqual(before+86400000);
        expect(result.remainingPaymentDeadline!.getTime()).toBeLessThanOrEqual(Date.now()+86400000);
        vendorOrderModel.findById.mockResolvedValue(result);
        expect(await service.completeVendorOrder(validObjectId)).toBe(result);
        expect(vendorOrderModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
    });
    it('blocks premature duration service completion and unpaid completion', async () => {
        const booking: any = { status: 'accepted', paymentStatus: 'PARTIALLY_PAID', eventEndDateTime: new Date(Date.now()+3600000) };
        vendorOrderModel.findById = jest.fn().mockResolvedValue(booking);
        await expect(service.completeVendorOrder(validObjectId)).rejects.toThrow('scheduled');
        booking.paymentStatus = 'PAYMENT_REQUIRED';
        await expect(service.completeVendorOrder(validObjectId)).rejects.toThrow('required payment');
    });

});
