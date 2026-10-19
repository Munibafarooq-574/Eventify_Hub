# Step 2: Admin-controlled policy structure

Extends the existing CancellationPolicyConfig document. There is no new collection, refund/payment model, or CancellationService. Embedded schemas describe the settings inside that same document.

## Configuration

`policySettings` contains:

- `clientRefunds.refundable`, `clientRefunds.partiallyRefundable`, `clientRefunds.nonRefundable`: independent refund tier arrays, as percentages of the amount paid.
- `vendorCausedClientRefunds`: client protection refund tiers independent of package refundability.
- `vendorPenalties`: separate penalty tiers, as percentages of the vendor booking price.
- `paymentHoldHours`: payment hold duration.
- `postServiceIssueWindowHours`: normal post-service reporting duration.

Every tier is `{ minHoursBeforeEvent, percentage }`. Arrays must contain 1–20 tiers, begin at zero hours, and have strictly increasing integer thresholds. Each range ends at the next threshold (exclusive); the final range is unbounded. Zero also covers events already started. Percentages are integers from 0–100; thresholds 0–87600 hours; durations 1–8760 hours. Independent arrays allow Admin to configure different time ranges for every policy.

Existing `penalty*` fields are retained for compatibility. Initial draft tiers use those persisted penalty values; client partial refunds use their complements. Refundable starts at 100%, Non-refundable at 0%, vendor-caused protection at 100%. Payment hold starts from a valid BOOKING_HOLD_HOURS or the existing 24-hour default. The initial 72-hour issue window is an editable draft seed, not an active rule. Initialization only writes when policySettings is absent and never overwrites saved settings.

## Admin API and UI

Admin Console → Management → Cancellation Policy (`/cancellation-policy`). The form supports all five independent tier lists, adding/removing time tiers, durations, loading/error/retry feedback and discarding edits.

GET `/cancellation/policy-config` remains compatible with the current mobile consumer. PATCH requires the existing JWT and Admin role guards. Nested DTO validation rejects nulls, missing groups, unknown fields, invalid values and invalid ranges.

Save the complete draft using `{ expectedRevision, policySettings }`. The backend atomically matches policyRevision and increments it; stale saves return 409. Mixed draft and legacy writes are rejected. The existing legacy penalty-only payload remains supported for authorized Admins.

## Deliberate activation boundary

Step 2 stores editable policy structure only. New settings are drafts and are not consumed by current refund, vendor penalty, payment deadline or issue-reporting paths. The existing cancellation calculation bodies remain unchanged. Step 3 now captures these settings for new bookings (see below). Downstream policy enforcement belongs to Steps 4–8. Those steps must consume this structure in the same service, preserve existing booking terms, and enforce authenticated ownership before cancellation mutations. The UI clearly labels the settings as drafts.

No booking statuses, acceptance/reschedule logic, payments, refunds or penalty records are rewritten by this step. Fully paid restrictions, exceptional Admin resolution and completed-order issue submission are not implemented here.

## Validation and deployment

- Backend: `npm run build`
- Focused tests: `npx jest --runInBand --roots src/cancellation --runTestsByPath src/cancellation/cancellation-policy.spec.ts`
- Admin: focused ESLint and `npm run build`

After backend and Admin deployment, sign in as Admin, open Cancellation Policy, save/reload draft values, test independent tier editing and a stale-tab save. Confirm existing booking refund previews and payment deadlines remain unchanged. Verify unauthorized policy writes return 401/403. Live verification requires the deployed services; local builds do not prove Render is Live.


## Step 3: booking policy snapshots

Every new VendorOrder now receives an embedded, server-generated `policySnapshot` in the existing order creation transaction. Normal and replacement bookings share this path. One Admin config revision is read per checkout; each vendor receives an independent deep copy. All policies are validated before any Order/VendorOrder is created.

Snapshot fields: schemaVersion (1), policyConfigId, policyRevision, capturedAt, selectedPolicy, settings. Settings reuse the Step 2 embedded schema rather than creating a duplicate configuration model. Full rules and durations are retained for the later enforcement steps.

