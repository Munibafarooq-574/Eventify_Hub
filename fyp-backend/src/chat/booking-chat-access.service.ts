import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../schemas/user.schema';
import { Order } from '../schemas/order.schema';
import { VendorOrder } from '../schemas/vendor-order.schema';
import { FeatureAccessService } from '../vendor/growth/feature-access.service';
@Injectable()
export class BookingChatAccessService {
 constructor(@InjectModel(User.name) private users:Model<User>, @InjectModel(Order.name) private orders:Model<Order>, @InjectModel(VendorOrder.name) private bookings:Model<VendorOrder>, private features:FeatureAccessService){}
 async isRestricted(userId:string){
  const user=await this.users.findById(userId).select('role').lean();
  return String(user?.role).toLowerCase()==='vendor' && !(await this.features.hasActiveSubscription(userId));
 }
 async assertList(userId:string){if(await this.isRestricted(userId)) throw new ForbiddenException('Your subscription is inactive. Open an existing booking and tap Message to contact its client.');}
 async pairAccess(first:string,second:string,readOnly=false):Promise<boolean>{
  if(!Types.ObjectId.isValid(first)||!Types.ObjectId.isValid(second)||first===second) throw new ForbiddenException('This booking conversation is unavailable.');
  let historyOnly=false;
  for(const [vendor,client] of [[first,second],[second,first]]){
   const user=await this.users.findById(vendor).select('role').lean();
   if(String(user?.role).toLowerCase()!=='vendor')continue;
   const restricted=await this.isRestricted(vendor);
   const parents=await this.orders.find({organizerId:client}).select('_id').lean();
   const relation={vendorId:vendor,orderId:{$in:parents.map(o=>o._id)}};
   const valid=await this.bookings.exists({...relation,status:{$in:['pending','accepted','completed']},paymentStatus:{$nin:['EXPIRED','PAYMENT_EXPIRED']},replacementOutcome:{$ne:'NO_LONGER_ASSIGNED'}});
   if(valid)continue;
   const previous=await this.bookings.exists(relation);
   if(previous){
    if(!readOnly)throw new ForbiddenException('This booking is closed. You can view chat history, but cannot send new messages.');
    historyOnly=true;
   }else if(restricted)throw new ForbiddenException('Messaging is available only for your existing bookings. Open My Orders and tap Message.');
  }
  return historyOnly;
 }
 async assertPair(first:string,second:string){await this.pairAccess(first,second);}
 async assertChat(chatId:string,userId:string,readOnly=false){
  const ids=chatId.split('-');
  if(ids.length!==2||!ids.includes(userId))throw new ForbiddenException('This conversation does not belong to you.');
  return this.pairAccess(ids[0],ids[1],readOnly);
 }
 async assertHistoryBooking(bookingId:string,userId:string,peerId:string){
  if(!Types.ObjectId.isValid(bookingId))throw new ForbiddenException('This booking conversation is unavailable.');
  const booking=await this.bookings.findById(bookingId).select('orderId vendorId').lean();
  const order=booking && await this.orders.findById(booking.orderId).select('organizerId').lean();
  const participants=order && [String(booking!.vendorId),String(order.organizerId)].sort().join('-');
  if(!participants || participants!==[userId,peerId].sort().join('-') || userId===peerId)
   throw new ForbiddenException('This conversation does not belong to you.');
 }
}
