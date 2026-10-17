import { readFileSync } from 'fs';
import { eventLocalToUtc } from './event-timezone';

// Exercise the runtime's complete IANA timezone set without maintaining a
// second timezone database in the application.
const runtimeZones = (Intl as typeof Intl & { supportedValuesOf(key: string): string[] })
  .supportedValuesOf('timeZone');
// Optional IANA zone.tab adds country/territory aliases on audit runs.
// Normal tests remain portable on Windows and require no external dataset.
const countryRows = process.env.TIMEZONE_COVERAGE_ZONE_TAB
  ? readFileSync(process.env.TIMEZONE_COVERAGE_ZONE_TAB, 'utf8').split('\n')
      .filter(line => line && !line.startsWith('#')).map(line => line.split('\t'))
  : [];
const zones = [...new Set([...runtimeZones, ...countryRows.map(row => row[2]), 'UTC', 'Etc/GMT+12', 'Etc/GMT-14'])];
const formatters = new Map<string, Intl.DateTimeFormat>();
function localParts(instant: number, zone: string) {
  let formatter = formatters.get(zone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    });
    formatters.set(zone, formatter);
  }
  const parts = Object.fromEntries(formatter.formatToParts(new Date(instant)).map(part => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}
function offsetMinutes(instant: number, zone: string) {
  const local = localParts(instant, zone);
  return (Date.parse(`${local.date}T${local.time}:00Z`) - instant) / 60000;
}

describe('worldwide event timezone coverage', () => {
  jest.setTimeout(180000);
  it('round-trips all IANA zones through every month of 2026 and 2027, including date boundaries', () => {
    let cases = 0;
    for (const zone of zones) {
      for (const year of [2026, 2027]) {
        for (let month = 0; month < 12; month++) {
          for (const [hour, minute] of [[0, 15], [12, 30], [23, 45]]) {
            const utc = Date.UTC(year, month, 15, hour, minute);
            const local = localParts(utc, zone);
            const actual = eventLocalToUtc(local.date, local.time, zone).getTime();
            if (actual !== utc) throw new Error(`${zone}: ${local.date} ${local.time} did not round-trip`);
            cases++;
          }
        }
      }
    }
    console.log(`Worldwide round trips: ${zones.length} timezones, ${cases} cases, ${new Set(countryRows.map(row => row[0])).size} country/territory codes from optional IANA table`);
  });

  it('rejects skipped/repeated local times at every detected timezone transition in 2026 and 2027', () => {
    let transitions = 0;
    for (const zone of zones) {
      let previous = Date.UTC(2025, 11, 31, 12);
      let previousOffset = offsetMinutes(previous, zone);
      for (let current = previous + 86400000; current <= Date.UTC(2027, 11, 31, 12); current += 86400000) {
        const currentOffset = offsetMinutes(current, zone);
        if (currentOffset !== previousOffset) {
          let low = previous / 60000;
          let high = current / 60000;
          while (high - low > 1) {
            const middle = Math.floor((low + high) / 2);
            if (offsetMinutes(middle * 60000, zone) === previousOffset) low = middle;
            else high = middle;
          }
          const transition = high * 60000;
          const first = transition + Math.min(previousOffset, currentOffset) * 60000;
          const width = Math.abs(currentOffset - previousOffset);
          const invalidLocal = new Date(first + Math.floor(width / 2) * 60000).toISOString();
          expect(() => eventLocalToUtc(invalidLocal.slice(0, 10), invalidLocal.slice(11, 16), zone))
            .toThrow(currentOffset > previousOffset ? 'does not exist' : 'Ambiguous');
          for (const utc of [transition - (width + 60) * 60000, transition + (width + 60) * 60000]) {
            const local = localParts(utc, zone);
            expect(eventLocalToUtc(local.date, local.time, zone).getTime()).toBe(utc);
          }
          transitions++;
        }
        previous = current;
        previousOffset = currentOffset;
      }
    }
    expect(transitions).toBeGreaterThan(0);
    console.log(`Worldwide clock transitions checked: ${transitions}`);
  });

  it.each([
    ['Pacific/Kiritimati', '2026-11-09', '00:15', '2026-11-08T10:15:00.000Z'],
    ['Etc/GMT+12', '2026-11-09', '23:45', '2026-11-10T11:45:00.000Z'],
    ['Asia/Kathmandu', '2026-11-09', '13:00', '2026-11-09T07:15:00.000Z'],
    ['Pacific/Chatham', '2026-11-09', '13:00', '2026-11-08T23:15:00.000Z'],
    ['Australia/Eucla', '2026-11-09', '13:00', '2026-11-09T04:15:00.000Z'],
    ['America/St_Johns', '2026-11-09', '13:00', '2026-11-09T16:30:00.000Z'],
  ])('handles offset/date boundary %s', (zone, date, time, utc) => {
    expect(eventLocalToUtc(date, time, zone).toISOString()).toBe(utc);
  });
});
