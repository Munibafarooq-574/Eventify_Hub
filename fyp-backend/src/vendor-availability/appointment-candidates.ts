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

export const APPOINTMENT_TIMINGS = ['BEFORE_EVENT', 'DURING_EVENT', 'BOTH'] as const;
export type AppointmentTiming = typeof APPOINTMENT_TIMINGS[number];
export const MAX_APPOINTMENT_LOOKBACK_MINUTES = 48 * 60;

type AppointmentConfig = {
  appointmentTiming?: AppointmentTiming;
  duringEventDurationMinutes?: number | null;
  requiredServiceDurationMinutes?: number;
  serviceWindowStartOffsetMinutes?: number;
  serviceWindowEndOffsetMinutes?: number;
};

export function appointmentConfigurationError(config: AppointmentConfig): string | undefined {
  const duration = config.requiredServiceDurationMinutes;
  if (duration === undefined || !Number.isSafeInteger(duration) || duration <= 0) {
    return 'Enter a positive whole number of minutes for the appointment duration.';
  }
  const timing = config.appointmentTiming ?? 'DURING_EVENT';
  if (!APPOINTMENT_TIMINGS.includes(timing)) return 'Choose when the appointment can take place.';
  const duringDuration = config.duringEventDurationMinutes;
  if (timing === 'BOTH' && duringDuration != null && (!Number.isSafeInteger(duringDuration) || duringDuration <= 0)) {
    return 'Enter a positive whole number of minutes for the during-event appointment.';
  }
  if (timing === 'DURING_EVENT') return;

  const start = config.serviceWindowStartOffsetMinutes;
  const end = config.serviceWindowEndOffsetMinutes;
  if (start === undefined || end === undefined || !Number.isSafeInteger(start) || !Number.isSafeInteger(end)
      || start >= 0 || end > 0 || start < -MAX_APPOINTMENT_LOOKBACK_MINUTES) {
    return 'Enter a before-event appointment window starting up to 48 hours before the event.';
  }
  if (end - start < duration) return 'The appointment duration must fit within the before-event window.';
}

export function appointmentWindows(config: AppointmentConfig, eventStart: Date, eventEnd: Date) {
  const error = appointmentConfigurationError(config);
  if (error) throw new RangeError(error);
  const timing = config.appointmentTiming ?? 'DURING_EVENT';
  const start = eventStart.getTime();
  const windows: { timing: Exclude<AppointmentTiming, 'BOTH'>; start: Date; end: Date; duration: number }[] = [];
  if (timing !== 'DURING_EVENT') {
    windows.push({
      timing: 'BEFORE_EVENT',
      duration: config.requiredServiceDurationMinutes!,
      start: new Date(start + config.serviceWindowStartOffsetMinutes! * 60_000),
      end: new Date(start + config.serviceWindowEndOffsetMinutes! * 60_000),
    });
  }
  if (timing !== 'BEFORE_EVENT') windows.push({
    timing: 'DURING_EVENT',
    start: eventStart,
    end: eventEnd,
    duration: (timing === 'BOTH' ? config.duringEventDurationMinutes : undefined) ?? config.requiredServiceDurationMinutes!,
  });
  return windows;
}

export function packageAppointmentCandidates(config: AppointmentConfig, eventStart: Date, eventEnd: Date) {
  return appointmentWindows(config, eventStart, eventEnd).flatMap(window =>
    buildAppointmentCandidates(window.start, window.end, window.duration)
      .map(candidate => ({ ...candidate, timing: window.timing })),
  );
}

export function isAppointmentInAllowedWindow(
  config: AppointmentConfig,
  eventStart: Date,
  eventEnd: Date,
  selectedStart: Date,
  selectedEnd: Date,
): boolean {
  if (appointmentConfigurationError(config)) return false;
  return appointmentWindows(config, eventStart, eventEnd)
    .some(window => selectedStart >= window.start && selectedEnd <= window.end &&
      selectedEnd.getTime() - selectedStart.getTime() === window.duration * 60_000);
}
