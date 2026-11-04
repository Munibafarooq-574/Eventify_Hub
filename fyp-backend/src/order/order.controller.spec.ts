import { MarketplaceGuard } from '../city/marketplace.guard';
jest.mock('@nestjs/schedule', () => ({ Cron: () => () => undefined }));

//fyp-backend/src/order/order.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';

describe('OrderController - Unit Tests', () => {
  let controller: OrderController;
  let service: any;
  const validObjectId = '507f191e810c19729de860ea';
  const client = { user: { id: validObjectId, role: 'Client' } };
  const vendor = { user: { id: validObjectId, role: 'Vendor' } };

  beforeEach(async () => {
    service = {
      createOrder: jest.fn().mockResolvedValue({ _id: 'order123' }),
      updateVendorResponse: jest.fn().mockResolvedValue({ status: 'accepted' }),
      assertVendorBookingOwner: jest.fn().mockResolvedValue(undefined),
      confirmOrderCompletion: jest.fn().mockResolvedValue({ status: 'completed' }),
      completeVendorOrder: jest.fn().mockResolvedValue({ status: 'completed' }),
      updateStatus: jest.fn().mockResolvedValue({ status: 'completed' }),
      getOrders: jest.fn().mockResolvedValue([]),
      getOrderStats: jest.fn().mockResolvedValue({ totalOrders: 5 }),
      getOrderStatsForVendor: jest.fn().mockResolvedValue([]),
      deleteOrder: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [{ provide: OrderService, useValue: service }],
    }).overrideGuard(MarketplaceGuard).useValue({ canActivate: () => true }).compile();

    controller = module.get<OrderController>(OrderController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should place an order', async () => {
    const req = {
      user: {
        id: validObjectId,
        role: 'Client',
      },
    };

    const body = {
  organizerId: validObjectId,
  eventId: 'event-test-1',
  eventDate: '2026-12-01',
  eventTime: '18:00',
  eventName: 'Wedding',
  guests: 200,
  eventCityId: validObjectId,
  eventAddress: 'Test Event Address',
  services: [
    {
      vendorId: validObjectId,
      serviceName: 'Catering',
      price: 10000,
      packageId: validObjectId,
    },
  ],
};
    const result = await controller.placeOrder(req, body);
    expect(result._id).toBe('order123');
  });

  it('should respond to vendor order', async () => {
    const res = await controller.respondToOrder('v123', { status: 'accepted' }, { user: { id: 'vendor', role: 'vendor' } });
    expect(res).toBeDefined();
    expect(res.status).toBe('accepted');
  });

  it('blocks a vendor response when booking ownership fails', async () => {
    service.assertVendorBookingOwner.mockRejectedValueOnce(new Error('Forbidden'));
    await expect(controller.respondToOrder('v123', { status: 'accepted' }, { user: { id: 'other', role: 'vendor' } }))
      .rejects.toThrow('Forbidden');
    expect(service.updateVendorResponse).not.toHaveBeenCalled();
  });

  it('should complete vendor order', async () => {
    const res = await controller.completeVendor('v123', { user: { id: validObjectId, role: 'Vendor' } });
    expect(res.status).toBe('completed');
  });

  it('should complete full order', async () => {
    const res = await controller.completeOrder('o123', client);
    expect(res).toBeDefined();
    if (res) {
      expect(res.status).toBe('completed');
    }
  });

  it('propagates rejection of legacy event-wide status changes', async () => {
    service.updateStatus.mockRejectedValueOnce(new Error('Update an individual vendor booking'));
    await expect(controller.updateOrderStatus('o123', { status: 'completed' }))
      .rejects.toThrow('individual vendor');
  });

  it('should get orders', async () => {
    const res = await controller.getOrders(client, 'Organizer', validObjectId);
    expect(res).toEqual([]);
  });

  it('rejects reads for another account or a mismatched role', async () => {
    const other = '507f191e810c19729de860eb';
    await expect(controller.getOrders(client, 'Organizer', other)).rejects.toThrow('own account');
    await expect(controller.getOrders(client, 'Vendor', validObjectId)).rejects.toThrow('own account');
    await expect(controller.getOrderStats(client, 'Organizer', other)).rejects.toThrow('own account');
    await expect(controller.getMonthlyOrderStats(vendor, other)).rejects.toThrow('own account');
    expect(service.getOrders).not.toHaveBeenCalled();
    expect(service.getOrderStats).not.toHaveBeenCalled();
    expect(service.getOrderStatsForVendor).not.toHaveBeenCalled();
  });

  it('should get stats', async () => {
    const res = await controller.getOrderStats(vendor, 'Vendor', validObjectId);
    expect(res.totalOrders).toBe(5);
  });

  it('should get monthly stats', async () => {
    const res = await controller.getMonthlyOrderStats(vendor, validObjectId);
    expect(Array.isArray(res)).toBe(true);
  });

  it('should delete an order', async () => {
    const res = await controller.deleteOrder('o123', client);
    expect(res).toEqual({});
  });
  it('rejects completion when vendor ownership fails', async () => {
    service.assertVendorBookingOwner.mockRejectedValueOnce(new Error('Forbidden'));
    await expect(controller.completeVendor('v123', { user: { id: 'other' } })).rejects.toThrow('Forbidden');
    expect(service.completeVendorOrder).not.toHaveBeenCalled();
  });

});
