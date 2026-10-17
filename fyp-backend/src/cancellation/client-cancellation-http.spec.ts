import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { getModelToken } from '@nestjs/mongoose';
import request from 'supertest';
import { Types } from 'mongoose';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { User } from '../schemas/user.schema';
import { CancellationController } from './cancellation.controller';
import { CancellationService } from './cancellation.service';

const secret = 'http-test-secret-only';
describe('Cancellation HTTP authentication and confirmation validation', () => {
    let app: INestApplication; let jwt: JwtService;
    const client = { _id: new Types.ObjectId().toString(), role: 'client' };
    const booking = new Types.ObjectId().toString();
    const service = { getClientRefunds: jest.fn(async () => []), calculateRefund: jest.fn(async () => ({ eligible: true })), organizerCancelConfirmedBooking: jest.fn(async () => ({ ok: true })), vendorCancelConfirmedBooking: jest.fn(), getVendorPenalties: jest.fn() };
    beforeAll(async () => {
        const module = await Test.createTestingModule({
            imports: [PassportModule, JwtModule.register({ secret })], controllers: [CancellationController],
            providers: [JwtStrategy, { provide: ConfigService, useValue: { get: () => secret } },
                { provide: getModelToken(User.name), useValue: { findById: () => ({ select: () => ({ lean: async () => client }) }) } },
                { provide: CancellationService, useValue: service }],
        }).compile();
        app = module.createNestApplication(); await app.init(); jwt = module.get(JwtService);
    });
    afterAll(async () => app?.close());
    beforeEach(() => jest.clearAllMocks());
    const path = () => `/cancellation/vendor-order/${booking}`;
    const auth = () => `Bearer ${jwt.sign({ id: client._id, role: 'admin' })}`;
    it.each(['calculate-refund', 'organizer-cancel-confirmed', 'vendor-cancel-confirmed'])('rejects missing JWT on %s', async route => {
        const req = route === 'calculate-refund' ? request(app.getHttpServer()).get(`${path()}/${route}`) : request(app.getHttpServer()).patch(`${path()}/${route}`).send({});
        await req.expect(401);
    });
    it('rejects an expired or incorrectly signed JWT', async () => {
        for (const token of [jwt.sign({ id: client._id }, { expiresIn: -10 }), jwt.sign({ id: client._id }, { secret: 'wrong-key' })]) {
            await request(app.getHttpServer()).get(`${path()}/calculate-refund`).set('Authorization', `Bearer ${token}`).expect(401);
        }
        expect(service.calculateRefund).not.toHaveBeenCalled();
    });
    it('passes database identity, rather than a supplied JWT role, into the existing service', async () => {
        await request(app.getHttpServer()).get(`${path()}/calculate-refund`).set('Authorization', auth()).expect(200);
        expect(service.calculateRefund).toHaveBeenCalledWith(booking, { id: client._id, role: 'client' });
    });
    it.each([{}, { previewToken: 'quote' }, { previewToken: 'quote', reason: '' }, { previewToken: 'quote', reason: '   ' }, { previewToken: '' }, { previewToken: 'quote', refundAmount: 999 }, { previewToken: 'quote', organizerId: client._id }, { previewToken: 'quote', reason: 'x'.repeat(501) }])('rejects missing preview or client-controlled financial/identity fields', async body => {
        await request(app.getHttpServer()).patch(`${path()}/organizer-cancel-confirmed`).set('Authorization', auth()).send(body).expect(400);
        expect(service.organizerCancelConfirmedBooking).not.toHaveBeenCalled();
    });
    it('accepts only the preview token and required reason', async () => {
        await request(app.getHttpServer()).patch(`${path()}/organizer-cancel-confirmed`).set('Authorization', auth()).send({ previewToken: 'signed-quote', reason: 'Changed plans' }).expect(200);
        expect(service.organizerCancelConfirmedBooking).toHaveBeenCalledWith(booking, { id: client._id, role: 'client' }, expect.objectContaining({ previewToken: 'signed-quote', reason: 'Changed plans' }));
    });
    it('authenticates refund reads and ignores a supplied organizer identity', async () => {
        await request(app.getHttpServer()).get('/cancellation/refunds').expect(401);
        await request(app.getHttpServer()).get('/cancellation/refunds?organizerId=someone-else').set('Authorization',auth()).expect(200);
        expect(service.getClientRefunds).toHaveBeenCalledWith({id:client._id,role:'client'});
    });

});
