//fyp-mobile/dto/CreateCakeBusinessDetails.dto.ts

export interface CreateCakeBusinessDetailsDto {
  cakeTypes: string[];

  minimumPrice: number;

  expertise: string;

  cityCovered: string;

  description: string;

  additionalInfo?: string;

  deliveryToHome: boolean;

  deliveryOptions: string[];

  downPaymentType: "PERCENTAGE" | "FIXED AMOUNT";

  downPayment: number;

  cancellationPolicy:
    | "REFUNDABLE"
    | "NON-REFUNDABLE"
    | "PARTIALLY REFUNDABLE";

  covidCompliant: "YES" | "NO";
}