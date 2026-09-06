// fyp-backend/src/cancellation/dto/cancel-booking.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class CancelBookingDto {
    @IsString()
    @IsOptional()
    reason?: string;
}