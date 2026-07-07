import { IsArray, IsEmail, IsOptional, IsString, MinLength, isString } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  name: string;

  @IsString()
  role: string;

  @IsString()
  @IsOptional()
  mobileNumber?: string;

  @IsString()
  @IsOptional()
  buisnessCategories?: string

  @IsString()
  @IsOptional()
  address?: string
}