// src/reviews/dto/reply-review.dto.ts
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class ReplyReviewDto {
  @IsString()
  @IsNotEmpty({ message: 'Reply text cannot be empty' })
  @MaxLength(1000, { message: 'Reply cannot exceed 1000 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  text: string;
}