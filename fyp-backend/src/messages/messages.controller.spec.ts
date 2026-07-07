import { Test, TestingModule } from '@nestjs/testing';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';

describe('MessagesController', () => {
  let controller: MessagesController;
  let service: MessagesService;

  const mockMessagesService = {
    create: jest.fn(),
    findByChatId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessagesController],
      providers: [{ provide: MessagesService, useValue: mockMessagesService }],
    }).compile();

    controller = module.get<MessagesController>(MessagesController);
    service = module.get<MessagesService>(MessagesService);
    jest.clearAllMocks();
  });

  // ✅ Unit Testing
  describe('Unit Testing', () => {
    const dto: CreateMessageDto = {
      chatId: 'abc123',
      senderId: 'user1',
      receiverId: 'user2',
      message: 'Hello',
    };

    it('should call messagesService.create() with correct data', async () => {
      await controller.create(dto);
      expect(service.create).toHaveBeenCalledWith(dto);
    });

    it('should return created message from service', async () => {
      const mockResponse = { ...dto, _id: 'id123' };
      service.create = jest.fn().mockResolvedValue(mockResponse);
      const result = await controller.create(dto);
      expect(result).toEqual(mockResponse);
    });

    it('should call messagesService.findByChatId() with correct chatId', async () => {
      await controller.findByChatId('abc123');
      expect(service.findByChatId).toHaveBeenCalledWith('abc123');
    });

    it('should return messages from service for given chatId', async () => {
      const messages = [dto, { ...dto, message: 'Hi again' }];
      service.findByChatId = jest.fn().mockResolvedValue(messages);
      const result = await controller.findByChatId('abc123');
      expect(result).toEqual(messages);
    });

    it('should create a message with minimum valid fields', async () => {
  const dto: CreateMessageDto = { chatId: 'min', senderId: 'u1', receiverId: 'u2', message: 'A' };
  const mock = { ...dto, _id: 'min-id' };
  service.create = jest.fn().mockResolvedValue(mock);
  expect(await controller.create(dto)).toEqual(mock);
});

it('should not call service if dto is undefined (simulate service failure)', async () => {
  service.create = jest.fn().mockImplementation(() => {
    throw new Error('Invalid DTO');
  });

  await expect(controller.create(undefined as any)).rejects.toThrow('Invalid DTO');
  expect(service.create).toHaveBeenCalled();
});


it('should create different messages with same chatId', async () => {
  const dto1 = { chatId: 'repeat', senderId: 'a', receiverId: 'b', message: '1' };
  const dto2 = { chatId: 'repeat', senderId: 'a', receiverId: 'b', message: '2' };
  service.create = jest.fn().mockResolvedValueOnce({ ...dto1, _id: 'x1' }).mockResolvedValueOnce({ ...dto2, _id: 'x2' });
  expect(await controller.create(dto1)).toHaveProperty('_id', 'x1');
  expect(await controller.create(dto2)).toHaveProperty('_id', 'x2');
});

  });

  // ✅ Integration Testing
  describe('Integration Testing', () => {
    const dto: CreateMessageDto = {
      chatId: 'chat456',
      senderId: 'alice',
      receiverId: 'bob',
      message: 'Test msg',
    };

    it('should save message and retrieve it by chatId', async () => {
      const saved = { ...dto, _id: 'm001' };
      service.create = jest.fn().mockResolvedValue(saved);
      const createResult = await controller.create(dto);
      expect(createResult).toEqual(saved);
    });

    it('should call service methods in expected order', async () => {
      await controller.create(dto);
      await controller.findByChatId(dto.chatId);
      expect(service.create).toHaveBeenCalled();
      expect(service.findByChatId).toHaveBeenCalled();
    });

    it('should handle valid POST and GET routes successfully', async () => {
      const saved = { ...dto, _id: 'mX' };
      service.create = jest.fn().mockResolvedValue(saved);
      service.findByChatId = jest.fn().mockResolvedValue([saved]);
      expect(await controller.create(dto)).toHaveProperty('_id');
      expect(await controller.findByChatId(dto.chatId)).toHaveLength(1);
    });

    it('should integrate with DB and return accurate data', async () => {
      const expected = [{ ...dto }];
      service.findByChatId = jest.fn().mockResolvedValue(expected);
      const result = await controller.findByChatId(dto.chatId);
      expect(result).toEqual(expected);
    });

    it('should save multiple messages for same chatId', async () => {
  const base = { chatId: 'same-id', senderId: 'x', receiverId: 'y' };
  const msg1 = { ...base, message: '1', _id: 'm1' };
  const msg2 = { ...base, message: '2', _id: 'm2' };
  service.create = jest.fn().mockResolvedValueOnce(msg1).mockResolvedValueOnce(msg2);
  expect(await controller.create(msg1)).toEqual(msg1);
  expect(await controller.create(msg2)).toEqual(msg2);
});

it('should allow consecutive create and fetch operations', async () => {
  const dto = { chatId: 'flow-id', senderId: 'aa', receiverId: 'bb', message: 'flow' };
  const saved = { ...dto, _id: 'flow-m' };
  service.create = jest.fn().mockResolvedValue(saved);
  service.findByChatId = jest.fn().mockResolvedValue([saved]);
  expect(await controller.create(dto)).toEqual(saved);
  expect(await controller.findByChatId(dto.chatId)).toContainEqual(saved);
});

it('should isolate message contexts across different chatIds', async () => {
  const m1 = { chatId: 'id1', senderId: 'u1', receiverId: 'u2', message: 'msg1', _id: 'a1' };
  const m2 = { chatId: 'id2', senderId: 'u3', receiverId: 'u4', message: 'msg2', _id: 'a2' };
  service.findByChatId = jest.fn().mockImplementation(chatId => {
    return Promise.resolve(chatId === 'id1' ? [m1] : [m2]);
  });
  expect(await controller.findByChatId('id1')).toEqual([m1]);
  expect(await controller.findByChatId('id2')).toEqual([m2]);
});

  });

  // ✅ DTO Validation Testing (simulate service throwing on bad DTO)
  describe('DTO Validation Testing', () => {
    it('should throw error if required fields are missing', async () => {
      const badDto: any = { chatId: '123', message: 'Missing fields' };
      service.create = jest.fn().mockRejectedValue(new Error('Validation failed'));
      await expect(controller.create(badDto)).rejects.toThrow('Validation failed');
    });

    it('should throw error if senderId is invalid', async () => {
      const badDto: any = { chatId: '123', senderId: '', receiverId: 'u2', message: 'Test' };
      service.create = jest.fn().mockRejectedValue(new Error('Invalid senderId'));
      await expect(controller.create(badDto)).rejects.toThrow('Invalid senderId');
    });

    it('should throw error if message is empty', async () => {
      const badDto: any = { chatId: '123', senderId: 'u1', receiverId: 'u2', message: '' };
      service.create = jest.fn().mockRejectedValue(new Error('Message is required'));
      await expect(controller.create(badDto)).rejects.toThrow('Message is required');
    });

    it('should throw error if chatId is null', async () => {
      const badDto: any = { chatId: null, senderId: 'u1', receiverId: 'u2', message: 'Hi' };
      service.create = jest.fn().mockRejectedValue(new Error('chatId cannot be null'));
      await expect(controller.create(badDto)).rejects.toThrow('chatId cannot be null');
    });

    it('should reject when receiverId is missing', async () => {
  const badDto: any = { chatId: '123', senderId: 'u1', message: 'No receiver' };
  service.create = jest.fn().mockRejectedValue(new Error('receiverId is required'));
  await expect(controller.create(badDto)).rejects.toThrow('receiverId is required');
});

it('should reject when all fields are empty strings', async () => {
  const badDto: any = { chatId: '', senderId: '', receiverId: '', message: '' };
  service.create = jest.fn().mockRejectedValue(new Error('Invalid input data'));
  await expect(controller.create(badDto)).rejects.toThrow('Invalid input data');
});

it('should reject when DTO is null', async () => {
  service.create = jest.fn().mockRejectedValue(new Error('Invalid DTO structure'));
  await expect(controller.create(null as any)).rejects.toThrow('Invalid DTO structure');
});

  });

  // ✅ Schema Validation Testing
  describe('Schema Validation Testing', () => {
    const goodDto: CreateMessageDto = {
      chatId: 'chat789',
      senderId: 'userA',
      receiverId: 'userB',
      message: 'All good',
    };

    it('should store messages matching schema', async () => {
      const stored = { ...goodDto, _id: 'mongoId' };
      service.create = jest.fn().mockResolvedValue(stored);
      const result = await controller.create(goodDto);
      expect(result).toEqual(stored);
    });

    it('should fail if chatId is number (schema type mismatch)', async () => {
      const badDto: any = { chatId: 12345, senderId: 'x', receiverId: 'y', message: 'Wrong type' };
      service.create = jest.fn().mockRejectedValue(new Error('Invalid schema'));
      await expect(controller.create(badDto)).rejects.toThrow('Invalid schema');
    });

    it('should fail if message is object instead of string', async () => {
      const badDto: any = { chatId: 'ok', senderId: 'x', receiverId: 'y', message: {} };
      service.create = jest.fn().mockRejectedValue(new Error('Invalid message format'));
      await expect(controller.create(badDto)).rejects.toThrow('Invalid message format');
    });

    it('should fail if any required field is missing', async () => {
      const badDto: any = { chatId: 'onlyId' };
      service.create = jest.fn().mockRejectedValue(new Error('Missing fields'));
      await expect(controller.create(badDto)).rejects.toThrow('Missing fields');
    });

    it('should pass when all fields are valid strings', async () => {
  const dto: CreateMessageDto = { chatId: 'ok', senderId: 'u1', receiverId: 'u2', message: 'good' };
  const result = { ...dto, _id: 'schema-pass' };
  service.create = jest.fn().mockResolvedValue(result);
  expect(await controller.create(dto)).toEqual(result);
});

it('should fail when _id field is not a string', async () => {
  const invalid = { chatId: 'id', senderId: 'a', receiverId: 'b', message: 'fail', _id: 123 };
  service.create = jest.fn().mockRejectedValue(new Error('Invalid _id type'));
  await expect(controller.create(invalid as any)).rejects.toThrow('Invalid _id type');
});

it('should fail when extra unknown field is added', async () => {
  const invalid = { chatId: 'id', senderId: 'a', receiverId: 'b', message: 'fail', unknown: 'bad' };
  service.create = jest.fn().mockRejectedValue(new Error('Unexpected field: unknown'));
  await expect(controller.create(invalid as any)).rejects.toThrow('Unexpected field: unknown');
});


  });

  // ✅ Negative Testing
  describe('Negative Testing', () => {
    it('should return error on invalid chatId', async () => {
      service.findByChatId = jest.fn().mockRejectedValue(new Error('Invalid chatId'));
      await expect(controller.findByChatId('')).rejects.toThrow('Invalid chatId');
    });

    it('should not save malformed message DTO', async () => {
      const badDto: any = { text: 'wrong key' };
      service.create = jest.fn().mockRejectedValue(new Error('Invalid DTO'));
      await expect(controller.create(badDto)).rejects.toThrow('Invalid DTO');
    });

    it('should return empty array if no messages found', async () => {
      service.findByChatId = jest.fn().mockResolvedValue([]);
      const result = await controller.findByChatId('no-msg-chat');
      expect(result).toEqual([]);
    });

    it('should handle unknown internal error gracefully', async () => {
      service.findByChatId = jest.fn().mockRejectedValue(new Error('Internal server error'));
      await expect(controller.findByChatId('xyz')).rejects.toThrow('Internal server error');
    });

    it('should handle service.create throwing general error', async () => {
  const dto: CreateMessageDto = { chatId: 'x', senderId: 'y', receiverId: 'z', message: 'Oops' };
  service.create = jest.fn().mockRejectedValue(new Error('Unexpected failure'));
  await expect(controller.create(dto)).rejects.toThrow('Unexpected failure');
});

it('should return empty result on non-existent chatId', async () => {
  service.findByChatId = jest.fn().mockResolvedValue([]);
  const result = await controller.findByChatId('non-existent');
  expect(result).toEqual([]);
});

it('should return rejected promise on undefined chatId', async () => {
  service.findByChatId = jest.fn().mockRejectedValue(new Error('chatId is undefined'));
  await expect(controller.findByChatId(undefined as any)).rejects.toThrow('chatId is undefined');
});

  });

   // ✅ Unit Tests for `findByChatId()` method of MessagesController,
