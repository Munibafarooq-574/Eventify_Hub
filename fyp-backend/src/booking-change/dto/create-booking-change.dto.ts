// fyp-backend/src/booking-change/dto/create-booking-change.dto.ts
import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateBookingChangeDto {
    @IsDateString()
    @IsNotEmpty()
    requestedDate: string; // "2026-09-16"

    @IsString()
    @IsNotEmpty()
    requestedStartTime: string; // "HH:mm"

    @IsInt()
    @Min(1)
    durationMinutes: number;

    @IsInt()
    @IsOptional()
    requestedGuests?: number;

    @IsString()
    @IsOptional()
    requestedLocation?: string;

    @IsString()
    @IsOptional()
    requestedServiceNote?: string;

    // Only relevant if the service/package itself changes price
    @IsInt()
    @IsOptional()
    requestedPrice?: number;
}