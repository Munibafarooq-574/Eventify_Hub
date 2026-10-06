//fyp-backend/src/order/order.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import axios from 'axios';
import { Connection, Model, Types } from 'mongoose';
import { Order } from 'src/schemas/order.schema';
import { VendorOrder } from 'src/schemas/vendor-order.schema';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { User } from 'src/schemas/user.schema';
import { Notification } from 'src/schemas/notification.schema';
import { VendorAvailabilityService } from 'src/vendor-availability/vendor-availability.service';
import { PayoutService } from 'src/payout/payout.service';
import { CommissionConfig } from 'src/schemas/commission-config.schema';
import { FeatureAccessService } from 'src/vendor/growth/feature-access.service';
import { DiscountService } from 'src/vendor/growth/discount/discount.service';
import { CityService } from 'src/city/city.service';
import { Category } from 'src/schemas/category.schema';
import { RescheduleRequest } from 'src/schemas/reschedule-request.schema';
import { CreateRescheduleRequestDto, RespondRescheduleRequestDto } from './dto/reschedule-request.dto';
import { ChatService } from '../chat/chat.service';

// Phase 5 scaffold: how long a vendor's acceptance holds the slot before
// payment is required. Configurable via env, not hardcoded.
const DEFAULT_HOLD_HOURS = Number(process.env.BOOKING_HOLD_HOURS) || 24;

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,

    @InjectModel(Order.name)
    private readonly orderModel: Model<Order>,

    @InjectModel(VendorOrder.name)
    private readonly vendorOrderModel: Model<VendorOrder>,

    @InjectModel(Notification.name)
    private readonly notificationModel: Model<Notification>,

    @InjectModel(RescheduleRequest.name)
    private readonly rescheduleRequestModel: Model<RescheduleRequest>,

    @InjectModel(CommissionConfig.name)
    private readonly commissionConfigModel: Model<CommissionConfig>,

    @InjectModel(Category.name)
    private readonly categoryModel: Model<Category>,

    @InjectConnection()
    private readonly connection: Connection,

    private readonly availabilityService: VendorAvailabilityService,
    private readonly payoutService: PayoutService,
    private readonly featureAccessService: FeatureAccessService,
    private readonly cityService: CityService,
    private readonly discountService: DiscountService,
    private readonly chatService: ChatService,
) { }


            // Create a new order
    async createOrder(
    organizerId: string,
    eventDate: Date,
    eventTime: string,
    services: {
        vendorId: string;
        serviceName: string;
        price: number;
        packageId: string;
        durationMinutes?: number;
        quantity?: number;
        requiredServiceWindow?: {
            startDateTime: string;
            endDateTime: string;
        } | null;
        promotion?: {
            promotionId: string;
            promotionType: 'COUPON' | 'DISCOUNT_CODE';
            promotionCode: string;
        };
    }[],
    eventName: string,
    guests: number,
    eventType?: string,
    durationMinutes = 60,
    eventCityId?: string,
    eventAddress?: string,
    selectedCategoryIds?: string[],
    eventId?: string,
): Promise<Order> {
    // ---------------------------------------------------------
    // Phase 12 — FINAL BOOKING AUTHORITY
    // Frontend price, availability and service window are hints only.
    // No booking records are written until every validation passes.
    // ---------------------------------------------------------

    if (!Types.ObjectId.isValid(organizerId)) {
        throw new BadRequestException('Invalid organizer');
    }

    if (!eventId?.trim()) {
        throw new BadRequestException('Event ID is required');
    }

    if (!eventName?.trim()) {
        throw new BadRequestException('Event name is required');
    }

    if (
        !Number.isInteger(Number(guests)) ||
        Number(guests) <= 0
    ) {
        throw new BadRequestException(
            'Guests must be a positive whole number',
        );
    }

    if (
        !Number.isInteger(Number(durationMinutes)) ||
        Number(durationMinutes) <= 0
    ) {
        throw new BadRequestException(
            'Event duration must be a positive whole number',
        );
    }

    if (!eventCityId || !Types.ObjectId.isValid(eventCityId)) {
        throw new BadRequestException('Event city is required');
    }

    if (!eventAddress?.trim()) {
        throw new BadRequestException('Event address is required');
    }

    if (
        !Array.isArray(services) ||
        services.length === 0
    ) {
        throw new BadRequestException(
            'At least one booking service is required',
        );
    }

    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

    if (!timePattern.test(eventTime || '')) {
        throw new BadRequestException(
            'Event time must use HH:mm format',
        );
    }

    const parsedEventDate = new Date(eventDate);

    if (Number.isNaN(parsedEventDate.getTime())) {
        throw new BadRequestException('Invalid event date');
    }

    // Final backend authority for city validity.
    await this.cityService.requireActiveCity(eventCityId);

    const normalizedEventAddress =
        eventAddress.trim();

    const uniqueSelectedCategoryIds = [
        ...new Set(
            (selectedCategoryIds ?? []).map(String),
        ),
    ];

    if (uniqueSelectedCategoryIds.length === 0) {
        throw new BadRequestException(
            'At least one selected event category is required',
        );
    }

    const invalidCategoryId =
        uniqueSelectedCategoryIds.find(
            (categoryId) =>
                !Types.ObjectId.isValid(categoryId),
        );

    if (invalidCategoryId) {
        throw new BadRequestException(
            'One or more selected category IDs are invalid',
        );
    }

    const categories = await this.categoryModel
        .find({
            _id: {
                $in: uniqueSelectedCategoryIds.map(
                    (categoryId) =>
                        new Types.ObjectId(categoryId),
                ),
            },
            isActive: { $ne: false },
        })
        .select('_id name normalizedName')
        .lean();

    if (
        categories.length !==
        uniqueSelectedCategoryIds.length
    ) {
        throw new BadRequestException(
            'One or more selected categories do not exist or are inactive',
        );
    }

    const validatedSelectedCategoryIds =
        categories.map(
            (category) =>
                new Types.ObjectId(
                    category._id.toString(),
                ),
        );

    const selectedCategoryIdSet =
        new Set(
            validatedSelectedCategoryIds.map(
                (categoryId) =>
                    categoryId.toString(),
            ),
        );

    const categoryById = new Map(
        categories.map((category: any) => [
            String(category._id),
            category,
        ]),
    );

    const [h, m] =
        eventTime.split(':').map(Number);

    const eventStartDateTime =
        new Date(parsedEventDate);

    eventStartDateTime.setHours(
        h,
        m,
        0,
        0,
    );

    if (
        Number.isNaN(
            eventStartDateTime.getTime(),
        ) ||
        eventStartDateTime.getTime() <
            Date.now()
    ) {
        throw new BadRequestException(
            'Event date/time must be in the future',
        );
    }

    const eventEndDateTime =
        new Date(
            eventStartDateTime.getTime() +
                Number(durationMinutes) *
                    60000,
        );

    // Reject exact duplicate cart lines. Quantity is the authority
    // for multiple units of the same vendor/package.
    const requestKeys = new Set<string>();

    for (const service of services) {
        if (
            !Types.ObjectId.isValid(
                String(service.vendorId),
            )
        ) {
            throw new BadRequestException(
                'Invalid vendor ID',
            );
        }

        if (
            !Types.ObjectId.isValid(
                String(service.packageId),
            )
        ) {
            throw new BadRequestException(
                'Invalid package ID',
            );
        }

        const key =
            `${service.vendorId}:${service.packageId}`;

        if (requestKeys.has(key)) {
            throw new BadRequestException(
                'Duplicate vendor/package found in booking',
            );
        }

        requestKeys.add(key);
    }

    const uniqueVendorIds = [
        ...new Set(
            services.map((service) =>
                String(service.vendorId),
            ),
        ),
    ].sort();

    const eventCityObjectId =
        new Types.ObjectId(eventCityId);

    const session =
        await this.connection.startSession();

    try {
        let savedOrder: Order | undefined;

        try {
            await session.withTransaction(
                async () => {
                    // -------------------------------------------------
                    // SERIALIZE FINAL BOOKING BY VENDOR
                    // -------------------------------------------------
                    // All requests touching the same vendor write the
                    // same vendor document first. MongoDB transactions
                    // therefore cannot both pass the final overlap check
                    // from the same stale snapshot.
                    //
                    // Sorted locking also reduces multi-vendor deadlock
                    // risk when carts contain several vendors.
                    // -------------------------------------------------
                    for (
                        const vendorId
                        of uniqueVendorIds
                    ) {
                        const lockResult =
                            await this.userModel
                                .updateOne(
                                    {
                                        _id:
                                            new Types.ObjectId(
                                                vendorId,
                                            ),
                                        role: 'Vendor',
                                    },
                                    {
                                        $inc: {
                                            bookingConcurrencyVersion: 1,
                                        },
                                    },
                                    { session },
                                );

                        if (
                            lockResult.matchedCount !==
                            1
                        ) {
                            throw new NotFoundException(
                                'One or more selected vendors do not exist',
                            );
                        }
                    }

                    // Idempotency check after locks are acquired.
                    const existingOrder =
                        await this.orderModel
                            .findOne({
                                organizerId:
                                    new Types.ObjectId(
                                        organizerId,
                                    ),
                                eventId:
                                    eventId.trim(),
                            })
                            .select('_id')
                            .session(session)
                            .lean();

                    if (existingOrder) {
                        throw new ConflictException(
                            'This event has already been booked',
                        );
                    }

                    const vendors =
                        await this.userModel
                            .find({
                                _id: {
                                    $in:
                                        uniqueVendorIds.map(
                                            (vendorId) =>
                                                new Types.ObjectId(
                                                    vendorId,
                                                ),
                                        ),
                                },
                                role: 'Vendor',
                                serviceLocationCityIds:
                                    eventCityObjectId,
                            })
                            .select(
                                '_id buisnessCategory packages availabilitySettings serviceLocationCityIds',
                            )
                            .session(session)
                            .lean();

                    if (
                        vendors.length !==
                        uniqueVendorIds.length
                    ) {
                        throw new ConflictException(
                            'One or more selected vendors do not serve the event city',
                        );
                    }

                    const vendorMap =
                        new Map(
                            vendors.map(
                                (vendor: any) => [
                                    String(
                                        vendor._id,
                                    ),
                                    vendor,
                                ],
                            ),
                        );

                    // Keep existing subscription enforcement.
                    const vendorAccessResults =
                        await Promise.all(
                            uniqueVendorIds.map(
                                async (
                                    vendorId,
                                ) => ({
                                    vendorId,
                                    hasAccess:
                                        await this.featureAccessService
                                            .hasActiveSubscription(
                                                vendorId,
                                            ),
                                }),
                            ),
                        );

                    const restrictedVendor =
                        vendorAccessResults.find(
                            (result) =>
                                !result.hasAccess,
                        );

                    if (restrictedVendor) {
                        throw new ConflictException(
                            'This vendor is currently unavailable for new bookings',
                        );
                    }

                    type ValidatedService = {
                        serviceIndex: number;
                        vendorId: string;
                        packageId: string;
                        serviceName: string;
                        quantity: number;
                        unitPrice: number;
                        originalAmount: number;
                        finalAmount: number;
                        discountAmount: number;
                        promotionSnapshot?: {
                            promotionId: string;
                            promotionType:
                                | 'COUPON'
                                | 'DISCOUNT_CODE';
                            promotionCode: string;
                        };
                        startDateTime: Date;
                        endDateTime: Date;
                        maxConcurrentBookings: number;
                        existingOverlapCount: number;
                    };

                    const validatedServices:
                        ValidatedService[] = [];

                    // -------------------------------------------------
                    // ALL FINAL VALIDATIONS
                    // -------------------------------------------------
                    for (
                        const [
                            serviceIndex,
                            service,
                        ] of services.entries()
                    ) {
                        const vendor =
                            vendorMap.get(
                                String(
                                    service.vendorId,
                                ),
                            );

                        if (!vendor) {
                            throw new NotFoundException(
                                'Vendor not found',
                            );
                        }

                        const vendorCategoryId =
                            vendor.buisnessCategory
                                ?.toString();

                        if (
                            !vendorCategoryId ||
                            !selectedCategoryIdSet.has(
                                vendorCategoryId,
                            )
                        ) {
                            throw new BadRequestException(
                                'Vendor category is not valid for this event',
                            );
                        }

                        const packageDoc =
                            (
                                vendor.packages ??
                                []
                            ).find(
                                (pkg: any) =>
                                    String(
                                        pkg._id,
                                    ) ===
                                    String(
                                        service.packageId,
                                    ),
                            );

                        if (!packageDoc) {
                            throw new BadRequestException(
                                'Package does not belong to the selected vendor',
                            );
                        }

                        if (
                            packageDoc.isActive ===
                            false
                        ) {
                            throw new ConflictException(
                                'Package is no longer active',
                            );
                        }

                        const validBookingTypes =
                            new Set([
                                'DURATION_BASED',
                                'TIME_SLOT_BASED',
                                'DELIVERY_BASED',
                                'SETUP_BASED',
                                'CUSTOM',
                            ]);

                        if (
                            !validBookingTypes.has(
                                packageDoc.bookingType,
                            )
                        ) {
                            throw new BadRequestException(
                                'Package booking type is invalid',
                            );
                        }

                        const quantity =
                            service.quantity ==
                            null
                                ? 1
                                : Number(
                                      service.quantity,
                                  );

                        if (
                            !Number.isInteger(
                                quantity,
                            ) ||
                            quantity < 1
                        ) {
                            throw new BadRequestException(
                                'Quantity must be a positive whole number',
                            );
                        }

                        const selectedDurationMinutes =
                            Number(
                                service.durationMinutes,
                            ) > 0
                                ? Number(
                                      service.durationMinutes,
                                  )
                                : Number(
                                      durationMinutes,
                                  );

                        if (
                            !Number.isInteger(
                                selectedDurationMinutes,
                            ) ||
                            selectedDurationMinutes <
                                1
                        ) {
                            throw new BadRequestException(
                                'Service duration must be a positive whole number',
                            );
                        }

                        const requestedEndDateTime =
                            new Date(
                                eventStartDateTime.getTime() +
                                    selectedDurationMinutes *
                                        60000,
                            );

                        // Existing availability engine remains the
                        // single source of truth for bookingType window,
                        // working slots, blocked dates, notice and DB
                        // overlap/capacity.
                        const availability =
                            await this.availabilityService
                                .checkVendorAvailability(
                                    String(
                                        service.vendorId,
                                    ),
                                    eventStartDateTime,
                                    requestedEndDateTime,
                                    String(
                                        service.packageId,
                                    ),
                                    session,
                                );

                        if (
                            !availability.available ||
                            !availability
                                .requiredServiceWindow
                        ) {
                            throw new ConflictException(
                                availability.reason ||
                                    'Vendor is no longer available for the selected time',
                            );
                        }

                        const finalServiceStartDateTime =
                            new Date(
                                availability
                                    .requiredServiceWindow
                                    .startDateTime,
                            );

                        const finalServiceEndDateTime =
                            new Date(
                                availability
                                    .requiredServiceWindow
                                    .endDateTime,
                            );

                        if (
                            Number.isNaN(
                                finalServiceStartDateTime.getTime(),
                            ) ||
                            Number.isNaN(
                                finalServiceEndDateTime.getTime(),
                            ) ||
                            finalServiceStartDateTime >=
                                finalServiceEndDateTime
                        ) {
                            throw new BadRequestException(
                                'Required service window is invalid',
                            );
                        }

                        // Price comes from the current package document,
                        // never from service.price supplied by the client.
                        let unitPrice:
                            | number
                            | null = null;

                        if (
                            packageDoc.bookingType ===
                            'DURATION_BASED'
                        ) {
                            const durationOption =
                                (
                                    packageDoc.durations ??
                                    []
                                ).find(
                                    (
                                        duration: any,
                                    ) => {
                                        const value =
                                            Number(
                                                duration.value,
                                            );

                                        const minutes =
                                            duration.unit ===
                                            'DAYS'
                                                ? value *
                                                  1440
                                                : duration.unit ===
                                                    'HOURS'
                                                  ? value *
                                                    60
                                                  : NaN;

                                        return (
                                            minutes ===
                                            selectedDurationMinutes
                                        );
                                    },
                                );

                            if (
                                durationOption
                            ) {
                                unitPrice =
                                    Number(
                                        durationOption.price,
                                    );
                            } else if (
                                packageDoc
                                    .allowCustomDuration
                            ) {
                                const unitMinutes =
                                    packageDoc
                                        .customDurationUnit ===
                                    'DAYS'
                                        ? 1440
                                        : packageDoc
                                                .customDurationUnit ===
                                            'HOURS'
                                          ? 60
                                          : 0;

                                const customRate =
                                    Number(
                                        packageDoc
                                            .customDurationRate,
                                    );

                                if (
                                    unitMinutes <=
                                        0 ||
                                    selectedDurationMinutes %
                                        unitMinutes !==
                                        0 ||
                                    !Number.isFinite(
                                        customRate,
                                    ) ||
                                    customRate <
                                        0
                                ) {
                                    throw new BadRequestException(
                                        'Package custom duration pricing is invalid',
                                    );
                                }

                                unitPrice =
                                    (selectedDurationMinutes /
                                        unitMinutes) *
                                    customRate;
                            } else {
                                unitPrice =
                                    Number(
                                        packageDoc.price,
                                    );
                            }
                        } else {
                            unitPrice =
                                Number(
                                    packageDoc.price,
                                );
                        }

                        if (
                            !Number.isFinite(
                                unitPrice,
                            ) ||
                            Number(unitPrice) < 0
                        ) {
                            throw new BadRequestException(
                                'Package does not have a valid current price',
                            );
                        }

                        const category =
                            categoryById.get(
                                vendorCategoryId,
                            );

                        const categoryIdentity =
                            String(
                                category
                                    ?.normalizedName ??
                                    category?.name ??
                                    '',
                            ).toLowerCase();

                        const isCatering =
                            categoryIdentity.includes(
                                'catering',
                            );

                        const originalAmount =
                            Number(unitPrice) *
                            quantity *
                            (isCatering
                                ? Number(
                                      guests,
                                  )
                                : 1);

                        if (
                            !Number.isFinite(
                                originalAmount,
                            ) ||
                            originalAmount < 0
                        ) {
                            throw new BadRequestException(
                                'Calculated booking price is invalid',
                            );
                        }

                        const maxConcurrentBookings =
                            Math.max(
                                1,
                                Number(
                                    availability
                                        .maxConcurrentBookings ??
                                        1,
                                ),
                            );

                        const existingOverlapCount =
                            Math.max(
                                0,
                                Number(
                                    availability
                                        .overlapCount ??
                                        0,
                                ),
                            );

                        // Existing DB overlap is already checked by the
                        // availability service. This extra count covers
                        // multiple items inside THIS same request before
                        // any VendorOrder has been inserted.
                        const sameRequestOverlapCount =
                            validatedServices.filter(
                                (
                                    previous,
                                ) =>
                                    previous.vendorId ===
                                        String(
                                            service.vendorId,
                                        ) &&
                                    previous.startDateTime <
                                        finalServiceEndDateTime &&
                                    previous.endDateTime >
                                        finalServiceStartDateTime,
                            ).length;

                        if (
                            existingOverlapCount +
                                sameRequestOverlapCount >=
                            maxConcurrentBookings
                        ) {
                            throw new ConflictException(
                                'This vendor does not have enough remaining capacity for the selected time',
                            );
                        }

                        let finalAmount =
                            originalAmount;

                        let discountAmount = 0;

                        let promotionSnapshot:
                            | ValidatedService['promotionSnapshot']
                            | undefined;

                        if (
                            service.promotion
                        ) {
                            const validation =
                                await this.discountService
                                    .validateCoupon(
                                        String(
                                            service.vendorId,
                                        ),
                                        service
                                            .promotion
                                            .promotionCode,
                                        originalAmount,
                                        organizerId,
                                        String(
                                            service.packageId,
                                        ),
                                    );

                            if (
                                validation.discountEntryId !==
                                service.promotion
                                    .promotionId
                            ) {
                                throw new BadRequestException(
                                    'The applied promotion is no longer valid',
                                );
                            }

                            discountAmount =
                                Number(
                                    validation.discountAmount ??
                                        0,
                                );

                            finalAmount =
                                Number(
                                    validation.finalAmount,
                                );

                            if (
                                !Number.isFinite(
                                    finalAmount,
                                ) ||
                                finalAmount < 0 ||
                                !Number.isFinite(
                                    discountAmount,
                                ) ||
                                discountAmount < 0
                            ) {
                                throw new BadRequestException(
                                    'Promotion calculation is invalid',
                                );
                            }

                            promotionSnapshot =
                                {
                                    promotionId:
                                        validation.discountEntryId,
                                    promotionType:
                                        service
                                            .promotion
                                            .promotionType,
                                    promotionCode:
                                        validation.code,
                                };
                        }

                        validatedServices.push(
                            {
                                serviceIndex,
                                vendorId:
                                    String(
                                        service.vendorId,
                                    ),
                                packageId:
                                    String(
                                        service.packageId,
                                    ),
                                serviceName:
                                    String(
                                        packageDoc.packageName ??
                                            service.serviceName,
                                    ),
                                quantity,
                                unitPrice:
                                    Number(
                                        unitPrice,
                                    ),
                                originalAmount,
                                finalAmount,
                                discountAmount,
                                promotionSnapshot,
                                startDateTime:
                                    finalServiceStartDateTime,
                                endDateTime:
                                    finalServiceEndDateTime,
                                maxConcurrentBookings,
                                existingOverlapCount,
                            },
                        );
                    }

                    // -------------------------------------------------
                    // ALL VALIDATIONS PASSED — WRITES START HERE
                    // -------------------------------------------------
                    const totalAmount =
                        validatedServices.reduce(
                            (
                                sum,
                                service,
                            ) =>
                                sum +
                                service.originalAmount,
                            0,
                        );

                    const totalDiscount =
                        validatedServices.reduce(
                            (
                                sum,
                                service,
                            ) =>
                                sum +
                                service.discountAmount,
                            0,
                        );

                    const finalAmount =
                        validatedServices.reduce(
                            (
                                sum,
                                service,
                            ) =>
                                sum +
                                service.finalAmount,
                            0,
                        );

                    const [order] =
                        await this.orderModel.create(
                            [
                                {
                                    organizerId:
                                        new Types.ObjectId(
                                            organizerId,
                                        ),
                                    eventId:
                                        eventId.trim(),
                                    eventDate:
                                        parsedEventDate,
                                    eventTime,
                                    eventName:
                                        eventName.trim(),
                                    eventType,
                                    guests:
                                        Number(
                                            guests,
                                        ),
                                    eventCityId:
                                        eventCityObjectId,
                                    eventAddress:
                                        normalizedEventAddress,
                                    selectedCategoryIds:
                                        validatedSelectedCategoryIds,
                                    totalAmount,
                                    discount:
                                        totalDiscount,
                                    finalAmount,
                                    status:
                                        'pending',
                                    eventStartDateTime,
                                    eventEndDateTime,
                                    eventDurationMinutes:
                                        Number(
                                            durationMinutes,
                                        ),
                                },
                            ],
                            { session },
                        );

                    const vendorOrderIds:
                        Types.ObjectId[] = [];

                    for (
                        const validatedService
                        of validatedServices
                    ) {
                        const promotionSnapshot =
                            validatedService
                                .promotionSnapshot;

                        const [vendorOrder] =
                            await this.vendorOrderModel
                                .create(
                                    [
                                        {
                                            orderId:
                                                order._id,
                                            vendorId:
                                                new Types.ObjectId(
                                                    validatedService.vendorId,
                                                ),
                                            serviceName:
                                                validatedService.serviceName,

                                            // Existing field stays as the
                                            // server-calculated original
                                            // line amount for compatibility.
                                            price:
                                                validatedService.originalAmount,

                                            promotionId:
                                                promotionSnapshot
                                                    ? new Types.ObjectId(
                                                          promotionSnapshot
                                                              .promotionId,
                                                      )
                                                    : null,
                                            promotionType:
                                                promotionSnapshot
                                                    ?.promotionType ??
                                                null,
                                            promotionCode:
                                                promotionSnapshot
                                                    ?.promotionCode ??
                                                null,
                                            originalAmount:
                                                validatedService.originalAmount,
                                            discountAmount:
                                                validatedService.discountAmount,
                                            finalAmount:
                                                validatedService.finalAmount,
                                            packageId:
                                                validatedService.packageId,
                                            status:
                                                'pending',
                                            eventStartDateTime:
                                                validatedService.startDateTime,
                                            eventEndDateTime:
                                                validatedService.endDateTime,
                                        },
                                    ],
                                    { session },
                                );

                        vendorOrderIds.push(
                            vendorOrder._id,
                        );
                    }

                    order.vendorOrders =
                        vendorOrderIds;

                    await order.save({
                        session,
                    });

                    // Preserve existing promotion redemption behavior,
                    // but only after every booking validation and all
                    // booking records have been prepared successfully.
                    for (
                        const service
                        of validatedServices
                    ) {
                        if (
                            !service
                                .promotionSnapshot
                        ) {
                            continue;
                        }

                        await this.discountService
                            .redeemCoupon(
                                service.vendorId,
                                service
                                    .promotionSnapshot
                                    .promotionCode,
                                String(
                                    order.organizerId,
                                ),
                                String(
                                    order._id,
                                ),
                            );
                    }

                    savedOrder = order;
                },
            );
        } catch (error: any) {
            // Unique organizerId+eventId index is the final
            // race-proof idempotency backstop.
            if (error?.code === 11000) {
                throw new ConflictException(
                    'This event has already been booked',
                );
            }

            throw error;
        }

        // Notifications only after a successful transaction commit.
        try {
            for (
                const service of services
            ) {
                await this.sendPushNotification(
                    'Order',
                    'A new order has been placed',
                    service.vendorId,
                    'CREATE_ORDER',
                );
            }
        } catch (error) {
            console.log(error);
        }

        return savedOrder!;
    } finally {
        await session.endSession();
    }
    }


   async getOrders(
    type: string,
    userId: string,
    status?: string,
    limit = 10,
    skip = 0,
): Promise<any[]> {
    const userIdObj = new Types.ObjectId(userId);

    const query: any = {
        ...(status && { status }),
    };

    if (type === 'Vendor') {
        const vendorOrders = await this.vendorOrderModel.find({
            vendorId: userIdObj,
        });

        const vendorOrderIds = vendorOrders.map(order => order._id);

        query.vendorOrders = { $in: vendorOrderIds };
    } else if (type === 'Organizer') {
        query.organizerId = userIdObj;
    }

    console.log('Final query:', query);

    const orders = await this.orderModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(Number(skip))
        .limit(Number(limit))
        .populate({
    path: 'organizerId',
    select: 'name email phone_number contactDetails',
})
.populate({
    path: 'eventCityId',
    select: 'name',
})
.populate({
    path: 'selectedCategoryIds',
    select: 'name normalizedName',
})
.populate({
    path: 'vendorOrders',
    populate: {
        path: 'vendorId',
        model: 'User',
        select: `
            name
            email
            phone_number
            businessAddress
            contactDetails
            buisnessCategory
            serviceLocationCityIds
            businessCityId
            packages
        `,
        populate: [
            {
                path: 'buisnessCategory',
                model: 'Category',
                select: 'name normalizedName',
            },
            {
                path: 'serviceLocationCityIds',
                model: 'City',
                select: 'name',
            },
            {
                path: 'businessCityId',
                model: 'City',
                select: 'name',
            },
        ],
    },
})
.lean()
.exec();

       if (type === 'Vendor') {
    return orders.map((order: any) => {
        order.vendorOrders = (order.vendorOrders || [])
            .filter((vo: any) => {
                const vendorIdOnItem =
                    vo.vendorId?._id ?? vo.vendorId;

                return (
                    vendorIdOnItem?.toString() === userId
                );
            })
            .map((vo: any) => {
                const bookingAmount =
                    vo.finalAmount ?? vo.price;

                return {
                    ...vo,

                    // IMPORTANT:
                    // Use frozen booking snapshot only.
                    // Do not recalculate from vendor's current settings.
                    downPaymentType:
                        vo.downPaymentType ?? null,

                    downPaymentPercentage:
                        vo.downPaymentPercentage ?? null,

                    downPaymentAmount:
                        vo.downPaymentAmount ?? null,

                    remainingAmount:
                        vo.remainingAmount ??
                        Math.max(
                            bookingAmount -
                                Number(
                                    vo.downPaymentAmount ?? 0,
                                ),
                            0,
                        ),
                };
            });

        return order;
    });
}

    return orders;
}


