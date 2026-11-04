import type { Types } from 'mongoose';

export const BOOKING_DRAFT_COLLECTION = 'bookingdrafts';

export type BookingDraft = {
    _id: Types.ObjectId;
    countryCode: string;
    revision: number;
    eventDetails: Record<string, unknown> | null;
    cartData: Record<string, unknown> | null;
};
