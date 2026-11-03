import type { BookingChatStage } from './booking-chat-notice';
import { BookingChatAccessService } from './booking-chat-access.service';

// fyp-backend/src/chat/chat.service.ts
import {
    PinDuration,
    PIN_DURATION_MS,
    isValidPinDuration,
} from './pin-duration.type';
import { Injectable, NotFoundException, ForbiddenException, BadRequestException, } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message } from '../schemas/message.schema';
import { Conversation } from 'src/schemas/conversation.schema';
import axios from 'axios';
import { User } from 'src/schemas/user.schema';
import { Notification } from 'src/schemas/notification.schema';

const REPLY_PREVIEW_FIELDS =
    'message imageUrl videoUrl audioUrl senderId chatId isDeletedForEveryone';

@Injectable()
export class ChatService {
    constructor(
        private readonly bookingAccess: BookingChatAccessService,
        @InjectModel(Message.name) private messageModel: Model<Message>,
        @InjectModel(Conversation.name) private conversationModel: Model<Conversation>,
        @InjectModel(User.name) private userModel: Model<User>,
        @InjectModel(Notification.name) private notificationModel: Model<Notification>,
    ) { }

    async assertBookingChatAccess(chatId: string, userId: string) {
        await this.bookingAccess.assertChat(chatId, userId, true);
    }

    async openBookingHistory(bookingId: string, userId: string, peerId: string) {
        await this.bookingAccess.assertHistoryBooking(bookingId, userId, peerId);
        const chatId = [userId, peerId].sort().join('-');
        const conversation = await this.conversationModel.findOne({ chatId });
        const messages = conversation ? await this.readMessages(chatId, userId) : [];
        return { chatId: messages.length ? chatId : null, messages, readOnly: true };
    }

    async chatReadOnly(chatId: string, userId: string) {
        return this.bookingAccess.assertChat(chatId, userId, true);
    }

    async createConversation(participants: string[]): Promise<Conversation> {
        const [first, second] = participants;
        await this.bookingAccess.assertPair(first, second);
        return this.findOrCreatePair(first, second);
    }

    async createOrGetConversation(userId: string, vendorId: string): Promise<string> {
        const conversation = await this.createConversation([userId, vendorId]);
        return conversation.chatId;
    }

    private async findOrCreatePair(first: string, second: string): Promise<Conversation> {
        const participants = [first, second].sort();
        const chatId = participants.join('-');
        const existing = await this.conversationModel.findOne({ chatId });
        if (existing) return existing;
        try {
            return await new this.conversationModel({ chatId, participants }).save();
        } catch (error) {
            if ((error as { code?: number }).code !== 11000) throw error;
            const conversation = await this.conversationModel.findOne({ chatId });
            if (!conversation) throw error;
            return conversation;
        }
    }

    async createBookingNotice(
        organizerId: string, vendorId: string, bookingId: string, stage: BookingChatStage, content: string,
    ): Promise<Message | null> {
        // Use the same participant access and canonical pair as manually opened chats.
        const chatId = await this.createOrGetConversation(organizerId, vendorId);
        const [senderId, receiverId] = stage === 'requested'
            ? [organizerId, vendorId]
            : [vendorId, organizerId];
        let message: Message;
        try {
            message = await this.messageModel.create({
                chatId, senderId, receiverId, message: content,
                bookingNoticeKey: `${bookingId}:${stage}`,
            });
        } catch (error) {
            if ((error as { code?: number }).code === 11000) return null;
            throw error;
        }
        await this.conversationModel.updateOne(
            { chatId, $or: [{ lastMessage: null }, { lastMessage: { $lt: message._id } }] },
            { lastMessage: message._id },
        );
        return message;
    }

