// fyp-backend/src/admin/admin.service.ts

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { VendorOrder } from 'src/schemas/vendor-order.schema';
import { Order } from 'src/schemas/order.schema';
import { Payment } from 'src/schemas/payment.schema';
import { Payout } from 'src/schemas/payout.schema';
import { Refund } from 'src/schemas/refund.schema';
import { User } from 'src/schemas/user.schema';

import {
    AdminDashboardStats,
    AdminBookingRow,
} from './admin.types';

const BOOKING_STATUS_FILTERS: Record<string, any> = {
    Pending: {
        status: 'pending',
    },

    Accepted: {
        status: 'accepted',
    },

    Confirmed: {
        status: 'accepted',
        paymentStatus: 'PAID',
    },

    Completed: {
        status: 'completed',
    },

    Cancelled: {
        status: {
            $in: [
                'cancelled',
                'cancelled_by_vendor',
            ],
        },
    },

    'Payment Pending': {
        paymentStatus: 'PAYMENT_REQUIRED',
    },
};

@Injectable()
export class AdminService {
    constructor(
        @InjectModel(VendorOrder.name)
        private readonly vendorOrderModel: Model<VendorOrder>,

        @InjectModel(Order.name)
        private readonly orderModel: Model<Order>,

        @InjectModel(Payment.name)
        private readonly paymentModel: Model<Payment>,

        @InjectModel(Payout.name)
        private readonly payoutModel: Model<Payout>,

        @InjectModel(Refund.name)
        private readonly refundModel: Model<Refund>,

        @InjectModel(User.name)
        private readonly userModel: Model<User>,
    ) {}

    // ============================================================
    // ADMIN DASHBOARD
    // ============================================================

    async getDashboardStats(): Promise<AdminDashboardStats> {
        const totalBookings =
            await this.vendorOrderModel.countDocuments();

        const completedBookings =
            await this.vendorOrderModel.countDocuments({
                status: 'completed',
            });

        const paidPayments =
            await this.paymentModel
                .find({
                    status: 'SUCCESS',
                })
                .lean();

        const grossBookingValue =
            paidPayments.reduce(
                (sum, payment) =>
                    sum +
                    Number(payment.amount || 0),
                0,
            );

        /**
         * Commission comes from the payout ledger.
         *
         * commission =
         * grossAmount - payoutAmount
         */
        const payouts =
            await this.payoutModel
                .find()
                .lean();

        const eventifyCommission =
            payouts.reduce(
                (sum, payout) =>
                    sum +
                    (
                        Number(
                            payout.grossAmount || 0,
                        ) -
                        Number(
                            payout.payoutAmount || 0,
                        )
                    ),
                0,
            );

        const vendorEarnings =
            payouts.reduce(
                (sum, payout) =>
                    sum +
                    Number(
                        payout.payoutAmount || 0,
                    ),
                0,
            );

        const pendingPayoutDocs =
            await this.payoutModel
                .find({
                    status: {
                        $in: [
                            'PENDING',
                            'PROCESSING',
                        ],
                    },
                })
                .lean();

        const pendingPayouts =
            pendingPayoutDocs.reduce(
                (sum, payout) =>
                    sum +
                    Number(
                        payout.payoutAmount || 0,
                    ),
                0,
            );

        const refundDocs =
            await this.refundModel
                .find({
                    status: 'PAID',
                })
                .lean();

        const totalRefunds =
            refundDocs.reduce(
                (sum, refund) =>
                    sum +
                    Number(
                        refund.refundAmount || 0,
                    ),
                0,
            );

        return {
            totalBookings,
            completedBookings,
            grossBookingValue,
            eventifyCommission,
            vendorEarnings,
            pendingPayouts,
            totalRefunds,
        };
    }

    // ============================================================
    // ADMIN BOOKINGS
    // ============================================================