async getOrderStats(type: string, userId: string) {
  console.log('📊 getOrderStats request:', { type, userId });

  if (!userId || !Types.ObjectId.isValid(userId)) {
    throw new BadRequestException(`Invalid userId: ${userId}`);
  }

  if (type !== 'Vendor' && type !== 'Organizer') {
    throw new BadRequestException(`Invalid type: ${type}`);
  }

  const userIdObj = new Types.ObjectId(userId);

  if (type === 'Vendor') {
    const vQuery = { vendorId: userIdObj };

    const [
      totalOrders,
      pending,
      processing,
      completed,
      cancelled,
    ] = await Promise.all([
      this.vendorOrderModel.countDocuments(vQuery),
      this.vendorOrderModel.countDocuments({
        ...vQuery,
        status: 'pending',
      }),
      this.vendorOrderModel.countDocuments({
        ...vQuery,
        status: 'accepted',
      }),
      this.vendorOrderModel.countDocuments({
        ...vQuery,
        status: 'completed',
      }),
      this.vendorOrderModel.countDocuments({
        ...vQuery,
        status: 'cancelled',
      }),
    ]);

    console.log('📊 Vendor order stats:', {
      totalOrders,
      pending,
      processing,
      completed,
      cancelled,
    });

    return {
      totalOrders,
      pending,
      processing,
      completed,
      cancelled,
    };
  }

  const query = {
    organizerId: userIdObj,
  };

  const [
    totalOrders,
    pending,
    processing,
    completed,
    cancelled,
  ] = await Promise.all([
    this.orderModel.countDocuments(query),
    this.orderModel.countDocuments({
      ...query,
      status: 'pending',
    }),
    this.orderModel.countDocuments({
      ...query,
      status: 'confirmed',
    }),
    this.orderModel.countDocuments({
      ...query,
      status: 'completed',
    }),
    this.orderModel.countDocuments({
      ...query,
      status: 'cancelled',
    }),
  ]);

  console.log('📊 Organizer order stats:', {
    totalOrders,
    pending,
    processing,
    completed,
    cancelled,
  });

  return {
    totalOrders,
    pending,
    processing,
    completed,
    cancelled,
  };
}


    // Update the status of an order to "completed"
    async completeOrder(orderId: string): Promise<Order> {
        const order = await this.orderModel.findById(orderId);

        if (!order) {
            throw new NotFoundException(`Order with ID ${orderId} not found`);
        }

        order.status = 'completed';
        return order.save();
    }

       async updateStatus(orderId: string, dto: UpdateOrderStatusDto) {
        const updated = await this.orderModel.findByIdAndUpdate(
            orderId,
            { status: dto.status },
            { new: true },
        );

        if (!updated) {
            throw new NotFoundException('Order not found');
        }

        // Keep VendorOrder.status in sync with Order.status so that
        // dashboard analytics (which reads from VendorOrder) reflects
        // the same state as the Order Summary screen.
        const vendorOrderStatusMap: Record<string, string> = {
            pending: 'pending',
            confirmed: 'accepted',
            completed: 'completed',
            cancelled: 'cancelled',
        };
        const mappedStatus = vendorOrderStatusMap[dto.status];
        if (mappedStatus) {
            await this.vendorOrderModel.updateMany(
                { _id: { $in: updated.vendorOrders } },
                { $set: { status: mappedStatus } },
            );
        }

        try {
            await this.sendPushNotification("Order Update", `Your order has been ${dto.status}`, updated.organizerId.toString(), "ORDER_UPDATE");
        } catch (error) {
            console.log(error);
        }
        return updated;
    }

    async updateVendorOrderStatus(
    vendorOrderId: string,
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled',
) {
    const statusMap: Record<
        'pending' | 'confirmed' | 'completed' | 'cancelled',
        'pending' | 'accepted' | 'completed' | 'cancelled'
    > = {
        pending: 'pending',
        confirmed: 'accepted',
        completed: 'completed',
        cancelled: 'cancelled',
    };

    const mappedStatus = statusMap[status];

    const vendorOrder = await this.vendorOrderModel.findByIdAndUpdate(
        vendorOrderId,
        { status: mappedStatus },
        { new: true },
    );

    if (!vendorOrder) {
        throw new NotFoundException('Vendor order not found');
    }

        // Phase 8: if vendor order is completed and fully paid,
    // automatically create the payout ledger entry.
    if (mappedStatus === 'completed') {
        try {
            if (vendorOrder.paymentStatus === 'PAID') {
                await this.payoutService.createPayoutIfEligible(
                    vendorOrderId,
                );
            }
        } catch (error) {
            console.log(
                'Payout not created yet:',
                error instanceof Error ? error.message : error,
            );
        }
    }

    // Find the parent Order
    const order = await this.orderModel.findOne({
        vendorOrders: vendorOrder._id,
    });

    if (order) {
        // Get all vendor orders belonging to this parent order
        const siblings = await this.vendorOrderModel.find({
            _id: { $in: order.vendorOrders },
        });

        const allCompleted =
            siblings.length > 0 &&
            siblings.every((vendor) => vendor.status === 'completed');

        const anyActive = siblings.some(
            (vendor) =>
                vendor.status === 'accepted' ||
                vendor.status === 'completed',
        );

        const newOrderStatus = allCompleted
            ? 'completed'
            : anyActive
                ? 'confirmed'
                : order.status;

        // Only update parent Order if its overall status actually changed
        if (newOrderStatus !== order.status) {
            await this.orderModel.findByIdAndUpdate(
                order._id,
                { status: newOrderStatus },
            );
        }
    }

    return vendorOrder;
}

    // Update vendor order status (accepted/rejected)
    async updateVendorResponse(vendorOrderId: string, status: 'accepted' | 'rejected', message?: string) {
        const vendorOrder = await this.vendorOrderModel.findById(vendorOrderId);

        if (!vendorOrder) {
            throw new NotFoundException(`Vendor Order with ID ${vendorOrderId} not found`);
        }

        vendorOrder.status = status;
        if (message) {
            vendorOrder.message = message;
        }

        if (status === 'accepted') {
    const now = new Date();

    vendorOrder.acceptedAt = now;

    vendorOrder.holdExpiresAt = new Date(
        now.getTime() + DEFAULT_HOLD_HOURS * 60 * 60000,
    );

    // ===== NEW (Phase 6): compute + snapshot down payment =====
    const vendorUser = await this.userModel
        .findById(vendorOrder.vendorId)
        .lean();

    const downPaymentConfig =
    this.getDownPaymentConfig(vendorUser);

const bookingAmount =
    Number(
        vendorOrder.finalAmount ??
        vendorOrder.price,
    );

if (
    !Number.isFinite(bookingAmount) ||
    bookingAmount < 0
) {
    throw new BadRequestException(
        'Booking amount is invalid',
    );
}

if (downPaymentConfig) {
        const configValue =
    Number(downPaymentConfig.value);

if (
    !Number.isFinite(configValue) ||
    configValue < 0
) {
    throw new BadRequestException(
        'Vendor down payment configuration is invalid',
    );
}

if (
    downPaymentConfig.type ===
        'PERCENTAGE' &&
    (
        configValue <= 0 ||
        configValue > 100
    )
) {
   throw new BadRequestException(
    'Vendor down payment percentage must be greater than 0 and cannot exceed 100',
);
}

const downPaymentAmount =
    downPaymentConfig.type ===
    'PERCENTAGE'
        ? Math.round(
              (bookingAmount *
                  configValue) /
                  100,
          )
        : configValue;

if (
    downPaymentAmount < 0 ||
    downPaymentAmount > bookingAmount
) {
    throw new BadRequestException(
        'Calculated down payment is invalid',
    );
}

        vendorOrder.downPaymentType = downPaymentConfig.type;

        vendorOrder.downPaymentPercentage =
            downPaymentConfig.type === 'PERCENTAGE'
                ? downPaymentConfig.value
                : null;
vendorOrder.downPaymentAmount =
    downPaymentAmount;

vendorOrder.remainingAmount =
    Math.max(
        bookingAmount -
            downPaymentAmount,
        0,
    );

if (downPaymentAmount === 0) {
    // Vendor requires no advance.
    // Booking is secured immediately and full amount
    // becomes remaining payment after completion.
    vendorOrder.paymentStatus =
        'PARTIALLY_PAID';

    vendorOrder.paymentDeadline = null;
}
    } else {
        // No down payment configured:
        // full booking price is treated as the required payment.
        vendorOrder.downPaymentType = 'FIXED';
        vendorOrder.downPaymentPercentage = null;
        vendorOrder.downPaymentAmount = bookingAmount;
        vendorOrder.remainingAmount = 0;
    }

    if (downPaymentConfig?.value !== 0) {
    vendorOrder.paymentStatus =
        'PAYMENT_REQUIRED';

    vendorOrder.paymentDeadline =
        vendorOrder.holdExpiresAt;
}

    // ===== Phase 13: commission snapshot =====
// Current platform commission is 0%, so vendor receives 100%.
const commissionConfig = await this.commissionConfigModel.findOne();

const commissionPercentage =
    commissionConfig?.platformCommissionPercentage ?? 0;

vendorOrder.commissionPercentageAtBooking = commissionPercentage;

vendorOrder.commissionAmount = Math.round(
    (vendorOrder.price * commissionPercentage) / 100,
);

vendorOrder.vendorNetAmount =
    vendorOrder.price - vendorOrder.commissionAmount;
}

        const saved = await vendorOrder.save();

        // Notify organizer (reuses existing notification pipeline)
        try {
            const order = await this.orderModel.findOne({ vendorOrders: vendorOrder._id });
            if (order) {
                const title = status === 'accepted' ? 'Booking request accepted' : 'Booking request rejected';
                const body = status === 'accepted'
                    ? `Your request for ${vendorOrder.serviceName} was accepted.`
                    : `Your request for ${vendorOrder.serviceName} was rejected.`;
                await this.sendPushNotification(title, body, order.organizerId.toString(), 'VENDOR_RESPONSE');
            }
        } catch (error) {
            console.log(error);
        }

        return saved;
    }

    // ===== NEW (Phase 4): organizer cancels a still-REQUESTED (pending) item =====
    async cancelVendorOrderByOrganizer(vendorOrderId: string, reason?: string) {
        const vendorOrder = await this.vendorOrderModel.findById(vendorOrderId);

        if (!vendorOrder) {
            throw new NotFoundException(`Vendor Order with ID ${vendorOrderId} not found`);
        }

        if (vendorOrder.status !== 'pending') {
            throw new ConflictException(
                'Only a requested (pending) booking can be cancelled by the organizer this way.',
            );
        }

        vendorOrder.status = 'cancelled';
        vendorOrder.cancelledBy = 'organizer';
        vendorOrder.cancelledAt = new Date();
        vendorOrder.cancellationReason = reason || null;

        const saved = await vendorOrder.save();

        try {
            await this.sendPushNotification(
                'Booking request cancelled',
                `The organizer cancelled their request for ${vendorOrder.serviceName}.`,
                vendorOrder.vendorId.toString(),
                'ORGANIZER_CANCELLED_REQUEST',
            );
        } catch (error) {
            console.log(error);
        }

        return saved;
    }

    // ===== NEW (Phase 5 scaffold): expire stale accepted-but-unpaid holds =====
    // Not wired to a cron job yet — call manually / via admin endpoint until
    // Phase 6 (payment) exists, so no currently-accepted booking is affected
    // unintentionally.
    async expireStaleHolds() {
    const now = new Date();

    const stale = await this.vendorOrderModel.find({
    status: 'accepted',
    holdExpiresAt: { $ne: null, $lt: now },

    // Only bookings whose required down payment
    // has NOT been successfully paid may expire.
    paymentStatus: {
        $in: [
            'PAYMENT_REQUIRED',
            'PAYMENT_FAILED',
        ],
    },
});

    for (const vendorOrder of stale) {
        vendorOrder.status = 'expired';
        vendorOrder.paymentStatus = 'PAYMENT_EXPIRED';

        await vendorOrder.save();

        try {
            const order = await this.orderModel.findOne({
                vendorOrders: vendorOrder._id,
            });

            if (order) {
                await this.sendPushNotification(
                    'Booking hold expired',
                    `Your accepted request for ${vendorOrder.serviceName} expired before payment.`,
                    order.organizerId.toString(),
                    'HOLD_EXPIRED',
                );
            }
        } catch (error) {
            console.log(error);
        }
    }

    return { expiredCount: stale.length };
}

    // ===== NEW (Phase 4): down payment info for vendor request details =====
    // Reuses the EXISTING per-category downPayment field — no duplicate field.
    private getDownPaymentConfig(vendorUser: any): { type: string; value: number } | null {
        const businessDetails =
            vendorUser?.photographerBusinessDetails ||
            vendorUser?.cateringBusinessDetails ||
            vendorUser?.venueBusinessDetails ||
            vendorUser?.salonBusinessDetails ||
            vendorUser?.cakeBusinessDetails ||
            vendorUser?.mehndiBusinessDetails ||
            vendorUser?.soundBusinessDetails;

        if (!businessDetails || businessDetails.downPayment == null) {
            return null;
        }

        return {
            type: businessDetails.downPaymentType || 'PERCENTAGE',
            value: businessDetails.downPayment,
        };
    }

    // Mark a vendor order as completed
