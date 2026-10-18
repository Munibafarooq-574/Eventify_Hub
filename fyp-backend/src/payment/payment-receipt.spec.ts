import { PaymentService } from './payment.service';
const base = {
    amount:1500,paymentType:'DOWN_PAYMENT',method:'CARD',transactionRef:'test-ref',paidAt:new Date('2026-10-17T09:01:00Z'),
    eventName:'Birthday',eventDate:new Date('2026-11-09T00:00:00Z'),eventTime:'13:00',eventDurationMinutes:180,
    vendorName:'Vendor11',categoryName:'Cakes',packageName:'Cake package',bookingType:'DELIVERY_BASED',eventTimeZone:'Asia/Karachi',
    serviceStart:new Date('2026-11-09T07:00:00Z'),serviceEnd:new Date('2026-11-09T09:00:00Z'),
    bookingTotal:3000,previouslyPaid:0,totalPaid:1500,remainingBalance:1500,paymentStatus:'PARTIALLY_PAID',
};
const service = () => Object.create(PaymentService.prototype) as any;
const text = (html: string) => html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');
describe('Payment receipt display',()=>{
    it('shows twelve-hour event time, real category and one delivery timestamp in the event timezone',()=>{
        const html=service().buildPaymentReceiptEmail(base);const content=text(html);
        expect(content).toMatch(/Event Time: 1:00 PM/);
        expect(content).toMatch(/Category: Cakes/);expect(content).toMatch(/Package: Cake package/);
        expect(content).toMatch(/Delivery at: .*12:00 pm \(Asia\/Karachi\)/i);
        expect(content).not.toMatch(/Service Start:|Service End:|Service: Vendor11/);
        expect(content).toMatch(/Remaining Balance: Rs. 1,500/);
    });
    it.each(['DURATION_BASED','SETUP_BASED','CUSTOM','TIME_SLOT_BASED',null])('keeps actual stored start/end for %s',bookingType=>{
        const content=text(service().buildPaymentReceiptEmail({...base,bookingType}));
        expect(content).toMatch(/Service Start: .*12:00 pm/i);expect(content).toMatch(/Service End: .*2:00 pm/i);
        expect(content).not.toMatch(/Delivery at:/);
    });
    it.each([['00:00','12:00 AM'],['12:00','12:00 PM'],['23:05','11:05 PM'],['1:00 pm','1:00 PM']])('formats event time %s', (eventTime,expected)=>{
        expect(text(service().buildPaymentReceiptEmail({...base,eventTime}))).toContain(`Event Time: ${expected}`);
    });
    it.each([
        ['America/New_York','2026-07-09T16:00:00Z'],
        ['America/New_York','2026-11-09T17:00:00Z'],
        ['Asia/Kathmandu','2026-11-09T06:15:00Z'],
    ])('uses %s timezone including DST and fractional offsets',(eventTimeZone,instant)=>{
        const content=text(service().buildPaymentReceiptEmail({...base,eventTimeZone,serviceStart:new Date(instant)}));
        expect(content).toMatch(/Delivery at: .*12:00 pm/i);
        expect(content).toContain(`(${eventTimeZone})`);
        expect(content).toMatch(/Event Date: 09-Nov-2026/);
    });
    it('escapes category and package text and labels legacy timestamps explicitly as UTC',()=>{
        const html=service().buildPaymentReceiptEmail({...base,categoryName:'<script>bad</script>',packageName:'A & B',eventTimeZone:null});
        expect(html).toContain('&lt;script&gt;');expect(html).not.toContain('<script>');expect(html).toContain('A &amp; B');expect(html).toContain('(UTC)');
    });
    it.each([undefined,true,false])('confirmation respects receipt preference %s and keeps booked metadata',async(sendReceipt)=>{
        const s=service();const query=(value:any)=>{const q:any={lean:jest.fn(async()=>value),select:jest.fn(),populate:jest.fn()};q.select.mockReturnValue(q);q.populate.mockReturnValue(q);return q;};
        const vendor={name:'Vendor11',buisnessCategory:{name:'Cakes'},packages:[{_id:'other',packageName:'Wrong',bookingType:'DURATION_BASED'},{_id:'cake',packageName:'Cake package',bookingType:'DELIVERY_BASED'}]};
        const order=query({eventName:'Birthday',eventTime:'13:00',eventCityId:{timeZone:'Asia/Karachi'}});
        const vendorQuery=query(vendor);
        s.userModel={findById:(id:string)=>id==='client'?query({email:'test@example.invalid'}):vendorQuery};
        s.orderModel={findById:()=>order};
        s.paymentModel={findById:async()=>({status:'PENDING',sendReceipt,organizerId:'client',vendorOrderId:'booking',amount:1500,save:async()=>{}}),find:()=>query([{amount:1500}])};
        s.vendorOrderModel={findById:async()=>({_id:'booking',orderId:'event',vendorId:'vendor',packageId:'cake',price:3000,status:'accepted',eventStartDateTime:base.serviceStart,eventEndDateTime:base.serviceEnd,save:async()=>{}})};
        s.emailService={sendTransactionalEmail:jest.fn(async()=>{})};
        await s.confirmPayment('payment');
        expect(order.populate).toHaveBeenCalledWith({path:'eventCityId',select:'timeZone'});
        expect(vendorQuery.populate).toHaveBeenCalledWith({path:'buisnessCategory',select:'name'});
        if(sendReceipt===false){expect(s.emailService.sendTransactionalEmail).not.toHaveBeenCalled();return;}
        expect(s.emailService.sendTransactionalEmail).toHaveBeenCalledTimes(1);
        const content=text(s.emailService.sendTransactionalEmail.mock.calls[0][0].html);
        expect(content).toMatch(/Category: Cakes/);expect(content).toMatch(/Package: Cake package/);expect(content).toMatch(/Delivery at: .*12:00 pm/i);
        expect(content).not.toContain('Package: Wrong');
    });
});
