import { BadRequestException } from '@nestjs/common';

/** Capacity is independent of the event's total guest count and package price. */
export type ServiceCapacity = {
  capacityUnit?: 'PERSON' | 'GROUP' | 'VEHICLE' | 'TEAM' | 'SETUP';
  peopleIncludedPerGroup?: number | null;
  maxPeoplePerBooking?: number | null;
  maxUnitsPerBooking?: number | null;
  availableParallelUnits?: number | null;
};

function positiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

export function validateServiceCapacity(capacity: ServiceCapacity): ServiceCapacity {
  const allowed = ['PERSON', 'GROUP', 'VEHICLE', 'TEAM', 'SETUP'];
  if (capacity.capacityUnit !== undefined && !allowed.includes(capacity.capacityUnit)) {
    throw new BadRequestException('Choose a valid service capacity unit.');
  }
  for (const field of ['peopleIncludedPerGroup', 'maxPeoplePerBooking', 'maxUnitsPerBooking', 'availableParallelUnits'] as const) {
    const value = capacity[field];
    if (value !== undefined && value !== null && !positiveInteger(value)) {
      throw new BadRequestException(`${field} must be a positive whole number.`);
    }
  }
  if (capacity.capacityUnit === 'GROUP' && !positiveInteger(capacity.peopleIncludedPerGroup)) {
    throw new BadRequestException('Group capacity requires people included per group.');
  }
  return capacity;
}

/** Throws only when explicitly configured capacity is exceeded; legacy packages stay readable. */
export function checkServiceCapacity(
  capacity: ServiceCapacity,
  requiredPeople: number,
  requiredUnits = 1,
) {
  validateServiceCapacity(capacity);
  if (!positiveInteger(requiredPeople) || !positiveInteger(requiredUnits)) {
    throw new BadRequestException('Enter a positive whole number for service requirements.');
  }
  const groupSize = capacity.capacityUnit === 'GROUP' ? capacity.peopleIncludedPerGroup! : null;
  const unitsNeeded = groupSize ? Math.ceil(requiredPeople / groupSize) :
    capacity.capacityUnit === 'PERSON' ? requiredPeople : requiredUnits;
  if (capacity.maxPeoplePerBooking != null && requiredPeople > capacity.maxPeoplePerBooking) {
    throw new BadRequestException(`This package supports at most ${capacity.maxPeoplePerBooking} people per booking.`);
  }
  if (capacity.maxUnitsPerBooking != null && unitsNeeded > capacity.maxUnitsPerBooking) {
    throw new BadRequestException(`This package supports at most ${capacity.maxUnitsPerBooking} units per booking.`);
  }
  if (capacity.availableParallelUnits != null && unitsNeeded > capacity.availableParallelUnits) {
    throw new BadRequestException('Not enough vendor teams or resources are available for this service.');
  }
  return { unitsNeeded, peopleRequested: requiredPeople };
}
