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

@WebSocketGateway({
    cors: {
        origin: '*', // Adjust as needed for security
    },
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
server!: Server;

    private logger: Logger = new Logger('ChatGateway');

    constructor(private chatService: ChatService) { }

    afterInit(server: Server) {
        this.logger.log('Initialized');
    }

    handleConnection(client: Socket, ...args: any[]) {
        this.logger.log(`Client connected: ${client.id}`);

        // Optionally, send existing conversations to the newly connected client
       // this.chatService.getUserConversations(client.id).then((conversations) => {
          //  client.emit('conversationList', conversations);
     //   });
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    // User sends a message
    /*@SubscribeMessage('sendMessage')
    async handleMessage(client: Socket, payload: {
    user: string;
    receiverId: string;
    chatId: string;
    content: string;
})    {
        this.logger.log(`Received message from ${payload.user}: ${payload.content} in chatId: ${payload.chatId}`);

        // Create and save the message in the database
        const message = await this.chatService.createMessage(
    payload.chatId,
    payload.user,
    payload.receiverId,
    payload.content,
);

        // Emit message to all users in the same conversation
        this.server.to(payload.chatId).emit('newMessage', message); // Broadcast the new message to all clients in that conversation
    } */

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
    },
) {
    this.logger.log(
        `Received message from ${payload.user} in chatId: ${payload.chatId}`,
    );

    // Create and save the message in the database
    const message = await this.chatService.createMessage(
        payload.chatId,
        payload.user,
        payload.receiverId,
        payload.content,
        payload.imageUrl || '',
    );

    // Emit message to all users in the same conversation
    this.server.to(payload.chatId).emit('newMessage', message);
}

    // User joins a conversation
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
    this.logger.log(`Client ${client.id} joined chat room ${payload.chatId}`);

    // Mark messages as read for this user
    await this.chatService.markMessagesAsRead(payload.chatId, payload.userId);

    // 🔵 NEW: tell everyone in the room that this user has seen the chat
    // so the sender's grey double-tick can flip to blue.
    this.server.to(payload.chatId).emit('messagesSeen', { chatId: payload.chatId });

    this.chatService
        .getMessagesForConversation(payload.chatId)
        .then((messages) => {
            client.emit('previousMessages', messages);
        });
}

// 🔵 NEW: Delete for Me
    @SubscribeMessage('deleteForMe')
    async handleDeleteForMe(
        client: Socket,
        payload: { messageId: string; userId: string },
    ) {
        await this.chatService.deleteMessageForMe(payload.messageId, payload.userId);
        // Sirf isi client ko confirm — baaki users ko farq nahi padta
        client.emit('messageDeletedForMe', { messageId: payload.messageId });
    }

    // 🔵 NEW: Delete for Everyone (sender only, no time limit)
    @SubscribeMessage('deleteForEveryone')
    async handleDeleteForEveryone(
        client: Socket,
        payload: { messageId: string; userId: string; chatId: string },
        
    ) {
        console.log("DELETE FOR EVERYONE PAYLOAD", payload);
        try {
            await this.chatService.deleteMessageForEveryone(payload.messageId, payload.userId);
            // Dono taraf broadcast — turant "This message was deleted" dikhega
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
}
