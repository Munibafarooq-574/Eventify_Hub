import { BookingChatAccessService } from './booking-chat-access.service';

import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from './chat.service';
import { getModelToken } from '@nestjs/mongoose';
import { Conversation } from '../schemas/conversation.schema';
import { Message } from '../schemas/message.schema';
import { User } from '../schemas/user.schema';
import { Notification } from '../schemas/notification.schema';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockConversationModel = {
    findOne: jest.fn(),
    updateOne: jest.fn(),
    find: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn(),
    save: jest.fn(),
};

const mockMessageModel = {
    populate: jest.fn().mockReturnThis(),
    countDocuments: jest.fn().mockResolvedValue(0),
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
                { provide: BookingChatAccessService, useValue: { assertPair:jest.fn(), assertList:jest.fn(), assertChat:jest.fn(), assertHistoryBooking:jest.fn() } },
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
        expect(result).toEqual([{ id: 'c1', participants: [], unreadCount: 0 }]);
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



describe('Opening closed booking history',()=>{
 it('returns no history without creating a conversation',async()=>{
  const service:any=Object.create(ChatService.prototype);
  service.bookingAccess={assertHistoryBooking:jest.fn()};
  service.conversationModel={findOne:jest.fn(async()=>null)};
  await expect(service.openBookingHistory('booking','vendor','client')).resolves.toEqual({chatId:null,messages:[],readOnly:true});
  expect(service.bookingAccess.assertHistoryBooking).toHaveBeenCalledWith('booking','vendor','client');
 });
 it('reuses the same existing conversation without changing it',async()=>{
  const service:any=Object.create(ChatService.prototype);
  service.bookingAccess={assertHistoryBooking:jest.fn()};
  service.conversationModel={findOne:jest.fn(async()=>({chatId:'client-vendor'}))};
  service.messageModel={find:jest.fn(()=>({sort:()=>({populate:()=>({exec:async()=>[{_id:'message'}]})})}))};
  await expect(service.openBookingHistory('booking','vendor','client')).resolves.toEqual({chatId:'client-vendor',messages:[{_id:'message'}],readOnly:true});
  expect(service.conversationModel.findOne).toHaveBeenCalledWith({chatId:'client-vendor'});
 });
 it('checks write permission before saving a message or shared history changes',async()=>{
  const service:any=Object.create(ChatService.prototype);
  service.bookingAccess={assertChat:jest.fn(async()=>{throw Error('closed')})};
  service.messageModel=jest.fn();
  await expect(service.createMessage('chat','vendor','client','hello')).rejects.toThrow('closed');
  expect(service.messageModel).not.toHaveBeenCalled();
  await expect(service.pinMessage('chat','message','vendor')).rejects.toThrow('closed');
  await expect(service.unpinMessage('chat','message','vendor')).rejects.toThrow('closed');
 });
});


describe('Booking-authorized chat history',()=>{
 const fixture=(messages:any[])=>{
  const service:any=Object.create(ChatService.prototype);
  service.bookingAccess={assertHistoryBooking:jest.fn(),assertChat:jest.fn(async()=>{throw Error('normal chat not available')})};
  service.conversationModel={findOne:jest.fn(async()=>({chatId:'client-vendor'}))};
  const query:any={sort:()=>query,populate:()=>query,exec:jest.fn(async()=>messages)};
  service.messageModel={find:jest.fn(()=>query)};
  return {service,query};
 };
 it('returns empty messages for an empty conversation without normal-chat requests',async()=>{
  const {service:s}=fixture([]);
  await expect(s.openBookingHistory('booking','vendor','client')).resolves.toEqual({chatId:null,messages:[],readOnly:true});
  expect(s.messageModel.find).toHaveBeenCalledWith({chatId:'client-vendor',deletedFor:{$ne:'vendor'}});
  expect(s.bookingAccess.assertChat).not.toHaveBeenCalled();
 });
 it('returns actual visible history in the same authorized response',async()=>{
  const messages=[{_id:'old',message:'Hello'}];const {service:s}=fixture(messages);
  await expect(s.openBookingHistory('booking','client','vendor')).resolves.toEqual({chatId:'client-vendor',messages,readOnly:true});
  expect(s.bookingAccess.assertHistoryBooking).toHaveBeenCalledWith('booking','client','vendor');
  expect(s.messageModel.find).toHaveBeenCalledWith({chatId:'client-vendor',deletedFor:{$ne:'client'}});
 });
 it('does not mistake a database failure for empty history',async()=>{
  const {service:s,query}=fixture([]);query.exec.mockRejectedValue(Error('unavailable'));
  await expect(s.openBookingHistory('booking','vendor','client')).rejects.toThrow('unavailable');
 });
 it('denies a different booking owner before returning messages',async()=>{
  const {service:s}=fixture([]);s.bookingAccess.assertHistoryBooking.mockRejectedValue(Error('not yours'));
  await expect(s.openBookingHistory('booking','other','vendor')).rejects.toThrow('not yours');
  expect(s.messageModel.find).not.toHaveBeenCalled();
 });
});
