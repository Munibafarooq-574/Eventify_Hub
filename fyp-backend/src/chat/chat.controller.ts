
// src/chat/conversation.controller.ts
/*import {
  Controller,
  Post,
  Param,
  Get,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ChatService } from './chat.service';
import { chatImageStorage, imageFileFilter } from './multer.config';

@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post(':userId/:vendorId')
  async createOrGetConversation(
    @Param('userId') userId: string,
    @Param('vendorId') vendorId: string,
  ) {
    const chatId = await this.chatService.createOrGetConversation(
      userId,
      vendorId,
    );
    return { chatId };
  }

  // API to get conversation list for a user
  @Get(':userId')
  async getConversationList(@Param('userId') userId: string) {
    const conversations = await this.chatService.getUserConversations(userId);
    return { conversations };
  }

  // Get all messages in a conversation
  @Get('messages/:chatId')
async getConversationMessages(
  @Param('chatId') chatId: string,
  @Query('userId') userId: string,
) {
  const messages = await this.chatService.getConversationMessages(
    chatId,
    userId,
  );

  return { messages };
}

  // 🔵 NEW: Upload chat image
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: chatImageStorage,
      fileFilter: imageFileFilter,
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  async uploadChatImage(@UploadedFile() file: Express.Multer.File) {
    const imageUrl = `/public/uploads/chat/${file.filename}`;
    return { imageUrl };
  }
}*/

// src/chat/conversation.controller.ts
import {
  Controller,
  Post,
  Param,
  Get,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ChatService } from './chat.service';
import { chatImageStorage, imageFileFilter } from './multer.config';

@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post(':userId/:vendorId')
  async createOrGetConversation(
    @Param('userId') userId: string,
    @Param('vendorId') vendorId: string,
  ) {
    const chatId = await this.chatService.createOrGetConversation(
      userId,
      vendorId,
    );
    return { chatId };
  }

  // API to get conversation list for a user
  @Get(':userId')
  async getConversationList(@Param('userId') userId: string) {
    const conversations = await this.chatService.getUserConversations(userId);
    return { conversations };
  }

  // Get all messages in a conversation
  @Get('messages/:chatId')
  async getConversationMessages(
    @Param('chatId') chatId: string,
    @Query('userId') userId: string,
  ) {
    const messages = await this.chatService.getConversationMessages(
      chatId,
      userId,
    );

    return { messages };
  }

  // 🔵 NEW (Phase 7.1): initial online/last-seen snapshot when a chat
  // screen first opens — after this, live updates come over the socket
  // via 'presenceUpdated' / 'userOnline' / 'userOffline'.
  @Get('presence/:userId')
  async getPresence(@Param('userId') userId: string) {
    return this.chatService.getUserPresence(userId);
  }

  // Upload chat image
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: chatImageStorage,
      fileFilter: imageFileFilter,
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  async uploadChatImage(@UploadedFile() file: Express.Multer.File) {
    const imageUrl = `/public/uploads/chat/${file.filename}`;
    return { imageUrl };
  }
}