The selected label comes from existing vendor business details, including photographer covidRefundPolicy and generic business cancellationPolicy. Common case/underscore/hyphen variations normalize to the existing three labels. Missing labels retain the existing partially refundable fallback; unknown nonempty labels reject booking rather than silently inventing terms. No new package-policy field or editor is introduced because package policy storage does not currently exist.

Frontend policy payloads are ignored. Snapshot fields are immutable in the Mongoose schema, and acceptance, payment and rescheduling do not write them. Legacy VendorOrders keep the field absent: there is no migration that retroactively assigns today's rules to old bookings. Existing cancellation calculation bodies retain their legacy behavior until Step 4 introduces snapshot-based cancellation with ownership enforcement. Payment hold and issue reporting are not activated by this step.

Admin Bookings → open a vendor booking → Saved booking policy shows the policy, saved revision, capture time and expandable saved terms. Legacy bookings display a message that no saved snapshot is available.

Local runtime verification:

1. Start updated backend and Admin app; existing local URLs can stay unchanged.
2. Make one new normal booking from the client app. Open it in Admin Bookings → Saved booking policy.
3. Record its saved revision and a percentage. Edit/save the Admin policy draft, then refresh the booking details: its saved revision and terms must stay unchanged.
4. Create another booking with a different event ID; it must capture the new revision/terms.
5. Restore any temporary policy edits. No payment or cancellation is required for this check.

Automated tests cover legacy absence, deep-copy isolation, vendor label sources, schema persistence/immutability, multi-vendor checkout, replacement checkout, forged client policy input, and invalid policy rejection before booking writes.


## Step 4: client cancellation preview and confirmation

Reuses CancellationService, Refund and VendorOrder. No duplicate service or refund collection is introduced.

Client My Events → open an event → confirmed vendor (accepted + PARTIALLY_PAID) → Cancel Booking opens a read-only review. It shows successful amount paid, saved policy/revision, notice, applicable refund percentage, refund and retained amounts. Keep Booking performs no mutation. Confirm Cancellation sends only the signed preview token and optional reason; all amounts and ownership are determined on the server.

GET `/cancellation/vendor-order/:id/calculate-refund` and PATCH `/cancellation/vendor-order/:id/organizer-cancel-confirmed` require JWT authentication. Current database user role and parent Order organizer ownership are checked. Vendor cancellation and penalty history also require the appropriate authenticated vendor ownership (Admin may view penalty history). The pending-request cancellation and generic vendor status endpoints now authenticate their actor; generic paid cancellation and event-wide status cancellation cannot bypass this review.

The client calculation uses only the immutable saved clientRefunds array selected by the saved policy label and SUCCESS Payment records belonging to that organizer/order. It never reads current Admin settings or current vendor business details. Exact fractional service hours choose the saved threshold; amounts are rounded to minor currency units. The vendor penalty tiers are independent and not used for client refunds.

Fully paid, completed, started, unassigned, unpaid/unsecured, missing/invalid snapshot, unresolved reschedule, existing refund, pending payment and inconsistent payment records cannot use normal cancellation. Legacy bookings without snapshots require Support review; they are never assigned today's rules. The Contact Support interface and vendor review flow remain separate later steps.

Eligible previews are HMAC signed, tied to organizer/booking and reviewed financial terms, and expire in five minutes. Confirm rechecks eligibility and amounts. Any changed tier, payment, service time or saved terms requires a new explicit review. Booking cancellation and the existing PENDING Refund record are written in one MongoDB transaction using snapshot read concern and majority writes. A retry of the same committed preview returns the existing result, including after token expiry, instead of creating a duplicate. A failed refund write rolls back the booking cancellation. Sibling bookings and parent composition are not rewritten. A zero refund keeps an audit record with an explanatory note; it does not represent money being returned. This step records the refund request; it does not add gateway settlement or claim a refund is already paid.

Verification (use a disposable test booking):

