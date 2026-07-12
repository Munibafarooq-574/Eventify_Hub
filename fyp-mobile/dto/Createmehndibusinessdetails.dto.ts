// fyp-mobile/dto/CreateMehndiBusinessDetails.dto.ts

export interface CreateMehndiBusinessDetailsDto {
    mehndiType: string[]; // e.g. ['BRIDAL', 'PARTY', 'ARABIC', 'GLITTER']
    travelsToClientHome: boolean;
    cityCovered: string;
    staffGender: string[]; // e.g. ['MALE', 'FEMALE', 'TRANSGENDER']
    minimumPrice?: number;
    description: string;
    additionalInfo?: string;
    downPaymentType: 'PERCENTAGE' | 'FIXED';
    downPayment: number;
    covidCompliant: 'YES' | 'NO';
    cancellationPolicy: 'REFUNDABLE' | 'NON-REFUNDABLE' | 'PARTIALLY REFUNDABLE';
}