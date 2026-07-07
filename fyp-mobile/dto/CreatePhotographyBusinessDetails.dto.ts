export interface CreatePhotographerBusinessDetailsDto {
    cityCovered: string;
    staff: string;
    minimumPrice: number;
    description: string;
    additionalInfo?: string;
    downPaymentType: 'PERCENTAGE' | 'FIXED';
    downPayment: number;
    covidCompliant: 'YES' | 'NO';
    covidRefundPolicy: 'REFUNDABLE' | 'NON-REFUNDABLE' | 'PARTIALLY REFUNDABLE';
}
