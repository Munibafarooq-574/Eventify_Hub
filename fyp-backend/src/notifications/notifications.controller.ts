// notification.controller.ts
import { Controller, Post, Body, Get, NotFoundException, Param } from '@nestjs/common';
import { NotificationService } from './notifications.service';

@Controller('notifications')
export class NotificationController {
    constructor(private notificationService: NotificationService) { }

    @Post('send')
    send(@Body() body: { token: string; title: string; message: string }) {
        return this.notificationService.sendExpoPush(body.token, body.title, body.message);
    }

    @Get(':userId')
    async getNotificationsByUserId(@Param('userId') userId: string) {
        const notifications = await this.notificationService.getNotificationsByUserId(userId);

        if (!notifications.length) {
            throw new NotFoundException(`No notifications found for user ID ${userId}`);
        }

        return { success: true, count: notifications.length, data: notifications };
    }
}