    // Get all conversations for a user
    async getUserConversations(userId: string): Promise<Conversation[]> {
        await this.bookingAccess.assertList(userId);
        const conversations = await this.conversationModel
            .find({ participants: userId })
            .populate({
                path: 'participants',
                match: { _id: { $ne: userId } },
            })
            .populate({
                path: 'lastMessage',
                select: 'message imageUrl videoUrl audioUrl audioDurationMs timestamp isDeletedForEveryone deliveredAt seenAt',
            })
            .lean()
            .exec();

        // Remove duplicate chatIds
        const uniqueConversations = conversations.filter(
            (conversation, index, self) =>
                index ===
                self.findIndex(
                    (c) => c.chatId === conversation.chatId,
                ),
        );

        const conversationsWithUnread = await Promise.all(
            uniqueConversations.map(async (conversation: any) => {
                const unreadCount = await this.messageModel.countDocuments({
                    chatId: conversation.chatId,
                    receiverId: userId,
                    isRead: false,
                });

                // Use the vendor brand photo or the client's account profile photo.
                // isOnline/lastSeen come through automatically once the
                // participant doc has those fields (Phase 7.1).
                const participants = (conversation.participants || []).map((p: any) => ({
                    ...p,
                    avatar: String(p.role).toLowerCase() === 'vendor'
                        ? p.contactDetails?.brandLogo || p.coverImage || p.images?.[0] || ''
                        : p.profileImage || '',
                    displayName: p.contactDetails?.brandName || p.name || "",
                }));
                return {
                    ...conversation,
                    participants,
                    unreadCount,
                };
            }),
        );

        return conversationsWithUnread as any;
    }


    // Get all messages for a conversation (chatId)
    async getConversationMessages(chatId: string, userId?: string): Promise<Message[]> {
        if (userId) await this.bookingAccess.assertChat(chatId, userId, true);
        return this.readMessages(chatId, userId);
    }

    private readMessages(chatId: string, userId?: string): Promise<Message[]> {
        const filter: any = { chatId };
        if (userId) {
            filter.deletedFor = { $ne: userId };
        }
        return this.messageModel
            .find(filter)
            .sort({ timestamp: -1 })
            .populate({ path: 'repliedToMessageId', select: REPLY_PREVIEW_FIELDS })
            .exec();
    }
    // Create a new message for a conversation
        async createMessage(
    chatId: string,
    senderId: string,
    receiverId: string,
    content: string,
    imageUrl: string = '',
    videoUrl: string = '',
    repliedToMessageId?: string | null,
    thumbnailUrl: string = '',
    videoDurationMs: number = 0,
    audioUrl: string = '',           // 🆕 ADD
    audioDurationMs: number = 0,     // 🆕 ADD
): Promise<Message> {

        await this.bookingAccess.assertChat(chatId, senderId);
        if ([senderId, receiverId].sort().join('-') !== chatId || senderId === receiverId) {
            throw new ForbiddenException('This booking conversation is unavailable.');
        }

        // 🟢 NEW (Reply feature) — only attach the reference if the
        // referenced message actually exists in THIS conversation. This
        // stops a client from linking a reply to a message that belongs to
        // a different conversation entirely.
        let validReplyId: string | null = null;
        if (repliedToMessageId) {
            const original = await this.messageModel
                .findOne({ _id: repliedToMessageId, chatId })
                .select('_id');
            if (original) {
                validReplyId = repliedToMessageId;
            }
        }

            const message = new this.messageModel({
        chatId,
        senderId,
        receiverId,
        message: content,
        imageUrl,
        videoUrl,
        thumbnailUrl,
        videoDurationMs,
        audioUrl,             // 🆕 ADD
        audioDurationMs,      // 🆕 ADD
        isRead: false,
        isDeletedForEveryone: false,
        repliedToMessageId: validReplyId,
    });

        await message.save();

        // Populate the reply reference (if any) so the payload we broadcast
        // over the socket already contains the quoted-message preview and
        // the mobile client doesn't need a second round trip.
        if (validReplyId) {
            await message.populate({
                path: 'repliedToMessageId',
                select: REPLY_PREVIEW_FIELDS,
            });
        }

        const saved = await this.messageModel.findById(message._id).lean();

        console.log("SAVED DOC =", saved);

        // Phir conversation ka lastMessage update karo
        await this.conversationModel.updateOne(
            { chatId },
            { lastMessage: message._id },
        );

        const conversationObj = await this.conversationModel
            .findOne({ chatId })
            .populate('participants');

        const otherUser = conversationObj?.participants.find(
            x => x._id && !x._id.equals(senderId),
        );

        try {
            console.log("Sending Push in messages");
            const notificationBody = videoUrl
    ? "🎥 Video"
    : imageUrl
        ? "📷 Photo"
        : content;

await this.sendPushNotification(
    "New Message",
    notificationBody,
    otherUser?._id,
    "MESSAGE",
);
        } catch (error) {
            console.log("Sending Push in messages", error);
        }

        return message;
    }


