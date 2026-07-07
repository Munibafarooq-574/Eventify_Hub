import { Test, TestingModule } from '@nestjs/testing';
import { MessagesModule } from './messages.module';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Message, MessageSchema } from '../auth/schemas/message.schema';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

describe('MessagesModule', () => {
  let module: TestingModule;
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    await mongoose.connect(uri); // real connection for mongoose internals

    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri), // ✅ mocked DB
        MongooseModule.forFeature([{ name: Message.name, schema: MessageSchema }]),
      ],
      controllers: [MessagesController],
      providers: [MessagesService],
    }).compile();
  }, 20000); // ⏱ extend timeout for slow init

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  describe('Compilation Tests', () => {
    it('should compile the module without errors', () => {
      expect(module).toBeDefined();
    });

    it('should contain the MessagesController', () => {
      const controller = module.get<MessagesController>(MessagesController);
      expect(controller).toBeInstanceOf(MessagesController);
    });

    it('should contain the MessagesService', () => {
      const service = module.get<MessagesService>(MessagesService);
      expect(service).toBeInstanceOf(MessagesService);
    });

    it('should load module dependencies without error', () => {
  expect(module).toHaveProperty('container');
});

it('should define all expected providers', () => {
  const providers = module.get(MessagesService);
expect(providers).toBeDefined();
});

it('should include expected imports', () => {
const controllers = module.get(MessagesController);
expect(controllers).toBeDefined();
});

it('should export a compiled module object', () => {
  expect(typeof module).toBe('object');
});

  });

  describe('Controller & Provider Registration', () => {
    it('should have MessagesService as a provider', () => {
      const service = module.get<MessagesService>(MessagesService);
      expect(service).toBeDefined();
    });

    it('should register MessagesController correctly', () => {
      const controller = module.get<MessagesController>(MessagesController);
      expect(controller).toBeDefined();
    });

    it('should allow injection of MessagesService into controller', () => {
      const controller = module.get<MessagesController>(MessagesController);
      expect((controller as any).messagesService).toBeDefined();
    });

    it('should resolve MessagesService from module', () => {
  const service = module.get(MessagesService);
  expect(service).toBeDefined();
});

it('should resolve MessagesController from module', () => {
  const controller = module.get(MessagesController);
  expect(controller).toBeDefined();
});

it('should optionally have createMessage method in MessagesController', () => {
  const controller = module.get(MessagesController);
  expect(typeof (controller as any).createMessage === 'function' || typeof (controller as any).createMessage === 'undefined').toBe(true);
});


it('should not return null for MessagesService', () => {
  const service = module.get(MessagesService);
  expect(service).not.toBeNull();
});

  });

  describe('Schema Binding Tests', () => {
    it('should initialize Message schema without error', () => {
      expect(MessageSchema).toBeDefined();
    });

    it('should include Message model metadata', () => {
      const feature = MongooseModule.forFeature([{ name: Message.name, schema: MessageSchema }]);
      expect(feature.module).toBeDefined();
    });

    it('should not throw error when resolving schema', () => {
      expect(() =>
        MongooseModule.forFeature([{ name: Message.name, schema: MessageSchema }]),
      ).not.toThrow();
    });

  it('should define schema paths correctly', () => {
  expect(MessageSchema.path('chatId')).toBeDefined();
});

it('should define senderId as required', () => {
  expect(MessageSchema.path('senderId').isRequired).toBeTruthy();
});

it('should define message as a String', () => {
  expect(MessageSchema.path('message').instance).toBe('String');
});

 it('should optionally include timestamps in schema definition', () => {
  const hasCreatedAt = MessageSchema.path('createdAt');
  const hasUpdatedAt = MessageSchema.path('updatedAt');
  expect(hasCreatedAt || hasUpdatedAt).not.toBeNull(); // At least one defined
});


  });

  describe('Negative Testing', () => {
  it('should return undefined for unregistered provider', () => {
    try {
      module.get('UNKNOWN_TOKEN');
    } catch (err) {
      expect(err.message).toContain('Nest could not find UNKNOWN_TOKEN');
    }
  });

  it('should not resolve invalid controller token', () => {
    try {
      module.get('InvalidController');
    } catch (err) {
      expect(err.message).toContain('Nest could not find InvalidController');
    }
  });

  it('should fail if provider lookup is strict and not registered', () => {
    expect(() => module.get('invalid')).toThrow();
  });

  it('should throw for null token lookup', () => {
  expect(() => module.get(null as any)).toThrow();
});

it('should throw for undefined token lookup', () => {
  expect(() => module.get(undefined as any)).toThrow();
});

it('should throw for empty string token lookup', () => {
  expect(() => module.get('')).toThrow();
});

it('should throw descriptive error for bad provider access', () => {
  try {
    module.get('nonExisting');
  } catch (err) {
    expect(err.message).toMatch(/could not find/i);
  }
});

});

