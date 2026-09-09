// types/admin.ts
// Shared TypeScript types for the Eventify Hub Admin Panel (Phase 22)

export type TrendDirection = "up" | "down" | "flat";

export interface AdminStat {
  key: string;
  label: string;
  value: string;
  icon: string; // name used with your icon set (e.g. Ionicons name)
  trendValue: string; // e.g. "12.5%"
  trendDirection: TrendDirection;
  accentColor?: string;
}

export interface RevenuePoint {
  label: string; // e.g. "Jan", "Mon 01"
  value: number;
}

export interface RevenueAnalytics {
  totalLabel: string; // formatted total, e.g. "Rs 2.4M"
  range: "7d" | "30d" | "12m";
  points: RevenuePoint[];
}

export interface PopularServiceItem {
  name: string;
  icon: string;
  percentage: number; // 0-100
}

export interface RecentBookingItem {
  id: string;
  bookingCode: string; // e.g. EVT-10452
  serviceName: string;
  vendorName: string;
  date: string;
  amountLabel: string;
  status: BookingStatus;
}

export type BookingStatus =
  | "PENDING"
  | "ACCEPTED"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED";

export interface AdminDashboardResponse {
  greetingName: string;
  stats: AdminStat[];
  revenue: RevenueAnalytics;
  popularServices: PopularServiceItem[];
  recentBookings: RecentBookingItem[];
}

// ---------------------------------------------------------------------------
// Phase 22.3 — Bookings
// ---------------------------------------------------------------------------

/**
 * Your backend treats a customer's overall `Order` (which can span
 * multiple vendors) separately from each vendor's individual `VendorOrder`
 * within it. Admin screens must keep this distinction visible rather than
 * flattening everything into one generic "booking".
 */
export type BookingEntityType = "ORDER" | "VENDOR_ORDER";

export interface BookingListItem {
  id: string;
  entityType: BookingEntityType;
  bookingCode: string; // e.g. EVT-10452
  serviceName: string;
  vendorName: string;
  eventDate: string;
  amountLabel: string;
  status: BookingStatus;
  vendorOrderCount?: number; // only relevant when entityType === "ORDER"
}

export interface BookingListResponse {
  items: BookingListItem[];
  nextCursor?: string | null;
}

export type BookingFilterKey =
  | "ALL"
  | "PENDING"
  | "ACCEPTED"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED";

export interface BookingTimelineStep {
  key: string;
  label: string;
  status: "done" | "current" | "upcoming";
}

export interface BookingDetails {
  id: string;
  entityType: BookingEntityType;
  bookingCode: string;
  serviceName: string;
  status: BookingStatus;

  organizer: {
    name: string;
    email: string;
    phone?: string;
  };

  vendor: {
    name: string;
    category: string;
  };

  event: {
    date: string;
    startTime: string;
    endTime: string;
  };

  payment: {
    totalLabel: string;
    downPaymentLabel: string;
    remainingLabel: string;
    downPaymentPaid: boolean;
    remainingPaid: boolean;
  };

  timeline: BookingTimelineStep[];

  // Present only when entityType === "ORDER": lets admin drill into each
  // vendor's individual sub-booking without losing the parent context.
  relatedVendorOrders?: {
    id: string;
    vendorName: string;
    serviceName: string;
    status: BookingStatus;
  }[];
}

// ---------------------------------------------------------------------------
// Phase 22.4 — Payments
// ---------------------------------------------------------------------------

export type PaymentType = "DOWN_PAYMENT" | "REMAINING" | "FULL_PAYMENT";
export type PaymentStatus = "PAID" | "PENDING" | "FAILED";
export type PaymentFilterKey = "ALL" | "PAID" | "PENDING" | "FAILED";

export interface PaymentListItem {
  id: string;
  bookingCode: string;
  serviceName: string;
  amountLabel: string;
  type: PaymentType;
  status: PaymentStatus;
  date: string;
}

export interface PaymentListResponse {
  items: PaymentListItem[];
  totalCollectedLabel: string;
  nextCursor?: string | null;
}

// ---------------------------------------------------------------------------
// Phase 22.5 — Refunds & Payouts
// ---------------------------------------------------------------------------

