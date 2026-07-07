import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';

@Controller('messages')
export class MessagesController {
    constructor(private readonly messagesService: MessagesService) { }

    // POST: Save a message
    @Post()
    async create(@Body() createMessageDto: CreateMessageDto) {
        return this.messagesService.create(createMessageDto);
    }

    // GET: Fetch messages by chatId
    @Get(':chatId')
    async findByChatId(@Param('chatId') chatId: string) {
        return this.messagesService.findByChatId(chatId);
    }
}
