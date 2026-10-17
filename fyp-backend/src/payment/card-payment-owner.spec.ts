import { PaymentService } from './payment.service';
describe('Card checkout account identity',()=>{
  it('returns only the authenticated booking owner after the existing ownership check',async()=>{
    const s:any=Object.create(PaymentService.prototype);
    s.vendorOrderModel={findById:async()=>({_id:'booking',price:3000,paymentStatus:'PAYMENT_REQUIRED',downPaymentAmount:1500})};
    s.assertOrganizerOwnsVendorOrder=jest.fn(async()=>({organizerId:'verified-client'}));
    s.paymentModel={find:()=>({lean:async()=>[]}),findOne:()=>({sort:()=>({lean:async()=>null})})};
    const result=await s.getPaymentStatus('booking','verified-client');
    expect(result.organizerId).toBe('verified-client');expect(result.downPaymentAmount).toBe(1500);
    expect(s.assertOrganizerOwnsVendorOrder).toHaveBeenCalledWith('booking','verified-client');
  });
  it('does not return identity or financial records for another client booking',async()=>{
    const s:any=Object.create(PaymentService.prototype);s.vendorOrderModel={findById:async()=>({_id:'booking'})};
    s.assertOrganizerOwnsVendorOrder=jest.fn(async()=>{throw new Error('You do not own this booking.')});
    s.paymentModel={find:jest.fn()};
    await expect(s.getPaymentStatus('booking','other')).rejects.toThrow('do not own');expect(s.paymentModel.find).not.toHaveBeenCalled();
  });
});