export type RefundStatus = "PENDING" | "PROCESSING" | "PAID" | "REJECTED";
export type RefundFilterKey = "ALL" | "PENDING" | "PROCESSING" | "PAID" | "REJECTED";

export interface RefundListItem {
  id: string;
  bookingCode: string;
  amountLabel: string;
  reason: string;
  status: RefundStatus;
  requestedAt: string;
}

export interface RefundListResponse {
  items: RefundListItem[];
  pendingCount: number;
  nextCursor?: string | null;
}

export type RefundAction = "APPROVE" | "REJECT" | "MARK_PROCESSING" | "MARK_PAID";

export type PayoutStatus = "PENDING" | "PROCESSING" | "PAID";
export type PayoutFilterKey = "ALL" | "PENDING" | "PROCESSING" | "PAID";

export interface PayoutListItem {
  id: string;
  vendorName: string;
  category: string;
  earnedLabel: string;
  commissionLabel: string;
  payoutLabel: string;
  status: PayoutStatus;
}

export interface PayoutListResponse {
  items: PayoutListItem[];
  totalPendingLabel: string;
  nextCursor?: string | null;
}

export type PayoutAction = "MARK_PROCESSING" | "MARK_PAID";

// ---------------------------------------------------------------------------
// Phase 22.6 — Disputes
// ---------------------------------------------------------------------------

export type DisputeStatus = "OPEN" | "REVIEWING" | "RESOLVED";
export type DisputeFilterKey = "ALL" | "OPEN" | "REVIEWING" | "RESOLVED";
export type DisputeRaisedBy = "ORGANIZER" | "VENDOR";

export interface DisputeListItem {
  id: string;
  bookingCode: string;
  organizerName: string;
  vendorName: string;
  issueSummary: string;
  raisedBy: DisputeRaisedBy;
  status: DisputeStatus;
}

export interface DisputeListResponse {
  items: DisputeListItem[];
  nextCursor?: string | null;
}

export interface DisputeDetails {
  id: string;
  bookingCode: string;
  organizerName: string;
  vendorName: string;
  issue: string;
  organizerStatement: string;
  vendorStatement: string;
  status: DisputeStatus;
}

export type DisputeResolution = "ORGANIZER" | "VENDOR" | "PARTIAL";

export interface DisputeResolutionInput {
  resolution: DisputeResolution;
  note?: string;
  partialAmountLabel?: string; // only relevant when resolution === "PARTIAL"
}

// ---------------------------------------------------------------------------
// Phase 22.7 — Commission
// ---------------------------------------------------------------------------

export interface TopRevenueVendor {
  name: string;
  revenueLabel: string;
}

export interface CommissionResponse {
  totalCommissionLabel: string;
  trendValue: string; // e.g. "10.4%"
  trendDirection: TrendDirection;
  bookingRevenueLabel: string;
  commissionLabel: string;
  commissionRatePercent: number; // e.g. 5
  topVendors: TopRevenueVendor[];
}

// ---------------------------------------------------------------------------
// Phase 22.8 — Analytics
// ---------------------------------------------------------------------------

export interface VendorPerformanceItem {
  name: string;
  performancePercent: number; // 0-100
}

export interface DemandInsightItem {
  label: string; // e.g. "October"
  demandPercent: number; // 0-100, relative to the highest-demand period
}

export interface AnalyticsOverview {
  revenue: RevenueAnalytics;
  popularServices: PopularServiceItem[];
  vendorPerformance: VendorPerformanceItem[];
  demandInsights: DemandInsightItem[];
}

// ---------------------------------------------------------------------------
// Category Requests
// ---------------------------------------------------------------------------

export type CategoryRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "MERGED";

export interface AdminCategoryRequest {
  _id: string;
  requestedName: string;
  normalizedName: string;
  description: string;
  status: CategoryRequestStatus;

  requestedBy?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;

  approvedCategoryId?: string | null;
  adminNote?: string | null;

  createdAt?: string;
  updatedAt?: string;
}

export type CategoryRequestReviewAction =
  | "REJECT"
  | "MERGE";

export interface ReviewCategoryRequestInput {
  action: CategoryRequestReviewAction;
  adminNote?: string;
  mergeCategoryId?: string;
}

export interface AdminCategoryOption {
  _id: string;
  name: string;
  image?: string;
  description?: string;
  businessDetailsType?: string;
  isActive?: boolean;
}