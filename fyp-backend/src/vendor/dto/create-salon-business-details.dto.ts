// fyp-backend/src/vendor/dto/create-salon-business-details.dto.ts

import { IsArray, IsString, IsBoolean, IsOptional, IsNumber, IsIn } from 'class-validator';

export class CreateSalonBusinessDetailsDto {
    @IsIn(['SOLO', 'SALON', 'HOME-BASED SALON'])
    staffType: string;

    @IsString()
    expertise: string;

    @IsBoolean()
    travelsToClientHome: boolean;

    @IsString()
    cityCovered: string;

    @IsArray()
    @IsString({ each: true })
    staffGender: string[]; // e.g. ['MALE', 'FEMALE', 'TRANSGENDER']

    @IsOptional()
    @IsNumber()
    minimumPrice?: number;

    @IsString()
    description: string;

    @IsOptional()
    @IsString()
    additionalInfo?: string;

    @IsIn(['PERCENTAGE', 'FIXED'])
    downPaymentType: 'PERCENTAGE' | 'FIXED';

    @IsNumber()
    downPayment: number;

    @IsIn(['YES', 'NO'])
    covidCompliant: 'YES' | 'NO';

    @IsIn(['REFUNDABLE', 'NON-REFUNDABLE', 'PARTIALLY REFUNDABLE'])
    cancellationPolicy: 'REFUNDABLE' | 'NON-REFUNDABLE' | 'PARTIALLY REFUNDABLE';
}