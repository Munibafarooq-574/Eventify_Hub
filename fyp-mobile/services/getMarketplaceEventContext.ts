import getAllCategories from "@/services/getAllCategories";
import { getSecureData } from "@/store";

export interface MarketplaceEventContext {
  eventId?: string;
  eventCityId?: string;
  eventAddress?: string;

  eventDate?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;

  guests?: number;

  selectedServices: string[];
  categoryIds: string[];

  hasEventContext: boolean;
  hasAvailabilityContext: boolean;
}

const cleanString = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const cleaned = value.trim();

  return cleaned.length > 0
    ? cleaned
    : undefined;
};

const getDateOnly = (
  value: unknown,
): string | undefined => {
  if (!value) {
    return undefined;
  }

  const date = new Date(value as string);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString().split("T")[0];
};

const calculateEndTime = (
  eventDate?: string,
  startTime?: string,
  durationMinutes?: number,
): string | undefined => {
  if (
    !eventDate ||
    !startTime ||
    !durationMinutes ||
    durationMinutes <= 0
  ) {
    return undefined;
  }

  const [hours, minutes] = startTime
    .split(":")
    .map(Number);

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes)
  ) {
    return undefined;
  }

  const start = new Date(eventDate);

  if (Number.isNaN(start.getTime())) {
    return undefined;
  }

  start.setHours(
    hours,
    minutes,
    0,
    0,
  );

  const end = new Date(
    start.getTime() +
      durationMinutes * 60 * 1000,
  );

  return `${end
    .getHours()
    .toString()
    .padStart(2, "0")}:${end
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
};

export default async function getMarketplaceEventContext(): Promise<MarketplaceEventContext> {
  const raw =
    await getSecureData("eventDetails");

  if (!raw) {
    return {
      selectedServices: [],
      categoryIds: [],
      hasEventContext: false,
      hasAvailabilityContext: false,
    };
  }

  try {
    const parsed = JSON.parse(raw);

    const eventCityId =
      cleanString(parsed?.eventCityId);

    const eventAddress =
      cleanString(parsed?.eventAddress);

    const eventId =
      cleanString(parsed?.eventId);

    const eventDate =
      getDateOnly(parsed?.eventDate);

    const startTime =
      cleanString(parsed?.startTime);

    const rawDuration =
      Number(parsed?.durationMinutes);

    const durationMinutes =
      Number.isFinite(rawDuration) &&
      rawDuration > 0
        ? rawDuration
        : undefined;

    const rawGuests =
      Number(parsed?.guests);

    const guests =
      Number.isFinite(rawGuests) &&
      rawGuests >= 0
        ? rawGuests
        : undefined;

    const selectedServices: string[] =
  Array.isArray(parsed?.selectedServices)
    ? Array.from(
        new Set<string>(
          (parsed.selectedServices as unknown[])
            .filter(
              (
                service: unknown,
              ): service is string =>
                typeof service === "string" &&
                service.trim().length > 0,
            )
            .map((service: string) =>
              service.trim(),
            ),
        ),
      )
    : [];

    let categoryIds: string[] = [];

    if (selectedServices.length > 0) {
      const categories =
        await getAllCategories();

      const selectedNames =
        new Set(
          selectedServices.map(
            (service) =>
              service.toLowerCase(),
          ),
        );

      categoryIds = Array.from(
        new Set(
          (categories ?? [])
            .filter((category: any) =>
              selectedNames.has(
                String(
                  category?.name ?? "",
                )
                  .trim()
                  .toLowerCase(),
              ),
            )
            .map((category: any) =>
              String(
                category?._id ?? "",
              ).trim(),
            )
            .filter(Boolean),
        ),
      );
    }

    const endTime =
      calculateEndTime(
        eventDate,
        startTime,
        durationMinutes,
      );

    const hasAvailabilityContext =
      Boolean(eventDate) &&
      Boolean(startTime) &&
      Boolean(durationMinutes);

    return {
      eventId,
      eventCityId,
      eventAddress,
      eventDate,
      startTime,
      endTime,
      durationMinutes,
      guests,
      selectedServices,
      categoryIds,

      hasEventContext:
        Boolean(eventCityId) ||
        selectedServices.length > 0,

      hasAvailabilityContext,
    };
  } catch (error) {
    console.error(
      "Failed to read marketplace event context:",
      error,
    );

    return {
      selectedServices: [],
      categoryIds: [],
      hasEventContext: false,
      hasAvailabilityContext: false,
    };
  }
}