    async getBookings(
        filter?: string,
        limit = 20,
        skip = 0,
    ): Promise<AdminBookingRow[]> {
        const query: any = {};

        const safeLimit = Math.min(
            Math.max(
                Number(limit) || 20,
                1,
            ),
            100,
        );

        const safeSkip = Math.max(
            Number(skip) || 0,
            0,
        );

        if (
            filter &&
            filter !== 'All'
        ) {
            if (
                filter === 'Refunded'
            ) {
                const refundedIds =
                    await this.refundModel
                        .find({
                            status: 'PAID',
                        })
                        .distinct(
                            'vendorOrderId',
                        );

                query._id = {
                    $in: refundedIds,
                };
            } else if (
                filter ===
                'Payout Pending'
            ) {
                const payoutPendingIds =
                    await this.payoutModel
                        .find({
                            status: {
                                $in: [
                                    'PENDING',
                                    'PROCESSING',
                                ],
                            },
                        })
                        .distinct(
                            'vendorOrderId',
                        );

                query._id = {
                    $in: payoutPendingIds,
                };
            } else if (
                BOOKING_STATUS_FILTERS[
                    filter
                ]
            ) {
                Object.assign(
                    query,
                    BOOKING_STATUS_FILTERS[
                        filter
                    ],
                );
            }
        }

        const vendorOrders =
            await this.vendorOrderModel
                .find(query)
                .populate(
                    'vendorId',
                    'name contactDetails',
                )
                .sort({
                    createdAt: -1,
                })
                .skip(safeSkip)
                .limit(safeLimit)
                .lean();

        const rows: AdminBookingRow[] =
            [];

        for (
            const vendorOrder
            of vendorOrders
        ) {
            const order =
                await this.orderModel
                    .findOne({
                        vendorOrders:
                            vendorOrder._id,
                    })
                    .populate(
                        'organizerId',
                        'name',
                    )
                    .lean();

            const payout =
                await this.payoutModel
                    .findOne({
                        vendorOrderId:
                            vendorOrder._id,
                    })
                    .lean();

            const commission =
                payout
                    ? Number(
                          payout.grossAmount ||
                              0,
                      ) -
                      Number(
                          payout.payoutAmount ||
                              0,
                      )
                    : 0;

            const vendorNet =
                payout
                    ? Number(
                          payout.payoutAmount ||
                              0,
                      )
                    : Number(
                          vendorOrder.price ||
                              0,
                      ) -
                      commission;

            rows.push({
                bookingId:
                    vendorOrder._id.toString(),

                organizerName:
                    (
                        order
                            ?.organizerId as any
                    )?.name ||
                    'N/A',

                vendorName:
                    (
                        vendorOrder
                            .vendorId as any
                    )
                        ?.contactDetails
                        ?.brandName ||
                    (
                        vendorOrder
                            .vendorId as any
                    )?.name ||
                    'N/A',

                eventName:
                    order?.eventName ||
                    'N/A',

                eventDate:
                    order?.eventDate as Date,

                eventTime:
                    order?.eventTime ||
                    '',

                amount:
                    Number(
                        vendorOrder.price ||
                            0,
                    ),

                downPayment:
                    Number(
                        vendorOrder
                            .downPaymentAmount ??
                            0,
                    ),

                remaining:
                    Number(
                        vendorOrder
                            .remainingAmount ??
                            vendorOrder.price ??
                            0,
                    ),

                commission,

                vendorNet,

                bookingStatus:
                    vendorOrder.status,

                paymentStatus:
                    vendorOrder.paymentStatus,

                payoutStatus:
                    payout?.status ??
                    null,
            });
        }

        return rows;
    }

    // ============================================================
    // ADMIN BOOKING DETAIL
    // ============================================================

