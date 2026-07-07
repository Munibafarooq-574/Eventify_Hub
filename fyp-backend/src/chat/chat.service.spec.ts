
import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from './chat.service';
import { getModelToken } from '@nestjs/mongoose';
import { Conversation } from '../auth/schemas/conversation.schema';
import { Message } from '../auth/schemas/message.schema';
import { User } from '../auth/schemas/user.schema';
import { Notification } from '../auth/schemas/notification.schema';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockConversationModel = {
    findOne: jest.fn(),
    updateOne: jest.fn(),
    find: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    exec: jest.fn(),
    save: jest.fn(),
};

const mockMessageModel = {
    find: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    exec: jest.fn(),
    save: jest.fn(),
};

const mockUserModel = {
    findById: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
};

const mockNotificationModel = {
    save: jest.fn().mockResolvedValue({ success: true }),
};

describe('ChatService', () => {
    let service: ChatService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ChatService,
                { provide: getModelToken(Conversation.name), useValue: mockConversationModel },
                { provide: getModelToken(Message.name), useValue: mockMessageModel },
                { provide: getModelToken(User.name), useValue: mockUserModel },
                { provide: getModelToken(Notification.name), useValue: mockNotificationModel },
            ],
        }).compile();

        service = module.get<ChatService>(ChatService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // it('should create a new conversation if not exists', async () => {
    //     mockConversationModel.findOne.mockResolvedValue(null);
    //     mockConversationModel.save.mockResolvedValue({ chatId: 'user1-vendor1' });

    //     const chatId = await service.createOrGetConversation('user1', 'vendor1');
    //     expect(chatId).toEqual('user1-vendor1');
    // });

    it('should return existing conversation chatId', async () => {
        mockConversationModel.findOne.mockResolvedValue({ chatId: 'user1-vendor1' });

        const chatId = await service.createOrGetConversation('user1', 'vendor1');
        expect(chatId).toEqual('user1-vendor1');
    });

    it('should get user conversations', async () => {
        const mockConversations = [{ id: 'c1' }];
        mockConversationModel.exec.mockResolvedValue(mockConversations);

        const result = await service.getUserConversations('user1');
        expect(result).toEqual(mockConversations);
    });

    it('should return sorted messages', async () => {
        const messages = [{ message: 'Hi' }];
        mockMessageModel.exec.mockResolvedValue(messages);

        const result = await service.getConversationMessages('chat1');
        expect(result).toEqual(messages);
    });

    it('should throw if user not found for push token', async () => {
        mockUserModel.findById.mockReturnValueOnce({ select: jest.fn().mockResolvedValue(null) });

        await expect(service.getUserPushToken('invalidUser'))
            .rejects
            .toThrow('User with ID invalidUser not found');
    });

    it('should throw if push token is missing', async () => {
        mockUserModel.findById.mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ _id: 'u1' }) });

        await expect(service.getUserPushToken('u1'))
            .rejects
            .toThrow('Push token not found for user ID u1');
    });

    // it('should send push notification', async () => {
    //     mockUserModel.findById.mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ pushToken: 'expoToken' }) });
    //     mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });

    //     const result = await service.sendPushNotification('Test', 'Message', 'u1', 'CHAT');
    //     expect(result.success).toBeTruthy();
    // });

    // it('should save a notification', async () => {
    //     const res = await service.saveNotification('u1', 'Test', 'Body', 'TYPE');
    //     //expect(res.success).toBeTruthy();
    //     expect(res).toBeDefined(); // or
    //     expect(res._id).toBeDefined(); // or
    //     expect(res.userId).toEqual('user1');

    // });

    it('should return messages for a chat', async () => {
        const messages = [{ message: 'Hello' }];
        mockMessageModel.exec.mockResolvedValue(messages);

        const result = await service.getMessagesForConversation('chat1');
        expect(result).toEqual(messages);
    });
});

