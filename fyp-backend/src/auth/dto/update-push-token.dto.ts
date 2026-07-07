// src/users/dto/update-push-token.dto.ts
import { IsString } from 'class-validator';

export class UpdatePushTokenDto {
    @IsString()
    userId: string;

    @IsString()
    token: string;
}
