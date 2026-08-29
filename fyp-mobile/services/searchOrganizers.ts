import { growthApi } from './growthApiClient';

export interface Organizer {
  _id: string;
  name: string;
  email: string;
}

export async function searchOrganizers(
  query: string,
): Promise<Organizer[]> {
  return growthApi.get<Organizer[]>(
    `/auth/organizers?q=${encodeURIComponent(query)}`,
  );
}