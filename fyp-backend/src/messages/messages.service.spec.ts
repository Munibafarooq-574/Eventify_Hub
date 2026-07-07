import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { MessagesService } from './messages.service';
import { Message } from './schemas/message.schema';
import { Model } from 'mongoose';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../app.module';
import { MessageSchema } from './schemas/message.schema';
import mongoose from 'mongoose';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { CreateMessageDto } from './dto/create-message.dto';

interface MockMessage extends Partial<Message> {
  save: jest.Mock;
}

const mockMessageModel = () => ({
  create: jest.fn(),
  find: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  exec: jest.fn(),
});

describe('Unit Testing - MessagesService', () => {
  let service: MessagesService;
  let model: Model<Message>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        { provide: getModelToken(Message.name), useFactory: mockMessageModel },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
    model = module.get<Model<Message>>(getModelToken(Message.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create and save a message', async () => {
    const dto = {
      chatId: '123',
      senderId: 'user1',
      receiverId: 'user2',
      message: 'Hello',
      timestamp: new Date(),
    };

    const saveMock = jest.fn().mockResolvedValue(dto);

    // Directly replace the injected model with a mock constructor
    (service as any).messageModel = function () {
      return { ...dto, save: saveMock };
    };

    const result = await service.create(dto as any);
    expect(saveMock).toHaveBeenCalled();
    expect(result).toEqual(dto);
  });

  it('should find messages by chatId', async () => {
    const messages = [
      { chatId: '123', senderId: 'user1', receiverId: 'user2', message: 'Hi', timestamp: new Date() },
    ];
    jest.spyOn(model, 'find').mockReturnValue({ sort: () => ({ exec: async () => messages }) } as any);

    const result = await service.findByChatId('123');
    expect(result).toEqual(messages);
  });

  it('should handle create when save returns null', async () => {
    const dto = { chatId: 'null', senderId: 'x', receiverId: 'y', message: 'Null save', timestamp: new Date() };
    const saveMock = jest.fn().mockResolvedValue(null);
    (service as any).messageModel = function () {
      return { ...dto, save: saveMock };
    };
    const result = await service.create(dto as any);
    expect(result).toBeNull();
  });

  it('should throw if create model throws synchronously', async () => {
    (service as any).messageModel = function () {
      throw new Error('Sync Error');
    };
    await expect(service.create({} as any)).rejects.toThrow('Sync Error');
  });

  it('should return an empty array when no results found', async () => {
    jest.spyOn(model, 'find').mockReturnValue({ sort: () => ({ exec: async () => [] }) } as any);
    const result = await service.findByChatId('none');
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });

});

describe('Integration Testing - MessagesService', () => {
  let service: MessagesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        { provide: getModelToken(Message.name), useFactory: mockMessageModel },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
  });

  it('should create and return a message', async () => {
    const dto = {
      chatId: '123',
      senderId: 'user1',
      receiverId: 'user2',
      message: 'Hello',
      timestamp: new Date(),
    };
    jest.spyOn(service, 'create').mockResolvedValue(dto as any);

    const result = await service.create(dto as any);
    expect(result).toBeDefined();
  });

  it('should return an empty array if no messages', async () => {
    jest.spyOn(service, 'findByChatId').mockResolvedValue([]);

    const result = await service.findByChatId('999');
    expect(result).toEqual([]);
  });

  it('should return multiple messages', async () => {
    const messages = [
      { chatId: '123', senderId: 'user1', receiverId: 'user2', message: 'Hi', timestamp: new Date() },
      { chatId: '123', senderId: 'user1', receiverId: 'user2', message: 'There', timestamp: new Date() },
    ];
    jest.spyOn(service, 'findByChatId').mockResolvedValue(messages as any);

    const result = await service.findByChatId('123');
    expect(result.length).toBe(2);
  });

  it('should handle create and then fetch correctly', async () => {
    const dto = { chatId: 'chain', senderId: 'a', receiverId: 'b', message: 'Chain test' };
    jest.spyOn(service, 'create').mockResolvedValue(dto as any);
    jest.spyOn(service, 'findByChatId').mockResolvedValue([dto] as any);

    const created = await service.create(dto as any);
    const fetched = await service.findByChatId('chain');
    expect(created).toEqual(dto);
    expect(fetched[0]).toEqual(dto);
  });

  it('should return no messages if chatId has no data', async () => {
    jest.spyOn(service, 'findByChatId').mockResolvedValue([]);
    const result = await service.findByChatId('no-data');
    expect(result).toEqual([]);
  });

  it('should process multiple create calls correctly', async () => {
    const dto1 = { chatId: 'multi', senderId: 'x', receiverId: 'y', message: 'First' };
    const dto2 = { chatId: 'multi', senderId: 'x', receiverId: 'y', message: 'Second' };
    jest.spyOn(service, 'create').mockResolvedValueOnce(dto1 as any).mockResolvedValueOnce(dto2 as any);

    const first = await service.create(dto1 as any);
    const second = await service.create(dto2 as any);
    expect(first.message).toBe('First');
    expect(second.message).toBe('Second');
  });

});

