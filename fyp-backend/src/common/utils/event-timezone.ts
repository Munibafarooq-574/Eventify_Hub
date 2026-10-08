import { BadRequestException } from '@nestjs/common';

// Interpret a calendar date and HH:mm in the event city's IANA timezone.
// Reject nonexistent and ambiguous local times (DST transitions) instead of guessing.
export function eventLocalToUtc(date: string, time: string, timeZone: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw new BadRequestException('Invalid event date or start time');
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
  } catch {
    throw new BadRequestException('Invalid event city timezone');
  }
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  if (new Date(naive).toISOString().slice(0, 16) !== date + 'T' + time) {
    throw new BadRequestException('Invalid event calendar date');
  }
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  const matches: number[] = [];
  // IANA UTC offsets range from -12 to +14 hours, including 15/30/45-minute offsets.
  for (let offset = -14 * 60; offset <= 12 * 60; offset += 15) {
    const instant = naive + offset * 60000;
    const parts = Object.fromEntries(fmt.formatToParts(new Date(instant)).map(p => [p.type, p.value]));
    if (+parts.year === year && +parts.month === month && +parts.day === day &&
        +parts.hour === hour && +parts.minute === minute) matches.push(instant);
  }
  if (matches.length !== 1) {
    throw new BadRequestException(
      matches.length ? 'Ambiguous event time due to daylight saving transition' :
        'Event time does not exist in selected city timezone',
    );
  }
  return new Date(matches[0]);
}
