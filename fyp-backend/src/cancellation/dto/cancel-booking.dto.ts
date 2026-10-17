import { Transform } from 'class-transformer';
// fyp-backend/src/cancellation/dto/cancel-booking.dto.ts
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CancelBookingDto {
    @IsString()
    @IsOptional()
    reason?: string;
}

// Paid client cancellation requires a backend-issued preview, not frontend amounts.
export class ConfirmClientCancellationDto {
    @IsString() @MinLength(1) @MaxLength(2048)
    previewToken: string;

    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    @IsString() @MinLength(1, { message: 'Please enter a reason for cancellation.' }) @MaxLength(500)
    reason: string;
}
