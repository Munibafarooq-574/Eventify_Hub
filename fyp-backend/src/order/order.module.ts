import { MongooseModule } from "@nestjs/mongoose";
import { Order, OrderSchema } from "../schemas/order.schema";
import { VendorOrder, VendorOrderSchema } from "../schemas/vendor-order.schema";
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { Module } from '@nestjs/common';
import { User, UserSchema } from "src/schemas/user.schema";
import { Notification, NotificationSchema } from "src/schemas/notification.schema";
import { VendorAvailabilityModule } from "../vendor-availability/vendor-availability.module";
import { PayoutModule } from "../payout/payout.module";
import { CommissionConfig, CommissionConfigSchema } from "src/schemas/commission-config.schema";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Order.name, schema: OrderSchema },
            { name: User.name, schema: UserSchema },
            { name: VendorOrder.name, schema: VendorOrderSchema },
            { name: Notification.name, schema: NotificationSchema },
            { name: CommissionConfig.name, schema: CommissionConfigSchema },

            
        ]),
        VendorAvailabilityModule,
        PayoutModule,
    ],
    controllers: [OrderController],
    providers: [OrderService],
})
export class OrderModule { }
