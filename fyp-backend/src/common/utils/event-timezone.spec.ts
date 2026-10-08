import { BadRequestException } from '@nestjs/common';
import { eventLocalToUtc } from './event-timezone';

describe('eventLocalToUtc', () => {
  it('converts Islamabad local time to UTC', () => {
    expect(eventLocalToUtc('2026-10-23', '17:00', 'Asia/Karachi').toISOString())
      .toBe('2026-10-23T12:00:00.000Z');
  });

  it('handles non-whole-hour offsets', () => {
    expect(eventLocalToUtc('2026-10-23', '17:00', 'Asia/Kathmandu').toISOString())
      .toBe('2026-10-23T11:15:00.000Z');
  });

  it('handles New York daylight saving time', () => {
    expect(eventLocalToUtc('2026-07-01', '17:00', 'America/New_York').toISOString())
      .toBe('2026-07-01T21:00:00.000Z');
    expect(eventLocalToUtc('2026-12-01', '17:00', 'America/New_York').toISOString())
      .toBe('2026-12-01T22:00:00.000Z');
  });

  it('rejects nonexistent and ambiguous DST times', () => {
    expect(() => eventLocalToUtc('2026-03-08', '02:30', 'America/New_York'))
      .toThrow(BadRequestException);
    expect(() => eventLocalToUtc('2026-11-01', '01:30', 'America/New_York'))
      .toThrow(BadRequestException);
  });

  it('rejects invalid dates and timezones', () => {
    expect(() => eventLocalToUtc('2026-02-30', '17:00', 'Asia/Karachi'))
      .toThrow(BadRequestException);
    expect(() => eventLocalToUtc('2026-10-23', '17:00', 'Invalid/Zone'))
      .toThrow(BadRequestException);
  });
});