    async getBookingDetail(
        vendorOrderId: string,
    ) {
        const vendorOrder =
            await this.vendorOrderModel
                .findById(
                    vendorOrderId,
                )
                .populate(
                    'vendorId',
                    [
                        'name',
                        'email',
                        'phone_number',
                        'contactDetails',
                    ].join(' '),
                )
                .lean();

        if (!vendorOrder) {
            return null;
        }

        const order =
            await this.orderModel
                .findOne({
                    vendorOrders:
                        vendorOrder._id,
                })
                .populate(
                    'organizerId',
                    [
                        'name',
                        'email',
                        'phone_number',
                    ].join(' '),
                )
                .lean();

        const payments =
            await this.paymentModel
                .find({
                    vendorOrderId,
                })
                .sort({
                    createdAt: -1,
                })
                .lean();

        const payout =
            await this.payoutModel
                .findOne({
                    vendorOrderId,
                })
                .lean();

        const refund =
            await this.refundModel
                .findOne({
                    vendorOrderId,
                })
                .lean();

        return {
            vendorOrder,
            order,
            payments,
            payout,
            refund,
        };
    }

    // ============================================================
    // ADMIN VENDORS
    // ============================================================

    async getVendors(
        search?: string,
        categoryId?: string,
        city?: string,
        limit = 20,
        skip = 0,
    ) {
        const safeLimit = Math.min(
            Math.max(
                Number(limit) || 20,
                1,
            ),
            100,
        );

        const safeSkip = Math.max(
            Number(skip) || 0,
            0,
        );

        const query: Record<
            string,
            any
        > = {
            role: 'Vendor',
        };

        // --------------------------------------------------------
        // SEARCH
        // --------------------------------------------------------

        const searchValue =
            search?.trim();

        if (searchValue) {
            query.$or = [
                {
                    name: {
                        $regex:
                            searchValue,
                        $options: 'i',
                    },
                },

                {
                    email: {
                        $regex:
                            searchValue,
                        $options: 'i',
                    },
                },

                {
                    'contactDetails.brandName':
                        {
                            $regex:
                                searchValue,
                            $options:
                                'i',
                        },
                },

                {
                    'contactDetails.bookingEmail':
                        {
                            $regex:
                                searchValue,
                            $options:
                                'i',
                        },
                },

                {
                    'contactDetails.contactNumber':
                        {
                            $regex:
                                searchValue,
                            $options:
                                'i',
                        },
                },
            ];
        }

        // --------------------------------------------------------
        // CATEGORY FILTER
        // --------------------------------------------------------

        if (
            categoryId?.trim()
        ) {
            const category =
                categoryId.trim();

            query.$and = [
                ...(query.$and ||
                    []),

                {
                    $or: [
                        {
                            categoryId:
                                category,
                        },

                        {
                            buisnessCategory:
                                category,
                        },
                    ],
                },
            ];
        }

        // --------------------------------------------------------
        // CITY FILTER
        // --------------------------------------------------------

        if (city?.trim()) {
            query[
                'contactDetails.city'
            ] = {
                $regex:
                    city.trim(),

                $options:
                    'i',
            };
        }

        // --------------------------------------------------------
        // QUERY
        // --------------------------------------------------------

        const vendors =
            await this.userModel
                .find(query)
                .select(
                    [
                        '_id',

                        'name',

                        'email',

                        'phone_number',

                        'role',

                        'categoryId',

                        'buisnessCategory',

                        'contactDetails',

                        'coverImage',

                        'images',

                        'packages',

                        'photographerBusinessDetails',

                        'cateringBusinessDetails',

                        'venueBusinessDetails',

                        'salonBusinessDetails',

                        'cakeBusinessDetails',

                        'mehndiBusinessDetails',

                        'soundBusinessDetails',

                        'genericBusinessDetails',

                        'availabilitySettings',

                        'isOnline',

                        'lastSeen',

                        'createdAt',

                        'updatedAt',
                    ].join(' '),
                )
                .sort({
                    createdAt: -1,
                })
                .skip(
                    safeSkip,
                )
                .limit(
                    safeLimit,
                )
                .lean();

        // --------------------------------------------------------
        // SAFE ADMIN RESPONSE
        // --------------------------------------------------------

        return vendors.map(
            (vendor: any) => {
                const businessDetails =
                    vendor
                        ?.photographerBusinessDetails ??
                    vendor
                        ?.cateringBusinessDetails ??
                    vendor
                        ?.venueBusinessDetails ??
                    vendor
                        ?.salonBusinessDetails ??
                    vendor
                        ?.cakeBusinessDetails ??
                    vendor
                        ?.mehndiBusinessDetails ??
                    vendor
                        ?.soundBusinessDetails ??
                    vendor
                        ?.genericBusinessDetails ??
                    null;

                return {
                    vendorId:
                        vendor._id.toString(),

                    name:
                        vendor.name
                            ?.trim?.() ||
                        'N/A',

                    brandName:
                        vendor
                            .contactDetails
                            ?.brandName
                            ?.trim?.() ||
                        vendor.name
                            ?.trim?.() ||
                        'N/A',

                    email:
                        vendor
                            .contactDetails
                            ?.bookingEmail
                            ?.trim?.() ||
                        vendor.email
                            ?.trim?.() ||
                        'N/A',

                    accountEmail:
                        vendor.email
                            ?.trim?.() ||
                        'N/A',

                    phoneNumber:
                        vendor
                            .contactDetails
                            ?.contactNumber
                            ?.trim?.() ||
                        vendor
                            .phone_number
                            ?.trim?.() ||
                        'N/A',

                    city:
                        vendor
                            .contactDetails
                            ?.city
                            ?.trim?.() ||
                        'N/A',

                    brandLogo:
                        vendor
                            .contactDetails
                            ?.brandLogo ||
                        null,

                    coverImage:
                        vendor.coverImage ||
                        null,

                    categoryId:
                        vendor.categoryId
                            ?.toString?.() ||
                        vendor
                            .buisnessCategory
                            ?.toString?.() ||
                        null,

                    packageCount:
                        Array.isArray(
                            vendor.packages,
                        )
                            ? vendor
                                  .packages
                                  .length
                            : 0,

                    imageCount:
                        Array.isArray(
                            vendor.images,
                        )
                            ? vendor
                                  .images
                                  .length
                            : 0,

                    isOnline:
                        Boolean(
                            vendor.isOnline,
                        ),

                    lastSeen:
                        vendor.lastSeen ||
                        null,

                    availabilityConfigured:
                        Boolean(
                            vendor
                                .availabilitySettings,
                        ),

                    profileComplete:
                        Boolean(
                            vendor
                                .contactDetails &&
                                vendor
                                    .coverImage &&
                                Array.isArray(
                                    vendor.images,
                                ) &&
                                vendor
                                    .images
                                    .length >
                                    0 &&
                                Array.isArray(
                                    vendor.packages,
                                ) &&
                                vendor
                                    .packages
                                    .length >
                                    0 &&
                                businessDetails,
                        ),

                    businessDetails,

                    createdAt:
                        vendor.createdAt ||
                        null,

                    updatedAt:
                        vendor.updatedAt ||
                        null,
                };
            },
        );
    }

