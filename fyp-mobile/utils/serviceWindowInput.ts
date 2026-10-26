export type OffsetUnit = "MINUTES" | "HOURS" | "DAYS";
export type OffsetDirection = "BEFORE" | "AFTER";
export interface FriendlyOffset {
  value: string;
  unit: OffsetUnit;
  direction: OffsetDirection;
}
export const EMPTY_OFFSET: FriendlyOffset = { value: "", unit: "HOURS", direction: "BEFORE" };
export const OFFSET_UNITS: OffsetUnit[] = ["MINUTES", "HOURS", "DAYS"];
export const offsetUnitLabel = (unit: OffsetUnit) =>
  unit === "MINUTES" ? "Minutes" : unit === "HOURS" ? "Hours" : "Days";

export function offsetToMinutes(offset: FriendlyOffset): number | undefined {
  if (!offset.value.trim()) return undefined;
  const value = Number(offset.value);
  if (!Number.isFinite(value) || value < 0) return undefined;
  const minutes = value * (offset.unit === "DAYS" ? 1440 : offset.unit === "HOURS" ? 60 : 1);
  if (!Number.isSafeInteger(minutes)) return undefined;
  return minutes === 0 ? 0 : offset.direction === "BEFORE" ? -minutes : minutes;
}

export function minutesToOffset(minutes: number | undefined | null): FriendlyOffset {
  if (minutes == null || !Number.isFinite(minutes)) return { ...EMPTY_OFFSET };
  const magnitude = Math.abs(minutes);
  const unit: OffsetUnit = magnitude !== 0 && magnitude % 1440 === 0
    ? "DAYS" : magnitude % 60 === 0 ? "HOURS" : "MINUTES";
  return { value: String(magnitude / (unit === "DAYS" ? 1440 : unit === "HOURS" ? 60 : 1)),
    unit, direction: minutes < 0 ? "BEFORE" : "AFTER" };
}

export function serviceWindowError(start: number | undefined, end: number | undefined,
  duration: number | undefined): string {
  if (start === undefined || end === undefined) return "Enter both service window times.";
  if (start > end) return "Earliest time must be before the latest time.";
  if (duration !== undefined && duration > 0 && duration > end - start)
    return "Time needed must fit within the earliest and latest times.";
  return "";
}
