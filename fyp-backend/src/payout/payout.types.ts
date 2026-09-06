// fyp-backend/src/payout/payout.types.ts
export interface PayoutSummary {
    vendorOrderId: string;
    grossAmount: number;
    payoutAmount: number;
    status: string;
    processedAt: Date | null;
    paidAt: Date | null;
}