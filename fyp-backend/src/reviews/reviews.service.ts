// src/reviews/reviews.service.ts

import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types, FilterQuery } from 'mongoose';
import { FeatureAccessService } from 'src/vendor/growth/feature-access.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewQueryDto, ReviewSortOption } from './dto/review-query.dto';
import { ReplyReviewDto } from './dto/reply-review.dto';
import {
    Review,
    ReviewModerationStatus,
} from 'src/schemas/review.schema';

@Injectable()
export class ReviewsService {
   constructor(
    @InjectModel(Review.name)
    private reviewModel: Model<Review>,
    private readonly featureAccessService: FeatureAccessService,
) {}

    async createReview(
    userId: string,
    dto: CreateReviewDto,
): Promise<Review> {
    if (!Types.ObjectId.isValid(userId)) {
        throw new BadRequestException('Invalid userId');
    }

    if (!Types.ObjectId.isValid(dto.vendorId)) {
        throw new BadRequestException('Invalid vendorId');
    }

    const vendorId = new Types.ObjectId(dto.vendorId);
    const userIdLocal = new Types.ObjectId(userId);

    const reasons: string[] = [];

    const previousReviewCount =
        await this.reviewModel.countDocuments({
            userId: userIdLocal,
        });

    if (previousReviewCount === 0) {
        reasons.push('FIRST_REVIEW');
    }

    if (dto.rating === 1) {
        reasons.push('LOW_RATING');
    }

    const text = dto.reviewText.trim();

    if (text.length < 10) {
        reasons.push('VERY_SHORT_TEXT');
    }

    const linkPattern =
        /(https?:\/\/|www\.)\S+/i;

    if (linkPattern.test(text)) {
        reasons.push('LINK_DETECTED');
    }

    const phonePattern =
        /(?:\+92|0092|0)?3\d{2}[\s-]?\d{7}/;

    if (phonePattern.test(text)) {
        reasons.push('PHONE_NUMBER_DETECTED');
    }

    const recentWindow = new Date(
        Date.now() - 10 * 60 * 1000,
    );

    const recentReviewCount =
        await this.reviewModel.countDocuments({
            userId: userIdLocal,
            createdAt: { $gte: recentWindow },
        });

    if (recentReviewCount >= 3) {
        reasons.push('MULTIPLE_REVIEWS_SHORT_TIME');
    }

    const status =
        reasons.length > 0
            ? ReviewModerationStatus.PENDING
            : ReviewModerationStatus.VISIBLE;

    return this.reviewModel.create({
        ...dto,
        userId: userIdLocal,
        vendorId,
        status,
        moderationReason:
            reasons.length > 0
                ? reasons.join(', ')
                : undefined,
    });
}

    async getVendorReviews(query: ReviewQueryDto) {
        const {
            vendorId,
            rating,
            withMedia,
            sort = ReviewSortOption.RECENT,
            page = 1,
            limit = 20,
        } = query;

        const filter: FilterQuery<Review> = {
    vendorId: new Types.ObjectId(vendorId),
    $or: [
        { status: ReviewModerationStatus.VISIBLE },
        { status: { $exists: false } },
    ],
};

        if (rating) {
            filter.rating = rating;
        }

        if (withMedia === 'true') {
            filter.media = {
                $exists: true,
                $not: { $size: 0 },
            };
        }

        const sortMap: Record<
            ReviewSortOption,
            Record<string, 1 | -1>
        > = {
            [ReviewSortOption.RECENT]: {
                createdAt: -1,
            },
            [ReviewSortOption.HIGHEST]: {
                rating: -1,
                createdAt: -1,
            },
            [ReviewSortOption.LOWEST]: {
                rating: 1,
                createdAt: -1,
            },
        };

        const sortStage =
            sortMap[sort] ?? sortMap[ReviewSortOption.RECENT];

        const skip = (page - 1) * limit;

        const [reviews, total] = await Promise.all([
            this.reviewModel
                .find(filter)
                .populate('userId', 'name')
                .sort(sortStage)
                .skip(skip)
                .limit(limit)
                .lean(),

            this.reviewModel.countDocuments(filter),
        ]);

        return {
            reviews,
            page,
            limit,
            total,
            hasMore: skip + reviews.length < total,
        };
    }

