// fyp-backend/src/booking-change/booking-change.types.ts
export interface BookingChangePreview {
    availabilityAvailable: boolean;
    availabilityReason?: string;
    currentPrice: number;
    requestedPrice: number;
    priceDifference: number;
    paymentAdjustment: number; // positive = organizer owes more, negative = refund due
}