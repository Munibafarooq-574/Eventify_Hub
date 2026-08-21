
    // src/chat/chat.gateway.ts
import {
    SubscribeMessage,
    WebSocketGateway,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Socket, Server } from 'socket.io';
import { ChatService } from './chat.service';
// add to imports
import { PinDuration } from './pin-duration.type';

@WebSocketGateway({
    cors: {
        origin: '*', // Adjust as needed for security
    },
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server!: Server;

    private logger: Logger = new Logger('ChatGateway');

    // 🔵 NEW (Phase 7.1) — presence tracking
    // userId -> set of socket ids. A Set (not a single id) is what makes
    // multi-device login safe: the user only goes "offline" once every
    // single one of their sockets has disconnected.
    private onlineUsers: Map<string, Set<string>> = new Map();
    // reverse lookup so handleDisconnect (which only gets a socket) can
    // find out which user that socket belonged to.
    private socketUserMap: Map<string, string> = new Map();
    // safety-net timers: if a client's typingStop never arrives (app killed,
    // connection dropped mid-typing) the indicator would stay stuck forever
    // without this. Keyed by `${socketId}:${chatId}`.
    private typingTimeouts: Map<string, NodeJS.Timeout> = new Map();

    constructor(private chatService: ChatService) { }

    afterInit(server: Server) {
        this.logger.log('Initialized');
    }

    handleConnection(client: Socket, ...args: any[]) {
        this.logger.log(`Client connected: ${client.id}`);
    }

    async handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);

        // clear any pending typing safety-net timers owned by this socket
        for (const key of Array.from(this.typingTimeouts.keys())) {
            if (key.startsWith(`${client.id}:`)) {
                clearTimeout(this.typingTimeouts.get(key));
                this.typingTimeouts.delete(key);
            }
        }

        const userId = this.socketUserMap.get(client.id);
        this.socketUserMap.delete(client.id);
        if (!userId) return;

        const sockets = this.onlineUsers.get(userId);
        if (!sockets) return;

        sockets.delete(client.id);
        if (sockets.size === 0) {
            this.onlineUsers.delete(userId);
            const lastSeen = new Date();
            try {
                await this.chatService.setUserOffline(userId, lastSeen);
                await this.broadcastPresence(userId, false, lastSeen);
            } catch (err) {
                this.logger.error('Failed to persist offline presence', err as any);
            }
        }
    }

    // 🔵 NEW: mobile calls this right after the socket connects (and again
    // on every reconnect) so the gateway knows which userId owns this
    // socket. Without this we'd have no way to map a bare socket.io
    // connection to a user for presence / delivery checks.
    @SubscribeMessage('registerUser')
async handleRegisterUser(
    client: Socket,
    payload: { userId: string },
) {
    if (!payload?.userId) return;

    const { userId } = payload;

    this.socketUserMap.set(client.id, userId);

    const wasOffline = !this.isUserOnline(userId);

    if (!this.onlineUsers.has(userId)) {
        this.onlineUsers.set(userId, new Set());
    }

    this.onlineUsers.get(userId)!.add(client.id);

    // Personal room for this user
    client.join(`user:${userId}`);

    if (wasOffline) {
        try {
            // Mark user online
            await this.chatService.setUserOnline(userId);

            // Notify conversation peers
            await this.broadcastPresence(
                userId,
                true,
                null,
            );

            // --------------------------------------------------
            // IMPORTANT:
            // Deliver messages that were sent while this user
            // was offline.
            // --------------------------------------------------
            const pendingMessages =
                await this.chatService.markPendingMessagesDeliveredForUser(
                    userId,
                );

            for (const pending of pendingMessages) {
                // Notify the sender directly.
                // This works even if sender is not currently inside
                // the conversation room.
                this.server
                    .to(`user:${pending.senderId}`)
                    .emit('messageDelivered', {
                        messageId: pending.messageId,
                        chatId: pending.chatId,
                        deliveredAt: pending.deliveredAt,
                    });
            }

            this.logger.log(
                `User ${userId} came online. Delivered ${pendingMessages.length} pending messages.`,
            );
        } catch (err) {
            this.logger.error(
                'Failed to process online presence / pending delivery',
                err as any,
            );
        }
    }
}

    private isUserOnline(userId: string): boolean {
        return this.onlineUsers.has(userId) && this.onlineUsers.get(userId)!.size > 0;
    }

    // Only tells people who actually share a conversation with this user —
    // not a global broadcast to every connected socket on the server.
    private async broadcastPresence(userId: string, isOnline: boolean, lastSeen: Date | null) {
        const peerIds = await this.chatService.getConversationPeerIds(userId);
        const payload = { userId, isOnline, lastSeen };
        peerIds.forEach((peerId) => {
            this.server.to(`user:${peerId}`).emit('presenceUpdated', payload);
            this.server.to(`user:${peerId}`).emit(isOnline ? 'userOnline' : 'userOffline', payload);
        });
    }

    // User sends a message
    @SubscribeMessage('sendMessage')
