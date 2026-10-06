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
import { VendorGrowthModule } from "../vendor/growth/vendor-growth.module";
import { CityModule } from '../city/city.module';
import {
  Category,
  CategorySchema,
} from '../schemas/category.schema';
import { RescheduleRequest, RescheduleRequestSchema } from '../schemas/reschedule-request.schema';
import { ChatModule } from '../chat/chat.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Order.name, schema: OrderSchema },
            { name: User.name, schema: UserSchema },
            { name: VendorOrder.name, schema: VendorOrderSchema },
            { name: Notification.name, schema: NotificationSchema },
            { name: CommissionConfig.name, schema: CommissionConfigSchema },
            { name: Category.name, schema: CategorySchema, },
            { name: RescheduleRequest.name, schema: RescheduleRequestSchema },

            
        ]),
        VendorAvailabilityModule,
        PayoutModule,
        VendorGrowthModule,
        CityModule,
        ChatModule,
    ],
    controllers: [OrderController],
    providers: [OrderService],
})
export class OrderModule { }
