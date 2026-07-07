// src/reviews/dto/create-review.dto.ts
import { IsNotEmpty, IsString, IsMongoId, IsInt, Max, Min } from 'class-validator';

export class CreateReviewDto {
    @IsMongoId()
    vendorId: string;

    @IsString()
    @IsNotEmpty()
    reviewText: string;

    @IsInt()
    @Min(1)
    @Max(5)
    rating: number;
}
