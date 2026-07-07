import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notifications.service';
import { getModelToken } from '@nestjs/mongoose';
import { User } from 'src/auth/schemas/user.schema';
import { Notification } from 'src/auth/schemas/notification.schema';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockUserModel = {
    findById: jest.fn(),
};

const mockNotificationModel = {
    find: jest.fn().mockReturnThis(),
    sort: jest.fn(),
};

describe('NotificationService', () => {
    let service: NotificationService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NotificationService,
                { provide: getModelToken(User.name), useValue: mockUserModel },
                { provide: getModelToken(Notification.name), useValue: mockNotificationModel },
            ],
        }).compile();

        service = module.get<NotificationService>(NotificationService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('sendExpoPush', () => {
        it('should send a push notification successfully', async () => {
            mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });

            const response = await service.sendExpoPush('token', 'Title', 'Body');
            expect(response).toEqual({ success: true });
        });

        it('should throw if push fails', async () => {
            mockedAxios.post.mockRejectedValueOnce(new Error('Push failed'));

            await expect(service.sendExpoPush('token', 'Title', 'Body')).rejects.toThrow('Push failed');
        });
    });

    describe('getUserPushToken', () => {
        it('should return push token', async () => {
            mockUserModel.findById.mockReturnValueOnce({
                select: jest.fn().mockResolvedValue({ pushToken: 'expo-token' }),
            });

            const token = await service.getUserPushToken('user123');
            expect(token).toBe('expo-token');
        });

        it('should throw if user not found', async () => {
            mockUserModel.findById.mockReturnValueOnce({
                select: jest.fn().mockResolvedValue(null),
            });

            await expect(service.getUserPushToken('bad')).rejects.toThrow();
        });

        it('should throw if push token missing', async () => {
            mockUserModel.findById.mockReturnValueOnce({
                select: jest.fn().mockResolvedValue({}),
            });

            await expect(service.getUserPushToken('missing')).rejects.toThrow();
        });
    });

    describe('sendPushNotification', () => {
        it('should send push using userId', async () => {
            jest.spyOn(service, 'getUserPushToken').mockResolvedValueOnce('expo-token');
            mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });

            const result = await service.sendPushNotification('Hello', 'World', 'user123');
            expect(result).toEqual({ success: true });
        });
    });

    describe('getNotificationsByUserId', () => {
        it('should return notifications array', async () => {
            const mockData = [{ message: 'Test' }];
            mockNotificationModel.sort.mockResolvedValueOnce(mockData);

            const result = await service.getNotificationsByUserId('user123');
            expect(result).toEqual(mockData);
        });
    });
});
