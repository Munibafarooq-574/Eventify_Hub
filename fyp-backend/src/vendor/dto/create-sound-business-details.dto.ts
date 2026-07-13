//fyp-backend/src/vendor/dto/Create-sound-business-details.dto.ts
import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
    ArrayNotEmpty,
    Min,
} from 'class-validator';

export enum DownPaymentType {
    PERCENTAGE = 'PERCENTAGE',
    FIXED = 'FIXED',
}

export enum YesNo {
    YES = 'YES',
    NO = 'NO',
}

export enum CancellationPolicy {
    REFUNDABLE = 'REFUNDABLE',
    NON_REFUNDABLE = 'NON-REFUNDABLE',
    PARTIALLY_REFUNDABLE = 'PARTIALLY REFUNDABLE',
}

export class CreateSoundBusinessDetailsDto {
    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    soundType: string[]; // e.g. WEDDING DJ, PARTY DJ, CORPORATE, LIVE BAND

    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    equipmentProvided: string[]; // e.g. SPEAKERS, MICROPHONE, LIGHTING, DJ CONSOLE, PROJECTOR

    @IsBoolean()
    travelsToClientHome: boolean;

    @IsString()
    cityCovered: string;

    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    staffGender: string[]; // e.g. MALE, FEMALE, TRANSGENDER

    @IsNumber()
    @Min(0)
    minimumPrice: number;

    @IsString()
    description: string;

    @IsOptional()
    @IsString()
    additionalInfo?: string;

    @IsEnum(DownPaymentType)
    downPaymentType: DownPaymentType;

    @IsNumber()
    @Min(0)
    downPayment: number;

    @IsEnum(YesNo)
    covidCompliant: YesNo;

    @IsEnum(CancellationPolicy)
    cancellationPolicy: CancellationPolicy;
}