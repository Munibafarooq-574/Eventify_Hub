import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Review, ReviewModerationStatus } from "src/schemas/review.schema";

@Injectable()
export class AdminReviewService {
  constructor(
    @InjectModel(Review.name)
    private readonly reviewModel: Model<Review>,
  ) {}

  async getReviews(limit = 20, skip = 0, status?: ReviewModerationStatus) {
    const filter: Record<string, any> = {};

    if (status === ReviewModerationStatus.VISIBLE) {
      filter.$or = [
        { status: ReviewModerationStatus.VISIBLE },
        { status: { $exists: false } },
      ];
    } else if (status) {
      filter.status = status;
    }

    const [reviews, total] = await Promise.all([
      this.reviewModel
        .find(filter)
        .populate("userId", "name email")
        .populate("vendorId", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      this.reviewModel.countDocuments(filter),
    ]);

    return {
      reviews,
      total,
      limit,
      skip,
    };
  }

  async getReviewDetail(reviewId: string) {
    const review = await this.reviewModel
      .findById(reviewId)
      .populate("userId", "name email")
      .populate("vendorId", "name email contactDetails")
      .lean();

    if (!review) {
      throw new NotFoundException("Review not found");
    }

    return {
      review,
      booking: null,
    };
  }

  async moderateReview(
  reviewId: string,
  adminId: string,
  status: ReviewModerationStatus,
  reason?: string,
) {
  const existingReview = await this.reviewModel
    .findById(reviewId)
    .select("status")
    .lean();

  if (!existingReview) {
    throw new NotFoundException("Review not found");
  }

  const currentStatus =
    existingReview.status ?? ReviewModerationStatus.VISIBLE;

  const allowedTransitions: Record<
    ReviewModerationStatus,
    ReviewModerationStatus[]
  > = {
    [ReviewModerationStatus.PENDING]: [
      ReviewModerationStatus.VISIBLE,
      ReviewModerationStatus.REJECTED,
    ],

    [ReviewModerationStatus.VISIBLE]: [
      ReviewModerationStatus.HIDDEN,
    ],

    [ReviewModerationStatus.HIDDEN]: [
      ReviewModerationStatus.VISIBLE,
    ],

    [ReviewModerationStatus.REJECTED]: [],
  };

  if (!allowedTransitions[currentStatus].includes(status)) {
    throw new BadRequestException(
      `Cannot change review status from ${currentStatus} to ${status}`,
    );
  }

  const moderatedAt = new Date();
  const moderatedBy = new Types.ObjectId(adminId);
  const moderationReason = reason?.trim() || undefined;

  const statusCondition =
    existingReview.status === undefined
      ? {
          $or: [
            { status: { $exists: false } },
            { status: ReviewModerationStatus.VISIBLE },
          ],
        }
      : {
          status: currentStatus,
        };

  const updatedReview =
    await this.reviewModel.findOneAndUpdate(
      {
        _id: reviewId,
        ...statusCondition,
      },
      {
        $set: {
          status,
          moderatedAt,
          moderatedBy,
          ...(moderationReason
            ? { moderationReason }
            : { moderationReason: null }),
        },
        $push: {
          moderationHistory: {
            fromStatus: currentStatus,
            toStatus: status,
            reason: moderationReason,
            moderatedBy,
            moderatedAt,
          },
        },
      },
      {
        new: true,
      },
    );

  if (!updatedReview) {
    throw new BadRequestException(
      "Review status has already changed. Refresh and try again.",
    );
  }

  return {
    reviewId: updatedReview._id,
    status: updatedReview.status,
    moderationReason: updatedReview.moderationReason,
    moderatedAt: updatedReview.moderatedAt,
    moderatedBy: updatedReview.moderatedBy,
  };
}
}
