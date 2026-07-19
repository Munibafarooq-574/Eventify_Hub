// fyp-backend/src/chat/chat.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message } from './../auth/schemas/message.schema';
import { Conversation } from 'src/auth/schemas/conversation.schema';
import axios from 'axios';
import { User } from 'src/auth/schemas/user.schema';
import { Notification } from 'src/auth/schemas/notification.schema';

@Injectable()
export class ChatService {
    constructor(
        @InjectModel(Message.name) private messageModel: Model<Message>,
        @InjectModel(Conversation.name) private conversationModel: Model<Conversation>,
        @InjectModel(User.name) private userModel: Model<User>,
        @InjectModel(Notification.name) private notificationModel: Model<Notification>,
    ) { }

    // Create a new conversation
    async createConversation(participants: string[]): Promise<Conversation> {
        const chatId = participants.sort().join('-');  // Chat ID can be a sorted combination of participant IDs
        const existingConversation = await this.conversationModel.findOne({ chatId });
        if (existingConversation) return existingConversation;

        const conversation = new this.conversationModel({ chatId, participants });
        return conversation.save();
    }

    async createOrGetConversation(userId: string, vendorId: string): Promise<string> {
        // Sort userId and vendorId to always have a consistent chatId
        const participants = [userId, vendorId].sort();
        const chatId = participants.join('-'); // Unique chatId based on participants

        // Check if conversation already exists
        let conversation = await this.conversationModel.findOne({ chatId });

        if (!conversation) {
            // If no conversation exists, create a new one
            conversation = new this.conversationModel({
                chatId,
                participants,
            });
            await conversation.save();
        }

        return conversation.chatId; // Return the chatId of the conversation
    }

    // Get all conversations for a user
    async getUserConversations(userId: string): Promise<Conversation[]> {
    const conversations = await this.conversationModel
        .find({ participants: userId })
        .populate({
            path: 'participants',
            match: { _id: { $ne: userId } },
        })
        .populate({
            path: 'lastMessage',
            select: 'message timestamp',
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

        // 🔵 NEW: User schema has no dedicated "avatar" field.
        // Use coverImage first, fall back to the first uploaded image.
        const participants = (conversation.participants || []).map((p: any) => ({
            ...p,
            avatar: p.coverImage || (p.images && p.images.length > 0 ? p.images[0] : ""),
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
    async getConversationMessages(chatId: string): Promise<Message[]> {
        return this.messageModel
            .find({ chatId })
            .sort({ timestamp: -1 })  // Sort messages by timestamp to get the correct order
            .exec();
    }

    // Create a new message for a conversation
    async createMessage(
    chatId: string,
    senderId: string,
    receiverId: string,
    content: string,
): Promise<Message> {
    const message = new this.messageModel({
        chatId,
        senderId,
        receiverId,
        message: content,
        isRead: false,
    });

    // Pehle message save karo
    await message.save();

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
        await this.sendPushNotification(
            "New Message",
            content,
            otherUser?._id,
            "MESSAGE",
        );
    } catch (error) {
        console.log("Sending Push in messages", error);
    }

    return message;
}

    // Get all messages for a conversation
    async getMessagesForConversation(chatId: string): Promise<Message[]> {
        return this.messageModel.find({ chatId }).sort({ timestamp: 1 }).exec();
    }

    async markMessagesAsRead(chatId: string, userId: string) {
    await this.messageModel.updateMany(
        {
            chatId,
            receiverId: userId,
            isRead: false,
        },
        {
            $set: {
                isRead: true,
            },
        },
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
}
