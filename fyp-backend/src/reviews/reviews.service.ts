// src/reviews/reviews.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { CreateReviewDto } from './dto/create-review.dto';
import { Review } from 'src/auth/schemas/review.schema';

@Injectable()
export class ReviewsService {
    constructor(
        @InjectModel(Review.name) private reviewModel: Model<Review>,
    ) { }

    async createReview(userId: string, dto: CreateReviewDto): Promise<Review> {
        const vendorId = new Types.ObjectId(dto.vendorId);
        const userIdLocal = new Types.ObjectId(userId);
        return this.reviewModel.create({ ...dto, userId: userIdLocal, vendorId: vendorId });
    }

    async getVendorReviews(vendorId: string): Promise<Review[]> {
        return this.reviewModel
            .find({ vendorId: new Types.ObjectId(vendorId) })
            .populate('userId', 'name')
            .sort({ createdAt: -1 });
    }

    async getTopVendorsByRating(limit = 5) {
        const pipeline: PipelineStage[] = [
            {
                $group: {
                    _id: "$vendorId",
                    averageRating: { $avg: "$rating" },
                    totalReviews: { $sum: 1 },
                },
            },
            {
                $sort: {
                    averageRating: -1,
                    totalReviews: -1,
                },
            },
            {
                $limit: limit,
            },
            {
                $lookup: {
                    from: "users", // correct collection name
                    localField: "_id",
                    foreignField: "_id",
                    as: "vendor",
                },
            },
            {
                $unwind: {
                    path: "$vendor",
                    preserveNullAndEmptyArrays: false,
                },
            },
            {
                $match: {
                    "vendor.role": "Vendor",
                },
            },
            {
                $project: {
                    _id: 0,
                    vendorId: "$_id",
                    averageRating: 1,
                    totalReviews: 1,
                    vendor: {
                        _id: 1,
                        name: 1,
                        email: 1,
                        role: 1,
                        coverImage: 1,
                        images: 1,
                        packages: 1,
                        contactDetails: 1,
                        photographerBusinessDetails: 1,
                        cateringBusinessDetails: 1,
                    },
                },
            },
        ];

        return await this.reviewModel.aggregate(pipeline).exec();
    }

}
