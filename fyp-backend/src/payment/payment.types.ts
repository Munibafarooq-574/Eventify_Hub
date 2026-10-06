// fyp-backend/src/payment/payment.types.ts
export interface PaymentBreakdown {
    vendorOrderId: string;

    // Final backend-authoritative amount after discount/promotion.
    totalAmount: number;

    downPaymentType: string | null;
    downPaymentPercentage: number | null;
    downPaymentAmount: number;

    // Snapshot created when vendor accepts.
    remainingAmount: number;

    // Calculated from successful Payment records.
    paidAmount: number;
    outstandingAmount: number;

    paymentStatus: string;
paymentDeadline: Date | null;

pendingPayment: {
    paymentId: string;
    type: string;
    amount: number;
    method: string;
} | null;

latestSuccessfulPayment: {
    paymentId: string;
    type: string;
    amount: number;
    method: string;
    transactionRef: string | null;
    paidAt: Date | null;
    verificationUrl: string;
} | null;

}