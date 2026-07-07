// src/order/dto/update-order-status.dto.ts
import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateOrderStatusDto {
    @IsEnum(['pending', 'confirmed', 'completed', 'cancelled'])
    @IsNotEmpty()
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}
