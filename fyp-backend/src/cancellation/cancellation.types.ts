// fyp-backend/src/cancellation/cancellation.types.ts
export interface RefundCalculationResult {
    daysBeforeEvent: number;
    tier: string;
    penaltyPercentage: number;
    amountPaid: number;
    refundAmount: number;
    withheldAmount: number;
}

export interface CancellationActor { id: string; role: string; }

export interface ClientCancellationPreview {
    vendorOrderId: string;
    eligible: boolean;
    restrictionCode?: string;
    message?: string;
    serviceName: string;
    eventStartDateTime: string | null;
    amountPaid: number;
    refundAmount: number | null;
    withheldAmount: number | null;
    refundPercentage: number | null;
    daysBeforeEvent: number | null;
    hoursBeforeEvent: number | null;
    tier: string | null;
    cancellationPolicyApplied: string | null;
    policyRevision: number | null;
    previewToken?: string;
    expiresAt?: string;
}
