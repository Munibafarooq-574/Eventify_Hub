import { currencySymbol, currencyOf, roundMoney } from './currency';

function getVendorBookingAmounts(service: {
    price?: number;
    originalAmount?: number;
    discountAmount?: number;
    finalAmount?: number;
    commissionAmount?: number;
    vendorNetAmount?: number | null;
    remainingAmount?: number;
    paymentStatus?: string;
}) {
    const original = Number(service.originalAmount ?? service.price ?? service.finalAmount ?? 0);
    const total = Number(service.finalAmount ?? Math.max(0, original - Number(service.discountAmount ?? 0)));
    const discount = Number(service.discountAmount ?? Math.max(0, roundMoney(original - total)));
    const fee = Number(service.commissionAmount ?? 0);
    const savedNet = service.vendorNetAmount;

    // Legacy net snapshots may still include the discount in the earnings.
    const matchesBookingTotal = savedNet != null && roundMoney(savedNet + fee) === roundMoney(total);
    const earnings = matchesBookingTotal ? savedNet : Math.max(0, roundMoney(total - fee));
    // Before payment clears, remainingAmount can already exclude the requested advance.
    const paymentStatus = String(service.paymentStatus || "UNPAID").toUpperCase();
    const savedRemaining = Number(service.remainingAmount ?? total);
    const remaining = paymentStatus === "PAID" ? 0
        : paymentStatus === "PARTIALLY_PAID" && Number.isFinite(savedRemaining)
            ? Math.min(total, Math.max(savedRemaining, 0))
            : total;
    const paid = Math.max(0, roundMoney(total - remaining));
    return { original, discount, total, fee, earnings, remaining, paid };
}

export const displayBookingMoney = (amount: number, booking: unknown) =>
    `${currencySymbol(currencyOf(booking))} ${Number(amount).toLocaleString(
        currencyOf(booking) === "USD" ? "en-US" : "en-PK", { maximumFractionDigits: 2 },
    )}`;

export function getVendorBookingSummary(services: Parameters<typeof getVendorBookingAmounts>[0][], booking: unknown) {
    const amounts = services.map(getVendorBookingAmounts);
    const original = amounts.reduce((sum, amount) => sum + amount.original, 0);
    const discount = amounts.reduce((sum, amount) => sum + amount.discount, 0);
    const bookingTotal = amounts.reduce((sum, amount) => sum + amount.total, 0);
    const earnings = amounts.reduce((sum, amount) => sum + amount.earnings, 0);
    const platformFee = amounts.reduce((sum, amount) => sum + amount.fee, 0);
    const discountLabel = amounts.length === 1 && original > 0
        ? `${Number((discount / original * 100).toFixed(1))}% OFF`
        : `Save ${displayBookingMoney(discount, booking)}`;
    return { amounts, original, discount, bookingTotal, earnings, platformFee, discountLabel };
}
