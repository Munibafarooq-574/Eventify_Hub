// fyp-backend/src/admin/admin-vendor-subscription.service.ts

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  VendorSubscription,
} from '../schemas/vendor-subscription.schema';

import {
  User,
} from '../schemas/user.schema';

@Injectable()
export class AdminVendorSubscriptionService {
  constructor(
    @InjectModel(VendorSubscription.name)
    private readonly subscriptionModel:
      Model<VendorSubscription>,

    @InjectModel(User.name)
    private readonly userModel:
      Model<User>,
  ) {}

  async getVendorSubscriptions(filters: {
    search?: string;
    plan?: string;
    status?: string;
    page?: string | number;
    limit?: string | number;
  }) {
    const page = Number(filters.page ?? 1);
    const limit = Number(filters.limit ?? 20);

    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      throw new BadRequestException(
        'Page must be >= 1 and limit must be between 1 and 100.',
      );
    }

    const search = String(
      filters.search ?? '',
    ).trim();

    if (search.length > 100) {
      throw new BadRequestException(
        'Search is too long.',
      );
    }

    const plan = String(
      filters.plan ?? '',
    ).toLowerCase();

    if (
      plan &&
      !['basic', 'growth', 'premium'].includes(plan)
    ) {
      throw new BadRequestException(
        'Invalid subscription plan.',
      );
    }

    const status = String(
      filters.status ?? '',
    ).toLowerCase();

    if (
      status &&
      ![
        'trial',
        'active',
        'expired',
        'cancelled',
      ].includes(status)
    ) {
      throw new BadRequestException(
        'Invalid subscription status.',
      );
    }

    const now = new Date();

    /*
     * Current subscription records only.
     * Historical/payment records are NOT part of this screen.
     */
    const subscriptionMatch: Record<string, any> = {
      isCurrent: true,
    };

    if (plan) {
      subscriptionMatch.plan = plan;
    }

    /*
     * Treat a subscription whose endDate has passed
     * as expired even if an old record has not yet had
     * its stored status updated.
     */
    if (status === 'expired') {
      subscriptionMatch.$or = [
        { status: 'expired' },
        { endDate: { $lte: now } },
      ];
    } else if (status === 'trial') {
      subscriptionMatch.status = 'trial';
      subscriptionMatch.endDate = {
        $gt: now,
      };
    } else if (status === 'active') {
      subscriptionMatch.status = 'active';
      subscriptionMatch.endDate = {
        $gt: now,
      };
    } else if (status === 'cancelled') {
      subscriptionMatch.status = 'cancelled';
    }

    const pipeline: any[] = [
      {
        $match: subscriptionMatch,
      },

      {
        $lookup: {
          from: this.userModel.collection.name,
          localField: 'vendorId',
          foreignField: '_id',
          as: 'vendor',
        },
      },

      {
        $unwind: '$vendor',
      },

      {
        $match: {
          'vendor.role': {
            $regex: /^vendor$/i,
          },
        },
      },
    ];

    if (search) {
      const escapedSearch =
        search.replace(
          /[.*+?^${}()|[\]\\]/g,
          '\\$&',
        );

      pipeline.push({
        $match: {
          $or: [
            {
              'vendor.name': {
                $regex: escapedSearch,
                $options: 'i',
              },
            },
            {
              'vendor.email': {
                $regex: escapedSearch,
                $options: 'i',
              },
            },
          ],
        },
      });
    }

    pipeline.push(
      {
        $sort: {
          createdAt: -1,
          _id: -1,
        },
      },

      {
        $facet: {
          metadata: [
            {
              $count: 'total',
            },
          ],

          data: [
            {
              $skip:
                (page - 1) * limit,
            },

            {
              $limit: limit,
            },

            {
              $project: {
                _id: 0,

                subscriptionId: {
                  $toString: '$_id',
                },

                vendorId: {
                  $toString:
                    '$vendor._id',
                },

                vendor: {
                  id: {
                    $toString:
                      '$vendor._id',
                  },
                  name: '$vendor.name',
                  email: '$vendor.email',
                  phone:
                    '$vendor.phone_number',
                  brandName:
                    '$vendor.contactDetails.brandName',
                },

                plan: 1,
                storedStatus: '$status',
                startDate: 1,
                endDate: 1,

                effectiveStatus: {
                  $cond: [
                    {
                      $lte: [
                        '$endDate',
                        now,
                      ],
                    },
                    'expired',
                    '$status',
                  ],
                },

                isTrial: {
                  $eq: [
                    '$status',
                    'trial',
                  ],
                },

                trialStartDate: {
                  $cond: [
                    {
                      $eq: [
                        '$status',
                        'trial',
                      ],
                    },
                    '$startDate',
                    null,
                  ],
                },

                trialEndDate: {
                  $cond: [
                    {
                      $eq: [
                        '$status',
                        'trial',
                      ],
                    },
                    '$endDate',
                    null,
                  ],
                },

                paidStartDate: {
                  $cond: [
                    {
                      $eq: [
                        '$paymentStatus',
                        'paid',
                      ],
                    },
                    '$startDate',
                    null,
                  ],
                },

                paidEndDate: {
                  $cond: [
                    {
                      $eq: [
                        '$paymentStatus',
                        'paid',
                      ],
                    },
                    '$endDate',
                    null,
                  ],
                },

                trialDaysRemaining: {
                  $cond: [
                    {
                      $and: [
                        {
                          $eq: [
                            '$status',
                            'trial',
                          ],
                        },
                        {
                          $gt: [
                            '$endDate',
                            now,
                          ],
                        },
                      ],
                    },
                    {
                      $ceil: {
                        $divide: [
                          {
                            $subtract: [
                              '$endDate',
                              now,
                            ],
                          },
                          86400000,
                        ],
                      },
                    },
                    0,
                  ],
                },

                createdAt: 1,
                updatedAt: 1,
              },
            },
          ],
        },
      },
    );

