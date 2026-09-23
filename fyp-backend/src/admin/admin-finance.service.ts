// fyp-backend/src/admin/admin-finance.service.ts

import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import {
  InjectModel,
} from '@nestjs/mongoose';

import {
  Model,
} from 'mongoose';

import {
  Payment,
} from 'src/schemas/payment.schema';

import {
  Refund,
} from 'src/schemas/refund.schema';

import {
  Payout,
} from 'src/schemas/payout.schema';

import {
  SubscriptionService,
} from '../vendor/growth/subscription/subscription.service';

import {
  VendorSubscription,
} from 'src/schemas/vendor-subscription.schema';

import { VendorOrder } from 'src/schemas/vendor-order.schema';

@Injectable()
export class AdminFinanceService {
  constructor(
    @InjectModel(Payment.name)
    private readonly paymentModel:
      Model<Payment>,

    @InjectModel(Refund.name)
    private readonly refundModel:
      Model<Refund>,

    @InjectModel(Payout.name)
    private readonly payoutModel:
      Model<Payout>,

      @InjectModel(VendorSubscription.name)
    private readonly subscriptionModel:
      Model<VendorSubscription>,
          @InjectModel(VendorOrder.name)
    private readonly vendorOrderModel: Model<VendorOrder>,
    // Reuse the existing centralized subscription service.
    // Do NOT duplicate subscription activation logic here.
    private readonly subscriptionService:
      SubscriptionService,
  ) {}

    private getFinanceDateRange(
    from?: string,
    to?: string,
  ): { start: Date; end: Date } | null {
    if (!from && !to) {
      return null;
    }

    if (!from || !to) {
      throw new BadRequestException(
        'Both from and to dates are required.',
      );
    }

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;

    if (
      !datePattern.test(from) ||
      !datePattern.test(to)
    ) {
      throw new BadRequestException(
        'Dates must use YYYY-MM-DD format.',
      );
    }

    const start = new Date(`${from}T00:00:00.000Z`);
    const end = new Date(`${to}T00:00:00.000Z`);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      start.toISOString().slice(0, 10) !== from ||
      end.toISOString().slice(0, 10) !== to
    ) {
      throw new BadRequestException(
        'Invalid calendar date.',
      );
    }

    if (start > end) {
      throw new BadRequestException(
        'From date cannot be after to date.',
      );
    }

    // Exclusive upper boundary: includes the entire selected final day.
    end.setUTCDate(end.getUTCDate() + 1);

    return { start, end };
  }
  // =========================================================
  // BOOKING PAYMENTS
  // =========================================================

  private async getDailyFinanceChart(
  range: { start: Date; end: Date } | null,
) {
  const dateFilter = (field: string) =>
    range
      ? {
          [field]: {
            $gte: range.start,
            $lt: range.end,
          },
        }
      : {};

  const [bookings, subscriptions, refunds] = await Promise.all([
    this.paymentModel.aggregate([
      {
        $match: {
          status: 'SUCCESS',
          paidAt: { $type: 'date', ...dateFilter('paidAt').paidAt },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$paidAt',
              timezone: 'UTC',
            },
          },
          amount: { $sum: '$amount' },
        },
      },
    ]),

    this.subscriptionModel.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          paymentProvider: {
            $in: ['bank_transfer', 'jazzcash', 'easypaisa'],
          },
          verifiedAt: {
            $type: 'date',
            ...dateFilter('verifiedAt').verifiedAt,
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$verifiedAt',
              timezone: 'UTC',
            },
          },
          amount: { $sum: '$amountPaid' },
        },
      },
    ]),

    this.refundModel.aggregate([
      {
        $match: {
          status: 'REFUNDED',
          refundedAt: {
            $type: 'date',
            ...dateFilter('refundedAt').refundedAt,
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$refundedAt',
              timezone: 'UTC',
            },
          },
          amount: { $sum: '$refundAmount' },
        },
      },
    ]),
  ]);

  const daily = new Map<
    string,
    {
      date: string;
      bookingCollections: number;
      subscriptionRevenue: number;
      completedRefunds: number;
    }
  >();

  const addAmounts = (
    records: Array<{ _id: string; amount: number }>,
    field:
      | 'bookingCollections'
      | 'subscriptionRevenue'
      | 'completedRefunds',
  ) => {
    for (const record of records) {
      const existing = daily.get(record._id) ?? {
        date: record._id,
        bookingCollections: 0,
        subscriptionRevenue: 0,
        completedRefunds: 0,
      };

      existing[field] = Number(record.amount ?? 0);
      daily.set(record._id, existing);
    }
  };

  addAmounts(bookings, 'bookingCollections');
  addAmounts(subscriptions, 'subscriptionRevenue');
  addAmounts(refunds, 'completedRefunds');

  const sortedDates = Array.from(daily.keys()).sort();

