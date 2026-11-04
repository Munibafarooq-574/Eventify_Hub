import {
    BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, Patch, Req, UseGuards,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { isClientRole, MarketplaceGuard, MarketplaceScope } from '../city/marketplace.guard';
import { BOOKING_DRAFT_COLLECTION, BookingDraft } from './booking-draft';

type ActorRequest = { user: { id: string; role: string }; marketplace?: MarketplaceScope };

@Controller('booking-draft')
@UseGuards(JwtAuthGuard, MarketplaceGuard)
export class BookingDraftController {
    constructor(@InjectConnection() private readonly connection: Connection) {}

    private scope(request: ActorRequest) {
        if (!isClientRole(request.user.role) || !request.marketplace) {
            throw new ForbiddenException('Only clients can access booking drafts.');
        }
        return request.marketplace;
    }

    private snapshot(draft: BookingDraft | null, countryCode: string) {
        const visible = draft?.countryCode === countryCode ? draft : null;
        return {
            revision: draft?.revision ?? 0,
            cartData: visible?.cartData ?? null,
            eventDetails: visible?.eventDetails ?? null,
        };
    }

    @Get()
    async getDraft(@Req() request: ActorRequest) {
        const { countryCode } = this.scope(request);
        const draft = await this.connection.db!.collection<BookingDraft>(BOOKING_DRAFT_COLLECTION)
            .findOne({ _id: new Types.ObjectId(request.user.id) });
        return this.snapshot(draft, countryCode);
    }

    @Patch()
    async updateDraft(
        @Req() request: ActorRequest,
        @Body() body: { key?: string; value?: unknown; revision?: number },
    ) {
        const { countryCode, businessCityIds } = this.scope(request);
        const { key, value, revision } = body ?? {};
        if ((key !== 'cartData' && key !== 'eventDetails') || !Number.isSafeInteger(revision) ||
            revision! < 0 || (value !== null && (!value || typeof value !== 'object' || Array.isArray(value)))) {
            throw new BadRequestException('Invalid booking draft update.');
        }
        if (Buffer.byteLength(JSON.stringify(value)) > 256 * 1024) {
            throw new BadRequestException('This booking draft is too large.');
        }

        const owner = new Types.ObjectId(request.user.id);
        const drafts = this.connection.db!.collection<BookingDraft>(BOOKING_DRAFT_COLLECTION);
        const current = await drafts.findOne({ _id: owner });
        const prior = this.snapshot(current, countryCode);
        if (prior.revision !== revision) this.conflict();
        const next = { ...prior, [key]: value as Record<string, unknown> | null };

        if (key === 'eventDetails') {
            if (value !== null) {
                const event = next.eventDetails!;
                if (typeof event.eventId !== 'string' || !event.eventId.trim() ||
                    !businessCityIds.some(cityId => String(cityId) === event.eventCityId)) {
                    throw new BadRequestException('Choose an event city in your marketplace country.');
                }
                if (!event.replacementMode && !event.replacementVendorOrderId &&
                    await this.connection.db!.collection('orders').findOne(
                        { organizerId: owner, eventId: event.eventId }, { projection: { _id: 1 } },
                    )) {
                    throw new ConflictException('This event has already been booked.');
                }
            }
            if (prior.eventDetails?.eventId !== next.eventDetails?.eventId) next.cartData = null;
        } else if (value !== null) {
            const entries = next.cartData!.vendors;
            if (!Array.isArray(entries) || (entries.length && !businessCityIds.some(cityId =>
                String(cityId) === next.eventDetails?.eventCityId))) {
                throw new BadRequestException('Choose an event before adding packages.');
            }
            const ids = [...new Set(entries.map(entry => String(entry?.vendorId || entry?.vendor?._id || '')))];
            if (ids.some(id => !Types.ObjectId.isValid(id)) || (ids.length && await this.connection.db!.collection('users')
                .countDocuments({
                    _id: { $in: ids.map(id => new Types.ObjectId(id)) },
                    role: 'Vendor',
                    businessCityId: { $in: businessCityIds },
                    serviceLocationCityIds: new Types.ObjectId(String(next.eventDetails!.eventCityId)),
                }) !== ids.length)) {
                throw new ForbiddenException('Choose vendors that serve your event city.');
            }
            for (const entry of entries) {
                if (!Array.isArray(entry.packages) || entry.packages.some((pkg: any) =>
                    pkg?.eventId && pkg.eventId !== next.eventDetails?.eventId)) {
                    throw new BadRequestException('The selected packages belong to a different event.');
                }
            }
        }

        const updated = {
            _id: owner, countryCode, revision: prior.revision + 1,
            cartData: next.cartData, eventDetails: next.eventDetails,
        };
        if (!current) {
            try { await drafts.insertOne(updated); }
            catch (error) {
                if ((error as { code?: number }).code === 11000) this.conflict();
                throw error;
            }
        } else {
            const result = await drafts.replaceOne({ _id: owner, revision: prior.revision }, updated);
            if (!result.matchedCount) this.conflict();
        }
        return this.snapshot(updated, countryCode);
    }

    private conflict(): never {
        throw new ConflictException('Your booking draft changed on another screen or device. Refresh and try again.');
    }
}
