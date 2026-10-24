import { SubscriptionService } from './subscription.service';
import { FeatureAccessService } from '../feature-access.service';

describe('Subscription expiry and existing booking safety', () => {
  beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(new Date('2026-10-24T07:00:00Z')); });
  afterEach(() => jest.useRealTimers());
  it.each(['trial', 'active', 'cancelled'])('expires %s entitlement without changing customer bookings', async status => {
    const bookings = [{status:'pending',price:6000}, {status:'accepted',paymentStatus:'PARTIALLY_PAID',downPaymentAmount:3000,remainingAmount:3000}];
    const before = JSON.stringify(bookings);
    const subscription:any = {status,endDate:new Date(Date.now()-1),isCurrent:true,save:jest.fn()};
    const service:any = Object.create(SubscriptionService.prototype);
    // Any accidental booking dependency must fail, rather than silently mutate records.
    service.vendorOrderModel = new Proxy({}, {get:()=>{throw Error('Subscription expiry must not access bookings');}});
    service.orderModel = service.vendorOrderModel;
    await service.expireIfNeeded(subscription);
    expect(subscription.status).toBe('expired');expect(subscription.isCurrent).toBe(true);
    expect(subscription.save).toHaveBeenCalledTimes(1);expect(JSON.stringify(bookings)).toBe(before);
  });
  it.each(['pending_payment','rejected'])('does not expire a %s payment request as an entitlement', async status=>{
    const service:any=Object.create(SubscriptionService.prototype);
    const subscription:any={status,endDate:new Date(Date.now()-1),save:jest.fn()};
    await service.expireIfNeeded(subscription);expect(subscription.status).toBe(status);expect(subscription.save).not.toHaveBeenCalled();
  });
  it.each([
    ['trial','basic',true,false],['active','basic',true,false],['active','growth',true,true],['active','premium',true,true],
    ['pending_payment','growth',false,false],['rejected','premium',false,false],['expired','growth',false,false],
    ['cancelled','growth',true,true],
  ])('checks %s %s new-booking and campaign entitlement separately',async(status,plan,booking,campaign)=>{
    const subscription={status,plan,paymentStatus:status==='trial'?'none':'paid',endDate:new Date(Date.now()+86400000)};
    const service:any=Object.create(FeatureAccessService.prototype);
    service.subscriptionService={getCurrentSubscription:jest.fn(async()=>subscription)};
    expect(await service.hasActiveSubscription('vendor')).toBe(booking);
    expect(await service.canCreateCampaign('vendor')).toBe(campaign);
  });
  it('cancelled paid access ends only at the saved end date',async()=>{
    const service:any=Object.create(FeatureAccessService.prototype);
    service.subscriptionService={getCurrentSubscription:async()=>({status:'cancelled',plan:'growth',endDate:new Date(Date.now())})};
    expect(await service.hasActiveSubscription('vendor')).toBe(false);
    expect(await service.getCampaignAccessEndDate('vendor')).toBeNull();
  });
});
