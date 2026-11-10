import { NotificationService } from './notifications.service';

describe('booking notification timezone', () => {
  it('resolves existing booking notifications in their own event city', async () => {
    const id = '6af2ea8ce13b67ca05e7b7fc';
    const records = [{ orderId: id, toObject: () => ({ orderId: id, createdAt: '2026-11-10T09:57:00Z' }) }];
    const notifications = { find: jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue(records) }) };
    const query: any = { select: jest.fn().mockReturnThis(), populate: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([{ _id: id, eventCityId: { timeZone: 'America/Los_Angeles' } }]) };
    const orders = { find: jest.fn().mockReturnValue(query) };
    const service = new NotificationService({} as any, notifications as any, orders as any);
    const result = await service.getNotificationsByUserId('signed-in-client');
    expect(notifications.find).toHaveBeenCalledWith({ userId: 'signed-in-client' });
    expect(orders.find).toHaveBeenCalledWith({ _id: { $in: [id] } });
    expect(query.populate).toHaveBeenCalledWith({ path: 'eventCityId', select: 'timeZone' });
    expect(result[0]).toMatchObject({ eventTimeZone: 'America/Los_Angeles', createdAt: '2026-11-10T09:57:00Z' });
  });
  it('keeps account updates independent of an event timezone', async () => {
    const records = [{ title: 'Account update' }];
    const notifications = { find: () => ({ sort: async () => records }) };
    const orders = { find: jest.fn() };
    expect(await new NotificationService({} as any, notifications as any, orders as any).getNotificationsByUserId('client')).toEqual(records);
    expect(orders.find).not.toHaveBeenCalled();
  });
});
