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
 async assertPair(first:string,second:string){
  if(!Types.ObjectId.isValid(first)||!Types.ObjectId.isValid(second)||first===second) throw new ForbiddenException('This booking conversation is unavailable.');
  for(const [vendor,client] of [[first,second],[second,first]]){
   if(!(await this.isRestricted(vendor)))continue;
   const parents=await this.orders.find({organizerId:client}).select('_id').lean();
   const booking=await this.bookings.exists({vendorId:vendor,orderId:{$in:parents.map(o=>o._id)},status:{$in:['pending','accepted','completed']},paymentStatus:{$nin:['EXPIRED','PAYMENT_EXPIRED']},replacementOutcome:{$ne:'NO_LONGER_ASSIGNED'}});
   if(!booking)throw new ForbiddenException('Messaging is available only for your existing bookings. Open My Orders and tap Message.');
  }
 }
 async assertChat(chatId:string,userId:string){const ids=chatId.split('-');if(ids.length!==2||!ids.includes(userId))throw new ForbiddenException('This conversation does not belong to you.');await this.assertPair(ids[0],ids[1]);}
}
