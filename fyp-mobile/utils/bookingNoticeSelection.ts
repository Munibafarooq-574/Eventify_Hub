// Zero means unrestricted and cannot coexist with a positive notice.
export function toggleBookingNotice(current: number[], value: number): number[] {
  if (value === 0) return current.length === 1 && current[0] === 0 ? [] : [0];
  const positive = current.filter((minutes) => minutes > 0);
  return positive.includes(value)
    ? positive.filter((minutes) => minutes !== value)
    : [...positive, value].sort((a, b) => a - b);
}
