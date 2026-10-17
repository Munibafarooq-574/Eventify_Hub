import { Types } from 'mongoose';
import { CancellationService } from './cancellation.service';
import { AdminFinanceService } from '../admin/admin-finance.service';
import { NotificationService } from '../notifications/notifications.service';
const id=()=>new Types.ObjectId().toString();
describe('Client refund updates',()=>{
  it('scopes refund reads to the verified client and projects no Admin notes or confirmation token',async()=>{
    const actor={id:id(),role:'client'};
    const record={vendorOrderId:id(),status:'REJECTED',amountPaid:1500,refundAmount:1500,withheldAmount:0,rejectionReason:'Duplicate claim',notes:'PRIVATE',confirmationKey:'PRIVATE'};
    const query:any={select:jest.fn(),sort:jest.fn(),lean:async()=>[record]};query.select.mockReturnValue(query);query.sort.mockReturnValue(query);
    const s:any=Object.create(CancellationService.prototype);s.refundModel={find:jest.fn(()=>query)};
    const result=await s.getClientRefunds(actor);
    expect(String(s.refundModel.find.mock.calls[0][0].organizerId)).toBe(actor.id);
    expect(result[0]).toMatchObject({status:'REJECTED',rejectionReason:'Duplicate claim'});
    expect(result[0]).not.toHaveProperty('notes');expect(result[0]).not.toHaveProperty('confirmationKey');
    record.status='PROCESSING';expect((await s.getClientRefunds(actor))[0].rejectionReason).toBeNull();
  });
  it.each(['Vendor','admin',''])('rejects %s users before any refund query',async role=>{
    const s:any=Object.create(CancellationService.prototype);s.refundModel={find:jest.fn()};
    await expect(s.getClientRefunds({id:id(),role})).rejects.toThrow('authenticated Client');
    expect(s.refundModel.find).not.toHaveBeenCalled();
  });
  function finance(status='PENDING'){
    const record:any={_id:id(),vendorOrderId:id(),organizerId:id(),status,refundAmount:1500};
    const refunds={findById:async()=>record,findOneAndUpdate:jest.fn(async(_filter,change)=>Object.assign(record,change.$set))};
    const notifications={notifyUser:jest.fn(async()=>{})};
    const s=new AdminFinanceService({} as any,refunds as any,{} as any,{} as any,{} as any,{} as any,notifications as any);
    return {record,refunds,notifications,s};
  }
  it('notifies only after a committed status transition and keeps retries idempotent',async()=>{
    const f=finance();await f.s.updateRefundStatus(f.record._id,'PROCESSING');await f.s.updateRefundStatus(f.record._id,'PROCESSING');
    expect(f.notifications.notifyUser).toHaveBeenCalledTimes(1);
    expect(f.notifications.notifyUser.mock.calls[0]).toEqual([f.record.organizerId,'Refund update',expect.stringContaining('not yet been confirmed'),'REFUND_UPDATE']);
    await f.s.updateRefundStatus(f.record._id,'REFUNDED');expect(f.record.refundedAt).toBeInstanceOf(Date);
    expect(f.notifications.notifyUser).toHaveBeenCalledTimes(2);
  });
  it('requires a client-facing rejection reason and clears it when reopened',async()=>{
    const f=finance();await expect(f.s.updateRefundStatus(f.record._id,'REJECTED',id(),'   ')).rejects.toThrow('reason');
    expect(f.refunds.findOneAndUpdate).not.toHaveBeenCalled();
    await f.s.updateRefundStatus(f.record._id,'REJECTED',id(),'  Duplicate claim  ');
    expect(f.record.rejectionReason).toBe('Duplicate claim');
    await f.s.updateRefundStatus(f.record._id,'PENDING');expect(f.record.rejectionReason).toBeNull();
  });
  it('does not roll back settlement if notification storage fails',async()=>{
    const f=finance('PROCESSING');f.notifications.notifyUser.mockRejectedValueOnce(new Error('storage down') as never);
    expect((await f.s.updateRefundStatus(f.record._id,'REFUNDED'))?.status).toBe('REFUNDED');
  });
  it('keeps the in-app notification when push is unavailable',async()=>{
    const model={create:jest.fn(async value=>value)};
    const s=new NotificationService({} as any,model as any);
    jest.spyOn(s,'sendPushNotification').mockRejectedValue(new Error('No push token'));
    await expect(s.notifyUser(id(),'Refund update','Processing','REFUND_UPDATE')).resolves.toMatchObject({type:'REFUND_UPDATE'});
    expect(model.create).toHaveBeenCalledTimes(1);
  });
});
