import { Types } from 'mongoose';
import { AdminFinanceService } from './admin-finance.service';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AdminFinanceController } from './admin-finance.controller';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/admin-role.guard';
import { model } from 'mongoose';
import { RefundSchema } from '../schemas/refund.schema';
const adminId = new Types.ObjectId().toString();
function fixture(amount = 0, status = 'PROCESSING') {
  const record: any = { _id: new Types.ObjectId(), status, refundAmount: amount, amountPaid: 2000, withheldAmount: 2000 - amount,
    processedAt: new Date(), refundedAt: null, rejectedAt: null, paidAt: null, notes: 'Original audit note' };
  const refunds = { findById: jest.fn().mockResolvedValue(record), findOneAndUpdate: jest.fn(async (_filter, update, _options) => Object.assign(record, update.$set)) };
  const service = new AdminFinanceService({} as any, refunds as any, {} as any, {} as any, {} as any, {} as any);
  const update = (target: any) => service.updateRefundStatus(String(record._id), target, adminId);
  return { record, refunds, service, update };
}
describe('Zero-refund closure without recording a repayment', () => {
  it.each(['PENDING', 'PROCESSING', 'REJECTED'])('closes an existing zero-refund %s record with an Admin audit', async status => {
    const f = fixture(0, status); const result = await f.update('NO_REFUND_DUE');
    expect(result).toMatchObject({ status: 'NO_REFUND_DUE', amountPaid: 2000, refundAmount: 0, withheldAmount: 2000, notes: 'Original audit note', refundedAt: null, paidAt: null, rejectedAt: null });
    expect(result!.closedAt).toBeInstanceOf(Date); expect(String(result!.closedBy)).toBe(adminId);
    expect(f.refunds.findOneAndUpdate.mock.calls[0][0]).toEqual({ _id: f.record._id, status, refundAmount: 0 });
  });
  it.each(['PROCESSING', 'REFUNDED', 'REJECTED'])('rejects %s for a zero refund, even through a direct API request', async target => {
    const f = fixture(0, 'PENDING'); await expect(f.update(target)).rejects.toThrow('Use Close case'); expect(f.refunds.findOneAndUpdate).not.toHaveBeenCalled();
  });
  it('rejects closing a positive refund as no refund due', async () => {
    const f = fixture(1000); await expect(f.update('NO_REFUND_DUE')).rejects.toThrow('positive refund'); expect(f.refunds.findOneAndUpdate).not.toHaveBeenCalled();
  });
  it('does not close without an authenticated Admin identity', async () => {
    const f = fixture(); await expect(f.service.updateRefundStatus(String(f.record._id), 'NO_REFUND_DUE')).rejects.toThrow('Admin identity');
  });
  it('keeps closure terminal and retries idempotent without changing the close time', async () => {
    const f = fixture(); await f.update('NO_REFUND_DUE'); const date = f.record.closedAt;
    await f.update('NO_REFUND_DUE'); expect(f.record.closedAt).toBe(date); expect(f.refunds.findOneAndUpdate).toHaveBeenCalledTimes(1);
    await expect(f.update('PENDING')).rejects.toThrow('already closed');
  });
  it('keeps positive refunds on the processing then confirmed-settlement path', async () => {
    const f = fixture(1000, 'PENDING'); await expect(f.update('REFUNDED')).rejects.toThrow('Process and verify');
    await f.update('PROCESSING'); await f.update('REFUNDED'); expect(f.record.refundedAt).toBeInstanceOf(Date); expect(f.record.closedAt).toBeUndefined();
    await expect(f.update('PENDING')).rejects.toThrow('already closed');
  });
  it('does not overwrite a concurrent status/amount change', async () => {
    const f = fixture(); f.refunds.findOneAndUpdate.mockResolvedValueOnce(null);
    await expect(f.update('NO_REFUND_DUE')).rejects.toThrow('Refund changed'); expect(f.record.status).toBe('PROCESSING');
  });
  it.each([NaN, -1, undefined])('rejects invalid refund amount %s instead of treating it as zero', async amount => {
    const f = fixture(); f.record.refundAmount = amount; await expect(f.update('NO_REFUND_DUE')).rejects.toThrow('Invalid refund amount');
  });
  it('retains both JWT and Admin authorization guards on finance writes', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, AdminFinanceController)).toEqual(expect.arrayContaining([JwtAuthGuard, AdminRoleGuard]));
  });
  it('supports the closure status and audit fields in the existing Refund schema', () => {
    const Refund = model('ZeroRefundClosureSchemaTest', RefundSchema);
    const record = new Refund({ vendorOrderId: new Types.ObjectId(), orderId: new Types.ObjectId(), organizerId: new Types.ObjectId(), vendorId: new Types.ObjectId(), amountPaid: 2000, refundAmount: 0, withheldAmount: 2000, daysBeforeEvent: 4, cancellationPolicyApplied: 'NON-REFUNDABLE', initiatedBy: 'ORGANIZER_CANCELLED', status: 'NO_REFUND_DUE', closedAt: new Date(), closedBy: adminId });
    expect(record.validateSync()).toBeUndefined(); expect(String(record.closedBy)).toBe(adminId);
  });
});
