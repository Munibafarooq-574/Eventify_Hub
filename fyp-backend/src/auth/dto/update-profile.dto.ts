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
    userId: string;
}