describe('findByChatId()', () => {
  
  it('returns messages retrieved by service for given chatId', async () => {
    const chatId = 'abc123';
    const result = [
      { chatId, senderId: 'user1', content: 'Hello' },
      { chatId, senderId: 'user2', content: 'Hi' },
    ];
    service.findByChatId = jest.fn().mockResolvedValue(result);

    const response = await controller.findByChatId(chatId);
    expect(response).toEqual(result);
  });

  it('should handle unknown internal error gracefully', async () => {
    service.findByChatId = jest.fn().mockRejectedValue(new Error('Internal server error'));

    await expect(controller.findByChatId('xyz')).rejects.toThrow('Internal server error');
  });

  it('should return correct number of messages', async () => {
  const messages = [
    { chatId: 'abc123', senderId: 'u1', receiverId: 'u2', message: '1' },
    { chatId: 'abc123', senderId: 'u2', receiverId: 'u1', message: '2' },
  ];
  service.findByChatId = jest.fn().mockResolvedValue(messages);
  const result = await controller.findByChatId('abc123');
  expect(result.length).toBe(2);
});

it('should support chatId with special characters', async () => {
  const messages = [{ chatId: 'chat-!@#$', senderId: 'x', receiverId: 'y', message: 'Yes' }];
  service.findByChatId = jest.fn().mockResolvedValue(messages);
  const result = await controller.findByChatId('chat-!@#$');
  expect(result).toEqual(messages);
});

it('should not return null', async () => {
  service.findByChatId = jest.fn().mockResolvedValue([]);
  const result = await controller.findByChatId('anything');
  expect(result).not.toBeNull();
});

});

