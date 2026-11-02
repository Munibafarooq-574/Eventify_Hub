import { buildAppointmentCandidates } from './appointment-candidates';

describe('buildAppointmentCandidates', () => {
  const start = new Date('2026-11-09T11:00:00.000Z'); // 4 PM Islamabad
  const end = new Date('2026-11-09T13:00:00.000Z'); // 6 PM Islamabad

  it('offers four half-hour windows inside a two-hour event', () => {
    const slots = buildAppointmentCandidates(start, end, 30);
    expect(slots).toHaveLength(4);
    expect(slots[0].startDateTime.toISOString()).toBe('2026-11-09T11:00:00.000Z');
    expect(slots[3].endDateTime.toISOString()).toBe('2026-11-09T13:00:00.000Z');
  });

  it('does not propose a slot extending past the event', () => {
    const slots = buildAppointmentCandidates(start, end, 60);
    expect(slots).toHaveLength(3);
    expect(slots.every(s => s.endDateTime <= end)).toBe(true);
  });

  it('rejects invalid and zero-length durations', () => {
    expect(() => buildAppointmentCandidates(start, end, 0)).toThrow(RangeError);
    expect(() => buildAppointmentCandidates(end, start, 30)).toThrow(RangeError);
    expect(() => buildAppointmentCandidates(start, end, 30, 0)).toThrow(RangeError);
  });

  it('does not mutate the supplied event dates', () => {
    buildAppointmentCandidates(start, end, 30);
    expect(start.toISOString()).toBe('2026-11-09T11:00:00.000Z');
    expect(end.toISOString()).toBe('2026-11-09T13:00:00.000Z');
  });
});
