import { formatServiceOffset, serviceWindowError } from './serviceWindowInput';

export const APPOINTMENT_TIMING_LABELS = {
  BEFORE_EVENT: 'Before Event',
  DURING_EVENT: 'During Event',
  BOTH: 'Both',
} as const;

export type AppointmentTiming = keyof typeof APPOINTMENT_TIMING_LABELS;

export function isValidDuringEventDuration(value: number | null) {
  return value === null || (Number.isSafeInteger(value) && value > 0);
}

export function beforeEventWindowError(start: number | undefined, end: number | undefined, duration: number | undefined) {
  if ((start !== undefined && (start >= 0 || start < -48 * 60)) || (end !== undefined && end > 0)) {
    return 'Choose a window starting up to 48 hours before the event and ending by event start.';
  }
  return serviceWindowError(start, end, duration);
}

export function appointmentTimingSummary(pkg: {
  appointmentTiming?: AppointmentTiming;
  duringEventDurationMinutes?: number | null;
  serviceWindowStartOffsetMinutes?: number;
  serviceWindowEndOffsetMinutes?: number;
}) {
  const timing = pkg.appointmentTiming ?? 'DURING_EVENT';
  const label = APPOINTMENT_TIMING_LABELS[timing];
  if (timing === 'DURING_EVENT' || pkg.serviceWindowStartOffsetMinutes == null || pkg.serviceWindowEndOffsetMinutes == null) return label;
  const beforeWindow = `${formatServiceOffset(pkg.serviceWindowStartOffsetMinutes)} to ${formatServiceOffset(pkg.serviceWindowEndOffsetMinutes)}`;
  const duringDuration = timing === 'BOTH' && pkg.duringEventDurationMinutes
    ? ` · During-event appointment: ${pkg.duringEventDurationMinutes} min`
    : '';
  return `${label} · ${beforeWindow}${duringDuration}`;
}
