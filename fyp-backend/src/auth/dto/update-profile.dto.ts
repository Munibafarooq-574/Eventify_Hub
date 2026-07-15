// fyp-backend/src/auth/dto/update-profile.dto.ts

import { IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateUserProfileDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    phoneNumber?: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    contactDetails?: {
        brandLogo?: string;
        address?: string;
    };

    @IsString()
userId!: string;
}