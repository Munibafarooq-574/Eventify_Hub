// fyp-backend/src/admin/admin.types.ts
export interface AdminDashboardStats {
    totalBookings: number;
    completedBookings: number;
    grossBookingValue: number;
    eventifyCommission: number;
    vendorEarnings: number;
    pendingPayouts: number;
    totalRefunds: number;
}

export interface AdminBookingRow {
    bookingId: string;
    organizerName: string;
    vendorName: string;
    eventName: string;
    eventDate: Date;
    eventTime: string;
    amount: number;
    downPayment: number;
    remaining: number;
    commission: number;
    vendorNet: number;
    bookingStatus: string;
    paymentStatus: string;
    payoutStatus: string | null;
}