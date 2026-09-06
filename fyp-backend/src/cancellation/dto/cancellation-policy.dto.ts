// fyp-backend/src/cancellation/dto/cancellation-policy.dto.ts
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateCancellationPolicyDto {
    @IsInt() @Min(0) @Max(100) @IsOptional()
    penalty30PlusDays?: number;

    @IsInt() @Min(0) @Max(100) @IsOptional()
    penalty15to29Days?: number;

    @IsInt() @Min(0) @Max(100) @IsOptional()
    penalty7to14Days?: number;

    @IsInt() @Min(0) @Max(100) @IsOptional()
    penaltyUnder7Days?: number;

    @IsInt() @Min(0) @Max(100) @IsOptional()
    penaltyEventDay?: number;
}