    async getVendorDetail(vendorId: string) {
    const vendor = await this.userModel
        .findOne({
            _id: vendorId,
            role: 'Vendor',
        })
        .select(
            [
                '_id',
                'name',
                'email',
                'phone_number',
                'role',
                'categoryId',
                'buisnessCategory',
                'contactDetails',
                'coverImage',
                'images',
                'packages',
                'photographerBusinessDetails',
                'cateringBusinessDetails',
                'venueBusinessDetails',
                'salonBusinessDetails',
                'cakeBusinessDetails',
                'mehndiBusinessDetails',
                'soundBusinessDetails',
                'genericBusinessDetails',
                'availabilitySettings',
                'isOnline',
                'lastSeen',
                'createdAt',
                'updatedAt',
            ].join(' '),
        )
        .lean();

    if (!vendor) {
        return null;
    }

    const data = vendor as any;

    const businessDetails =
        data.photographerBusinessDetails ??
        data.cateringBusinessDetails ??
        data.venueBusinessDetails ??
        data.salonBusinessDetails ??
        data.cakeBusinessDetails ??
        data.mehndiBusinessDetails ??
        data.soundBusinessDetails ??
        data.genericBusinessDetails ??
        null;

    return {
        vendorId: data._id.toString(),

        name:
            data.name?.trim?.() ||
            'N/A',

        brandName:
            data.contactDetails?.brandName?.trim?.() ||
            data.name?.trim?.() ||
            'N/A',

        accountEmail:
            data.email?.trim?.() ||
            'N/A',

        bookingEmail:
            data.contactDetails?.bookingEmail?.trim?.() ||
            data.email?.trim?.() ||
            'N/A',

        phoneNumber:
            data.contactDetails?.contactNumber?.trim?.() ||
            data.phone_number?.trim?.() ||
            'N/A',

        city:
            data.contactDetails?.city?.trim?.() ||
            'N/A',

        officialAddress:
            data.contactDetails?.officialAddress?.trim?.() ||
            'N/A',

        website:
            data.contactDetails?.website?.trim?.() ||
            null,

        instagramLink:
            data.contactDetails?.instagramLink?.trim?.() ||
            null,

        facebookLink:
            data.contactDetails?.facebookLink?.trim?.() ||
            null,

        officialGoogleLink:
            data.contactDetails?.officialGoogleLink?.trim?.() ||
            null,

        brandLogo:
            data.contactDetails?.brandLogo ||
            null,

        coverImage:
            data.coverImage ||
            null,

        categoryId:
            data.categoryId?.toString?.() ||
            data.buisnessCategory?.toString?.() ||
            null,

        packages:
            Array.isArray(data.packages)
                ? data.packages
                : [],

        images:
            Array.isArray(data.images)
                ? data.images
                : [],

        packageCount:
            Array.isArray(data.packages)
                ? data.packages.length
                : 0,

        imageCount:
            Array.isArray(data.images)
                ? data.images.length
                : 0,

        businessDetails,

        availabilitySettings:
            data.availabilitySettings ||
            null,

        availabilityConfigured:
            Boolean(data.availabilitySettings),

        isOnline:
            Boolean(data.isOnline),

        lastSeen:
            data.lastSeen ||
            null,

        profileComplete:
            Boolean(
                data.contactDetails &&
                data.coverImage &&
                Array.isArray(data.images) &&
                data.images.length > 0 &&
                Array.isArray(data.packages) &&
                data.packages.length > 0 &&
                businessDetails,
            ),

        createdAt:
            data.createdAt ||
            null,

        updatedAt:
            data.updatedAt ||
            null,
    };
}

