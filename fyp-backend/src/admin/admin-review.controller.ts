import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AdminRoleGuard } from "../auth/admin-role.guard";
import { AdminReviewService } from "./admin-review.service";
import { ReviewModerationStatus } from "src/schemas/review.schema";

@Controller("admin/reviews")
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminReviewController {
  constructor(private readonly service: AdminReviewService) {}

  // GET /admin/reviews?limit=20&skip=0
  @Get()
  list(
    @Query("limit") limit = "20",
    @Query("skip") skip = "0",
    @Query("status") status?: string,
  ) {
    const parsedLimit = Number(limit);
    const parsedSkip = Number(skip);

    if (
      !Number.isInteger(parsedLimit) ||
      parsedLimit < 1 ||
      parsedLimit > 100 ||
      !Number.isInteger(parsedSkip) ||
      parsedSkip < 0
    ) {
      throw new BadRequestException("Invalid pagination parameters");
    }

    let parsedStatus: ReviewModerationStatus | undefined;

    if (status) {
      const validStatuses = Object.values(ReviewModerationStatus);

      if (!validStatuses.includes(status as ReviewModerationStatus)) {
        throw new BadRequestException("Invalid review moderation status");
      }

      parsedStatus = status as ReviewModerationStatus;
    }

    return this.service.getReviews(parsedLimit, parsedSkip, parsedStatus);
  }

  // GET /admin/reviews/:id
  @Get(":id")
  detail(@Param("id") reviewId: string) {
    if (!/^[0-9a-fA-F]{24}$/.test(reviewId)) {
      throw new BadRequestException("Invalid review ID");
    }

    return this.service.getReviewDetail(reviewId);
  }

  // PATCH /admin/reviews/:id/moderate
  @Patch(":id/moderate")
  moderate(
    @Param("id") reviewId: string,
    @Body()
    body: {
      status: ReviewModerationStatus;
      reason?: string;
    },
    @Req() request: any,
  ) {
    if (!/^[0-9a-fA-F]{24}$/.test(reviewId)) {
      throw new BadRequestException("Invalid review ID");
    }

    const validStatuses = Object.values(ReviewModerationStatus);

    if (!body?.status || !validStatuses.includes(body.status)) {
      throw new BadRequestException("Invalid review moderation status");
    }
    if (
      body.reason !== undefined &&
      (typeof body.reason !== "string" || body.reason.trim().length > 500)
    ) {
      throw new BadRequestException(
        "Moderation reason must be a string with maximum 500 characters",
      );
    }
    if (!request.user?.id || !/^[0-9a-fA-F]{24}$/.test(request.user.id)) {
      throw new BadRequestException("Invalid admin ID");
    }

    return this.service.moderateReview(
      reviewId,
      request.user.id,
      body.status,
      body.reason,
    );
  }
}
