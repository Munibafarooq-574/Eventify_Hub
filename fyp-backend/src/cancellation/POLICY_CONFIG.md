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

Step 2 stores editable policy structure only. New settings are drafts and are not consumed by current refund, vendor penalty, payment deadline or issue-reporting paths. The existing cancellation calculation bodies remain unchanged. Booking snapshots and downstream policy enforcement belong to Steps 3–8. Those steps must consume this structure in the same service, preserve existing booking terms, and enforce authenticated ownership before cancellation mutations. The UI clearly labels the settings as drafts.

No booking statuses, acceptance/reschedule logic, payments, refunds or penalty records are rewritten by this step. Fully paid restrictions, exceptional Admin resolution and completed-order issue submission are not implemented here.

## Validation and deployment

- Backend: `npm run build`
- Focused tests: `npx jest --runInBand --roots src/cancellation --runTestsByPath src/cancellation/cancellation-policy.spec.ts`
- Admin: focused ESLint and `npm run build`

After backend and Admin deployment, sign in as Admin, open Cancellation Policy, save/reload draft values, test independent tier editing and a stale-tab save. Confirm existing booking refund previews and payment deadlines remain unchanged. Verify unauthorized policy writes return 401/403. Live verification requires the deployed services; local builds do not prove Render is Live.
