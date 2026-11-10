import checkVendorsAvailability from "./checkVendorsAvailability";
import getTimeSlotAppointments, { type TimeSlotAppointmentResponse } from "./getTimeSlotAppointments";
import { growthApi } from "./growthApiClient";

type ReviewAvailability = Parameters<typeof getTimeSlotAppointments>[0] & {
  bookingType: string;
  replacementMode: boolean;
  window?: { startDateTime: string; endDateTime: string };
  deliveryTimeZone?: string;
};

export async function checkReviewPackageAvailability({
  bookingType, replacementMode, window, deliveryTimeZone, ...event
}: ReviewAvailability): Promise<boolean> {
  if (bookingType === "DURATION_BASED" || (bookingType === "DELIVERY_BASED" && !window)) {
    const result = await checkVendorsAvailability({
      vendorIds: [event.vendorId],
      packageId: event.packageId,
      eventCityId: event.eventCityId,
      eventDate: event.eventDate,
      startTime: event.eventStartTime,
      durationMinutes: event.eventDurationMinutes,
      replacementMode,
    });
    return result.some(item => item.vendorId === event.vendorId && item.available);
  }

  if (!window) return false;

  let result: TimeSlotAppointmentResponse;
  if (bookingType === "TIME_SLOT_BASED") {
    result = await getTimeSlotAppointments(event);
  } else if (bookingType === "SETUP_BASED") {
    result = await growthApi.post("/vendor-availability/setup-candidates", event);
  } else if (bookingType === "DELIVERY_BASED") {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: deliveryTimeZone || "UTC",
      year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(new Date(window.startDateTime));
    const date = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    result = await growthApi.post("/vendor-availability/delivery-candidates", {
      ...event, deliveryDate: `${date.year}-${date.month}-${date.day}`,
    });
  } else {
    return false;
  }

  return result.slots.some(slot => slot.available &&
    Date.parse(slot.startDateTime) === Date.parse(window.startDateTime) &&
    Date.parse(slot.endDateTime) === Date.parse(window.endDateTime));
}
