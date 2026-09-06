// fyp-backend/src/payment/dto/retry-payment.dto.ts
import { IsIn, IsNotEmpty } from 'class-validator';

export class RetryPaymentDto {
    @IsIn(['card', 'jazzcash', 'easypaisa'])
    @IsNotEmpty()
    method: string;
}