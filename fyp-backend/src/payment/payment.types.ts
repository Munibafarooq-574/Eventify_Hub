// fyp-backend/src/payment/payment.types.ts
export interface PaymentBreakdown {
    vendorOrderId: string;
    totalAmount: number;
    downPaymentType: string;
    downPaymentPercentage: number | null;
    downPaymentAmount: number;
    remainingAmount: number;
    paymentStatus: string;
    paymentDeadline: Date | null;
}