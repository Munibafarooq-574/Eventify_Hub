// src/reviews/reviews.module.ts
import { Module } from '@nestjs/common';
import { NotificationController } from './notifications.controller';
import { NotificationService } from './notifications.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/auth/schemas/user.schema';
import { Notification, NotificationSchema } from 'src/auth/schemas/notification.schema';

@Module({
    imports: [MongooseModule.forFeature([
        { name: User.name, schema: UserSchema }, { name: Notification.name, schema: NotificationSchema },])],
    controllers: [NotificationController],
    providers: [NotificationService],
    exports: [NotificationService]
})
export class NotificationsModule { }
