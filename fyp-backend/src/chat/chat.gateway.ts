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
    server: Server;

    private logger: Logger = new Logger('ChatGateway');

    constructor(private chatService: ChatService) { }

    afterInit(server: Server) {
        this.logger.log('Initialized');
    }

    handleConnection(client: Socket, ...args: any[]) {
        this.logger.log(`Client connected: ${client.id}`);

        // Optionally, send existing conversations to the newly connected client
        this.chatService.getUserConversations(client.id).then((conversations) => {
            client.emit('conversationList', conversations);
        });
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    // User sends a message
    @SubscribeMessage('sendMessage')
    async handleMessage(client: Socket, payload: { user: string; chatId: string; content: string }) {
        this.logger.log(`Received message from ${payload.user}: ${payload.content} in chatId: ${payload.chatId}`);

        // Create and save the message in the database
        const message = await this.chatService.createMessage(payload.chatId, payload.user, payload.content);

        // Emit message to all users in the same conversation
        this.server.to(payload.chatId).emit('newMessage', message); // Broadcast the new message to all clients in that conversation
    }

    // User joins a conversation
    @SubscribeMessage('joinConversation')
    handleJoinConversation(client: Socket, chatId: string) {
        client.join(chatId); // Join the chat room for that conversation
        this.logger.log(`Client ${client.id} joined chat room ${chatId}`);

        // Optionally, send existing messages to the user when they join
        this.chatService.getMessagesForConversation(chatId).then((messages) => {
            client.emit('previousMessages', messages);
        });
    }
}