1. Deploy this backend commit on Render and verify Live. Pull the same mobile code and reload the app. Admin can remain local, pointed at the same Render backend.
2. Create a new booking with a saved policy, accept it as its vendor and complete the required test down payment. Use a future service date. Open Client My Events → event → that vendor → Cancel Booking.
3. Compare preview amount paid/rate/revision with the booking's saved terms in local Admin. Keep Booking must preserve the booking and create no refund.
4. Reopen and confirm once. Only that vendor must appear cancelled in booking history; siblings stay active. Local Admin refund history must show one PENDING request with the calculated amounts. Refresh/retry must not duplicate it.
5. Check Refundable, Partially refundable and Non-refundable test cases, plus legacy/completed/fully paid restrictions. A test with a pending reschedule must be blocked until resolved.

Automated checks: backend saved-policy unit tests, real-JWT HTTP guard/DTO tests and existing policy/snapshot/order regression tests. Transaction rollback tests use a session mock; they do not replace a deployed MongoDB replica-set runtime check. Mobile API tests verify authentication and the preview/confirm payload boundary. Focused mobile lint must pass; whole-project TypeScript diagnostics are compared with the pre-change baseline because the repository already contains unrelated errors.


### Cancellation history visibility

Client booking history and vendor order cards display persisted cancelledBy, cancellationReason and cancelledAt through one shared mobile presentation component. Vendor details remain visible on collapsed cancelled cards. Both cancellation statuses are classified consistently. Legacy missing actors are shown as Not recorded, missing reasons as No reason provided, and no cancellation facts are fabricated.

Admin booking details show cancellation actor/name, reason and time above the event details. Refund Management places cancellation details beside the booking, identifies the cancelling party and links directly to the canonical vendor booking ID. Booking-detail financial lookups use the ID of the loaded booking; payment history reads the existing Payment.type field while retaining the legacy paymentType display fallback. These are read/display changes and do not recreate a cancellation or refund or alter saved rules/amounts. Existing live records must be refreshed after deployment to verify the booking-detail display.


### Zero-refund Admin review

Existing zero-value Refund audit records stay reviewable. Admin closes a PENDING/PROCESSING (or legacy REJECTED) zero refund with NO_REFUND_DUE instead of claiming money was refunded or rejecting the saved-policy outcome. closedAt and closedBy identify this review; refundedAt/paidAt remain null. Positive refunds cannot use this status. Zero refunds cannot be marked PROCESSING, REFUNDED or REJECTED through the API. Closure is terminal and repeat closure is idempotent. Updates conditionally match the existing status and amount to avoid overwriting a concurrent change. Current processing zero-refund cases can be closed manually after deployment; no migration changes existing records automatically. Financial totals continue to count actual REFUNDED settlements only. Admin has a No refund due filter and a separate close action; normal positive refunds retain their processing/repayment confirmation path.

## Vendor cancellation saved-policy calculation

Vendor cancellation now reads `vendorCausedClientRefunds` and `vendorPenalties` from that booking's validated policy snapshot. It selects each tier using exact hours before the stored service start, including threshold equality. Refund applies to successful payments; penalty applies to `finalAmount ?? price`, rounded to cents. Missing/invalid snapshots require Support review rather than applying today's Admin configuration. Fully paid restrictions and existing reschedule handling remain unchanged. Existing refund and penalty records are never recalculated. Refund records retain the policy revision, configuration reference, percentage and calculation time. Payment-hold and issue-window settings remain unenforced.

## Phase 13A completion

Vendor cancellation preview and confirmation use the same saved-policy calculation for pending and accepted bookings, whether unpaid, partially paid or fully paid. Completed and no-longer-assigned bookings cannot use this flow. A pending payment must be resolved first. All vendor cancellations require a trimmed reason (1–500 characters); the generic order-status endpoint cannot bypass this review.

Cancellation, refund and vendor penalty are saved in one database transaction. The penalty ledger includes its policy revision, config reference, saved penalty tiers, calculation time and cancellation time. The event and sibling vendor bookings are preserved. After commit, client and vendor receive cancellation notifications through the existing notification service. Refund settlement continues through the existing Admin workflow; cancellation notification is not proof of repayment.

Penalty eligibility: a monetary vendor penalty applies only when the booking was accepted and SUCCESS payment records total more than zero. Pending/unaccepted requests and accepted/unpaid bookings record zero penalty (amount and percentage). Preview and confirmation share this backend rule; refund calculation and configured penalty tiers remain unchanged. Payment-status labels alone do not establish payment.
