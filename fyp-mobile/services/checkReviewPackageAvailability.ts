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
}: ReviewAvailability): Promise<{ available: boolean; reason?: string }> {
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
    return result.find(item => item.vendorId === event.vendorId) ?? { available: false };
  }

  if (!window) return { available: false };

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
    return { available: false };
  }

  const matchingSlots = result.slots.filter(slot =>
    Date.parse(slot.startDateTime) === Date.parse(window.startDateTime) &&
    Date.parse(slot.endDateTime) === Date.parse(window.endDateTime));
  return matchingSlots.find(slot => slot.available) ?? matchingSlots[0] ?? { available: false };
}