    // Get all messages for a conversation
    async getMessagesForConversation(chatId: string, userId?: string): Promise<Message[]> {
        const filter: any = { chatId };
        if (userId) {
            filter.deletedFor = { $ne: userId };
        }
        return this.messageModel
            .find(filter)
            .sort({ timestamp: 1 })
            .populate({ path: 'repliedToMessageId', select: REPLY_PREVIEW_FIELDS })
            .exec();
    }

    // Existing "mark as read on join" — now also stamps seenAt, and backfills
    // deliveredAt for any message that somehow never got a delivery stamp
    // (e.g. receiver was offline when it was sent).
    async markMessagesAsRead(chatId: string, userId: string, seenAt: Date = new Date()) {
        await this.messageModel.updateMany(
            {
                chatId,
                receiverId: userId,
                isRead: false,
            },
            [
                {
                    $set: {
                        isRead: true,
                        seenAt,
                        deliveredAt: { $ifNull: ['$deliveredAt', seenAt] },
                    },
                },
            ] as any,
        );
    }

    async getUserPushToken(userId: string): Promise<string> {
        const user = await this.userModel.findById(userId).select('pushToken');
        console.log(user?.email);
        if (!user) {
            throw new NotFoundException(`User with ID ${userId} not found`);
        }

        if (!user.pushToken) {
            throw new NotFoundException(`Push token not found for user ID ${userId}`);
        }

        return user.pushToken;
    }