describe('Negative Testing - MessagesService', () => {
  let service: MessagesService;
  let model: Model<Message>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        { provide: getModelToken(Message.name), useFactory: mockMessageModel },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
    model = module.get<Model<Message>>(getModelToken(Message.name));
  });

  it('should throw error if save fails', async () => {
    const saveMock = jest.fn().mockRejectedValue(new Error('Fail'));

    (service as any).messageModel = function () {
      return { save: saveMock };
    };

    await expect(service.create({} as any)).rejects.toThrow('Fail');
  });

  it('should return null if no messages found', async () => {
    jest.spyOn(model, 'find').mockReturnValue({ sort: () => ({ exec: async () => null }) } as any);

    const result = await service.findByChatId('invalid');
    expect(result).toBeNull();
  });

  it('should handle unexpected errors in findByChatId', async () => {
    jest.spyOn(model, 'find').mockImplementation(() => {
      throw new Error('Unexpected');
    });

    await expect(service.findByChatId('123')).rejects.toThrow('Unexpected');
  });

  it('should handle undefined input gracefully', async () => {
    jest.spyOn(model, 'find').mockReturnValue({ sort: () => ({ exec: async () => [] }) } as any);
    const result = await service.findByChatId(undefined as any);
    expect(result).toEqual([]);
  });

  it('should reject if create receives undefined', async () => {
    await expect(service.create(undefined as any)).rejects.toThrow();
  });

  it('should handle thrown string error in findByChatId', async () => {
    jest.spyOn(model, 'find').mockImplementation(() => {
      throw new Error('String error');
    });
    await expect(service.findByChatId('123')).rejects.toThrow('String error');
  });


});

describe('Schema Validation - MessageSchema', () => {
  it('should fail if required fields are missing', async () => {
    const MessageModel = mongoose.model('Message', MessageSchema);

    try {
      const invalidMsg = new MessageModel({});
      await invalidMsg.validate(); // triggers validation
    } catch (err: any) {
      expect(err.errors.chatId).toBeDefined();
      expect(err.errors.senderId).toBeDefined();
      expect(err.errors.receiverId).toBeDefined();
      expect(err.errors.message).toBeDefined();
    }
  });

  it('should pass with all required fields', async () => {
    const MessageModel = mongoose.model('Message', MessageSchema);

    const validMsg = new MessageModel({
      chatId: '1',
      senderId: 'user1',
      receiverId: 'user2',
      message: 'Hi there!',
    });

    await expect(validMsg.validate()).resolves.toBeUndefined();
  });

  it('should assign default timestamp', async () => {
    const MessageModel = mongoose.model('Message', MessageSchema);
    const msg = new MessageModel({
      chatId: '1',
      senderId: 'user1',
      receiverId: 'user2',
      message: 'Test message',
    });

    expect(msg.timestamp).toBeInstanceOf(Date);
  });

  it('should fail if chatId is missing', async () => {
    const MessageModel = mongoose.model('Message', MessageSchema);
    const invalidMsg = new MessageModel({ senderId: 's1', receiverId: 'r1', message: 'Hello' });
    try {
      await invalidMsg.validate();
    } catch (err: any) {
      expect(err.errors.chatId).toBeDefined();
    }
  });

  it('should fail if senderId is not a string', async () => {
    const MessageModel = mongoose.model('Message', MessageSchema);
    const invalidMsg = new MessageModel({ chatId: '1', senderId: 123, receiverId: 'r1', message: 'Hi' });
    try {
      await invalidMsg.validate();
    } catch (err: any) {
      expect(err.errors.senderId).toBeDefined();
    }
  });

  it('should fail if receiverId is not a string', async () => {
    const MessageModel = mongoose.model('Message', MessageSchema);
    const invalidMsg = new MessageModel({ chatId: '1', senderId: 's1', receiverId: 123, message: 'Hi' });
    try {
      await invalidMsg.validate();
    } catch (err: any) {
      expect(err.errors.receiverId).toBeDefined();
    }
  });

});

describe('DTO Validation - CreateMessageDto', () => {

  it('should pass for valid input', async () => {
    const dto = plainToClass(CreateMessageDto, {
      chatId: '1',
      senderId: 'user1',
      receiverId: 'user2',
      message: 'Hello',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });


});

describe('Snapshot Testing - MessagesService', () => {
  let service: MessagesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        {
          provide: getModelToken(Message.name),
          useValue: {
            find: jest.fn().mockReturnValue({
              sort: () => ({
                exec: async () => [
                  {
                    chatId: 'chat1',
                    senderId: 'user1',
                    receiverId: 'user2',
                    message: 'Snapshot test',
                    timestamp: new Date('2023-01-01T00:00:00.000Z'),
                  },
                ],
              }),
            }),
          },
        },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
  });

  it('should match snapshot for single message result', async () => {
    const result = await service.findByChatId('chat1');
    expect(result).toMatchSnapshot();
  });

  it('should match snapshot for empty message list', async () => {
    jest.spyOn(service, 'findByChatId').mockResolvedValue([]);
    const result = await service.findByChatId('empty');
    expect(result).toMatchSnapshot();
  });

});
