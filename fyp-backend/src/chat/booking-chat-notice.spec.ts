import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, createConnection, Types } from 'mongoose';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { Conversation, ConversationSchema } from '../schemas/conversation.schema';
import { Message, MessageSchema } from '../schemas/message.schema';
import { BookingChatLine, BookingChatOrder, formatBookingNotice } from './booking-chat-notice';

describe('Automatic booking chat', () => {
    let mongo: MongoMemoryServer;
    let db: Connection;
    let chat: ChatService;
    let gateway: ChatGateway;
    const emit = jest.fn();
    const to = jest.fn((_room: string) => ({ emit }));
    const assertPair = jest.fn();
    const assertHistoryBooking = jest.fn();
    const organizerId = new Types.ObjectId();
    const photographer = new Types.ObjectId();
    const baker = new Types.ObjectId();
    const order: BookingChatOrder = {
        organizerId,
        eventName: 'Sara Wedding',
        eventDate: new Date('2099-09-20'),
        eventStartDateTime: new Date('2099-09-20T13:00:00Z'),
    };
    const photography: BookingChatLine = {
        _id: new Types.ObjectId(),
        vendorId: photographer,
        serviceName: 'Premium',
        bookingChatService: 'Photography',
        bookingChatTimeZone: 'Asia/Karachi',
        eventStartDateTime: new Date('2099-09-20T13:00:00Z'),
        eventEndDateTime: new Date('2099-09-20T17:00:00Z'),
    };
    const cake: BookingChatLine = {
        ...photography,
        _id: new Types.ObjectId(),
        vendorId: baker,
        bookingType: 'DELIVERY_BASED',
        bookingChatService: 'Wedding Cake',
        serviceName: 'Three tiers',
        eventStartDateTime: new Date('2099-09-20T12:30:00Z'),
    };

    beforeAll(async () => {
        mongo = await MongoMemoryServer.create({ instance: { args: ['--nounixsocket'] } });
        db = await createConnection(mongo.getUri()).asPromise();
        const messages = db.model(Message.name, MessageSchema);
        const conversations = db.model(Conversation.name, ConversationSchema);
        await Promise.all([messages.init(), conversations.init()]);
        chat = new ChatService({ assertPair, assertHistoryBooking } as any, messages, conversations, {} as any, {} as any);
        gateway = new ChatGateway({} as any, {} as any, chat);
        gateway.server = { to } as any;
    }, 20000);

    afterAll(async () => {
        await db?.close();
        await mongo?.stop();
    });

    it('keeps two vendors in separate existing chat rooms and deduplicates concurrent notices', async () => {
        const existing = await chat.createOrGetConversation(String(organizerId), String(photographer));
        await Promise.all([
            gateway.sendBookingNotice(order, photography, 'requested'),
            gateway.sendBookingNotice(order, photography, 'requested'),
            gateway.sendBookingNotice(order, cake, 'requested'),
            gateway.sendBookingNotice(order, cake, 'requested'),
        ]);

        const messages = await db.model(Message.name).find().lean();
        const photoMessage = messages.find(message => message.receiverId === String(photographer));
        const cakeMessage = messages.find(message => message.receiverId === String(baker));
        expect(messages).toHaveLength(2);
        expect(photoMessage?.chatId).toBe(existing);
        expect(cakeMessage?.chatId).not.toBe(existing);
        expect(photoMessage?.message).toBe('Booking request sent for Sara Wedding on 20 September.\nService: Photography\nPackage: Premium\nTime: 6:00 PM – 10:00 PM');
        expect(cakeMessage?.message).toContain('Delivery: 5:30 PM');
        expect(cakeMessage?.message).not.toContain('Time:');
        expect(await db.model(Conversation.name).countDocuments()).toBe(2);
        expect(await db.model(Conversation.name).findOne({ chatId: existing })).toHaveProperty('lastMessage', photoMessage?._id);
        expect(to.mock.calls).toEqual(expect.arrayContaining([[existing], [cakeMessage?.chatId]]));
        expect(emit).toHaveBeenCalledTimes(2);
    });

    it('posts a distinct confirmation to the organizer and uses the existing push path once', async () => {
        const push = jest.spyOn(chat, 'sendPushNotification').mockResolvedValue(undefined);
        await gateway.sendBookingNotice(order, photography, 'confirmed', true);
        await gateway.sendBookingNotice(order, photography, 'confirmed', true);

        const message = await db.model(Message.name).findOne({ bookingNoticeKey: `${photography._id}:confirmed` });
        expect(message).toMatchObject({ senderId: String(photographer), receiverId: String(organizerId) });
        expect(message?.message).toContain('Booking confirmed for Sara Wedding on 20 September.');
        expect(push).toHaveBeenCalledTimes(1);
        expect(push).toHaveBeenCalledWith('Booking confirmed', message?.message, String(organizerId), 'MESSAGE');
        push.mockRestore();
    });

    it.each(['completed', 'cancelled'] as const)('posts one %s notice in the affected vendor chat', async stage => {
        const booking = { ...cake, _id: new Types.ObjectId() };
        const chatId = await chat.createOrGetConversation(String(organizerId), String(baker));
        if (stage === 'cancelled') assertPair.mockRejectedValue(new Error('Booking is closed'));
        try {
            await Promise.all([
                gateway.sendBookingNotice(order, booking, stage),
                gateway.sendBookingNotice(order, booking, stage),
            ]);
        } finally {
            assertPair.mockReset();
        }

        const messages = await db.model(Message.name).find({ bookingNoticeKey: `${booking._id}:${stage}` });
        expect(messages).toHaveLength(1);
        expect(messages[0]).toMatchObject({ chatId, senderId: String(baker), receiverId: String(organizerId) });
        expect(messages[0].message).toContain(`Booking ${stage} for Sara Wedding on 20 September.`);
        if (stage === 'cancelled') {
            expect(assertHistoryBooking).toHaveBeenCalledWith(String(booking._id), String(organizerId), String(baker));
        }
    });

    it('includes the local day when delivery is scheduled before the event date', () => {
        const notice = formatBookingNotice(order, {
            ...cake, eventStartDateTime: new Date('2099-09-19T12:30:00Z'),
        }, 'confirmed');
        expect(notice).toContain('on 20 September.');
        expect(notice).toContain('Delivery: 19 September, 5:30 PM');
    });

    it('keeps a committed booking successful if conversation storage fails', async () => {
        const failure = jest.spyOn(chat, 'createBookingNotice').mockRejectedValueOnce(new Error('Unavailable'));
        await expect(gateway.sendBookingNotice(order, cake, 'requested')).resolves.toBeUndefined();
        failure.mockRestore();
    });
});
