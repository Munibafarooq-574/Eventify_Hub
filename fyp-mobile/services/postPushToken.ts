import axios, { AxiosRequestConfig } from "axios";

export default async function postPushToken(userId: string, token: string) {
    const url = `http://13.233.214.252:3000/auth/push-token`;
    // const url = `http://192.168.100.15:3000/auth/push-token`;

    console.log(token, userId);

    const config: AxiosRequestConfig = {
        method: "POST",
        url,
        data: { token, userId }, // Only token in body
    };

    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error("Error posting push token:", error);
        throw error;
    }
}