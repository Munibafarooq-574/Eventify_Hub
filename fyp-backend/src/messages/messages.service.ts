import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateMessageDto } from './dto/create-message.dto';
import { Message } from './schemas/message.schema';

@Injectable()
export class MessagesService {
    constructor(@InjectModel(Message.name) private messageModel: Model<Message>) { }

    // Save a new message
    async create(createMessageDto: CreateMessageDto): Promise<Message> {
        const newMessage = new this.messageModel(createMessageDto);
        return newMessage.save();
    }

    // Fetch messages by chatId
    async findByChatId(chatId: string): Promise<Message[]> {
        return this.messageModel.find({ chatId }).sort({ timestamp: 1 }).exec();
    }
}
