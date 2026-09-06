// fyp-backend/src/booking-change/dto/respond-booking-change.dto.ts
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RespondBookingChangeDto {
    @IsIn(['accepted', 'rejected'])
    @IsNotEmpty()
    decision: 'accepted' | 'rejected';

    @IsString()
    @IsOptional()
    rejectionReason?: string;
}