async handleMessage(
    client: Socket,
    payload: {
        user: string;
        receiverId: string;
        chatId: string;
        content: string;
        imageUrl?: string;
        videoUrl?: string; // 🆕 NEW (Video Sharing)
        repliedToMessageId?: string | null;
    },
) {
    this.logger.log(`Received message from ${payload.user} in chatId: ${payload.chatId}`);

    const message: any = await this.chatService.createMessage(
        payload.chatId,
        payload.user,
        payload.receiverId,
        payload.content,
        payload.imageUrl || '',
        payload.videoUrl || '', // 🆕 NEW
        payload.repliedToMessageId || null,
    );

    if (this.isUserOnline(payload.receiverId)) {
        const deliveredAt = new Date();
        await this.chatService.markMessageDelivered(message._id.toString(), deliveredAt);
        message.deliveredAt = deliveredAt;
    }

    this.server.to(payload.chatId).emit('newMessage', message);

    if (this.isUserOnline(payload.receiverId)) {
        this.server.to(payload.chatId).emit('messageDelivered', {
            messageId: message._id.toString(),
            deliveredAt: message.deliveredAt,
        });
    }
}

    // User joins a conversation
    /*@SubscribeMessage('joinConversation')
    async handleJoinConversation(
        client: Socket,
        payload: {
            chatId: string;
            userId: string;
        },
    ) {
        client.join(payload.chatId);
        this.logger.log(`Client ${client.id} joined chat room ${payload.chatId}`);

        // Mark messages as read/seen for this user — this is the "receiver
        // opens the conversation" case from the seen-receipt requirements.
        const seenAt = new Date();
        await this.chatService.markMessagesAsRead(payload.chatId, payload.userId, seenAt);

        // 🔵 seenBy is now included so the sender's client can tell it was
        // THIS user (not itself) who saw the chat, and flip the tick blue.
        this.server.to(payload.chatId).emit('messagesSeen', {
            chatId: payload.chatId,
            seenBy: payload.userId,
            seenAt,
        });

        this.chatService
            .getMessagesForConversation(payload.chatId)
            .then((messages) => {
                client.emit('previousMessages', messages);
            });
    }   */

    // User joins a conversation
