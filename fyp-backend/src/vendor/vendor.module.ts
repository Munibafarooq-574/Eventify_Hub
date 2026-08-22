//fyp-backend/src/vendor/vendor.module.ts
/*import { Module } from '@nestjs/common';
import { VendorService } from './vendor.service';
import { VendorController } from './vendor.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './../auth/schemas/user.schema';
import { Category, CategorySchema } from 'src/auth/schemas/category.schema';
import { FileUploadService } from 'src/file-upload/file-upload.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: User.name, schema: UserSchema },
            { name: Category.name, schema: CategorySchema }
        ]),
    ],
    controllers: [VendorController],
    providers: [VendorService, FileUploadService],
})
export class VendorModule { } */

//fyp-backend/src/vendor/vendor.module.ts
import { Module } from '@nestjs/common';

import { VendorService } from './vendor.service';
import { VendorController } from './vendor.controller';

import { MongooseModule } from '@nestjs/mongoose';

import { User, UserSchema } from './../auth/schemas/user.schema';
import { Category, CategorySchema } from 'src/auth/schemas/category.schema';

import { Order, OrderSchema } from 'src/auth/schemas/order.schema';
import {
    VendorOrder,
    VendorOrderSchema,
} from 'src/auth/schemas/vendor-order.schema';
import { Review, ReviewSchema } from 'src/auth/schemas/review.schema';
import { Message, MessageSchema } from 'src/auth/schemas/message.schema';
import {
    Conversation,
    ConversationSchema,
} from 'src/auth/schemas/conversation.schema';

import { FileUploadService } from 'src/file-upload/file-upload.service';
import { VendorAnalyticsService } from './vendor-analytics.service';

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
    ],

    controllers: [VendorController],

    providers: [
        VendorService,
        VendorAnalyticsService,
        FileUploadService,
    ],
})
export class VendorModule {}