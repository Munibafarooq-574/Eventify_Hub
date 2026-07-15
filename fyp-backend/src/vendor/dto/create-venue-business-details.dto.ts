

/*export class CreateVenueBusinessDetailsDto {
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
} */

    //fyp-backend/src/vendor/dto/create-venue-business-details.dto.ts
    export class CreateVenueBusinessDetailsDto {
    typeOfVenue: string[]; // ['HALL', 'OUTDOOR', 'MARQUEE/BANQUET']
    expertise: string;
    amenities: string;
    maximumPeopleCapacity?: number;
    catering?: string[]; // ['INTERNAL', 'EXTERNAL'] - multi-select, optional
    parking: boolean;
    staff: string[]; // ['MALE', 'FEMALE', 'TRANSGENDER'] - multi-select
    minimumPrice?: number;
    description: string;
    additionalInfo?: string;
    downPaymentType: 'PERCENTAGE' | 'FIXED';
    downPayment: number;
    cancellationPolicy: 'REFUNDABLE' | 'NON-REFUNDABLE' | 'PARTIALLY REFUNDABLE';
    covidCompliant: 'YES' | 'NO';
}