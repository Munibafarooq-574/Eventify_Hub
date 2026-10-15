import { ValidationPipe } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { CancellationController } from './cancellation.controller';
import { CancellationService } from './cancellation.service';
import { CancellationPolicySettingsDto, UpdateCancellationPolicyDto } from './dto/cancellation-policy.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/admin-role.guard';

function settings(): CancellationPolicySettingsDto {
    return {
        clientRefunds: { refundable: [{ minHoursBeforeEvent: 0, percentage: 100 }],
            partiallyRefundable: [{ minHoursBeforeEvent: 0, percentage: 20 }, { minHoursBeforeEvent: 48, percentage: 80 }],
            nonRefundable: [{ minHoursBeforeEvent: 0, percentage: 0 }] },
        vendorCausedClientRefunds: [{ minHoursBeforeEvent: 0, percentage: 100 }],
        vendorPenalties: [{ minHoursBeforeEvent: 0, percentage: 50 }],
        paymentHoldHours: 24, postServiceIssueWindowHours: 72,
    };
}
function setup(hasSettings = true) {
    const config = { _id: 'config', policyRevision: 0, policySettings: hasSettings ? settings() : undefined,
        penalty30PlusDays: 3, penalty15to29Days: 12, penalty7to14Days: 28, penaltyUnder7Days: 54, penaltyEventDay: 99 };
    const model = {
        findOne: jest.fn().mockResolvedValue(config),
        updateOne: jest.fn().mockImplementation(async (_filter, update) => { Object.assign(config, update.$set); }),
        findById: jest.fn().mockReturnValue({ orFail: async () => config }),
        findOneAndUpdate: jest.fn().mockImplementation(async (filter, update) => {
            if (filter.policyRevision !== config.policyRevision) return null;
            Object.assign(config, update.$set); config.policyRevision++; return config;
        }),
        findByIdAndUpdate: jest.fn().mockImplementation((_id, update) => ({ orFail: async () => { Object.assign(config, update.$set); return config; } })),
    };
    const orders = { findById: async () => ({ _id: 'booking', eventStartDateTime: new Date(Date.now() + 10.5 * 86400000) }) };
    const payments = { find: async () => [{ amount: 1000 }] };
    const service = new CancellationService(orders as any, {} as any, payments as any, {} as any, {} as any, model as any, {} as any, {} as any);
    return { service, config, model };
}

describe('Step 2 policy structure', () => {
    const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
    const validate = (value: unknown) => pipe.transform(value, { type: 'body', metatype: UpdateCancellationPolicyDto });
    it.each([-1, 101, 2.5, null, '25'])('rejects invalid nested percentage %p', async value => {
        const input = settings(); (input.vendorPenalties[0] as any).percentage = value;
        await expect(validate({ policySettings: input, expectedRevision: 0 })).rejects.toThrow();
    });
    it.each([0, -1, 1.5, 8761, null])('rejects invalid duration %p', async value => {
        await expect(validate({ policySettings: { ...settings(), paymentHoldHours: value } })).rejects.toThrow();
    });
    it('rejects missing groups, empty tiers, null settings and unknown nested fields', async () => {
        await expect(validate({ policySettings: { ...settings(), clientRefunds: {} } })).rejects.toThrow();
        await expect(validate({ policySettings: { ...settings(), vendorPenalties: [] } })).rejects.toThrow();
        await expect(validate({ policySettings: null })).rejects.toThrow();
        await expect(validate({ policySettings: [settings()] })).rejects.toThrow();
        await expect(validate({ policySettings: { ...settings(), clientRefunds: [] } })).rejects.toThrow();
        await expect(validate({ policySettings: { ...settings(), activate: true } })).rejects.toThrow();
    });
    it('accepts independently configured groups and time ranges', async () => {
        await expect(validate({ policySettings: settings(), expectedRevision: 0 })).resolves.toBeDefined();
    });
    it('protects writes with JWT and Admin guards', () => {
        expect(Reflect.getMetadata(GUARDS_METADATA, CancellationController.prototype.updatePolicyConfig)).toEqual([JwtAuthGuard, AdminRoleGuard]);
    });
    it('seeds stored legacy values once without changing active penalties', async () => {
        const { service, config, model } = setup(false);
        await service.getPolicyConfig();
        expect(config.policySettings?.clientRefunds.partiallyRefundable).toContainEqual({ minHoursBeforeEvent: 168, percentage: 72 });
        expect(config.policySettings?.vendorPenalties).toContainEqual({ minHoursBeforeEvent: 168, percentage: 28 });
        expect(config.penalty7to14Days).toBe(28);
        await service.getPolicyConfig(); expect(model.updateOne).toHaveBeenCalledTimes(1);
    });
    it.each([
        [{ minHoursBeforeEvent: 1, percentage: 30 }],
        [{ minHoursBeforeEvent: 0, percentage: 30 }, { minHoursBeforeEvent: 0, percentage: 40 }],
        [{ minHoursBeforeEvent: 0, percentage: 30 }, { minHoursBeforeEvent: 48, percentage: 40 }, { minHoursBeforeEvent: 24, percentage: 50 }],
    ].map(tiers => ({ tiers })))('rejects uncovered or overlapping/unsorted ranges', async ({ tiers }) => {
        const { service, model } = setup();
        await expect(service.updatePolicyConfig({ expectedRevision: 0, policySettings: { ...settings(), vendorPenalties: tiers } })).rejects.toThrow('strictly increasing');
        expect(model.findOneAndUpdate).not.toHaveBeenCalled();
    });
    it('rejects missing revision, stale edits and mixed legacy/settings writes', async () => {
        const { service } = setup();
        await expect(service.updatePolicyConfig({ policySettings: settings() })).rejects.toThrow('expectedRevision');
        await expect(service.updatePolicyConfig({ policySettings: settings(), expectedRevision: 10 })).rejects.toThrow('Reload');
        await expect(service.updatePolicyConfig({ policySettings: settings(), expectedRevision: 0, penaltyEventDay: 3 })).rejects.toThrow('separately');
    });
    it('saves settings with a revision without changing current refunds', async () => {
        const { service, config } = setup();
        const before = await service.calculateRefund('booking');
        const next = settings(); next.vendorPenalties[0].percentage = 99; next.clientRefunds.partiallyRefundable[0].percentage = 100;
        next.paymentHoldHours = 48;
        await service.updatePolicyConfig({ policySettings: next, expectedRevision: 0 });
        expect(config.policyRevision).toBe(1);
        expect(config.policySettings?.vendorPenalties[0].percentage).toBe(99);
        expect(config.penalty7to14Days).toBe(28);
        expect(await service.calculateRefund('booking')).toEqual(before);
        await expect(service.updatePolicyConfig({ policySettings: next, expectedRevision: 0 })).rejects.toThrow('Reload');
    });
    it('preserves legacy Admin penalty API', async () => {
        const { service, config } = setup();
        await service.updatePolicyConfig({ penalty7to14Days: 35 });
        expect(config.penalty7to14Days).toBe(35);
        expect(config.policySettings?.vendorPenalties[0].percentage).toBe(50);
    });
});
