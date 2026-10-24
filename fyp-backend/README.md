
### Booking down-payment deadlines

Existing `BOOKING_HOLD_HOURS` defaults to 24. On acceptance, an advance-payment booking snapshots the earlier of that hold limit and its canonical service start minus preparation time. Delivery bookings use their saved delivery/service window, not the parent event clock.

- `BOOKING_PAYMENT_PREPARATION_MINUTES`: platform preparation floor (default 60 minutes). The applicable vendor/day advance-notice minimum is reused when larger. Existing zero notice does not remove the platform payment-preparation floor.
- `BOOKING_MIN_PAYMENT_WINDOW_MINUTES`: minimum time the client must have to submit payment after acceptance (default 15). Acceptance is rejected when less time remains.

These environment settings are backend configuration; saved booking payment windows do not extend when settings change or acceptance is repeated. Zero-advance bookings have no down-payment hold. Remaining payment after completion is unchanged. Legacy unpaid bookings are capped by their canonical service cutoff when read, paid or expired; no direct data migration is required.

Payment submit, resolution and expiry serialize on the same booking in a MongoDB transaction. Pending or successful payments prevent automatic unpaid expiry. Pending advance verification after the preparation cutoff remains pending for Admin review and cannot be confirmed as a secured service; the current test-payment flow can reject it. Real gateway capture/refund reconciliation remains a separate integration phase.
