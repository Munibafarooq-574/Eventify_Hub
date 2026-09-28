import axios from "axios";

const API_URL = "https://eventify-hub.onrender.com";

export interface ActiveCity {
  _id: string;
  name: string;
  countryCode: string;
  countryName: string;
  stateProvinceCode: string;
  stateProvinceName: string;
}

export default async function getActiveCities(): Promise<ActiveCity[]> {
  const response = await axios.get(`${API_URL}/cities`);
  return response.data;
}