    const [result] =
      await this.subscriptionModel.aggregate(
        pipeline,
      );

    const total =
      result?.metadata?.[0]?.total ?? 0;

    return {
      data: result?.data ?? [],

      pagination: {
        page,
        limit,
        total,
        totalPages:
          Math.ceil(total / limit),
      },
    };
  }

  async getVendorSubscriptionDetail(
    vendorId: string,
  ) {
    if (
      !Types.ObjectId.isValid(
        vendorId,
      )
    ) {
      throw new BadRequestException(
        'Invalid vendor ID.',
      );
    }

    const vendor =
      await this.userModel
        .findOne({
          _id:
            new Types.ObjectId(
              vendorId,
            ),
          role: {
            $regex: /^vendor$/i,
          },
        })
        .select(
          'name email phone_number contactDetails city buisnessCategory categoryId createdAt',
        )
        .lean();

    if (!vendor) {
      throw new NotFoundException(
        'Vendor not found.',
      );
    }

    const current =
      await this.subscriptionModel
        .findOne({
          vendorId:
            new Types.ObjectId(
              vendorId,
            ),
          isCurrent: true,
        })
        .lean();

    if (!current) {
      throw new NotFoundException(
        'Current vendor subscription not found.',
      );
    }

    const history =
      await this.subscriptionModel
        .find({
          vendorId:
            new Types.ObjectId(
              vendorId,
            ),
        })
        .sort({
          createdAt: -1,
        })
        .select(
          'plan status startDate endDate isCurrent createdAt updatedAt',
        )
        .lean();

    const now = new Date();

    const endDate =
      current.endDate
        ? new Date(
            current.endDate,
          )
        : null;

    const expired =
      Boolean(
        endDate &&
          endDate.getTime() <=
            now.getTime(),
      );

    const effectiveStatus =
      expired
        ? 'expired'
        : String(
            current.status,
          ).toLowerCase();

    const isTrial =
      effectiveStatus ===
      'trial';

    const trialDaysRemaining =
      isTrial && endDate
        ? Math.max(
            0,
            Math.ceil(
              (
                endDate.getTime() -
                now.getTime()
              ) /
                86400000,
            ),
          )
        : 0;

    return {
      vendor: {
        id: String(vendor._id),
        name:
          (vendor as any).name ??
          null,
        email:
          (vendor as any).email ??
          null,
        phone:
          (vendor as any)
            .phone_number ??
          null,
        brandName:
          (vendor as any)
            .contactDetails
            ?.brandName ??
          null,
        city:
          (vendor as any)
            .contactDetails
            ?.city ??
          (vendor as any).city ??
          null,
        categoryId:
          (vendor as any)
            .categoryId ??
          (vendor as any)
            .buisnessCategory ??
          null,
      },

      subscription: {
        subscriptionId:
          String(current._id),

        effectivePlan:
          current.plan,

        status:
          effectiveStatus,

        isTrial,

        trialStartDate:
          isTrial
            ? current.startDate
            : null,

        trialEndDate:
          isTrial
            ? current.endDate
            : null,

        trialDaysRemaining,

        paidStartDate:
          (current as any)
            .paymentStatus ===
          'paid'
            ? current.startDate
            : null,

        paidEndDate:
          (current as any)
            .paymentStatus ===
          'paid'
            ? current.endDate
            : null,

        startDate:
          current.startDate,

        endDate:
          current.endDate,
      },

      history: history.map(
        (item: any) => ({
          subscriptionId:
            String(item._id),
          plan: item.plan,
          status:
            item.endDate &&
            new Date(
              item.endDate,
            ).getTime() <=
              now.getTime()
              ? 'expired'
              : item.status,
          startDate:
            item.startDate,
          endDate:
            item.endDate,
          isCurrent:
            item.isCurrent,
          createdAt:
            item.createdAt,
        }),
      ),
    };
  }
}