if (!range && sortedDates.length === 0) {
  return [];
}

const start = range
  ? new Date(range.start)
  : new Date(`${sortedDates[0]}T00:00:00.000Z`);

const end = range
  ? new Date(range.end.getTime() - 1)
  : new Date(`${sortedDates[sortedDates.length - 1]}T00:00:00.000Z`);

const result = [];

for (
  const current = new Date(start);
  current <= end;
  current.setUTCDate(current.getUTCDate() + 1)
) {
  const date = current.toISOString().slice(0, 10);

  result.push(
    daily.get(date) ?? {
      date,
      bookingCollections: 0,
      subscriptionRevenue: 0,
      completedRefunds: 0,
    },
  );
}

return result;
}

  private async getCollectedCommission(
    range: { start: Date; end: Date } | null,
  ): Promise<number> {
    const results = await this.paymentModel.aggregate([
      {
        $match: {
          status: 'SUCCESS',
          ...(range
            ? {
                paidAt: {
                  $gte: range.start,
                  $lt: range.end,
                },
              }
            : {}),
        },
      },
      {
        $group: {
          _id: '$vendorOrderId',
          collectedAmount: {
            $sum: '$amount',
          },
        },
      },
      {
        $lookup: {
          from: this.vendorOrderModel.collection.name,
          localField: '_id',
          foreignField: '_id',
          as: 'vendorOrder',
        },
      },
      {
        $unwind: '$vendorOrder',
      },
      {
        $project: {
          commission: {
            $cond: [
              {
                $gt: ['$vendorOrder.price', 0],
              },
              {
                $multiply: [
                  {
                    $min: [
                      {
                        $divide: [
                          '$collectedAmount',
                          '$vendorOrder.price',
                        ],
                      },
                      1,
                    ],
                  },
                  {
                    $ifNull: [
                      '$vendorOrder.commissionAmount',
                      0,
                    ],
                  },
                ],
              },
              0,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: '$commission',
          },
        },
      },
    ]);

    return Number(results[0]?.total ?? 0);
  }

    async getFinanceOverview(from?: string, to?: string) {
    const range = this.getFinanceDateRange(from, to);

  const bookingDateMatch = range
  ? {
      $or: [
        {
          status: 'SUCCESS',
          paidAt: {
            $gte: range.start,
            $lt: range.end,
          },
        },
        {
          status: { $ne: 'SUCCESS' },
          createdAt: {
            $gte: range.start,
            $lt: range.end,
          },
        },
      ],
    }
  : {};
      const [
  bookingPayments,
  subscriptionPayments,
  refunds,
  collectedCommission,
  dailyChart,
  subscriptionRevenueByPlan,
] = await Promise.all([
        this.paymentModel.aggregate([
      {
        $match: bookingDateMatch,
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          amount: { $sum: '$amount' },
        },
      },
    ]),

        this.subscriptionModel.aggregate([
            {
        $match: range
          ? {
              $or: [
                {
                  paymentStatus: 'paid',
                  verifiedAt: {
                    $gte: range.start,
                    $lt: range.end,
                  },
                },
                {
                  paymentStatus: { $ne: 'paid' },
                  createdAt: {
                    $gte: range.start,
                    $lt: range.end,
                  },
                },
              ],
            }
          : {},
      },
  {
    $group: {
      _id: '$paymentStatus',
      count: {
        $sum: {
          $cond: [
            {
              $or: [
                { $ne: ['$paymentStatus', 'paid'] },
                {
                  $and: [
                    { $eq: [{ $type: '$verifiedAt' }, 'date'] },
                    {
                      $in: [
                        '$paymentProvider',
                        ['bank_transfer', 'jazzcash', 'easypaisa'],
                      ],
                    },
                  ],
                },
              ],
            },
            1,
            0,
          ],
        },
      },
      amount: {
        $sum: {
          $cond: [
            {
              $and: [
                { $eq: ['$paymentStatus', 'paid'] },
                { $ne: ['$verifiedAt', null] },
                {
                  $in: [
                    '$paymentProvider',
                    ['bank_transfer', 'jazzcash', 'easypaisa'],
                  ],
                },
              ],
            },
            '$amountPaid',
            {
              $cond: [
                { $eq: ['$paymentStatus', 'paid'] },
                0,
                '$amountDue',
              ],
            },
          ],
        },
      },
    },
  },
]),

          this.refundModel.aggregate([
  {
    $match: range
      ? {
          $or: [
            {
              status: 'REFUNDED',
              refundedAt: {
                $gte: range.start,
                $lt: range.end,
              },
            },
            {
              status: { $ne: 'REFUNDED' },
              createdAt: {
                $gte: range.start,
                $lt: range.end,
              },
            },
          ],
        }
      : {},
  },
  {
    $group: {
      _id: '$status',
            count: { $sum: 1 },
            amount: { $sum: '$refundAmount' },
          },
        },
      ]),

   this.getCollectedCommission(range),
this.getDailyFinanceChart(range),

this.subscriptionModel.aggregate([
  {
    $match: {
      paymentStatus: 'paid',
      paymentProvider: {
        $in: ['bank_transfer', 'jazzcash', 'easypaisa'],
      },
      verifiedAt: {
        $type: 'date',
        ...(range
          ? {
              $gte: range.start,
              $lt: range.end,
            }
          : {}),
      },
      plan: {
        $in: ['basic', 'growth', 'premium'],
      },
    },
  },
  {
    $group: {
      _id: '$plan',
      paidTransactions: { $sum: 1 },
      revenue: { $sum: '$amountPaid' },
    },
  },
]),
]);

  const getStats = (
    records: Array<{
      _id: string;
      count: number;
      amount: number;
    }>,
    status: string,
  ) => {
    const record = records.find(
      (item) => item._id === status,
    );

    return {
      count: record?.count ?? 0,
      amount: record?.amount ?? 0,
    };
  };

  const bookingSuccessful = getStats(
    bookingPayments,
    'SUCCESS',
  );

  const bookingPending = getStats(
    bookingPayments,
    'PENDING',
  );

  const bookingFailed = getStats(
    bookingPayments,
    'FAILED',
  );

  const subscriptionPaid = getStats(
    subscriptionPayments,
    'paid',
  );

  const subscriptionPending = getStats(
    subscriptionPayments,
    'pending',
  );

  const subscriptionFailed = getStats(
    subscriptionPayments,
    'failed',
  );

  const completedRefunds = getStats(
    refunds,
    'REFUNDED',
  );

  const pendingRefunds = getStats(
    refunds,
    'PENDING',
  );

  const processingRefunds = getStats(
    refunds,
    'PROCESSING',
  );

  const grossTransactions =
    bookingSuccessful.amount +
    subscriptionPaid.amount;

  const netTransactions =
    grossTransactions -
    completedRefunds.amount;

  const getPlanRevenue = (plan: string) => {
  const record = subscriptionRevenueByPlan.find(
    (item) => item._id === plan,
  );

  return {
    paidTransactions: record?.paidTransactions ?? 0,
    revenue: record?.revenue ?? 0,
  };
};

return {
  currency: 'PKR',

  dailyChart,

  subscriptionRevenueByPlan: {
    basic: getPlanRevenue('basic'),
    growth: getPlanRevenue('growth'),
    premium: getPlanRevenue('premium'),
  },

  bookingPayments: {
      successful: bookingSuccessful,
      pending: bookingPending,
      failed: bookingFailed,
    },

    subscriptionPayments: {
      paid: subscriptionPaid,
      pending: subscriptionPending,
      failed: subscriptionFailed,
    },

    refunds: {
      completed: completedRefunds,
      pending: pendingRefunds,
      processing: processingRefunds,
    },

    summary: {
      bookingPaymentsCollected:
        bookingSuccessful.amount,

      subscriptionRevenue:
        subscriptionPaid.amount,

      grossTransactions,

      completedRefunds:
        completedRefunds.amount,

      netTransactions,

      platformRevenue:
      subscriptionPaid.amount,
      collectedCommission,
    },
  };
}
async getRecentTransactions(filters: {
  from?: string;
  to?: string;
  status?: string;
  type?: string;
  search?: string;
  page?: string;
  limit?: string;
}) {
  const range = this.getFinanceDateRange(
    filters.from,
    filters.to,
  );

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

  const type = (filters.type || 'ALL').toUpperCase();
  const status = (filters.status || 'ALL').toUpperCase();
  const search = (filters.search || '').trim();

  if (
    !['ALL', 'BOOKING_PAYMENT', 'SUBSCRIPTION_PAYMENT'].includes(type)
  ) {
    throw new BadRequestException('Invalid transaction type.');
  }

  if (
    !['ALL', 'PENDING', 'SUCCESS', 'PAID', 'FAILED'].includes(status)
  ) {
    throw new BadRequestException('Invalid payment status.');
  }

  if (search.length > 100) {
    throw new BadRequestException('Search is too long.');
  }

  const { Types } = await import('mongoose');

  const searchId = /^[a-fA-F0-9]{24}$/.test(search)
  ? new Types.ObjectId(search)
  : null;

  const bookingMatch: Record<string, any> = {};
  const subscriptionMatch: Record<string, any> = {
    paymentStatus: {
      $in: ['pending', 'paid', 'failed'],
    },
    paymentProvider: {
      $in: ['bank_transfer', 'jazzcash', 'easypaisa'],
    },
  };

  if (range) {
  const dateCondition = {
    $gte: range.start,
    $lt: range.end,
  };

  bookingMatch.$expr = {
    $and: [
      {
        $gte: [
          { $ifNull: ['$paidAt', '$createdAt'] },
          range.start,
        ],
      },
      {
        $lt: [
          { $ifNull: ['$paidAt', '$createdAt'] },
          range.end,
        ],
      },
    ],
  };

  subscriptionMatch.$expr = {
    $and: [
      {
        $gte: [
          { $ifNull: ['$verifiedAt', '$createdAt'] },
          range.start,
        ],
      },
      {
        $lt: [
          { $ifNull: ['$verifiedAt', '$createdAt'] },
          range.end,
        ],
      },
    ],
  };
}
if (status !== 'ALL') {
  bookingMatch.status =
    status === 'PAID' || status === 'SUCCESS'
      ? 'SUCCESS'
      : status;

  subscriptionMatch.paymentStatus =
    status === 'PAID' || status === 'SUCCESS'
      ? 'paid'
      : status.toLowerCase();
}

  if (search) {
    bookingMatch.$or = [
      ...(searchId
        ? [
            { _id: searchId },
            { orderId: searchId },
            { vendorOrderId: searchId },
            { vendorId: searchId },
            { organizerId: searchId },
          ]
        : []),
      { transactionRef: search },
    ];

    subscriptionMatch.$or = [
      ...(searchId
        ? [
            { _id: searchId },
            { vendorId: searchId },
          ]
        : []),
      { paymentReference: search },
    ];
  }

  const bookingPipeline: any[] = [
    { $match: bookingMatch },
    {
      $project: {
        _id: 1,
        transactionId: { $toString: '$_id' },
        transactionDate: {
          $ifNull: ['$paidAt', '$createdAt'],
        },
        vendorId: 1,
        clientId: '$organizerId',
        transactionType: {
          $literal: 'BOOKING_PAYMENT',
        },
        paymentMethod: '$method',
        amount: '$amount',
        status: 1,
        reference: '$transactionRef',
        orderId: 1,
      },
    },
  ];

  const subscriptionPipeline: any[] = [
    { $match: subscriptionMatch },
    {
      $project: {
        _id: 1,
        transactionId: { $toString: '$_id' },
        transactionDate: {
          $ifNull: ['$verifiedAt', '$createdAt'],
        },
        vendorId: 1,
        clientId: { $literal: null },
        transactionType: {
          $literal: 'SUBSCRIPTION_PAYMENT',
        },
        paymentMethod: '$paymentProvider',
        amount: {
          $cond: [
            { $eq: ['$paymentStatus', 'paid'] },
            '$amountPaid',
            '$amountDue',
          ],
        },
        status: {
          $toUpper: '$paymentStatus',
        },
        reference: '$paymentReference',
        orderId: { $literal: null },
      },
    },
  ];

  const includeBookings = type !== 'SUBSCRIPTION_PAYMENT';
  const includeSubscriptions = type !== 'BOOKING_PAYMENT';

  const pipeline: any[] = includeBookings
  ? [...bookingPipeline]
  : [
      { $match: { _id: { $exists: false } } },
      {
        $unionWith: {
          coll: this.subscriptionModel.collection.name,
          pipeline: subscriptionPipeline,
        },
      },
    ];

  if (includeBookings && includeSubscriptions) {
    pipeline.push({
      $unionWith: {
        coll: this.subscriptionModel.collection.name,
        pipeline: subscriptionPipeline,
      },
    });
  }

  pipeline.push(
    {
      $sort: {
        transactionDate: -1,
        _id: -1,
      },
    },
    {
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [
          { $skip: (page - 1) * limit },
          { $limit: limit },
          {
            $lookup: {
              from: 'users',
              localField: 'vendorId',
              foreignField: '_id',
              as: 'vendor',
              pipeline: [
                {
                  $project: {
                    name: 1,
                  },
                },
              ],
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: 'clientId',
              foreignField: '_id',
              as: 'client',
              pipeline: [
                {
                  $project: {
                    name: 1,
                  },
                },
              ],
            },
          },
          {
            $project: {
              _id: 0,
              transactionId: 1,
              transactionDate: 1,
              transactionType: 1,
              paymentMethod: 1,
              amount: 1,
              status: 1,
              reference: 1,
              orderId: 1,
              vendorId: {
                $toString: '$vendorId',
              },
              clientId: {
                $cond: [
                  { $ne: ['$clientId', null] },
                  { $toString: '$clientId' },
                  null,
                ],
              },
              vendorName: {
                $arrayElemAt: ['$vendor.name', 0],
              },
              clientName: {
                $arrayElemAt: ['$client.name', 0],
              },
            },
          },
        ],
      },
    },
  );

  const [result] = await this.paymentModel.aggregate(pipeline);

  const total = result?.metadata?.[0]?.total ?? 0;

  return {
    data: result?.data ?? [],
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
  async getPayments(
    status?: string,
    limit = 20,
    skip = 0,
  ) {
    const normalizedStatus =
      status &&
      status !== 'ALL'
        ? status.toUpperCase()
        : undefined;

    const query:
      Record<string, unknown> =
      normalizedStatus
        ? {
            status:
              normalizedStatus,
          }
        : {};

    const payments =
      await this.paymentModel
        .find(query)
        .populate(
          'vendorOrderId',
          'serviceName price downPaymentType downPaymentPercentage downPaymentAmount remainingAmount paymentStatus status',
        )
        .populate(
          'organizerId',
          'name email phone_number',
        )
        .populate(
          'vendorId',
          'name email phone_number',
        )
        .sort({
          createdAt: -1,
        })
        .skip(
          Number(skip),
        )
        .limit(
          Number(limit),
        )
        .lean();

    const vendorOrderIds =
      payments
        .map(
          (payment: any) =>
            payment.vendorOrderId
              ?._id,
        )
        .filter(Boolean);

    const successfulPaymentTotals =
      vendorOrderIds.length > 0
        ? await this.paymentModel.aggregate([
            {
              $match: {
                vendorOrderId: {
                  $in:
                    vendorOrderIds,
                },

                status:
                  'SUCCESS',
              },
            },
            {
              $group: {
                _id:
                  '$vendorOrderId',

                paidSoFar: {
                  $sum:
                    '$amount',
                },
              },
            },
          ])
        : [];

    const paidMap =
      new Map<
        string,
        number
      >();

    for (
      const item of successfulPaymentTotals
    ) {
      paidMap.set(
        String(
          item._id,
        ),
        Number(
          item.paidSoFar ||
            0,
        ),
      );
    }

    return payments.map(
      (payment: any) => {
        const vendorOrder =
          payment.vendorOrderId;

        const vendorOrderId =
          String(
            vendorOrder?._id ??
              payment.vendorOrderId ??
              '',
          );

        const totalBookingAmount =
          Number(
            vendorOrder?.price ??
              0,
          );

        const paidSoFar =
          paidMap.get(
            vendorOrderId,
          ) ?? 0;

        const outstandingAmount =
          Math.max(
            totalBookingAmount -
              paidSoFar,
            0,
          );

        return {
          paymentId:
            String(
              payment._id,
            ),

          vendorOrderId,

          orderId:
            String(
              payment.orderId ??
                '',
            ),

          client:
            payment.organizerId
              ? {
                  id: String(
                    payment
                      .organizerId
                      ._id,
                  ),

                  name:
                    payment
                      .organizerId
                      .name ??
                    'Unknown Client',

                  email:
                    payment
                      .organizerId
                      .email ??
                    null,

                  phone:
                    payment
                      .organizerId
                      .phone_number ??
                    null,
                }
              : null,

          vendor:
            payment.vendorId
              ? {
                  id: String(
                    payment
                      .vendorId
                      ._id,
                  ),

                  name:
                    payment
                      .vendorId
                      .name ??
                    'Unknown Vendor',

                  email:
                    payment
                      .vendorId
                      .email ??
                    null,

                  phone:
                    payment
                      .vendorId
                      .phone_number ??
                    null,
                }
              : null,

          booking:
            vendorOrder
              ? {
                  serviceName:
                    vendorOrder
                      .serviceName ??
                    'N/A',

                  bookingStatus:
                    vendorOrder
                      .status ??
                    null,

                  totalAmount:
                    totalBookingAmount,

                  downPaymentType:
                    vendorOrder
                      .downPaymentType ??
                    null,

                  downPaymentPercentage:
                    vendorOrder
                      .downPaymentPercentage ??
                    null,

                  downPaymentAmount:
                    Number(
                      vendorOrder
                        .downPaymentAmount ??
                        0,
                    ),

                  configuredRemainingAmount:
                    Number(
                      vendorOrder
                        .remainingAmount ??
                        0,
                    ),

                  paymentStatus:
                    vendorOrder
                      .paymentStatus ??
                    null,
                }
              : null,

          type:
            payment.type,

          amount:
            Number(
              payment.amount ??
                0,
            ),

          paidSoFar,

          outstandingAmount,

          status:
            payment.status,

          method:
            payment.method ??
            null,

          transactionRef:
            payment.transactionRef ??
            null,

          paidAt:
            payment.paidAt ??
            null,

          failureReason:
            payment.failureReason ??
            null,

          createdAt:
            payment.createdAt ??
            null,

          updatedAt:
            payment.updatedAt ??
            null,
        };
      },
    );
  }

  // =========================================================
  // REFUNDS
  // =========================================================

  async getRefunds(
    status?: string,
    limit = 20,
    skip = 0,
  ) {
    const normalizedStatus =
      status &&
      status !== 'ALL'
        ? status.toUpperCase()
        : undefined;

    const query:
      Record<string, unknown> =
      normalizedStatus
        ? {
            status:
              normalizedStatus,
          }
        : {};

    const refunds =
      await this.refundModel
        .find(query)
        .populate(
          'vendorOrderId',
          'serviceName price status cancellationReason cancelledBy cancelledAt',
        )
        .populate(
          'organizerId',
          'name email phone_number',
        )
        .populate(
          'vendorId',
          'name email phone_number',
        )
        .sort({
          createdAt: -1,
        })
        .skip(
          Number(skip),
        )
        .limit(
          Number(limit),
        )
        .lean();

    return refunds.map(
      (refund: any) => ({
        refundId:
          String(
            refund._id,
          ),

        vendorOrderId:
          String(
            refund.vendorOrderId
              ?._id ??
              refund.vendorOrderId ??
              '',
          ),

        orderId:
          String(
            refund.orderId ??
              '',
          ),

        client:
          refund.organizerId
            ? {
                id: String(
                  refund
                    .organizerId
                    ._id,
                ),

                name:
                  refund
                    .organizerId
                    .name ??
                  'Unknown Client',

                email:
                  refund
                    .organizerId
                    .email ??
                  null,

                phone:
                  refund
                    .organizerId
                    .phone_number ??
                  null,
              }
            : null,

        vendor:
          refund.vendorId
            ? {
                id: String(
                  refund
                    .vendorId
                    ._id,
                ),

                name:
                  refund
                    .vendorId
                    .name ??
                  'Unknown Vendor',

                email:
                  refund
                    .vendorId
                    .email ??
                  null,

                phone:
                  refund
                    .vendorId
                    .phone_number ??
                  null,
              }
            : null,

        booking:
          refund.vendorOrderId
            ? {
                serviceName:
                  refund
                    .vendorOrderId
                    .serviceName ??
                  'N/A',

                totalAmount:
                  Number(
                    refund
                      .vendorOrderId
                      .price ??
                      0,
                  ),

                status:
                  refund
                    .vendorOrderId
                    .status ??
                  null,

                cancelledBy:
                  refund
                    .vendorOrderId
                    .cancelledBy ??
                  null,

                cancelledAt:
                  refund
                    .vendorOrderId
                    .cancelledAt ??
                  null,

                cancellationReason:
                  refund
                    .vendorOrderId
                    .cancellationReason ??
                  null,
              }
            : null,

        amountPaid:
          Number(
            refund.amountPaid ??
              0,
          ),

        refundAmount:
          Number(
            refund.refundAmount ??
              0,
          ),

        withheldAmount:
          Number(
            refund.withheldAmount ??
              0,
          ),

        initiatedBy:
          refund.initiatedBy,

        daysBeforeEvent:
          Number(
            refund.daysBeforeEvent ??
              0,
          ),

        cancellationPolicyApplied:
          refund
            .cancellationPolicyApplied,

        status:
          refund.status,

        processedAt:
          refund.processedAt ??
          null,

        refundedAt:
          refund.refundedAt ??
          refund.paidAt ??
          null,

        rejectedAt:
          refund.rejectedAt ??
          null,

        notes:
          refund.notes ??
          null,

        createdAt:
          refund.createdAt ??
          null,

        updatedAt:
          refund.updatedAt ??
          null,
      }),
    );
  }

  async updateRefundStatus(
    refundId: string,

    status:
      | 'PENDING'
      | 'PROCESSING'
      | 'REFUNDED'
      | 'REJECTED',
  ) {
    const refund =
      await this.refundModel
        .findById(
          refundId,
        );

    if (!refund) {
      return null;
    }

    refund.status =
      status;

    if (
      status ===
      'PENDING'
    ) {
      refund.processedAt =
        null;

      refund.refundedAt =
        null;

      refund.rejectedAt =
        null;
    }

    if (
      status ===
      'PROCESSING'
    ) {
      refund.processedAt =
        new Date();

      refund.refundedAt =
        null;

      refund.rejectedAt =
        null;
    }

    if (
      status ===
      'REFUNDED'
    ) {
      refund.refundedAt =
        new Date();

      refund.rejectedAt =
        null;
    }

    if (
      status ===
      'REJECTED'
    ) {
      refund.rejectedAt =
        new Date();

      refund.refundedAt =
        null;
    }

    return refund.save();
  }

  // =========================================================
  // SUBSCRIPTION PAYMENTS
  // =========================================================

  async getSubscriptionPayments(
    status?: string,
    plan?: string,
    limit = 20,
    skip = 0,
  ) {
    return this.subscriptionService
      .getAdminSubscriptionPayments(
        status,
        plan,
        limit,
        skip,
      );
  }

  async reviewSubscriptionPayment(
    subscriptionId: string,

    decision:
      | 'PAID'
      | 'FAILED',

    adminId: string,

    reason?: string,
  ) {
    return this.subscriptionService
      .reviewSubscriptionPayment(
        subscriptionId,
        decision,
        adminId,
        reason,
      );
  }

  // =========================================================
  // LEGACY PAYOUTS
  // =========================================================
  // Preserved for now.
  // Current subscription-only platform revenue model
  // does not require platform booking payouts.

  async getPayouts(
    status?: string,
    limit = 20,
    skip = 0,
  ) {
    const query:
      Record<string, unknown> =
      status &&
      status !== 'ALL'
        ? {
            status:
              status.toUpperCase(),
          }
        : {};

    return this.payoutModel
      .find(query)
      .populate(
        'vendorId',
        'name contactDetails',
      )
      .populate(
        'vendorOrderId',
        'serviceName',
      )
      .sort({
        createdAt: -1,
      })
      .skip(
        Number(skip),
      )
      .limit(
        Number(limit),
      )
      .lean();
  }
}