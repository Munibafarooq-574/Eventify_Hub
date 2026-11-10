import { Types } from 'mongoose';
import { SubscriptionService } from './subscription.service';
import { PaymentProvider, PaymentStatus, SubscriptionStatus } from './subscription.types';

const plain = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const makeService = (sendReceipt: boolean, emailFails = false) => {
  const vendorId = new Types.ObjectId();
  const adminId = new Types.ObjectId();
  const paymentRequest: any = {
    _id: new Types.ObjectId(), vendorId,
    plan: 'growth', entitlementSnapshot: { name: 'Growth' },
    amountDue: 25.33, amountPaid: 0,
    currency: 'USD', paymentProvider: PaymentProvider.CARD_TEST,
    paymentReference: 'TEST-CARD-ABC', sendReceipt,
    status: SubscriptionStatus.PENDING_PAYMENT,
    paymentStatus: PaymentStatus.PENDING,
    activationType: 'immediate', endDate: null,
    save: jest.fn(async () => undefined),
  };
  const sessionQuery = (value: any) => ({ session: jest.fn(async () => value) });
  const sendTransactionalEmail = jest.fn(async () => {
    if (emailFails) throw new Error('Brevo offline');
  });
  const vendor = {
    email: 'vendor@example.invalid',
    name: 'Vendor13',
    contactDetails: { brandName: 'Studio & Events' },
  };
  const service: any = Object.create(SubscriptionService.prototype);
  service.connection = { transaction: (fn: (session: object) => Promise<void>) => fn({}) };
  service.subscriptionModel = {
    findById: jest.fn(() => sessionQuery(paymentRequest)),
    exists: jest.fn(() => sessionQuery(false)),
    find: jest.fn(() => sessionQuery([])),
    updateMany: jest.fn(async () => undefined),
  };
  service.userModel = {
    updateOne: jest.fn(async () => ({ matchedCount: 1 })),
    findById: jest.fn(() => ({
      select: jest.fn(() => ({ lean: jest.fn(async () => vendor) })),
    })),
  };
  service.emailService = { sendTransactionalEmail };
  return { service, vendorId, adminId, paymentRequest, sendTransactionalEmail };
};

describe('Vendor subscription receipt email', () => {
  it('reuses booking purple email design and escapes vendor supplied text', () => {
    const { service } = makeService(true);
    const html = service.buildSubscriptionPaymentReceiptEmail({
      vendorName: '<script>alert(1)</script>', brandName: 'Studio & Events',
      planName: 'Growth', amount: 25.33, currency: 'USD',
      provider: PaymentProvider.CARD_TEST, reference: 'TEST-CARD-ABC',
      verifiedAt: new Date('2026-11-10T15:30:00Z'),
      startsAt: new Date('2026-11-10T15:30:00Z'),
      endsAt: new Date('2026-12-10T15:30:00Z'), scheduled: false,
    });
    const display = plain(html);
    expect(html).toContain('background:#7D0C72');
    expect(html).toContain('Subscription Payment Receipt');
    expect(display).toContain('Amount Paid: $ 25.33');
    expect(display).toContain('Credit / Debit Card (Test)');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
    expect(html).toContain('Studio &amp; Events');
  });

  it('sends receipt to vendor only after approved transaction commits', async () => {
    const { service, adminId, paymentRequest, sendTransactionalEmail } = makeService(true);
    const result = await service.reviewSubscriptionPayment(
      String(paymentRequest._id), 'PAID', String(adminId),
    );
    expect(result.paymentStatus).toBe(PaymentStatus.PAID);
    expect(result.status).toBe(SubscriptionStatus.ACTIVE);
    expect(sendTransactionalEmail).toHaveBeenCalledTimes(1);
    const mail = sendTransactionalEmail.mock.calls[0][0] as any;
    expect(mail.to).toBe('vendor@example.invalid');
    expect(mail.subject).toContain('Growth');
    expect(plain(mail.html)).toContain('Amount Paid: $ 25.33');
    expect(paymentRequest.save).toHaveBeenCalledTimes(1);
  });

  it('does not email when receipt preference is off', async () => {
    const { service, adminId, paymentRequest, sendTransactionalEmail } = makeService(false);
    await service.reviewSubscriptionPayment(String(paymentRequest._id), 'PAID', String(adminId));
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
  });

  it('does not send success receipt for a rejected subscription request', async () => {
    const { service, adminId, paymentRequest, sendTransactionalEmail } = makeService(true);
    const result = await service.reviewSubscriptionPayment(
      String(paymentRequest._id), 'FAILED', String(adminId), 'Not verified',
    );
    expect(result.paymentStatus).toBe(PaymentStatus.FAILED);
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
  });

  it('does not rollback a committed approval when email delivery fails', async () => {
    const { service, adminId, paymentRequest } = makeService(true, true);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const result = await service.reviewSubscriptionPayment(
        String(paymentRequest._id), 'PAID', String(adminId),
      );
      expect(result.paymentStatus).toBe(PaymentStatus.PAID);
      expect(errorSpy).toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });
});
