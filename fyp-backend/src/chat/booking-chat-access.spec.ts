import { Types } from 'mongoose';
import { BookingChatAccessService } from './booking-chat-access.service';
import { ChatGateway } from './chat.gateway';
const id=()=>String(new Types.ObjectId());
function fixture(active=false,booking=true){
 const vendor=id(),client=id();const s:any=Object.create(BookingChatAccessService.prototype);
 s.users={findById:(v:string)=>({select:()=>({lean:async()=>({role:v===vendor?'Vendor':'Organizer'})})})};
 s.features={hasActiveSubscription:jest.fn(async()=>active)};
 s.orders={find:jest.fn(()=>({select:()=>({lean:async()=>[{_id:id()}]})}))};
 s.bookings={exists:jest.fn(async()=>booking?{_id:id()}:null)};return{s,vendor,client};
}
describe('Inactive vendor booking-only messaging',()=>{
 it('blocks conversation lists for an inactive vendor',async()=>{const f=fixture();await expect(f.s.assertList(f.vendor)).rejects.toThrow('Open an existing booking')});
 it('preserves active vendor and client conversation lists',async()=>{const f=fixture(true);await expect(f.s.assertList(f.vendor)).resolves.toBeUndefined();await expect(f.s.assertList(f.client)).resolves.toBeUndefined()});
 it('allows existing booking in either direction and preserves participant ownership',async()=>{const f=fixture();await f.s.assertPair(f.vendor,f.client);await f.s.assertPair(f.client,f.vendor);await f.s.assertChat([f.vendor,f.client].sort().join('-'),f.vendor);expect(f.s.bookings.exists).toHaveBeenCalled();await expect(f.s.assertChat([f.vendor,f.client].sort().join('-'),id())).rejects.toThrow('belong')});
 it('uses canonical booking states, owner and reassignment restrictions',async()=>{const f=fixture();await f.s.assertPair(f.vendor,f.client);expect(f.s.orders.find).toHaveBeenCalledWith({organizerId:f.client});expect(f.s.bookings.exists.mock.calls[0][0]).toMatchObject({vendorId:f.vendor,status:{$in:['pending','accepted','completed']},replacementOutcome:{$ne:'NO_LONGER_ASSIGNED'},paymentStatus:{$nin:['EXPIRED','PAYMENT_EXPIRED']}})});
 it('blocks unrelated clients and fails closed if subscription check fails',async()=>{const f=fixture(false,false);await expect(f.s.assertPair(f.vendor,f.client)).rejects.toThrow('existing bookings');f.s.features.hasActiveSubscription.mockRejectedValue(new Error('unavailable'));await expect(f.s.assertPair(f.vendor,f.client)).rejects.toThrow('unavailable')});
 it('does not add subscription booking restrictions for active vendors',async()=>{const f=fixture(true,false);await f.s.assertPair(f.vendor,f.client);expect(f.s.bookings.exists).not.toHaveBeenCalled()});
 it('authenticates socket sender before a message can be stored',async()=>{const g:any=Object.create(ChatGateway.prototype);g.logger={log:jest.fn()};g.jwt={verifyAsync:jest.fn(async()=>({id:'other'}))};g.config={get:()=> 'secret'};g.chatService={createMessage:jest.fn()};const c:any={emit:jest.fn()};await g.handleMessage(c,{user:id(),receiverId:id(),chatId:'fake',token:'bad'});expect(g.chatService.createMessage).not.toHaveBeenCalled();expect(c.emit).toHaveBeenCalledWith('chatError',expect.anything())});
 it('does not join a room when booking access is denied',async()=>{const g:any=Object.create(ChatGateway.prototype);const user=id();g.jwt={verifyAsync:async()=>({id:user})};g.config={get:()=> 'secret'};g.chatService={assertBookingChatAccess:jest.fn(async()=>{throw Error('denied')})};const c:any={emit:jest.fn(),join:jest.fn()};await g.handleJoinConversation(c,{userId:user,chatId:'blocked',token:'valid'});expect(c.join).not.toHaveBeenCalled()});
});

describe('Expired subscription booking-state access regression',()=>{
 it.each([
  ['pending','UNPAID',true],
  ['accepted','PAYMENT_REQUIRED',true],
  ['accepted','PARTIALLY_PAID',true],
  ['accepted','PAID',true],
  ['completed','PAID',true],
  ['expired','UNPAID',false],
  ['expired','PAYMENT_EXPIRED',false],
  ['pending','EXPIRED',false],
  ['cancelled_by_vendor','UNPAID',false],
  ['rejected','UNPAID',false],
 ])('%s / %s preserves booking-based access (%s)',async(status,paymentStatus,allowed)=>{
  const f=fixture(false);
  f.s.bookings.exists.mockImplementation(async(filter:any)=>filter.status.$in.includes(status)&&!filter.paymentStatus.$nin.includes(paymentStatus)?{_id:id()}:null);
  const chatId=[f.vendor,f.client].sort().join('-');
  for(const participant of [f.vendor,f.client]) {
   if(allowed) await expect(f.s.assertChat(chatId,participant)).resolves.toBeUndefined();
   else await expect(f.s.assertChat(chatId,participant)).rejects.toThrow('existing bookings');
  }
 });
});