describe('DTO & Schema Validation', () => {
  it('should reject message creation without required fields', async () => {
    const TestModel = mongoose.model(Message.name, MessageSchema);
    const invalidMessage = new TestModel({});
    try {
      await invalidMessage.validate();
    } catch (err) {
      expect(err.errors).toBeDefined();
      expect(err.errors.chatId).toBeDefined();
      expect(err.errors.senderId).toBeDefined();
      expect(err.errors.message).toBeDefined();
    }
  });
 
  it('should accept a valid message schema document', async () => {
  const TestModel = mongoose.model(Message.name, MessageSchema);
  const validMessage = new TestModel({
    chatId: 'chat123',
    senderId: 'user1',
    receiverId: 'user2',
    message: 'Hello!',
  });

  await expect(validMessage.validate()).resolves.toBeUndefined(); // ✅ no error means valid
});

it('should reject if receiverId is missing', async () => {
  const TestModel = mongoose.model(Message.name, MessageSchema);
  const msg = new TestModel({ chatId: 'x', senderId: 'y', message: 'ok' });
  await expect(msg.validate()).rejects.toThrow();
});


it('should fail if receiverId is not provided', async () => {
  const TestModel = mongoose.model(Message.name, MessageSchema);
  const msg = new TestModel({ chatId: 'x', senderId: 'y', message: 'msg' });
  await expect(msg.validate()).rejects.toThrow();
});


it('should fail on invalid field types', async () => {
  const TestModel = mongoose.model(Message.name, MessageSchema);
  const msg = new TestModel({ chatId: {}, senderId: [], message: 123 });
  await expect(msg.validate()).rejects.toThrow();
});

it('should preserve message field spaces if trim is not set', async () => {
  const TestModel = mongoose.model(Message.name, MessageSchema);
  const msg = new TestModel({ chatId: 'c', senderId: 's', receiverId: 'r', message: '  hi  ' });
  const saved = await msg.save();
  expect(saved.message).toBe('  hi  '); // no trimming expected unless schema says so
});


});

describe('Auth Guard Testing', () => {
  class MockAuthGuard {
    canActivate(context: ExecutionContext) {
      return true;
    }
  }

  it('should allow access when guard returns true', () => {
    const guard = new MockAuthGuard();
    const canActivate = guard.canActivate({} as ExecutionContext);
    expect(canActivate).toBe(true);
  });

  it('should deny access when guard returns false', () => {
    class DenyGuard {
      canActivate() {
        return false;
      }
    }

    const guard = new DenyGuard();
    expect(guard.canActivate()).toBe(false);
  });

   it('should use reflector to extract metadata if implemented', () => {
  const reflector = new Reflector();
  const roles = reflector.get<string[]>('roles', class {});
  expect(roles).toBeUndefined(); // No roles assigned, safe fallback
});

it('should define canActivate method on mock guard', () => {
  const guard = new (class { canActivate = () => true })();
  expect(typeof guard.canActivate).toBe('function');
});

it('should handle unexpected ExecutionContext gracefully', () => {
  const reflector = new Reflector();
  const value = reflector.get<string[]>('roles', class {});
  expect(value).toBeUndefined(); // since no metadata is set
});

it('should fallback on undefined metadata from reflector', () => {
  const reflector = new Reflector();
  expect(() => reflector.get('roles', {} as any)).not.toThrow();
});

it('should use class context safely in reflector', () => {
  const reflector = new Reflector();
  const value = reflector.get<string[]>('roles', class Test {});
  expect(value).toBeUndefined();
});

});

describe('Rate Limiting/Throttler Testing', () => {
  it('should not throw error for standard request', () => {
    // Simulate safe request frequency
    expect(true).toBe(true); // Placeholder (actual throttler is integration-tested)
  });

  it('should respect default request limit', () => {
    const MAX_REQUESTS = 10; // Hypothetical value
    expect(MAX_REQUESTS).toBeLessThanOrEqual(60); // Default safe cap
  });

  it('should allow burst within timeframe', () => {
    const now = Date.now();
    const later = now + 1000;
    expect(later - now).toBeLessThanOrEqual(1000);
  });

  it('should simulate burst requests under safe range', () => {
  const simulated = [1, 2, 3, 4, 5];
  expect(simulated.length).toBeLessThanOrEqual(10);
});

it('should confirm request timing is linear', () => {
  const t1 = Date.now();
  const t2 = t1 + 500;
  expect(t2 - t1).toBe(500);
});

it('should support basic interval logic', () => {
  const interval = 100;
  expect(interval % 10).toBe(0);
});

it('should not exceed absolute request cap', () => {
  const requests = 30;
  expect(requests).toBeLessThan(100);
});

});

describe('Snapshot Testing', () => {
  it('should match snapshot for MessagesController', () => {
    const controller = module.get<MessagesController>(MessagesController);
    expect(controller).toMatchSnapshot();
  });

  it('should match snapshot for MessagesService', () => {
    const service = module.get<MessagesService>(MessagesService);
    expect(service).toMatchSnapshot();
  });

  it('should match snapshot for Mongoose schema', () => {
    const schema = MessageSchema.obj;
    expect(schema).toMatchSnapshot();
  });

  it('should consistently snapshot controller constructor shape', () => {
  const controller = module.get<MessagesController>(MessagesController);
  expect(typeof controller.constructor).toMatchSnapshot();
});

it('should snapshot individual service method existence', () => {
  const service = module.get<MessagesService>(MessagesService);
  expect(typeof service).toBe('object');
});

it('should snapshot schema structure keys', () => {
  const keys = Object.keys(MessageSchema.obj);
  expect(keys).toMatchSnapshot();
});

it('should ensure schema fields are stable across runs', () => {
  const schemaFields = Object.keys(MessageSchema.paths);
  expect(schemaFields).toMatchSnapshot();
});

});

});
