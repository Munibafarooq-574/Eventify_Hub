// fyp-mobile/dto/CreateGenericBusinessDetails.dto.ts

export interface CreateGenericBusinessDetailsDto {
    description: string;

    cityCovered?: string;

    minimumPrice?: number;

    additionalInfo?: string;

    travelsToClientHome?: boolean;

    downPaymentType?: "PERCENTAGE" | "FIXED";

    downPayment?: number;

    cancellationPolicy?:
        | "REFUNDABLE"
        | "NON-REFUNDABLE"
        | "PARTIALLY REFUNDABLE";

    customFields?: Record<string, unknown>;
}