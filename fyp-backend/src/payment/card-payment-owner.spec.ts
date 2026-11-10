import { PaymentService } from './payment.service';
describe('Card checkout account identity',()=>{
  it.each(['PKR','USD',undefined])('returns the owner and saved currency %s after the existing ownership check',async(currency)=>{
    const s:any=Object.create(PaymentService.prototype);
    s.vendorOrderModel={findById:async()=>({_id:'booking',currency,vendorId:'booked-vendor',bookingChatTimeZone:'America/Los_Angeles',price:3000,paymentStatus:'PAYMENT_REQUIRED',downPaymentAmount:1500})};
    s.assertOrganizerOwnsVendorOrder=jest.fn(async()=>({organizerId:'verified-client'}));
    s.paymentModel={find:()=>({lean:async()=>[]}),findOne:()=>({sort:()=>({lean:async()=>null})})};
    const select=jest.fn(()=>({lean:async()=>({name:'Vendor10',email:'account@example.invalid',contactDetails:{brandName:'Brandvendor10',bookingEmail:'bookings@example.invalid'}})}));
    s.userModel={findById:jest.fn(()=>({select}))};
    const result=await s.getPaymentStatus('booking','verified-client');
    expect(result.vendor).toEqual({name:'Vendor10',brandName:'Brandvendor10',email:'bookings@example.invalid'});
    expect(s.userModel.findById).toHaveBeenCalledWith('booked-vendor');
    expect(select).toHaveBeenCalledWith('name email contactDetails.brandName contactDetails.bookingEmail');
    expect(result.currency).toBe(currency || 'PKR');
    expect(result.eventTimeZone).toBe('America/Los_Angeles');
    expect(result.organizerId).toBe('verified-client');expect(result.downPaymentAmount).toBe(1500);
    expect(s.assertOrganizerOwnsVendorOrder).toHaveBeenCalledWith('booking','verified-client');
  });
  it('resolves legacy receipt timezone from the owning event city', async () => {
    const s:any=Object.create(PaymentService.prototype);
    const cityQuery={select:jest.fn().mockReturnThis(),lean:async()=>({timeZone:'America/Los_Angeles'})};
    const cityModel={findById:jest.fn(()=>cityQuery)};
    s.vendorOrderModel={findById:async()=>({_id:'booking',price:15000,paymentStatus:'UNPAID'}),db:{model:()=>cityModel}};
    s.assertOrganizerOwnsVendorOrder=jest.fn(async()=>({eventCityId:'event-city'}));
    s.paymentModel={find:()=>({lean:async()=>[]}),findOne:()=>({sort:()=>({lean:async()=>null})})};
    const result=await s.getPaymentStatus('booking','client');
    expect(result.eventTimeZone).toBe('America/Los_Angeles');
    expect(cityModel.findById).toHaveBeenCalledWith('event-city');
  });
  it('does not return identity or financial records for another client booking',async()=>{
    const s:any=Object.create(PaymentService.prototype);s.vendorOrderModel={findById:async()=>({_id:'booking'})};
    s.assertOrganizerOwnsVendorOrder=jest.fn(async()=>{throw new Error('You do not own this booking.')});
    s.paymentModel={find:jest.fn()};
    await expect(s.getPaymentStatus('booking','other')).rejects.toThrow('do not own');expect(s.paymentModel.find).not.toHaveBeenCalled();
  });
  it.each(['initiateDownPaymentLocked','initiateRemainingPayment'])('%s rejects PKR wallets for USD without creating a transaction', async method => {
    const s:any=Object.create(PaymentService.prototype);
    const booking={_id:'booking',currency:'USD'};
    s.vendorOrderModel={findById:()=>({session:async()=>booking,then:(resolve:any)=>resolve(booking)})};
    s.paymentModel={create:jest.fn()};
    await expect(s[method]('booking','jazzcash','client')).rejects.toThrow('USD bookings require card payment');
    expect(s.paymentModel.create).not.toHaveBeenCalled();
  });

});
