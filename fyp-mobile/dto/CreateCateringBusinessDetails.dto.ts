export interface CreateCateringBusinessDetailsDto {
    expertise: string;
    travelsToClientHome: boolean;
    cityCovered: string;
    staff: string; // ['MALE', 'FEMALE', 'TRANSGENDER']
    provideFoodTesting?: boolean; // Optional
    provideDecoration?: boolean; // Optional
    provideSoundSystem?: boolean; // Optional
    provideSeatingArrangement?: boolean; // Optional
    provideWaiters?: boolean; // Optional
    provideCutleryAndPlates?: boolean; // Optional
    minimumPrice?: number; // Optional
    description: string;
    additionalInfo?: string; // Optional
    downPaymentType: 'PERCENTAGE' | 'FIXED';
    downPayment: number;
    cancellationPolicy: 'REFUNDABLE' | 'NON-REFUNDABLE' | 'PARTIALLY REFUNDABLE';
    covidCompliant: 'YES' | 'NO';
}
