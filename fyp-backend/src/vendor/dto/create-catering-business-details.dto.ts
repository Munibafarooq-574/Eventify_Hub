//Fyp-backend/src/vendor/dto/create-catering-business-details.dto.ts

/*export class CreateCateringBusinessDetailsDto {
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
}*/

export class CreateCateringBusinessDetailsDto {

    // Multiple Expertise
    expertise: string[];

    travelsToClientHome: boolean;

    // Multiple Cities
    cityCovered: string[];

    // Multiple Staff
    staff: string[];

    provideFoodTesting?: boolean;

    provideDecoration?: boolean;

    provideSoundSystem?: boolean;

    provideSeatingArrangement?: boolean;

    provideWaiters?: boolean;

    provideCutleryAndPlates?: boolean;

    minimumPrice?: number;

    description: string;

    additionalInfo?: string;

    downPaymentType: "PERCENTAGE" | "FIXED";

    downPayment: number;

    cancellationPolicy:
        | "REFUNDABLE"
        | "NON-REFUNDABLE"
        | "PARTIALLY REFUNDABLE";

    covidCompliant: "YES" | "NO";
}
