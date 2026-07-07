import axios, { AxiosRequestConfig } from "axios";

interface UpdateProfileDto {
  name?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  userId: string;
}

export default async function patchUpdateProfile(userId: string, data: UpdateProfileDto) {
  const url = `http://13.233.214.252:3000/auth/update`; // Your backend update profile endpoint

  const config: AxiosRequestConfig = {
    method: "PATCH",
    url,
    data,
  };

  try {
    const response = await axios(config);
    return response.data; // Return updated user profile data
  } catch (error) {
    console.error("Error updating profile:", error);
    throw error;
  }
}