    async sendPushNotification(title: string, body: string, userId: string, type: string) {
        const token = await this.getUserPushToken(userId);
        console.log("Token", token);
        const message = {
            to: token,
            sound: 'default',
            title,
            body,
        };

        try {
            const response = await axios.post('https://exp.host/--/api/v2/push/send', message, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            await this.saveNotification(userId, title, body, type);
            return response.data;
        } catch (error) {
            console.error('Expo push error:', error);
            throw error;
        }
    }

    async saveNotification(userId: string, title: string, body: string, type: string) {
        const notification = new this.notificationModel({
            userId,
            title,
            body,
            type,
        });
        return await notification.save();
    }

    // 🔵 Delete for Me
    async deleteMessageForMe(messageId: string, userId: string): Promise<void> {
        await this.messageModel.updateOne(
            { _id: messageId },
            { $addToSet: { deletedFor: userId } },
        );
    }

    // 🔵 Delete for Everyone
    async deleteMessageForEveryone(
        messageId: string,
        userId: string
    ): Promise<Message> {

        const msg = await this.messageModel.findById(messageId);

        if (!msg) {
            throw new NotFoundException("Message not found");
        }


        if (msg.senderId.toString() !== userId.toString()) {
            throw new ForbiddenException(
                "You can only delete your own messages"
            );
        }


        await this.bookingAccess.assertChat(msg.chatId, userId);
        msg.isDeletedForEveryone = true;

        await msg.save();

        console.log("DELETED MESSAGE", msg._id);

        return msg;
    }

    // ================= Phase 7.1 additions =================

    // ---- Presence ----
    async setUserOnline(userId: string): Promise<void> {
        await this.userModel.updateOne({ _id: userId }, { $set: { isOnline: true } });
    }

    async setUserOffline(userId: string, lastSeen: Date): Promise<void> {
        await this.userModel.updateOne(
            { _id: userId },
            { $set: { isOnline: false, lastSeen } },
        );
    }

    async getUserPresence(userId: string): Promise<{ isOnline: boolean; lastSeen: Date | null }> {
        const user = await this.userModel.findById(userId).select('isOnline lastSeen').lean();
        return {
            isOnline: !!(user as any)?.isOnline,
            lastSeen: (user as any)?.lastSeen || null,
        };
    }

    // All userIds who share at least one existing conversation with `userId`.
    // Used to scope presence broadcasts instead of blasting them to every
    // connected socket on the server.
    async getConversationPeerIds(userId: string): Promise<string[]> {
        const conversations = await this.conversationModel
            .find({ participants: userId })
            .select('participants')
            .lean();

        const peerIds = new Set<string>();
        conversations.forEach((c: any) => {
            (c.participants || []).forEach((p: any) => {
                const id = p.toString();
                if (id !== userId.toString()) peerIds.add(id);
            });
        });
        return Array.from(peerIds);
    }

    // ---- Delivered / Seen ----

async markMessageDelivered(messageId: string, deliveredAt: Date): Promise<void> {
    await this.messageModel.updateOne(
        { _id: messageId, deliveredAt: null },
        { $set: { deliveredAt } },
    );
}

// Mark all pending messages as delivered when the receiver comes online
async markPendingMessagesDeliveredForUser(receiverId: string) {
    const deliveredAt = new Date();

    const messages = await this.messageModel
        .find({
            receiverId,
            deliveredAt: null,
            isDeletedForEveryone: { $ne: true },
        })
        .select('_id senderId chatId')
        .lean();

    if (!messages.length) {
        return [];
    }

    const messageIds = messages.map((message) => message._id);

    await this.messageModel.updateMany(
        {
            _id: { $in: messageIds },
        },
        {
            $set: {
                deliveredAt,
            },
        },
    );

    return messages.map((message) => ({
        messageId: message._id.toString(),
        senderId: message.senderId.toString(),
        chatId: message.chatId.toString(),
        deliveredAt,
    }));
}

async markMessageIdsSeen(messageIds: string[], seenAt: Date): Promise<void> {
    await this.messageModel.updateMany(
        { _id: { $in: messageIds } },
        [
            {
                $set: {
                    isRead: true,
                    seenAt,
                    deliveredAt: { $ifNull: ['$deliveredAt', seenAt] },
                },
            },
        ] as any,
    );
}

    // ================= NEW: Reply / Search / Pin =================

    // Shared authorization check — used by search, pin, and unpin so a
    // user can never touch/read a conversation they don't belong to.
    async isUserInConversation(chatId: string, userId: string): Promise<boolean> {
        if (!chatId || !userId) return false;
        const convo = await this.conversationModel
            .findOne({ chatId })
            .select('participants')
            .lean();
        if (!convo) return false;
        return (convo.participants || []).some(
            (p: any) => p.toString() === userId.toString(),
        );
    }

    // ---- Search (conversation-scoped, case-insensitive) ----
    async searchMessages(
        chatId: string,
        userId: string,
        query: string,
    ): Promise<Message[]> {
        await this.bookingAccess.assertChat(chatId, userId, true);
        const isMember = await this.isUserInConversation(chatId, userId);
        if (!isMember) {
            throw new ForbiddenException('You do not belong to this conversation');
        }

        const trimmed = (query || '').trim();
        if (!trimmed) return [];

        // Escape regex special characters so a search like "3.5" or "c++"
        // doesn't throw or behave unexpectedly.
        const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        return this.messageModel
            .find({
                chatId,
                deletedFor: { $ne: userId },
                isDeletedForEveryone: { $ne: true },
                message: { $regex: escaped, $options: 'i' },
            })
            .sort({ timestamp: -1 })
            .select('message imageUrl senderId receiverId chatId timestamp createdAt')
            .limit(100)
            .exec();
    }

    // ---- Pin / Unpin ----
    async pinMessage(
    chatId: string,
    messageId: string,
    userId: string,
    duration?: PinDuration | null,
): Promise<{ conversation: Conversation; previousPinnedMessageId: string | null }> {
    await this.bookingAccess.assertChat(chatId, userId);
    const isMember = await this.isUserInConversation(chatId, userId);
    if (!isMember) {
        throw new ForbiddenException('You do not belong to this conversation');
    }

    const msg = await this.messageModel.findOne({ _id: messageId, chatId });
    if (!msg) {
        throw new NotFoundException('Message not found in this conversation');
    }

    let pinExpiresAt: Date | null = null;
    if (duration !== undefined && duration !== null) {
        if (!isValidPinDuration(duration)) {
            throw new BadRequestException(
                `Invalid pin duration "${duration}". Must be one of: 24h, 7d, 30d.`,
            );
        }
        pinExpiresAt = new Date(Date.now() + PIN_DURATION_MS[duration]);
    }

    const existingConvo = await this.conversationModel
        .findOne({ chatId })
        .select('pinnedMessageId')
        .lean();

    const previousPinnedMessageId = (existingConvo as any)?.pinnedMessageId
        ? (existingConvo as any).pinnedMessageId.toString()
        : null;

    // WhatsApp-style: sirf ek hi pin allowed — purane message ka pin clear karo
    if (previousPinnedMessageId && previousPinnedMessageId !== messageId) {
        await this.messageModel.updateOne(
            { _id: previousPinnedMessageId },
            { $set: { pinnedAt: null, pinExpiresAt: null } },
        );
    }

    msg.pinnedAt = new Date();
    msg.pinExpiresAt = pinExpiresAt;
    await msg.save();

    const convo = await this.conversationModel.findOneAndUpdate(
        { chatId },
        { $set: { pinnedMessageId: new Types.ObjectId(messageId) } },
        { new: true },
    );
    if (!convo) {
        throw new NotFoundException('Conversation not found');
    }

    return { conversation: convo, previousPinnedMessageId };
}

    async unpinMessage(chatId: string, messageId: string, userId: string): Promise<Conversation> {
    await this.bookingAccess.assertChat(chatId, userId);
    const isMember = await this.isUserInConversation(chatId, userId);
    if (!isMember) {
        throw new ForbiddenException('You do not belong to this conversation');
    }

    const convo = await this.conversationModel.findOneAndUpdate(
        { chatId, pinnedMessageId: new Types.ObjectId(messageId) },
        { $set: { pinnedMessageId: null } },
        { new: true },
    );
    if (!convo) {
        throw new NotFoundException('Conversation not found or message not currently pinned');
    }

    await this.messageModel.updateOne(
        { _id: messageId },
        { $set: { pinnedAt: null, pinExpiresAt: null } },
    );

    return convo;
}
     
     async expireStalePins(chatId: string): Promise<string[]> {
    const convo = await this.conversationModel
        .findOne({ chatId })
        .select('pinnedMessageId')
        .lean();

    const pinnedId = (convo as any)?.pinnedMessageId;
    if (!pinnedId) return [];

    const now = new Date();
    const stillValid = await this.messageModel
        .findOne({ _id: pinnedId, pinExpiresAt: { $ne: null, $lte: now } })
        .select('_id')
        .lean();

    if (!stillValid) return [];

    await this.conversationModel.updateOne({ chatId }, { $set: { pinnedMessageId: null } });
    await this.messageModel.updateOne(
        { _id: pinnedId },
        { $set: { pinnedAt: null, pinExpiresAt: null } },
    );

    return [pinnedId.toString()];
}

    async getPinnedMessageMeta(
        chatId: string,
        messageId: string,
    ): Promise<{ pinnedAt: Date | null; pinExpiresAt: Date | null } | null> {
        return this.messageModel
            .findOne({ _id: messageId, chatId })
            .select('pinnedAt pinExpiresAt')
            .lean();
    }

    async getPinnedMessages(chatId: string, userId: string): Promise<Message[]> {
    await this.bookingAccess.assertChat(chatId, userId, true);
    const isMember = await this.isUserInConversation(chatId, userId);
    if (!isMember) {
        throw new ForbiddenException('You do not belong to this conversation');
    }

    await this.expireStalePins(chatId);

    const convo = await this.conversationModel
        .findOne({ chatId })
        .select('pinnedMessageId')
        .lean();

    const pinnedId = (convo as any)?.pinnedMessageId;
    if (!pinnedId) return [];

    const msg = await this.messageModel
        .findById(pinnedId)
        .select(
            'message imageUrl videoUrl senderId receiverId chatId timestamp isDeletedForEveryone pinnedAt pinExpiresAt',
        )
        .exec();

    return msg ? [msg] : [];
}
}
