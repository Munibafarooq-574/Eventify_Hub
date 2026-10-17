import { JwtAuthGuard } from '../auth/jwt-auth.guard';
// notification.controller.ts
import { Controller, Post, Body, Get, Param, Request, UseGuards, ForbiddenException, Header } from '@nestjs/common';
import { NotificationService } from './notifications.service';

@Controller('notifications')
export class NotificationController {
    constructor(private notificationService: NotificationService) { }

    @Post('send')
    send(@Body() body: { token: string; title: string; message: string }) {
        return this.notificationService.sendExpoPush(body.token, body.title, body.message);
    }

    @Get(':userId')
    @Header('Cache-Control', 'private, no-store')
    @UseGuards(JwtAuthGuard)
    async getNotificationsByUserId(@Param('userId') userId: string, @Request() req: any) {
        if (!req.user?.id || String(req.user.id) !== userId) throw new ForbiddenException('You can only read your own notifications.');
        const notifications = await this.notificationService.getNotificationsByUserId(userId);

        return { success: true, count: notifications.length, data: notifications };
    }
}
