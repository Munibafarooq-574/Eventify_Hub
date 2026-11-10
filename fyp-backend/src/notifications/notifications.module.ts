import { Order, OrderSchema } from '../schemas/order.schema';
import { City, CitySchema } from '../schemas/city.schema';
// src/reviews/reviews.module.ts
import { Module } from '@nestjs/common';
import { NotificationController } from './notifications.controller';
import { NotificationService } from './notifications.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/schemas/user.schema';
import { Notification, NotificationSchema } from 'src/schemas/notification.schema';

@Module({
    imports: [MongooseModule.forFeature([
        { name: Order.name, schema: OrderSchema }, { name: City.name, schema: CitySchema }, { name: User.name, schema: UserSchema }, { name: Notification.name, schema: NotificationSchema },])],
    controllers: [NotificationController],
    providers: [NotificationService],
    exports: [NotificationService]
})
export class NotificationsModule { }
