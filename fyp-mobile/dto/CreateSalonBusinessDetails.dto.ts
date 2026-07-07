export interface CreateSalonBusinessDetailsDto {
    staffType: string; // ['SOLO', 'SALON', 'HOME-BASED SALON']
    expertise: string;
    travelsToClientHome: boolean;
    cityCovered: string;
    staffGender: string; // ['MALE', 'FEMALE', 'TRANSGENDER']
    minimumPrice?: number;
    description: string;
    additionalInfo?: string;
    downPaymentType: 'PERCENTAGE' | 'FIXED';
    downPayment: number;
    covidCompliant: 'YES' | 'NO';
    cancellationPolicy: 'REFUNDABLE' | 'NON-REFUNDABLE' | 'PARTIALLY REFUNDABLE';
}
