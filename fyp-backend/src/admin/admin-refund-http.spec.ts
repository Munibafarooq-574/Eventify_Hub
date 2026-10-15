import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import request from 'supertest';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { User } from '../schemas/user.schema';
import { AdminFinanceController } from './admin-finance.controller';
import { AdminFinanceService } from './admin-finance.service';

describe('Admin refund closure HTTP flow', () => {
  let app: INestApplication; let jwt: JwtService; let refund: any;
  const admin = { _id: new Types.ObjectId().toString(), role: 'Admin' };
  const client = { _id: new Types.ObjectId().toString(), role: 'Client' };
  const secret = 'http-refund-test-only-secret';
  beforeAll(async () => {
    const refundModel = {
      findById: async () => refund,
      findOneAndUpdate: async (filter: any, update: any) => {
        if (filter.status !== refund.status || filter.refundAmount !== refund.refundAmount) return null;
        Object.assign(refund, update.$set); return refund;
      },
    };
    const service = new AdminFinanceService({} as any, refundModel as any, {} as any, {} as any, {} as any, {} as any);
    const module = await Test.createTestingModule({
      imports: [PassportModule, JwtModule.register({ secret })], controllers: [AdminFinanceController],
      providers: [JwtStrategy, { provide: ConfigService, useValue: { get: () => secret } },
        { provide: getModelToken(User.name), useValue: { findById: (id: string) => ({ select: () => ({ lean: async () => id === admin._id ? admin : client }) }) } },
        { provide: AdminFinanceService, useValue: service }],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init(); jwt = module.get(JwtService);
  });
  afterAll(async () => app?.close());
  beforeEach(() => { refund = { _id: new Types.ObjectId(), refundAmount: 0, amountPaid: 2000, withheldAmount: 2000, status: 'PROCESSING' }; });
  const patch = () => request(app.getHttpServer()).patch(`/admin/finance/refunds/${refund._id}/status`);
  const auth = (id = admin._id) => `Bearer ${jwt.sign({ id, role: 'admin' })}`;
  it('closes the existing zero processing record using authenticated Admin identity', async () => {
    const response = await patch().set('Authorization', auth()).send({ status: 'NO_REFUND_DUE' }).expect(200);
    expect(response.body).toMatchObject({ status: 'NO_REFUND_DUE', refundAmount: 0, withheldAmount: 2000, closedBy: admin._id, refundedAt: null, paidAt: null });
    expect(response.body.closedAt).toBeTruthy();
    await patch().set('Authorization', auth()).send({ status: 'NO_REFUND_DUE' }).expect(200);
  });
  it('rejects unauthenticated and non-Admin closure despite a spoofed token role', async () => {
    await patch().send({ status: 'NO_REFUND_DUE' }).expect(401);
    await patch().set('Authorization', auth(client._id)).send({ status: 'NO_REFUND_DUE' }).expect(403);
    expect(refund.status).toBe('PROCESSING');
  });
  it('rejects a zero refunded status and injected financial fields', async () => {
    await patch().set('Authorization', auth()).send({ status: 'REFUNDED' }).expect(409);
    await patch().set('Authorization', auth()).send({ status: 'NO_REFUND_DUE', refundAmount: 0 }).expect(400);
    expect(refund.status).toBe('PROCESSING');
  });
  it('does not close a positive refund without repayment', async () => {
    refund.refundAmount = 1000;
    await patch().set('Authorization', auth()).send({ status: 'NO_REFUND_DUE' }).expect(409);
    expect(refund.status).toBe('PROCESSING');
  });
});
