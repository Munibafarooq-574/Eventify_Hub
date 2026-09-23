import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { AdminDisputeService } from './admin-dispute.service';

describe('AdminDisputeService transaction rollback', () => {
  let mongo: MongoMemoryReplSet;

  beforeAll(async () => {
    mongo = await MongoMemoryReplSet.create({
      replSet: { count: 1 },
    });

    await mongoose.connect(mongo.getUri());
  }, 120000);

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo?.stop();
  });

  it('rolls back a dispute update when refund creation fails', async () => {
    const disputeId = new mongoose.Types.ObjectId();
    const vendorOrderId = new mongoose.Types.ObjectId();

    const disputeSchema = new mongoose.Schema({
      vendorOrderId: mongoose.Schema.Types.ObjectId,
      orderId: mongoose.Schema.Types.ObjectId,
      organizerId: mongoose.Schema.Types.ObjectId,
      vendorId: mongoose.Schema.Types.ObjectId,
      status: String,
      resolutionNotes: String,
      resolvedAt: Date,
    });

    const refundSchema = new mongoose.Schema({
      vendorOrderId: mongoose.Schema.Types.ObjectId,
      refundAmount: Number,
    });

    const paymentSchema = new mongoose.Schema({
      vendorOrderId: mongoose.Schema.Types.ObjectId,
      status: String,
      amount: Number,
    });

    const DisputeModel = mongoose.model('RollbackTestDispute', disputeSchema);
    const RefundModel = mongoose.model('RollbackTestRefund', refundSchema);
    const PaymentModel = mongoose.model('RollbackTestPayment', paymentSchema);

    await DisputeModel.create({
      _id: disputeId,
      vendorOrderId,
      orderId: new mongoose.Types.ObjectId(),
      organizerId: new mongoose.Types.ObjectId(),
      vendorId: new mongoose.Types.ObjectId(),
      status: 'OPEN',
    });

    await PaymentModel.create({
      vendorOrderId,
      status: 'SUCCESS',
      amount: 5000,
    });

    const refundModelWithFailure = {
      findOne: jest.fn().mockReturnValue({
        session: jest.fn().mockResolvedValue(null),
      }),
      create: jest.fn().mockRejectedValue(
        new Error('Simulated refund creation failure'),
      ),
    };

    const service = new AdminDisputeService(
      DisputeModel as any,
      {} as any,
      {} as any,
      PaymentModel as any,
      refundModelWithFailure as any,
      mongoose.connection,
    );

    await expect(
      service.resolveDispute(
        disputeId.toString(),
        'RESOLVED_ORGANIZER',
        'Rollback test',
      ),
    ).rejects.toThrow('Simulated refund creation failure');

    const dispute = await DisputeModel.findById(disputeId);

    expect(dispute?.status).toBe('OPEN');
    expect(dispute?.resolvedAt).toBeUndefined();
    expect(refundModelWithFailure.create).toHaveBeenCalledTimes(1);
  }, 120000);
});