@SubscribeMessage('joinConversation')
async handleJoinConversation(
    client: Socket,
    payload: {
        chatId: string;
        userId: string;
    },
) {
    client.join(payload.chatId);

    this.logger.log(
        `Client ${client.id} joined chat room ${payload.chatId}`,
    );

    // 🟢 Pin duration feature:
    // Check whether any currently pinned messages have expired.
    // The backend is the source of truth for expiration.
    const expiredPinIds = await this.chatService.expireStalePins(
        payload.chatId,
    );

    // Notify everyone currently inside this conversation that
    // these messages are no longer pinned.
    expiredPinIds.forEach((messageId) => {
        this.server.to(payload.chatId).emit('messageUnpinned', {
            chatId: payload.chatId,
            messageId,
            unpinnedBy: 'system',
        });
    });

    // Mark messages as read/seen for this user.
    // This is the "receiver opens the conversation" case
    // from the seen-receipt requirements.
    const seenAt = new Date();

    await this.chatService.markMessagesAsRead(
        payload.chatId,
        payload.userId,
        seenAt,
    );

    // 🔵 seenBy is included so the sender's client can tell
    // which user actually saw the chat and update the tick.
    this.server.to(payload.chatId).emit('messagesSeen', {
        chatId: payload.chatId,
        seenBy: payload.userId,
        seenAt,
    });

    // Send existing conversation messages to the client.
    this.chatService
        .getMessagesForConversation(payload.chatId)
        .then((messages) => {
            client.emit('previousMessages', messages);
        });
}
    
            // 🔵 NEW: fine-grained "these specific messages just became visible"
    // signal — for when the chat screen stays open and new messages arrive
    // live (join already covers the "just opened the chat" case).
    @SubscribeMessage('messageSeen')
    async handleMessageSeen(
        client: Socket,
        payload: { conversationId: string; messageIds: string[]; userId: string },
    ) {
        if (!payload?.messageIds?.length || !payload?.conversationId) return;

        const seenAt = new Date();
        await this.chatService.markMessageIdsSeen(payload.messageIds, seenAt);

        this.server.to(payload.conversationId).emit('messagesSeen', {
            chatId: payload.conversationId,
            seenBy: payload.userId,
            seenAt,
            messageIds: payload.messageIds,
        });
    }

    // 🔵 NEW: typing indicator
    @SubscribeMessage('typingStart')
    handleTypingStart(client: Socket, payload: { chatId: string; userId: string }) {
        if (!payload?.chatId || !payload?.userId) return;

        // broadcast to everyone else in the room, never back to the sender
        client.to(payload.chatId).emit('typingStatus', {
            userId: payload.userId,
            chatId: payload.chatId,
            isTyping: true,
        });

        const key = `${client.id}:${payload.chatId}`;
        if (this.typingTimeouts.has(key)) clearTimeout(this.typingTimeouts.get(key));
        this.typingTimeouts.set(
            key,
            setTimeout(() => {
                client.to(payload.chatId).emit('typingStatus', {
                    userId: payload.userId,
                    chatId: payload.chatId,
                    isTyping: false,
                });
                this.typingTimeouts.delete(key);
            }, 5000), // safety net only — client should send typingStop well before this
        );
    }

    @SubscribeMessage('typingStop')
    handleTypingStop(client: Socket, payload: { chatId: string; userId: string }) {
        if (!payload?.chatId || !payload?.userId) return;

        const key = `${client.id}:${payload.chatId}`;
        if (this.typingTimeouts.has(key)) {
            clearTimeout(this.typingTimeouts.get(key));
            this.typingTimeouts.delete(key);
        }

        client.to(payload.chatId).emit('typingStatus', {
            userId: payload.userId,
            chatId: payload.chatId,
            isTyping: false,
        });
    }

    // 🔵 Delete for Me (unchanged)
    @SubscribeMessage('deleteForMe')
    async handleDeleteForMe(
        client: Socket,
        payload: { messageId: string; userId: string },
    ) {
        await this.chatService.deleteMessageForMe(payload.messageId, payload.userId);
        client.emit('messageDeletedForMe', { messageId: payload.messageId });
    }

    // 🔵 Delete for Everyone (unchanged)
    @SubscribeMessage('deleteForEveryone')
    async handleDeleteForEveryone(
        client: Socket,
        payload: { messageId: string; userId: string; chatId: string },
    ) {
        try {
            await this.chatService.deleteMessageForEveryone(payload.messageId, payload.userId);
            this.server.to(payload.chatId).emit('messageDeletedForEveryone', {
                messageId: payload.messageId,
            });
        } catch (err) {
            client.emit('deleteError', {
                messageId: payload.messageId,
                error: err instanceof Error ? err.message : 'Unknown error',
            });
        }
    }

    // 🟢 NEW (Pin feature) — pin a message for everyone in the conversation.
    // Authorization (must belong to the conversation) is enforced inside
    // chatService.pinMessage.
   /* @SubscribeMessage('pinMessage')
    async handlePinMessage(
        client: Socket,
        payload: { chatId: string; messageId: string; userId: string },
    ) {
        try {
            await this.chatService.pinMessage(payload.chatId, payload.messageId, payload.userId);
            this.server.to(payload.chatId).emit('messagePinned', {
                chatId: payload.chatId,
                messageId: payload.messageId,
                pinnedBy: payload.userId,
            });
        } catch (err) {
            client.emit('pinError', {
                messageId: payload.messageId,
                error: err instanceof Error ? err.message : 'Unknown error',
            });
        }
    }  */


            // 🟢 Pin feature with optional duration
    @SubscribeMessage('pinMessage')
    async handlePinMessage(
        client: Socket,
        payload: {
            chatId: string;
            messageId: string;
            userId: string;
            duration?: PinDuration | null;
        },
    ) {
        try {
            await this.chatService.pinMessage(
                payload.chatId,
                payload.messageId,
                payload.userId,
                payload.duration ?? null,
            );

            // Get the values calculated by the backend.
            // Clients must use these values instead of calculating expiry
            // themselves.
            const meta = await this.chatService.getPinnedMessageMeta(
                payload.chatId,
                payload.messageId,
            );

            this.server.to(payload.chatId).emit('messagePinned', {
                chatId: payload.chatId,
                messageId: payload.messageId,
                pinnedBy: payload.userId,
                pinnedAt: meta?.pinnedAt ?? null,
                pinExpiresAt: meta?.pinExpiresAt ?? null,
            });
        } catch (err) {
            client.emit('pinError', {
                messageId: payload.messageId,
                error: err instanceof Error ? err.message : 'Unknown error',
            });
        }
    }

    // 🟢 NEW (Pin feature) — unpin a message for everyone in the conversation.
    @SubscribeMessage('unpinMessage')
    async handleUnpinMessage(
        client: Socket,
        payload: { chatId: string; messageId: string; userId: string },
    ) {
        try {
            await this.chatService.unpinMessage(payload.chatId, payload.messageId, payload.userId);
            this.server.to(payload.chatId).emit('messageUnpinned', {
                chatId: payload.chatId,
                messageId: payload.messageId,
                unpinnedBy: payload.userId,
            });
        } catch (err) {
            client.emit('pinError', {
                messageId: payload.messageId,
                error: err instanceof Error ? err.message : 'Unknown error',
            });
        }
    }
}