    async getTopVendorsByRating(limit = 5) {
    const safeLimit = Math.min(
        Math.max(Number(limit) || 5, 1),
        20,
    );

    const pipeline: PipelineStage[] = [
        // Only public/visible reviews participate
        {
            $match: {
                $or: [
                    { status: ReviewModerationStatus.VISIBLE },
                    { status: { $exists: false } },
                ],
            },
        },

        // Review statistics per vendor
        {
            $group: {
                _id: '$vendorId',
                averageRating: { $avg: '$rating' },
                totalReviews: { $sum: 1 },
            },
        },

        // Get vendor's own VendorOrders
        {
            $lookup: {
                from: 'vendororders',
                let: { vendorId: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $eq: ['$vendorId', '$$vendorId'],
                            },
                        },
                    },
                    {
                        $group: {
                            _id: null,

                            completedOrders: {
                                $sum: {
                                    $cond: [
                                        { $eq: ['$status', 'completed'] },
                                        1,
                                        0,
                                    ],
                                },
                            },

                            vendorCancelledOrders: {
                                $sum: {
                                    $cond: [
                                        {
                                            $eq: [
                                                '$status',
                                                'cancelled_by_vendor',
                                            ],
                                        },
                                        1,
                                        0,
                                    ],
                                },
                            },
                        },
                    },
                ],
                as: 'orderStats',
            },
        },

        {
            $addFields: {
                completedOrders: {
                    $ifNull: [
                        { $arrayElemAt: ['$orderStats.completedOrders', 0] },
                        0,
                    ],
                },

                vendorCancelledOrders: {
                    $ifNull: [
                        {
                            $arrayElemAt: [
                                '$orderStats.vendorCancelledOrders',
                                0,
                            ],
                        },
                        0,
                    ],
                },
            },
        },

        // Same reliability concept already used by vendor analytics
        {
            $addFields: {
                relevantBookings: {
                    $add: [
                        '$completedOrders',
                        '$vendorCancelledOrders',
                    ],
                },
            },
        },

        {
            $addFields: {
                cancellationRate: {
                    $cond: [
                        { $gt: ['$relevantBookings', 0] },
                        {
                            $multiply: [
                                {
                                    $divide: [
                                        '$vendorCancelledOrders',
                                        '$relevantBookings',
                                    ],
                                },
                                100,
                            ],
                        },
                        0,
                    ],
                },
            },
        },

        {
            $addFields: {
                reliabilityScore: {
                    $max: [
                        0,
                        {
                            $subtract: [
                                100,
                                {
                                    $multiply: [
                                        '$cancellationRate',
                                        2,
                                    ],
                                },
                            ],
                        },
                    ],
                },
            },
        },

        // Final popularity score:
        // rating 40 + reviews 20 + completed orders 25 + reliability 15
        {
            $addFields: {
                popularityScore: {
                    $add: [
                        // Rating: max 40
                        {
                            $multiply: [
                                {
                                    $divide: [
                                        '$averageRating',
                                        5,
                                    ],
                                },
                                40,
                            ],
                        },

                        // Reviews: max 20, capped at 50 reviews
                        {
                            $multiply: [
                                {
                                    $divide: [
                                        {
                                            $min: [
                                                '$totalReviews',
                                                50,
                                            ],
                                        },
                                        50,
                                    ],
                                },
                                20,
                            ],
                        },

                        // Completed orders: max 25, capped at 50
                        {
                            $multiply: [
                                {
                                    $divide: [
                                        {
                                            $min: [
                                                '$completedOrders',
                                                50,
                                            ],
                                        },
                                        50,
                                    ],
                                },
                                25,
                            ],
                        },

                        // Reliability: max 15
                        {
                            $multiply: [
                                {
                                    $divide: [
                                        '$reliabilityScore',
                                        100,
                                    ],
                                },
                                15,
                            ],
                        },
                    ],
                },
            },
        },

        // Highest popularity first
        {
            $sort: {
                popularityScore: -1,
                averageRating: -1,
                totalReviews: -1,
                completedOrders: -1,
            },
        },

        // Vendor details
        {
            $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'vendor',
            },
        },

        {
            $unwind: {
                path: '$vendor',
                preserveNullAndEmptyArrays: false,
            },
        },

        {
            $match: {
                'vendor.role': 'Vendor',
            },
        },

        {
            $limit: safeLimit,
        },

        {
            $project: {
                _id: 0,

                vendorId: '$_id',

                averageRating: {
                    $round: ['$averageRating', 1],
                },

                totalReviews: 1,

                completedOrders: 1,

                reliabilityScore: {
                    $round: ['$reliabilityScore', 0],
                },

                popularityScore: {
                    $round: ['$popularityScore', 1],
                },

                vendor: 1,
            },
        },
    ];

    return this.reviewModel.aggregate(pipeline).exec();
}
    async getVendorReviewSummary(vendorId: string) {
        if (!Types.ObjectId.isValid(vendorId)) {
            throw new BadRequestException('Invalid vendorId');
        }

        const vendorObjectId = new Types.ObjectId(vendorId);

        const pipeline: PipelineStage[] = [
            {
    $match: {
        vendorId: vendorObjectId,
        $or: [
            { status: ReviewModerationStatus.VISIBLE },
            { status: { $exists: false } },
        ],
    },
},
            {
                $group: {
                    _id: '$vendorId',
                    averageRating: {
                        $avg: '$rating',
                    },
                    totalReviews: {
                        $sum: 1,
                    },
                    reviewsWithMedia: {
                        $sum: {
                            $cond: [
                                {
                                    $gt: [
                                        {
                                            $size: {
                                                $ifNull: ['$media', []],
                                            },
                                        },
                                        0,
                                    ],
                                },
                                1,
                                0,
                            ],
                        },
                    },
                    rating5: {
                        $sum: {
                            $cond: [
                                { $eq: ['$rating', 5] },
                                1,
                                0,
                            ],
                        },
                    },
                    rating4: {
                        $sum: {
                            $cond: [
                                { $eq: ['$rating', 4] },
                                1,
                                0,
                            ],
                        },
                    },
                    rating3: {
                        $sum: {
                            $cond: [
                                { $eq: ['$rating', 3] },
                                1,
                                0,
                            ],
                        },
                    },
                    rating2: {
                        $sum: {
                            $cond: [
                                { $eq: ['$rating', 2] },
                                1,
                                0,
                            ],
                        },
                    },
                    rating1: {
                        $sum: {
                            $cond: [
                                { $eq: ['$rating', 1] },
                                1,
                                0,
                            ],
                        },
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    averageRating: {
                        $round: ['$averageRating', 1],
                    },
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

        const result =
            await this.reviewModel.aggregate(pipeline).exec();

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

    // POST /reviews/:reviewId/reply
    async replyToReview(
        reviewId: string,
        vendorId: string,
        dto: ReplyReviewDto,
    ) {
        if (!Types.ObjectId.isValid(reviewId)) {
            throw new NotFoundException('Review not found');
        }

        const review = await this.reviewModel.findById(reviewId);

        if (!review) {
            throw new NotFoundException('Review not found');
        }

        // Security: only the owner/vendor of this review can reply
        if (review.vendorId.toString() !== vendorId.toString()) {
            throw new ForbiddenException(
                'You are not authorized to reply to this review',
            );
        }

        review.vendorReply = {
            text: dto.text,
            repliedAt: new Date(),
        };

        await review.save();

        return {
            reviewId: review._id,
            vendorReply: review.vendorReply,
        };
    }
}
