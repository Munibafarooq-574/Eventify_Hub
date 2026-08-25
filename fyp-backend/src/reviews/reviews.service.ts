// src/reviews/reviews.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { CreateReviewDto } from './dto/create-review.dto';
import { Review } from 'src/schemas/review.schema';

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

    //new add
    async getVendorReviewSummary(vendorId: string) {
    if (!Types.ObjectId.isValid(vendorId)) {
        throw new BadRequestException('Invalid vendorId');
    }

    const vendorObjectId = new Types.ObjectId(vendorId);

    const pipeline: PipelineStage[] = [
        { $match: { vendorId: vendorObjectId } },
        {
            $group: {
                _id: '$vendorId',
                averageRating: { $avg: '$rating' },
                totalReviews: { $sum: 1 },
                reviewsWithMedia: {
                    $sum: {
                        $cond: [
                            {
                                $gt: [
                                    { $size: { $ifNull: ['$media', []] } },
                                    0,
                                ],
                            },
                            1,
                            0,
                        ],
                    },
                },
                rating5: {
                    $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] },
                },
                rating4: {
                    $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] },
                },
                rating3: {
                    $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] },
                },
                rating2: {
                    $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] },
                },
                rating1: {
                    $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] },
                },
            },
        },
        {
            $project: {
                _id: 0,
                averageRating: { $round: ['$averageRating', 1] },
                totalReviews: 1,
                reviewsWithMedia: 1,
                ratingBreakdown: {
                    5: '$rating5',
                    4: '$rating4',
                    3: '$rating3',
                    2: '$rating2',
                    1: '$rating1',
                },
            },
        },
    ];

    const result = await this.reviewModel.aggregate(pipeline).exec();

    if (!result.length) {
        return {
            averageRating: 0,
            totalReviews: 0,
            reviewsWithMedia: 0,
            ratingBreakdown: {
                5: 0,
                4: 0,
                3: 0,
                2: 0,
                1: 0,
            },
        };
    }

    return result[0];
}

}
