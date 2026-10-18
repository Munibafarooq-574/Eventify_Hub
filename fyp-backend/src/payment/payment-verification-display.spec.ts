import { PaymentVerificationController } from './payment-verification.controller';
describe('Payment verification display',()=>{
  it('shows vendor name, package and actual payment time in the event timezone with escaped values',async()=>{
    const paymentService:any={verifyPaymentReceipt:jest.fn(async()=>({vendorName:'Vendor <10>',packageName:'Photo & video',paidAt:new Date('2026-10-18T07:23:41Z'),eventTimeZone:'Asia/Karachi'}))};
    const controller=new PaymentVerificationController(paymentService);
    const response:any={type:jest.fn().mockReturnThis(),send:jest.fn()};
    await controller.verify('signed-token',response);
    const html=response.send.mock.calls[0][0];
    expect(html).toContain('Vendor Name');expect(html).toContain('Vendor &lt;10&gt;');
    expect(html).toContain('Package Name');expect(html).toContain('Photo &amp; video');
    expect(html).toMatch(/18 Oct 2026, 12:23:41 pm \(Asia\/Karachi\)/i);
    expect(paymentService.verifyPaymentReceipt).toHaveBeenCalledWith('signed-token');
  });
});
