import { growthApi } from './growthApiClient';

export type TimeSlotAppointment = {
  startDateTime: string;
  endDateTime: string;
  available: boolean;
  reason?: string;
};

export type TimeSlotAppointmentResponse = {
  vendorId: string;
  packageId: string;
  durationMinutes: number;
  slots: TimeSlotAppointment[];
};

/**
 * Candidate slots are generated and availability-checked on the backend.
 * Do not compute bookable slots or prices locally.
 */
export default function getTimeSlotAppointments(payload: {
  vendorId: string;
  packageId: string;
  eventCityId: string;
  eventDate: string;
  eventStartTime: string;
  eventDurationMinutes: number;
}) {
  return growthApi.post<TimeSlotAppointmentResponse>(
    '/vendor-availability/appointment-candidates',
    payload,
  );
}