    // ============================================================
    // ADMIN CLIENTS
    //
    // User-facing terminology = Client
    // Existing database role compatibility = Organizer
    // ============================================================

    async getClients(
        search?: string,
        limit = 20,
        skip = 0,
    ) {
        const safeLimit = Math.min(
            Math.max(
                Number(limit) || 20,
                1,
            ),
            100,
        );

        const safeSkip = Math.max(
            Number(skip) || 0,
            0,
        );

        const query: Record<
            string,
            any
        > = {
            role: 'Organizer',
        };

        // --------------------------------------------------------
        // SEARCH
        // --------------------------------------------------------

        const searchValue =
            search?.trim();

        if (searchValue) {
            query.$or = [
                {
                    name: {
                        $regex:
                            searchValue,
                        $options: 'i',
                    },
                },

                {
                    email: {
                        $regex:
                            searchValue,
                        $options: 'i',
                    },
                },

                {
                    phone_number: {
                        $regex:
                            searchValue,
                        $options: 'i',
                    },
                },
            ];
        }

        // --------------------------------------------------------
        // SAFE USER QUERY
        //
        // Never expose password / pushToken / provider credentials.
        // --------------------------------------------------------

        const clients =
            await this.userModel
                .find(query)
                .select(
                    [
                        '_id',
                        'name',
                        'email',
                        'phone_number',
                        'address',
                        'role',
                        'isOnline',
                        'lastSeen',
                        'createdAt',
                        'updatedAt',
                    ].join(' '),
                )
                .sort({
                    createdAt: -1,
                })
                .skip(
                    safeSkip,
                )
                .limit(
                    safeLimit,
                )
                .lean();

        if (!clients.length) {
            return [];
        }

        // --------------------------------------------------------
        // CLIENT IDS
        // --------------------------------------------------------

        const clientIds =
            clients.map(
                (client: any) =>
                    client._id,
            );

        // --------------------------------------------------------
        // ORDER STATISTICS
        //
        // One Order = one Client event.
        // An Order may contain multiple VendorOrders.
        // --------------------------------------------------------

        const orderStats =
            await this.orderModel.aggregate([
                {
                    $match: {
                        organizerId: {
                            $in: clientIds,
                        },
                    },
                },

                {
                    $group: {
                        _id: '$organizerId',

                        totalEvents: {
                            $sum: 1,
                        },

                        totalSpent: {
                            $sum: {
                                $ifNull: [
                                    '$finalAmount',
                                    0,
                                ],
                            },
                        },

                        pendingEvents: {
                            $sum: {
                                $cond: [
                                    {
                                        $eq: [
                                            '$status',
                                            'pending',
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },

                        confirmedEvents: {
                            $sum: {
                                $cond: [
                                    {
                                        $eq: [
                                            '$status',
                                            'confirmed',
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },

                        completedEvents: {
                            $sum: {
                                $cond: [
                                    {
                                        $eq: [
                                            '$status',
                                            'completed',
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },

                        cancelledEvents: {
                            $sum: {
                                $cond: [
                                    {
                                        $eq: [
                                            '$status',
                                            'cancelled',
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },

                        totalVendorBookings: {
                            $sum: {
                                $size: {
                                    $ifNull: [
                                        '$vendorOrders',
                                        [],
                                    ],
                                },
                            },
                        },

                        lastEventAt: {
                            $max:
                                '$eventDate',
                        },
                    },
                },
            ]);

        const statsMap =
            new Map(
                orderStats.map(
                    (stats: any) => [
                        stats._id.toString(),
                        stats,
                    ],
                ),
            );

        // --------------------------------------------------------
        // SAFE ADMIN RESPONSE
        // --------------------------------------------------------

        return clients.map(
            (client: any) => {
                const stats =
                    statsMap.get(
                        client._id.toString(),
                    );

                return {
                    clientId:
                        client._id.toString(),

                    name:
                        client.name
                            ?.trim?.() ||
                        'N/A',

                    email:
                        client.email
                            ?.trim?.() ||
                        'N/A',

                    phoneNumber:
                        client.phone_number
                            ?.trim?.() ||
                        'N/A',

                    address:
                        client.address
                            ?.trim?.() ||
                        'N/A',

                    isOnline:
                        Boolean(
                            client.isOnline,
                        ),

                    lastSeen:
                        client.lastSeen ||
                        null,

                    totalEvents:
                        Number(
                            stats?.totalEvents ||
                                0,
                        ),

                    totalVendorBookings:
                        Number(
                            stats
                                ?.totalVendorBookings ||
                                0,
                        ),

                    totalSpent:
                        Number(
                            stats?.totalSpent ||
                                0,
                        ),

                    pendingEvents:
                        Number(
                            stats
                                ?.pendingEvents ||
                                0,
                        ),

                    confirmedEvents:
                        Number(
                            stats
                                ?.confirmedEvents ||
                                0,
                        ),

                    completedEvents:
                        Number(
                            stats
                                ?.completedEvents ||
                                0,
                        ),

                    cancelledEvents:
                        Number(
                            stats
                                ?.cancelledEvents ||
                                0,
                        ),

                    lastEventAt:
                        stats?.lastEventAt ||
                        null,

                    createdAt:
                        client.createdAt ||
                        null,

                    updatedAt:
                        client.updatedAt ||
                        null,
                };
            },
        );
    }

    // ============================================================
    // ADMIN CLIENT DETAIL
    // ============================================================

    async getClientDetail(
        clientId: string,
    ) {
        const client =
            await this.userModel
                .findOne({
                    _id: clientId,

                    // Existing database compatibility.
                    role: 'Organizer',
                })
                .select(
                    [
                        '_id',
                        'name',
                        'email',
                        'phone_number',
                        'address',
                        'role',
                        'isOnline',
                        'lastSeen',
                        'createdAt',
                        'updatedAt',
                    ].join(' '),
                )
                .lean();

        if (!client) {
            return null;
        }

        const data =
            client as any;

        // --------------------------------------------------------
        // CLIENT EVENTS
        // --------------------------------------------------------

        const orders =
            await this.orderModel
                .find({
                    organizerId:
                        data._id,
                })
                .select(
                    [
                        '_id',
                        'eventName',
                        'eventType',
                        'guests',
                        'eventDate',
                        'eventTime',
                        'eventStartDateTime',
                        'eventEndDateTime',
                        'eventDurationMinutes',
                        'totalAmount',
                        'discount',
                        'finalAmount',
                        'status',
                        'vendorOrders',
                        'createdAt',
                        'updatedAt',
                    ].join(' '),
                )
                .sort({
                    createdAt: -1,
                })
                .lean();

        // --------------------------------------------------------
        // ALL VENDOR ORDER IDS USED BY THIS CLIENT
        // --------------------------------------------------------

        const vendorOrderIds =
            orders.flatMap(
                (order: any) =>
                    Array.isArray(
                        order.vendorOrders,
                    )
                        ? order.vendorOrders
                        : [],
            );

        // --------------------------------------------------------
        // VENDOR BOOKING DETAILS
        // --------------------------------------------------------

        const vendorOrders =
            vendorOrderIds.length > 0
                ? await this.vendorOrderModel
                      .find({
                          _id: {
                              $in:
                                  vendorOrderIds,
                          },
                      })
                      .populate(
                          'vendorId',
                          [
                              'name',
                              'contactDetails',
                          ].join(' '),
                      )
                      .sort({
                          createdAt: -1,
                      })
                      .lean()
                : [];

        const vendorOrderMap =
            new Map(
                vendorOrders.map(
                    (
                        vendorOrder: any,
                    ) => [
                        vendorOrder._id.toString(),
                        vendorOrder,
                    ],
                ),
            );

        // --------------------------------------------------------
        // EVENT HISTORY
        // --------------------------------------------------------

        const events =
            orders.map(
                (order: any) => {
                    const bookings =
                        (
                            order.vendorOrders ||
                            []
                        )
                            .map(
                                (
                                    vendorOrderId:
                                        any,
                                ) =>
                                    vendorOrderMap.get(
                                        vendorOrderId.toString(),
                                    ),
                            )
                            .filter(Boolean)
                            .map(
                                (
                                    vendorOrder:
                                        any,
                                ) => {
                                    const vendor =
                                        vendorOrder.vendorId as any;

                                    return {
                                        bookingId:
                                            vendorOrder._id.toString(),

                                        vendorId:
                                            vendor?._id
                                                ?.toString?.() ||
                                            null,

                                        vendorName:
                                            vendor
                                                ?.contactDetails
                                                ?.brandName
                                                ?.trim?.() ||
                                            vendor
                                                ?.name
                                                ?.trim?.() ||
                                            'N/A',

                                        serviceName:
                                            vendorOrder
                                                .serviceName ||
                                            vendorOrder
                                                .packageName ||
                                            'N/A',

                                        amount:
                                            Number(
                                                vendorOrder.price ||
                                                    0,
                                            ),

                                        downPayment:
                                            Number(
                                                vendorOrder
                                                    .downPaymentAmount ??
                                                    0,
                                            ),

                                        remaining:
                                            Number(
                                                vendorOrder
                                                    .remainingAmount ??
                                                    vendorOrder
                                                        .price ??
                                                    0,
                                            ),

                                        bookingStatus:
                                            vendorOrder.status ||
                                            'N/A',

                                        paymentStatus:
                                            vendorOrder
                                                .paymentStatus ||
                                            null,

                                        createdAt:
                                            vendorOrder
                                                .createdAt ||
                                            null,
                                    };
                                },
                            );

                    return {
                        orderId:
                            order._id.toString(),

                        eventName:
                            order.eventName ||
                            'N/A',

                        eventType:
                            order.eventType ||
                            'N/A',

                        guests:
                            Number(
                                order.guests ||
                                    0,
                            ),

                        eventDate:
                            order.eventDate ||
                            null,

                        eventTime:
                            order.eventTime ||
                            '',

                        eventStartDateTime:
                            order
                                .eventStartDateTime ||
                            null,

                        eventEndDateTime:
                            order
                                .eventEndDateTime ||
                            null,

                        eventDurationMinutes:
                            Number(
                                order
                                    .eventDurationMinutes ||
                                    0,
                            ),

                        totalAmount:
                            Number(
                                order
                                    .totalAmount ||
                                    0,
                            ),

                        discount:
                            Number(
                                order.discount ||
                                    0,
                            ),

                        finalAmount:
                            Number(
                                order
                                    .finalAmount ||
                                    0,
                            ),

                        status:
                            order.status ||
                            'N/A',

                        vendorBookingCount:
                            bookings.length,

                        bookings,

                        createdAt:
                            order.createdAt ||
                            null,

                        updatedAt:
                            order.updatedAt ||
                            null,
                    };
                },
            );

        // --------------------------------------------------------
        // CLIENT SUMMARY
        // --------------------------------------------------------

        const totalEvents =
            events.length;

        const totalVendorBookings =
            events.reduce(
                (
                    total: number,
                    event: any,
                ) =>
                    total +
                    event.vendorBookingCount,
                0,
            );

        const totalSpent =
            events.reduce(
                (
                    total: number,
                    event: any,
                ) =>
                    total +
                    Number(
                        event.finalAmount ||
                            0,
                    ),
                0,
            );

        const pendingEvents =
            events.filter(
                (event: any) =>
                    event.status ===
                    'pending',
            ).length;

        const confirmedEvents =
            events.filter(
                (event: any) =>
                    event.status ===
                    'confirmed',
            ).length;

        const completedEvents =
            events.filter(
                (event: any) =>
                    event.status ===
                    'completed',
            ).length;

        const cancelledEvents =
            events.filter(
                (event: any) =>
                    event.status ===
                    'cancelled',
            ).length;

        return {
            clientId:
                data._id.toString(),

            name:
                data.name?.trim?.() ||
                'N/A',

            email:
                data.email?.trim?.() ||
                'N/A',

            phoneNumber:
                data.phone_number
                    ?.trim?.() ||
                'N/A',

            address:
                data.address?.trim?.() ||
                'N/A',

            isOnline:
                Boolean(
                    data.isOnline,
                ),

            lastSeen:
                data.lastSeen ||
                null,

            totalEvents,

            totalVendorBookings,

            totalSpent,

            pendingEvents,

            confirmedEvents,

            completedEvents,

            cancelledEvents,

            events,

            createdAt:
                data.createdAt ||
                null,

            updatedAt:
                data.updatedAt ||
                null,
        };
    }
}