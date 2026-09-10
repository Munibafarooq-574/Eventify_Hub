import {
  IsEmail,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCategoryRequestDto {
  @IsString()
  @MinLength(2, {
    message:
      'Requester name must contain at least 2 characters.',
  })
  @MaxLength(80)
  requesterName: string;

  @IsEmail(
    {},
    {
      message:
        'Please provide a valid email address.',
    },
  )
  @MaxLength(150)
  requesterEmail: string;

  @IsString()
  @MinLength(2, {
    message:
      'Category name must contain at least 2 characters.',
  })
  @MaxLength(80)
  requestedName: string;

  @IsString()
  @MinLength(5, {
    message:
      'Description must contain at least 5 characters.',
  })
  @MaxLength(500)
  description: string;
}