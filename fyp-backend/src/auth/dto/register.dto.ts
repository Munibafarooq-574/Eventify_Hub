import {
  IsEmail,
  IsMongoId,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

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

  @IsOptional()
  @IsString()
  mobileNumber?: string;

  /**
   * NEW canonical field.
   * Frontend should migrate to this.
   */
  @IsOptional()
  @IsMongoId()
  categoryId?: string;

  /**
   * TEMPORARY backward compatibility.
   * Remove after old mobile registration flow is migrated.
   */
  @IsOptional()
  @IsMongoId()
  buisnessCategories?: string;

  @IsOptional()
  @IsString()
  address?: string;
}