async completeVendorOrder(vendorOrderId: string) {
    const vendorOrder = await this.vendorOrderModel.findById(vendorOrderId);

    if (!vendorOrder) {
        throw new NotFoundException(
            `Vendor Order with ID ${vendorOrderId} not found`,
        );
    }

    vendorOrder.status = 'completed';

    const saved = await vendorOrder.save();

    try {
        if (saved.paymentStatus === 'PAID') {
            await this.payoutService.createPayoutIfEligible(vendorOrderId);
        }
    } catch (error) {
        console.log(
            'Payout not created yet:',
            error instanceof Error ? error.message : error,
        );
    }

    return saved;
}

    // Delete an order from the database
    async deleteOrder(orderId: string): Promise<any> {
        const order = await this.orderModel.findById(orderId);
        if (!order) {
            throw new NotFoundException(`Order with ID ${orderId} not found`);
        }

        // Delete associated vendor orders
        await this.vendorOrderModel.deleteMany({ orderId });

        return this.orderModel.deleteOne({ _id: orderId });
    }

    async confirmOrderCompletion(orderId: string) {
        return this.orderModel.findByIdAndUpdate(orderId, { status: 'completed' }, { new: true });
    }

    async getOrderStatsForVendor(vendorId: string) {
        const now = new Date();
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1); // start of 6 months ago

        // Step 1: Fetch real data
        const rawStats = await this.orderModel.aggregate([
            {
                $match: {
                    createdAt: { $gte: sixMonthsAgo },
                },
            },
            {
                $lookup: {
                    from: 'vendororders', // <- make sure this matches your MongoDB collection name (plural, lowercase!)
                    localField: 'vendorOrders',
                    foreignField: '_id',
                    as: 'vendorOrderDetails',
                },
            },
            {
                $match: {
                    'vendorOrderDetails.vendorId': new Types.ObjectId(vendorId),
                },
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                    },
                    totalAmount: { $sum: '$finalAmount' },
                    orderCount: { $sum: 1 },
                },
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1 },
            },
            {
                $project: {
                    year: '$_id.year',
                    month: '$_id.month',
                    totalAmount: 1,
                    orderCount: 1,
                    _id: 0,
                },
            },
        ]);


        // Step 2: Fill in missing months
        const result = [];
        const rawMap = new Map(
            rawStats.map(stat => [`${stat.year}-${stat.month}`, stat])
        );

        for (let i = 0; i < 6; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;

            const key = `${year}-${month}`;
            const stat = rawMap.get(key);

            result.push({
                year,
                month,
                totalAmount: stat?.totalAmount || 0,
                orderCount: stat?.orderCount || 0,
            });
        }

        // ✅ RETURN THE RESULT
        return result;
    }

    async getUserPushToken(userId: string): Promise<string> {
        const user = await this.userModel.findById(userId).select('pushToken');

        if (!user) {
            throw new NotFoundException(`User with ID ${userId} not found`);
        }

        if (!user.pushToken) {
            throw new NotFoundException(`Push token not found for user ID ${userId}`);
        }

        return user.pushToken;
    }

    async sendPushNotification(title: string, body: string, userId: string, type: string) {
        const token = await this.getUserPushToken(userId);
        const message = {
            to: token,
            sound: 'default',
            title,
            body,
        };

        try {
            const response = await axios.post('https://exp.host/--/api/v2/push/send', message, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            await this.saveNotification(userId, title, body, type);
            return response.data;
        } catch (error) {
            console.error('Expo push error:', error);
            throw error;
        }
    }

    async saveNotification(userId: string, title: string, body: string, type: string) {
        const notification = new this.notificationModel({
            userId,
            title,
            body,
            type,
        });
        return await notification.save();
    }

    // =========================================================
    // Phase 13B — Client event date/time rescheduling
    // =========================================================

    async requestEventReschedule(
        orderId: string,
        requesterId: string,
        dto: CreateRescheduleRequestDto,
    ) {
        if (!Types.ObjectId.isValid(orderId) || !Types.ObjectId.isValid(requesterId)) {
            throw new BadRequestException('Invalid booking or client ID');
        }

        const order: any = await this.orderModel.findById(orderId).lean();
        if (!order) throw new NotFoundException('Booking not found');

        if (String(order.organizerId) !== String(requesterId)) {
            throw new BadRequestException('Only the booking client can request rescheduling');
        }

        if (['completed', 'cancelled'].includes(order.status)) {
            throw new ConflictException('This booking can no longer be rescheduled');
        }

        const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
        if (!timePattern.test(dto.eventTime || '')) {
            throw new BadRequestException('Event time must use HH:mm format');
        }
        if (!Number.isInteger(Number(dto.durationMinutes)) || Number(dto.durationMinutes) <= 0) {
                throw new BadRequestException('Event duration must be a positive whole number');
            }

            if (!dto.reason || !dto.reason.trim()) {
                throw new BadRequestException(
                    'Reason is required for rescheduling',
                );
            }

            const newDate = new Date(dto.eventDate);
        if (Number.isNaN(newDate.getTime())) throw new BadRequestException('Invalid event date');

        const [h, m] = dto.eventTime.split(':').map(Number);
        const newEventStart = new Date(newDate);
        newEventStart.setHours(h, m, 0, 0);
        const newEventEnd = new Date(newEventStart.getTime() + Number(dto.durationMinutes) * 60000);

        if (newEventStart.getTime() < Date.now()) {
            throw new BadRequestException('Requested event date/time must be in the future');
        }

        const oldEventStart = order.eventStartDateTime
            ? new Date(order.eventStartDateTime)
            : new Date(order.eventDate);
        const oldEventEnd = order.eventEndDateTime
            ? new Date(order.eventEndDateTime)
            : new Date(oldEventStart.getTime() + Number(order.eventDurationMinutes || 60) * 60000);

        if (
            oldEventStart.getTime() === newEventStart.getTime() &&
            oldEventEnd.getTime() === newEventEnd.getTime()
        ) {
            throw new BadRequestException('Requested date/time is unchanged');
        }

        const vendorOrders: any[] = await this.vendorOrderModel.find({
            _id: { $in: order.vendorOrders || [] },
            status: { $in: ['pending', 'accepted'] },
        }).lean();

        if (!vendorOrders.length) {
            throw new ConflictException('No active vendor bookings can be rescheduled');
        }

        const existing = await this.rescheduleRequestModel.findOne({
            orderId: order._id,
            status: 'CHANGE_REQUESTED',
        }).lean();

        if (existing) {
            throw new ConflictException('A rescheduling request is already pending for this booking');
        }

        const expiresAt = new Date(Date.now() + DEFAULT_HOLD_HOURS * 60 * 60 * 1000);
        const created: any[] = [];
        const requestGroupId = new Types.ObjectId();

        for (const vendorOrder of vendorOrders) {
            const availability = await this.availabilityService.checkVendorAvailability(
                String(vendorOrder.vendorId),
                newEventStart,
                newEventEnd,
                vendorOrder.packageId || undefined,
                undefined,
                String(vendorOrder._id),
            );

            const vendor: any = await this.userModel
                .findById(vendorOrder.vendorId)
                .select('packages')
                .lean();

            const pkg = (vendor?.packages || []).find(
                (p: any) => String(p._id) === String(vendorOrder.packageId),
            );

            const request = await this.rescheduleRequestModel.create({
                requestGroupId,
                bookingId: order._id,
                orderId: order._id,
                eventId: order.eventId || String(order._id),
                vendorOrderId: vendorOrder._id,
                vendorId: vendorOrder.vendorId,
                requestedBy: new Types.ObjectId(requesterId),
                bookingType: pkg?.bookingType || null,
                oldEventDate: order.eventDate,
                oldStartTime: order.eventTime,
                oldEndTime: oldEventEnd,
                newEventDate: newDate,
                newStartTime: dto.eventTime,
                newEndTime: newEventEnd,
                oldServiceStartDateTime: vendorOrder.eventStartDateTime || null,
                oldServiceEndDateTime: vendorOrder.eventEndDateTime || null,
                newServiceStartDateTime: availability.requiredServiceWindow?.startDateTime || null,
                newServiceEndDateTime: availability.requiredServiceWindow?.endDateTime || null,
                reason: dto.reason.trim(),
                availabilityPrecheckPassed: availability.available,
                availabilityPrecheckReason: availability.reason || null,
                status: 'CHANGE_REQUESTED',
                expiresAt,
            });

            created.push(request);

            try {
                const chatId = await this.chatService.createOrGetConversation(
                    requesterId,
                    String(vendorOrder.vendorId),
                );
                await this.chatService.createMessage(
                    chatId,
                    requesterId,
                    String(vendorOrder.vendorId),
                    `Rescheduling requested: ${dto.eventDate} at ${dto.eventTime}. Please review the booking rescheduling request.`,
                );
            } catch (error) {
                console.log('Reschedule chat message failed:', error instanceof Error ? error.message : error);
            }

            try {
                await this.sendPushNotification(
                    'Rescheduling request',
                    'A client requested a new event date/time. Please review the request.',
                    String(vendorOrder.vendorId),
                    'RESCHEDULE_REQUESTED',
                );
            } catch (error) {
                // Notification delivery must never roll back the request.
                console.log('Reschedule push notification failed:', error instanceof Error ? error.message : error);
                try {
                    await this.saveNotification(
                        String(vendorOrder.vendorId),
                        'Rescheduling request',
                        'A client requested a new event date/time. Please review the request.',
                        'RESCHEDULE_REQUESTED',
                    );
                } catch {}
            }
        }

        return {
            orderId: order._id,
            eventId: order.eventId,
            requests: created,
        };
    }

    async getRescheduleRequests(userId: string, role: string, orderId?: string) {
        const normalizedRole = String(role || '').trim().toLowerCase();
        const filter: any = {};

        if (orderId) {
            if (!Types.ObjectId.isValid(orderId)) throw new BadRequestException('Invalid booking ID');
            filter.orderId = new Types.ObjectId(orderId);
        }

        if (normalizedRole === 'vendor') {
            filter.vendorId = new Types.ObjectId(userId);
        } else if (normalizedRole === 'client' || normalizedRole === 'organizer') {
            filter.requestedBy = new Types.ObjectId(userId);
        } else {
            throw new BadRequestException('Unsupported account role');
        }

        await this.expireRescheduleRequests();
        return this.rescheduleRequestModel.find(filter).sort({ createdAt: -1 }).lean();
    }

    async respondToRescheduleRequest(
        requestId: string,
        vendorId: string,
        dto: RespondRescheduleRequestDto,
    ) {
        if (!Types.ObjectId.isValid(requestId) || !Types.ObjectId.isValid(vendorId)) {
            throw new BadRequestException('Invalid request or vendor ID');
        }

        await this.expireRescheduleRequests();

        const request: any = await this.rescheduleRequestModel.findById(requestId);
        if (!request) throw new NotFoundException('Rescheduling request not found');

        if (String(request.vendorId) !== String(vendorId)) {
            throw new BadRequestException('This rescheduling request belongs to another vendor');
        }

        if (request.status !== 'CHANGE_REQUESTED') {
            throw new ConflictException('This rescheduling request has already been resolved');
        }

        if (dto.status === 'ACCEPTED') {
            const vendorOrder: any = await this.vendorOrderModel.findById(request.vendorOrderId).lean();
            if (!vendorOrder || !['pending', 'accepted'].includes(vendorOrder.status)) {
                throw new ConflictException('Vendor booking is no longer active');
            }

            const requestedStart = new Date(request.newEventDate);
            const [rh, rm] = String(request.newStartTime).split(':').map(Number);
            requestedStart.setHours(rh, rm, 0, 0);

            const availability = await this.availabilityService.checkVendorAvailability(
                String(request.vendorId),
                requestedStart,
                new Date(request.newEndTime),
                vendorOrder.packageId || undefined,
                undefined,
                String(vendorOrder._id),
            );

            if (!availability.available) {
                throw new ConflictException(
                    availability.reason || 'Vendor is no longer available for the requested time',
                );
            }

            request.newServiceStartDateTime =
                availability.requiredServiceWindow?.startDateTime || request.newServiceStartDateTime;
            request.newServiceEndDateTime =
                availability.requiredServiceWindow?.endDateTime || request.newServiceEndDateTime;
        }

        request.status = dto.status;
        request.respondedAt = new Date();
        request.responseMessage = dto.message?.trim() || null;
        await request.save();

        const order: any = await this.orderModel.findById(request.orderId).lean();

        if (dto.status === 'ACCEPTED') {
            await this.applyRescheduleIfAllAccepted(String(request.orderId));
        }

        if (order) {
            try {
                const chatId = await this.chatService.createOrGetConversation(
                    String(order.organizerId),
                    String(request.vendorId),
                );
                await this.chatService.createMessage(
                    chatId,
                    String(request.vendorId),
                    String(order.organizerId),
                    dto.status === 'ACCEPTED'
                        ? 'Rescheduling request accepted.'
                        : 'Rescheduling request rejected. The original booking remains unchanged.',
                );
            } catch (error) {
                console.log('Reschedule response chat message failed:', error instanceof Error ? error.message : error);
            }

            try {
                await this.sendPushNotification(
                    dto.status === 'ACCEPTED' ? 'Reschedule accepted' : 'Reschedule rejected',
                    dto.status === 'ACCEPTED'
                        ? 'A vendor accepted your requested event date/time.'
                        : 'A vendor rejected your requested event date/time. Your original booking remains unchanged.',
                    String(order.organizerId),
                    dto.status === 'ACCEPTED' ? 'RESCHEDULE_ACCEPTED' : 'RESCHEDULE_REJECTED',
                );
            } catch (error) {
                try {
                    await this.saveNotification(
                        String(order.organizerId),
                        dto.status === 'ACCEPTED' ? 'Reschedule accepted' : 'Reschedule rejected',
                        dto.status === 'ACCEPTED'
                            ? 'A vendor accepted your requested event date/time.'
                            : 'A vendor rejected your requested event date/time. Your original booking remains unchanged.',
                        dto.status === 'ACCEPTED' ? 'RESCHEDULE_ACCEPTED' : 'RESCHEDULE_REJECTED',
                    );
                } catch {}
            }
        }

        return request;
    }

    private async applyRescheduleIfAllAccepted(orderId: string) {
        const latest: any = await this.rescheduleRequestModel
            .findOne({ orderId: new Types.ObjectId(orderId) })
            .sort({ createdAt: -1 })
            .lean();

        if (!latest) return { applied: false };

        const batch: any[] = await this.rescheduleRequestModel
            .find({ requestGroupId: latest.requestGroupId })
            .lean();

        if (!batch.length || batch.some((r: any) => r.status !== 'ACCEPTED')) {
            return { applied: false };
        }

        const session = await this.connection.startSession();
        try {
            await session.withTransaction(async () => {
                const order: any = await this.orderModel.findById(orderId).session(session);
                if (!order) throw new NotFoundException('Booking not found');

                const vendorOrders: any[] = [];
                for (const req of batch) {
                    const vo: any = await this.vendorOrderModel.findById(req.vendorOrderId).session(session);
                    if (!vo || !['pending', 'accepted'].includes(vo.status)) {
                        throw new ConflictException('A vendor booking is no longer active');
                    }
                    vendorOrders.push(vo);
                }

                const vendorIds = [...new Set(batch.map((r: any) => String(r.vendorId)))].sort();
                for (const id of vendorIds) {
                    await this.userModel.updateOne(
                        { _id: new Types.ObjectId(id), role: 'Vendor' },
                        { $inc: { bookingConcurrencyVersion: 1 } },
                        { session },
                    );
                }

                for (let i = 0; i < batch.length; i++) {
                    const req: any = batch[i];
                    const vo: any = vendorOrders[i];

                    const requestedStart = new Date(req.newEventDate);
                    const [rh, rm] = String(req.newStartTime).split(':').map(Number);
                    requestedStart.setHours(rh, rm, 0, 0);

                    const availability = await this.availabilityService.checkVendorAvailability(
                        String(req.vendorId),
                        requestedStart,
                        new Date(req.newEndTime),
                        vo.packageId || undefined,
                        session,
                        String(vo._id),
                    );

                    if (!availability.available) {
                        throw new ConflictException(
                            availability.reason || 'Final rescheduling availability validation failed',
                        );
                    }

                    vo.eventStartDateTime =
                        availability.requiredServiceWindow?.startDateTime || req.newServiceStartDateTime;
                    vo.eventEndDateTime =
                        availability.requiredServiceWindow?.endDateTime || req.newServiceEndDateTime;
                    await vo.save({ session });

                    await this.rescheduleRequestModel.updateOne(
                        { _id: req._id },
                        {
                            $set: {
                                newServiceStartDateTime: vo.eventStartDateTime,
                                newServiceEndDateTime: vo.eventEndDateTime,
                                appliedAt: new Date(),
                            },
                        },
                        { session },
                    );
                }

                const first: any = batch[0];
                const newStart = new Date(first.newEventDate);
                const [nh, nm] = String(first.newStartTime).split(':').map(Number);
                newStart.setHours(nh, nm, 0, 0);

                order.eventDate = new Date(first.newEventDate);
                order.eventTime = first.newStartTime;
                order.eventStartDateTime = newStart;
                order.eventEndDateTime = new Date(first.newEndTime);
                order.eventDurationMinutes =
                    Math.round((new Date(first.newEndTime).getTime() - newStart.getTime()) / 60000);
                await order.save({ session });
            });
        } finally {
            await session.endSession();
        }

        return { applied: true };
    }

    async expireRescheduleRequests() {
        const now = new Date();
        const result = await this.rescheduleRequestModel.updateMany(
            { status: 'CHANGE_REQUESTED', expiresAt: { $lt: now } },
            { $set: { status: 'EXPIRED', respondedAt: now } },
        );
        return { expiredCount: result.modifiedCount };
    }

}