// fyp-backend/src/cancellation/cancellation.types.ts
export interface RefundCalculationResult {
    daysBeforeEvent: number;
    tier: string;
    penaltyPercentage: number;
    amountPaid: number;
    refundAmount: number;
    withheldAmount: number;
}