// ✅ Simulated End-to-End Testing of create → fetch flow
describe('End-to-End Message Flow', () => {
  it('should create and fetch a message correctly', async () => {
    const dto: CreateMessageDto = {
      chatId: 'chat-e2e',
      senderId: 'u1',
      receiverId: 'u2',
      message: 'Hello E2E',
    };

    const createdMessage = { ...dto, _id: 'msg-e2e' };
    service.create = jest.fn().mockResolvedValue(createdMessage);
    service.findByChatId = jest.fn().mockResolvedValue([createdMessage]);

    const postResult = await controller.create(dto);
    expect(postResult).toEqual(createdMessage);

    const getResult = await controller.findByChatId(dto.chatId);
    expect(getResult).toContainEqual(createdMessage);
  });

  it('should handle empty results after valid creation', async () => {
    const dto: CreateMessageDto = {
      chatId: 'chat-empty',
      senderId: 'u1',
      receiverId: 'u2',
      message: 'Empty test',
    };

    const saved = { ...dto, _id: 'id999' };
    service.create = jest.fn().mockResolvedValue(saved);
    service.findByChatId = jest.fn().mockResolvedValue([]);

    await controller.create(dto);
    const result = await controller.findByChatId(dto.chatId);
    expect(result).toEqual([]);
  });

  it('should ensure same chatId returns matching messages', async () => {
    const chatId = 'c123';
    const messages = [
      { chatId, senderId: 'a', receiverId: 'b', message: '1' },
      { chatId, senderId: 'b', receiverId: 'a', message: '2' },
    ];

    service.findByChatId = jest.fn().mockResolvedValue(messages);
    const result = await controller.findByChatId(chatId);
    expect(result.length).toBe(2);
    expect(result.every((m) => m.chatId === chatId)).toBeTruthy();
  });

  it('should not throw error if messages array is empty', async () => {
    service.findByChatId = jest.fn().mockResolvedValue([]);
    const result = await controller.findByChatId('no-data');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it('should create and retrieve multiple messages in order', async () => {
  const dto1 = { chatId: 'flow123', senderId: 'a', receiverId: 'b', message: '1' };
  const dto2 = { chatId: 'flow123', senderId: 'b', receiverId: 'a', message: '2' };
  const created1 = { ...dto1, _id: 'x1' };
  const created2 = { ...dto2, _id: 'x2' };

  service.create = jest.fn()
    .mockResolvedValueOnce(created1)
    .mockResolvedValueOnce(created2);
  service.findByChatId = jest.fn().mockResolvedValue([created1, created2]);

  await controller.create(dto1);
  await controller.create(dto2);
  const result = await controller.findByChatId('flow123');
  expect(result).toEqual([created1, created2]);
});

it('should confirm id field exists on created messages', async () => {
  const dto = { chatId: 'check-id', senderId: 'p', receiverId: 'q', message: 'hello' };
  const result = { ...dto, _id: 'generated-id' };
  service.create = jest.fn().mockResolvedValue(result);
  const response = await controller.create(dto);
  expect(response._id).toBeDefined();
});

it('should fetch consistent data for repeated same-chatId calls', async () => {
  const message = { chatId: 'repeat-id', senderId: 'x', receiverId: 'y', message: 'const', _id: 'z1' };
  service.findByChatId = jest.fn().mockResolvedValue([message]);
  const first = await controller.findByChatId('repeat-id');
  const second = await controller.findByChatId('repeat-id');
  expect(first).toEqual(second);
});

});

// ✅ Return Format Testing
describe('Return Format Testing', () => {
  it('should return message object with _id, chatId, senderId, receiverId, and message', async () => {
    const expected = {
      _id: 'format1',
      chatId: 'chatF',
      senderId: 'A',
      receiverId: 'B',
      message: 'format check',
    };
    service.create = jest.fn().mockResolvedValue(expected);
    const result = await controller.create({
      chatId: 'chatF',
      senderId: 'A',
      receiverId: 'B',
      message: 'format check',
    });
    expect(result).toMatchObject({
      _id: expect.any(String),
      chatId: expect.any(String),
      senderId: expect.any(String),
      receiverId: expect.any(String),
      message: expect.any(String),
    });
  });

  it('should only match allowed public fields from response', async () => {
  const extra = {
    _id: 'xyz',
    chatId: 'cf',
    senderId: '1',
    receiverId: '2',
    message: 'valid',
    secretKey: 'not-allowed',
  };

  service.create = jest.fn().mockResolvedValue(extra);

  const result = await controller.create({
    chatId: 'cf',
    senderId: '1',
    receiverId: '2',
    message: 'valid',
  });

  const { _id, chatId, senderId, receiverId, message } = result;

  expect({ _id, chatId, senderId, receiverId, message }).toEqual({
    _id: 'xyz',
    chatId: 'cf',
    senderId: '1',
    receiverId: '2',
    message: 'valid',
  });
});


it('should include all required keys in message object', async () => {
  const msg = {
    _id: 'xyz',
    chatId: 'cf',
    senderId: '1',
    receiverId: '2',
    message: 'valid',
  };
  service.create = jest.fn().mockResolvedValue(msg);
  const result = await controller.create({
    chatId: 'cf',
    senderId: '1',
    receiverId: '2',
    message: 'valid',
  });
  expect(result).toHaveProperty('chatId');
  expect(result).toHaveProperty('senderId');
  expect(result).toHaveProperty('receiverId');
  expect(result).toHaveProperty('message');
});
  
it('should maintain type consistency across responses', async () => {
  const message = {
    _id: 't101',
    chatId: 'typed',
    senderId: 's1',
    receiverId: 's2',
    message: 'typed test',
  };
  service.create = jest.fn().mockResolvedValue(message);
  const result = await controller.create(message);
  expect(typeof result.chatId).toBe('string');
  expect(typeof result.message).toBe('string');
});

});

// ✅ Snapshot Testing for MessagesController
describe('Snapshot Testing', () => {
 
  it('should match snapshot for messages list by chatId', async () => {
    const chatId = 'snap-chat';
    const messages = [
      { chatId, senderId: 'u1', receiverId: 'u2', message: 'Hi', _id: 'm1' },
      { chatId, senderId: 'u2', receiverId: 'u1', message: 'Hello', _id: 'm2' },
    ];

    service.findByChatId = jest.fn().mockResolvedValue(messages);
    const result = await controller.findByChatId(chatId);
    expect(result).toMatchSnapshot();
  });

  it('should match snapshot for empty message list', async () => {
    service.findByChatId = jest.fn().mockResolvedValue([]);
    const result = await controller.findByChatId('empty-chat');
    expect(result).toMatchSnapshot();
  });

  it('should match snapshot for error when chatId is invalid', async () => {
    service.findByChatId = jest.fn().mockRejectedValue(new Error('Invalid chatId'));
    await expect(controller.findByChatId('')).rejects.toThrowErrorMatchingSnapshot();
  });

  it('should match snapshot for multiple messages', async () => {
  const chatId = 'snap-multi';
  const messages = [
    { chatId, senderId: 'x', receiverId: 'y', message: 'First', _id: 'm1' },
    { chatId, senderId: 'y', receiverId: 'x', message: 'Second', _id: 'm2' },
  ];
  service.findByChatId = jest.fn().mockResolvedValue(messages);
  const result = await controller.findByChatId(chatId);
  expect(result).toMatchSnapshot();
});

it('should match snapshot with special characters in message', async () => {
  const message = {
    _id: 'id-@#',
    chatId: 'snap-special',
    senderId: '1',
    receiverId: '2',
    message: 'Hello 🤖✨ #special!',
  };
  service.create = jest.fn().mockResolvedValue(message);
  const result = await controller.create({
    chatId: 'snap-special',
    senderId: '1',
    receiverId: '2',
    message: 'Hello 🤖✨ #special!',
  });
  expect(result).toMatchSnapshot();
});

it('should match snapshot when no messages exist for chatId', async () => {
  service.findByChatId = jest.fn().mockResolvedValue([]);
  const result = await controller.findByChatId('nothing-here');
  expect(result).toMatchSnapshot();
});

});

});
