
/*export interface CreateVenueBusinessDetailsDto {
    typeOfVenue: string; // ['HALL', 'OUTDOOR', 'MARQUEE/BANQUET']
    expertise: string;
    amenities: string;
    maximumPeopleCapacity?: number; // Optional
    catering?: string; // ['INTERNAL', 'EXTERNAL'], Optional
    parking: boolean;
    staff: string; // ['MALE', 'FEMALE', 'TRANSGENDER']
    minimumPrice?: number; // Optional
    description: string;
    additionalInfo?: string; // Optional
    downPaymentType: 'PERCENTAGE' | 'FIXED';
    downPayment: number;
    cancellationPolicy: 'REFUNDABLE' | 'NON-REFUNDABLE' | 'PARTIALLY REFUNDABLE';
    covidCompliant: 'YES' | 'NO';
}*/

//fyp-mobile/dto/CreateVenueBusinessDetails.dto.ts
export interface CreateVenueBusinessDetailsDto {
    typeOfVenue: string;
    expertise: string;
    amenities: string;
    maximumPeopleCapacity?: number;
    catering?: string[];
    parking: boolean;
    staff: string[];
    minimumPrice?: number;
    description: string;
    additionalInfo?: string;
    downPaymentType: 'PERCENTAGE' | 'FIXED';
    downPayment: number;
    cancellationPolicy: 'REFUNDABLE' | 'NON-REFUNDABLE' | 'PARTIALLY REFUNDABLE';
    covidCompliant: 'YES' | 'NO';
}
