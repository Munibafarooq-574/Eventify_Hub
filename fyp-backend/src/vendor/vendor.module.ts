//fyp-backend/src/vendor/vendor.module.ts
import { Module } from '@nestjs/common';

import { VendorService } from './vendor.service';
import { VendorController } from './vendor.controller';

import { MongooseModule } from '@nestjs/mongoose';

import { User, UserSchema } from '../schemas/user.schema';
import { Category, CategorySchema } from 'src/schemas/category.schema';

import { Order, OrderSchema } from 'src/schemas/order.schema';
import {
    VendorOrder,
    VendorOrderSchema,
} from 'src/schemas/vendor-order.schema';
import { Review, ReviewSchema } from 'src/schemas/review.schema';
import { Message, MessageSchema } from 'src/schemas/message.schema';
import {
    Conversation,
    ConversationSchema,
} from 'src/schemas/conversation.schema';

import { FileUploadService } from 'src/file-upload/file-upload.service';
import { VendorAnalyticsService } from './vendor-analytics.service';
import { VendorGrowthModule } from './growth/vendor-growth.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: User.name, schema: UserSchema },
            { name: Category.name, schema: CategorySchema },

            { name: Order.name, schema: OrderSchema },
            { name: VendorOrder.name, schema: VendorOrderSchema },
            { name: Review.name, schema: ReviewSchema },
            { name: Message.name, schema: MessageSchema },
            { name: Conversation.name, schema: ConversationSchema },
        ]),
        VendorGrowthModule,
    ],

    controllers: [VendorController],

    providers: [
        VendorService,
        VendorAnalyticsService,
        FileUploadService,
    ],
})
export class VendorModule {}