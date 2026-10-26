// Delivery/setup services retain minute-level windows. Other vendors use an hour.
export function minimumWorkingWindowMinutes(packages: any[] = []): number {
  return packages.some(pkg => pkg.isActive !== false && ['DELIVERY_BASED', 'SETUP_BASED'].includes(pkg.bookingType)) ? 1 : 60;
}
export function workingWindowMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return eh * 60 + em - sh * 60 - sm;
}
