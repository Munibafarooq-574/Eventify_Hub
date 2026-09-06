// fyp-backend/src/payout/dto/update-payout-status.dto.ts
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdatePayoutStatusDto {
    @IsIn(['PENDING', 'PROCESSING', 'PAID'])
    @IsNotEmpty()
    status: 'PENDING' | 'PROCESSING' | 'PAID';

    @IsString()
    @IsOptional()
    payoutMethod?: string;

    @IsString()
    @IsOptional()
    payoutReference?: string;

    @IsString()
    @IsOptional()
    notes?: string;
}