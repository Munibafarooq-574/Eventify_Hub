import { Test, TestingModule } from '@nestjs/testing';
import { NotificationController } from './notifications.controller';
import { NotificationService } from './notifications.service';
import { NotFoundException } from '@nestjs/common';

const mockNotificationService = {
    sendExpoPush: jest.fn(),
    getNotificationsByUserId: jest.fn(),
};

describe('NotificationController', () => {
    let controller: NotificationController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [NotificationController],
            providers: [
                { provide: NotificationService, useValue: mockNotificationService },
            ],
        }).compile();

        controller = module.get<NotificationController>(NotificationController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('send()', () => {
        it('should call sendExpoPush and return result', async () => {
            const dto = { token: 'token123', title: 'Hi', message: 'Test' };
            mockNotificationService.sendExpoPush.mockResolvedValue({ success: true });

            const result = await controller.send(dto);
            expect(result).toEqual({ success: true });
        });
    });

    describe('getNotificationsByUserId()', () => {
        it('should return notifications for user', async () => {
            const data = [{ msg: 'test' }];
            mockNotificationService.getNotificationsByUserId.mockResolvedValue(data);

            const result = await controller.getNotificationsByUserId('user123');
            expect(result.data).toEqual(data);
        });

        it('should throw if no notifications found', async () => {
            mockNotificationService.getNotificationsByUserId.mockResolvedValue([]);

            await expect(controller.getNotificationsByUserId('noUser')).rejects.toThrow(NotFoundException);
        });
    });
});
