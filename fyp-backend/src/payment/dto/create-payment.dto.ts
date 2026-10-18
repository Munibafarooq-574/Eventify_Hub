// fyp-backend/src/payment/dto/create-payment.dto.ts
import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePaymentDto {
    @IsIn(['card', 'jazzcash', 'easypaisa'])
    @IsNotEmpty()
    method: string;

    @IsOptional()
    @IsBoolean()
    sendReceipt?: boolean;
}