//fyp-mobile/dto/Createsoundbusinessdetails.dto.ts

export type DownPaymentType = 'PERCENTAGE' | 'FIXED';
export type YesNo = 'YES' | 'NO';
export type CancellationPolicy =
    | 'REFUNDABLE'
    | 'NON-REFUNDABLE'
    | 'PARTIALLY REFUNDABLE';

export interface CreateSoundBusinessDetailsDto {
    // e.g. WEDDING DJ, PARTY DJ, CORPORATE, LIVE BAND
    soundType: string[];

    // e.g. SPEAKERS, MICROPHONE, LIGHTING, DJ CONSOLE, PROJECTOR
    equipmentProvided: string[];

    travelsToClientHome: boolean;

    cityCovered: string;

    // e.g. MALE, FEMALE, TRANSGENDER
    staffGender: string[];

    minimumPrice: number;

    description: string;

    additionalInfo?: string;

    downPaymentType: DownPaymentType;

    downPayment: number;

    covidCompliant: YesNo;

    cancellationPolicy: CancellationPolicy;
}