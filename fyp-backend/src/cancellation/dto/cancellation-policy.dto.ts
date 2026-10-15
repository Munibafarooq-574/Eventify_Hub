// fyp-backend/src/cancellation/dto/cancellation-policy.dto.ts
import { ArrayMaxSize, ArrayMinSize, IsArray, IsDefined, IsInt, IsObject, ValidateIf, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CancellationPolicyTierDto {
    @IsInt() @Min(0) @Max(87600)
    minHoursBeforeEvent: number;

    @IsInt() @Min(0) @Max(100)
    percentage: number;
}

export class ClientRefundRulesDto {
    @IsArray() @ArrayMinSize(1) @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => CancellationPolicyTierDto)
    refundable: CancellationPolicyTierDto[];

    @IsArray() @ArrayMinSize(1) @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => CancellationPolicyTierDto)
    partiallyRefundable: CancellationPolicyTierDto[];

    @IsArray() @ArrayMinSize(1) @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => CancellationPolicyTierDto)
    nonRefundable: CancellationPolicyTierDto[];
}

export class CancellationPolicySettingsDto {
    @IsDefined() @IsObject() @ValidateNested() @Type(() => ClientRefundRulesDto)
    clientRefunds: ClientRefundRulesDto;

    @IsArray() @ArrayMinSize(1) @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => CancellationPolicyTierDto)
    vendorCausedClientRefunds: CancellationPolicyTierDto[];

    @IsArray() @ArrayMinSize(1) @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => CancellationPolicyTierDto)
    vendorPenalties: CancellationPolicyTierDto[];

    @IsInt() @Min(1) @Max(8760)
    paymentHoldHours: number;

    @IsInt() @Min(1) @Max(8760)
    postServiceIssueWindowHours: number;
}

export class UpdateCancellationPolicyDto {
    @ValidateIf((_object, value) => value !== undefined) @IsDefined() @IsObject() @ValidateNested() @Type(() => CancellationPolicySettingsDto)
    policySettings?: CancellationPolicySettingsDto;

    @ValidateIf((_object, value) => value !== undefined) @IsInt() @Min(0)
    expectedRevision?: number;

    @IsInt() @Min(0) @Max(100) @ValidateIf((_object, value) => value !== undefined)
    penalty30PlusDays?: number;

    @IsInt() @Min(0) @Max(100) @ValidateIf((_object, value) => value !== undefined)
    penalty15to29Days?: number;

    @IsInt() @Min(0) @Max(100) @ValidateIf((_object, value) => value !== undefined)
    penalty7to14Days?: number;

    @IsInt() @Min(0) @Max(100) @ValidateIf((_object, value) => value !== undefined)
    penaltyUnder7Days?: number;

    @IsInt() @Min(0) @Max(100) @ValidateIf((_object, value) => value !== undefined)
    penaltyEventDay?: number;
}