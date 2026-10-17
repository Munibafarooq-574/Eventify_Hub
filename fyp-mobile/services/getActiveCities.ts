import axios from "axios";

import { API_BASE_URL } from "./apiConfig";

export interface ActiveCity {
  _id: string;
  name: string;
  countryCode: string;
  countryName: string;
  stateProvinceCode: string;
  stateProvinceName: string;
}

export default async function getActiveCities(): Promise<ActiveCity[]> {
  const response = await axios.get(`${API_BASE_URL}/cities`);
  return response.data;
}