// fyp-mobile/dto/CreateSalonBusinessDetails.dto.ts

export interface CreateSalonBusinessDetailsDto {
    staffType: string; // e.g. 'SOLO' | 'SALON' | 'HOME-BASED SALON'
    expertise: string;
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