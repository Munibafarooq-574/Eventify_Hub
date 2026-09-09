import {
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
} from 'class-validator';

export class CreateContactDetailsDto {
  @IsString()
  @MinLength(2)
  brandName: string;

  @IsOptional()
  @IsString()
  brandLogo?: string;

  @IsString()
  @MinLength(7)
  contactNumber: string;

  @IsOptional()
  @IsString()
  @MinLength(7)
  contactNumberSecondary?: string;

  @IsOptional()
  @IsUrl(
    {
      require_protocol: true,
    },
    {
      message: 'instagramLink must be a valid URL',
    },
  )
  instagramLink?: string;

  @IsOptional()
  @IsUrl(
    {
      require_protocol: true,
    },
    {
      message: 'facebookLink must be a valid URL',
    },
  )
  facebookLink?: string;

  @IsEmail()
  bookingEmail: string;

  @IsOptional()
  @IsUrl(
    {
      require_protocol: true,
    },
    {
      message: 'website must be a valid URL',
    },
  )
  website?: string;

  @IsString()
  @MinLength(2)
  city: string;

  @IsOptional()
  @IsString()
  officialAddress?: string;

  @IsOptional()
  @IsUrl(
    {
      require_protocol: true,
    },
    {
      message: 'officialGoogleLink must be a valid URL',
    },
  )
  officialGoogleLink?: string;
}