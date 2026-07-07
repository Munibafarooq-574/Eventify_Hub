import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';

describe('OrderController - Unit Tests', () => {
  let controller: OrderController;
  let service: any;
  const validObjectId = '507f191e810c19729de860ea';

  beforeEach(async () => {
    service = {
      createOrder: jest.fn().mockResolvedValue({ _id: 'order123' }),
      updateVendorResponse: jest.fn().mockResolvedValue({ status: 'accepted' }),
      completeVendorOrder: jest.fn().mockResolvedValue({ status: 'completed' }),
      confirmOrderCompletion: jest.fn().mockResolvedValue({ status: 'completed' }),
      updateStatus: jest.fn().mockResolvedValue({ status: 'completed' }),
      getOrders: jest.fn().mockResolvedValue([]),
      getOrderStats: jest.fn().mockResolvedValue({ totalOrders: 5 }),
      getOrderStatsForVendor: jest.fn().mockResolvedValue([]),
      deleteOrder: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [{ provide: OrderService, useValue: service }],
    }).compile();

    controller = module.get<OrderController>(OrderController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should place an order', async () => {
    const body = {
      organizerId: validObjectId,
      eventDate: '2025-06-01',
      eventTime: '6PM',
      eventName: 'Wedding',
      guests: 200,
      services: [{ vendorId: validObjectId, serviceName: 'Catering', price: 10000 }],
    };
    const result = await controller.placeOrder(body);
    expect(result._id).toBe('order123');
  });

  it('should respond to vendor order', async () => {
    const res = await controller.respondToOrder('v123', { status: 'accepted' });
    expect(res).toBeDefined();
    expect(res.status).toBe('accepted');
  });

  it('should complete vendor order', async () => {
    const res = await controller.completeVendor('v123');
    expect(res.status).toBe('completed');
  });

  it('should complete full order', async () => {
    const res = await controller.completeOrder('o123');
    expect(res).toBeDefined();
    if (res) {
      expect(res.status).toBe('completed');
    }
  });

  it('should update order status', async () => {
    const res = await controller.updateOrderStatus('o123', { status: 'completed' });
    expect(res.status).toBe('completed');
  });

  it('should get orders', async () => {
    const res = await controller.getOrders('Organizer', validObjectId);
    expect(res).toEqual([]);
  });

  it('should get stats', async () => {
    const res = await controller.getOrderStats('Vendor', validObjectId);
    expect(res.totalOrders).toBe(5);
  });

  it('should get monthly stats', async () => {
    const res = await controller.getMonthlyOrderStats(validObjectId);
    expect(Array.isArray(res)).toBe(true);
  });

  it('should delete an order', async () => {
    const res = await controller.deleteOrder('o123');
    expect(res).toEqual({});
  });
});
