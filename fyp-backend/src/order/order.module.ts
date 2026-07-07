import { MongooseModule } from "@nestjs/mongoose";
import { Order, OrderSchema } from "../auth/schemas/order.schema";
import { VendorOrder, VendorOrderSchema } from "../auth/schemas/vendor-order.schema";
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { Module } from '@nestjs/common';
import { User, UserSchema } from "src/auth/schemas/user.schema";
import { Notification, NotificationSchema } from "src/auth/schemas/notification.schema";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Order.name, schema: OrderSchema },
            { name: User.name, schema: UserSchema },
            { name: VendorOrder.name, schema: VendorOrderSchema },
            { name: Notification.name, schema: NotificationSchema }
        ]),
    ],
    controllers: [OrderController],
    providers: [OrderService],
})
export class OrderModule { }
