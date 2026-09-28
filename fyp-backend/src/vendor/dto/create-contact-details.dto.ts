import { Transform } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsMongoId,
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

  // Legacy field.
  // Existing vendors ke migration complete hone tak keep rahega.
  @IsOptional()
  @IsString()
  @MinLength(2)
  city?: string;

  @IsMongoId({
    message: 'businessCityId must be a valid city ID',
  })
  businessCityId: string;

  @Transform(({ value }) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    return [value];
  }

  return value;
})
@IsArray({
  message: 'serviceLocationCityIds must be an array',
})
@IsMongoId({
  each: true,
  message:
    'Each serviceLocationCityId must be a valid city ID',
})
serviceLocationCityIds: string[];

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