// fyp-backend/src/chat/chat.controller.ts

import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';

import { ChatService } from './chat.service';
import { FileUploadService } from '../file-upload/file-upload.service';

import {
  chatImageStorage,
  imageFileFilter,
  videoFileFilter,
  audioFileFilter, // 🆕 ADD
} from './multer.config';

@Controller('chat')
export class ChatController {
  constructor(
  private readonly chatService: ChatService,
  private readonly fileUploadService: FileUploadService,
) {}

  // ============================================================
  // IMAGE UPLOAD
  // IMPORTANT: Keep static routes BEFORE :userId/:vendorId
  // ============================================================

 @Post('upload')
@UseInterceptors(
  FileInterceptor('image', {
    storage: chatImageStorage,
    fileFilter: imageFileFilter,
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
  }),
)
async uploadChatImage(
  @UploadedFile() file: Express.Multer.File,
) {
  if (!file) {
    throw new BadRequestException('Image file is required');
  }

  const response = await this.fileUploadService.uploadFile(file);

  if (!response?.Location) {
    throw new BadRequestException('Image upload failed');
  }

  console.log('IMAGE S3 URL:', response.Location);

  return {
    imageUrl: response.Location,
  };
}

    // ============================================================
  // AUDIO (VOICE NOTE) UPLOAD
  // IMPORTANT: This MUST be before :userId/:vendorId
  // ============================================================

  @Post('upload/audio')
@UseInterceptors(
  FileInterceptor('audio', {
    storage: chatImageStorage,
    fileFilter: audioFileFilter,
    limits: {
      fileSize: 20 * 1024 * 1024,
    },
  }),
)
async uploadChatAudio(
  @UploadedFile() file: Express.Multer.File,
) {
  if (!file) {
    throw new BadRequestException('Audio file is required');
  }

  const response = await this.fileUploadService.uploadFile(file);

  if (!response?.Location) {
    throw new BadRequestException('Audio upload failed');
  }

  console.log('AUDIO S3 URL:', response.Location);

  return {
    audioUrl: response.Location,
  };
}

  // ============================================================
  // VIDEO UPLOAD
  // IMPORTANT: This MUST be before :userId/:vendorId
  // ============================================================

  @Post('upload/video')
@UseInterceptors(
  FileInterceptor('video', {
    storage: chatImageStorage,
    fileFilter: videoFileFilter,
    limits: {
      fileSize: 200 * 1024 * 1024,
    },
  }),
)
async uploadChatVideo(
  @UploadedFile() file: Express.Multer.File,
) {
  if (!file) {
    throw new BadRequestException('Video file is required');
  }

  console.log('VIDEO FILE:', {
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
  });

  const response = await this.fileUploadService.uploadFile(file);

  if (!response?.Location) {
    throw new BadRequestException('Video upload failed');
  }

  console.log('VIDEO S3 URL:', response.Location);

  return {
    videoUrl: response.Location,
  };
}

  // ============================================================
  // CREATE / GET CONVERSATION
  // ============================================================
  // IMPORTANT:
  // This dynamic route MUST come AFTER:
  // /upload
  // /upload/video
  //
  // Otherwise:
  // POST /chat/upload/video
  // can be interpreted as:
  // userId = "upload"
  // vendorId = "video"
  // ============================================================

  @Post(':userId/:vendorId')
  async createOrGetConversation(
    @Param('userId') userId: string,
    @Param('vendorId') vendorId: string,
  ) {
    const chatId = await this.chatService.createOrGetConversation(
      userId,
      vendorId,
    );

    return {
      chatId,
    };
  }

  // ============================================================
  // GET CONVERSATION LIST
  // ============================================================

  @Get(':userId')
  async getConversationList(
    @Param('userId') userId: string,
  ) {
    const conversations =
      await this.chatService.getUserConversations(userId);

    return {
      conversations,
    };
  }

  // ============================================================
  // GET ALL MESSAGES IN A CONVERSATION
  // ============================================================

  @Get('messages/:chatId')
  async getConversationMessages(
    @Param('chatId') chatId: string,
    @Query('userId') userId: string,
  ) {
    const messages =
      await this.chatService.getConversationMessages(
        chatId,
        userId,
      );

    return {
      messages,
    };
  }

  // ============================================================
  // SEARCH MESSAGES
  // ============================================================

  @Get('conversations/:chatId/messages/search')
  async searchMessages(
    @Param('chatId') chatId: string,
    @Query('q') q: string,
    @Query('userId') userId: string,
  ) {
    const results =
      await this.chatService.searchMessages(
        chatId,
        userId,
        q || '',
      );

    return {
      results,
    };
  }

  // ============================================================
  // GET PINNED MESSAGES
  // ============================================================

  @Get('conversations/:chatId/pinned')
  async getPinnedMessages(
    @Param('chatId') chatId: string,
    @Query('userId') userId: string,
  ) {
    const pinnedMessages =
      await this.chatService.getPinnedMessages(
        chatId,
        userId,
      );

    return {
      pinnedMessages,
    };
  }

  // ============================================================
  // GET USER PRESENCE
  // ============================================================

  @Get('presence/:userId')
  async getPresence(
    @Param('userId') userId: string,
  ) {
    return this.chatService.getUserPresence(userId);
  }
}