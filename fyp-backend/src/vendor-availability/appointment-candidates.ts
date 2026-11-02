/**
 * Candidate appointment windows within an event.
 * These are NOT availability confirmations: each candidate must be checked
 * through VendorAvailabilityService.checkVendorAvailability before display
 * and again during order creation.
 */
export function buildAppointmentCandidates(
  eventStart: Date,
  eventEnd: Date,
  serviceDurationMinutes: number,
  stepMinutes = 30,
): Array<{ startDateTime: Date; endDateTime: Date }> {
  const start = eventStart.getTime();
  const end = eventEnd.getTime();
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end <= start ||
    !Number.isSafeInteger(serviceDurationMinutes) ||
    serviceDurationMinutes <= 0 ||
    !Number.isSafeInteger(stepMinutes) ||
    stepMinutes <= 0
  ) {
    throw new RangeError('Invalid event window or appointment duration');
  }
  const durationMs = serviceDurationMinutes * 60_000;
  const stepMs = stepMinutes * 60_000;
  const candidates: Array<{ startDateTime: Date; endDateTime: Date }> = [];
  for (let cursor = start; cursor + durationMs <= end; cursor += stepMs) {
    candidates.push({
      startDateTime: new Date(cursor),
      endDateTime: new Date(cursor + durationMs),
    });
    if (candidates.length > 200) {
      throw new RangeError('Too many appointment candidates');
    }
  }
  return candidates;
}
