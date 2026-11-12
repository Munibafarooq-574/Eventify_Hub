import { appointmentConfigurationError, buildAppointmentCandidates, isAppointmentInAllowedWindow, packageAppointmentCandidates } from './appointment-candidates';

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

describe('package appointment timing', () => {
  const eventStart = new Date('2026-11-20T10:00:00Z');
  const eventEnd = new Date('2026-11-20T15:00:00Z');
  const before = {
    appointmentTiming: 'BEFORE_EVENT' as const,
    requiredServiceDurationMinutes: 180,
    serviceWindowStartOffsetMinutes: -270,
    serviceWindowEndOffsetMinutes: -30,
  };

  it('defaults legacy packages to during the event', () => {
    const legacy = { requiredServiceDurationMinutes: 180 };
    const slots = packageAppointmentCandidates(legacy, eventStart, eventEnd);
    expect(slots[0]).toMatchObject({ timing: 'DURING_EVENT', startDateTime: eventStart });
    expect(isAppointmentInAllowedWindow(legacy, eventStart, eventEnd,
      new Date('2026-11-20T06:30:00Z'), new Date('2026-11-20T09:30:00Z'))).toBe(false);
  });

  it('generates before-event slots that meet the completion deadline', () => {
    const slots = packageAppointmentCandidates(before, eventStart, eventEnd);
    expect(slots.map(slot => slot.startDateTime.toISOString())).toEqual([
      '2026-11-20T05:30:00.000Z', '2026-11-20T06:00:00.000Z', '2026-11-20T06:30:00.000Z',
    ]);
    expect(slots.every(slot => slot.timing === 'BEFORE_EVENT' &&
      isAppointmentInAllowedWindow(before, eventStart, eventEnd, slot.startDateTime, slot.endDateTime))).toBe(true);
    expect(isAppointmentInAllowedWindow(before, eventStart, eventEnd,
      new Date('2026-11-20T07:00:00Z'), eventStart)).toBe(false);
  });

  it('supports different durations for both windows and rejects a slot crossing the event start', () => {
    const both = { ...before, appointmentTiming: 'BOTH' as const, duringEventDurationMinutes: 60 };
    const slots = packageAppointmentCandidates(both, eventStart, eventEnd);
    const during = slots.find(slot => slot.timing === 'DURING_EVENT')!;
    expect(during.endDateTime).toEqual(new Date('2026-11-20T11:00:00Z'));
    expect(isAppointmentInAllowedWindow(both, eventStart, eventEnd, eventStart, during.endDateTime)).toBe(true);
    expect(isAppointmentInAllowedWindow(both, eventStart, eventEnd, eventStart, new Date('2026-11-20T13:00:00Z'))).toBe(false);
    expect(isAppointmentInAllowedWindow(both, eventStart, eventEnd,
      new Date('2026-11-20T09:30:00Z'), new Date('2026-11-20T10:30:00Z'))).toBe(false);
  });

  it('rejects a before-event window too short for the appointment', () => {
    expect(appointmentConfigurationError({ ...before, serviceWindowStartOffsetMinutes: -60 }))
      .toBe('The appointment duration must fit within the before-event window.');
  });
});
