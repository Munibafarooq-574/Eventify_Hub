import { BadRequestException } from '@nestjs/common';
import { checkServiceCapacity, validateServiceCapacity } from './service-capacity';

describe('Option A service capacity', () => {
  it('keeps legacy packages backward-compatible', () => {
    expect(checkServiceCapacity({}, 100)).toEqual({ unitsNeeded: 1, peopleRequested: 100 });
  });
  it('counts partial groups with ceiling rounding', () => {
    expect(checkServiceCapacity({ capacityUnit: 'GROUP', groupSize: 6, availableParallelUnits: 2 }, 7).unitsNeeded).toBe(2);
    expect(checkServiceCapacity({ capacityUnit: 'GROUP', groupSize: 6, availableParallelUnits: 2 }, 12).unitsNeeded).toBe(2);
  });
  it('rejects a third group when only two teams exist', () => {
    expect(() => checkServiceCapacity({ capacityUnit: 'GROUP', groupSize: 6, availableParallelUnits: 2 }, 13))
      .toThrow('Not enough vendor teams');
  });
  it('checks client service requirement rather than total event guests', () => {
    expect(checkServiceCapacity({ capacityUnit: 'GROUP', groupSize: 6, maxPeoplePerBooking: 12 }, 5).unitsNeeded).toBe(1);
    expect(() => checkServiceCapacity({ capacityUnit: 'GROUP', groupSize: 6, maxPeoplePerBooking: 12 }, 13))
      .toThrow('at most 12 people');
  });
  it('supports vehicle and team quantities independently', () => {
    expect(checkServiceCapacity({ capacityUnit: 'VEHICLE', maxUnitsPerBooking: 3 }, 100, 3).unitsNeeded).toBe(3);
    expect(() => checkServiceCapacity({ capacityUnit: 'VEHICLE', maxUnitsPerBooking: 3 }, 100, 4)).toThrow(BadRequestException);
  });
  it.each([0, -1, 1.2, NaN, Infinity])('rejects invalid people count %s', value => {
    expect(() => checkServiceCapacity({}, value)).toThrow(BadRequestException);
  });
  it('rejects noninteger and contradictory group configuration', () => {
    expect(() => validateServiceCapacity({ maxUnitsPerBooking: 1.5 })).toThrow(BadRequestException);
    expect(() => validateServiceCapacity({ capacityUnit: 'GROUP' })).toThrow(BadRequestException);
    expect(() => validateServiceCapacity({ availableParallelUnits: 0 })).toThrow(BadRequestException);
  });
});
