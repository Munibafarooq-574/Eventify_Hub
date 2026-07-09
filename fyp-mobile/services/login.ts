import axios, { AxiosRequestConfig } from "axios";

export default async function Login(email: string, password: string) {
    try {
        const url = `https://eventify-hub.onrender.com/auth/login`;
        const config: AxiosRequestConfig = {
            maxBodyLength: Infinity,
            method: "POST",
            data: { email, password },
            url,
        };

        const response = await axios<{ token: string, user: any }>(config);
        return response.data;
    } catch (error: any) {
        if (error.response && error.response.data && error.response.data.message) {
            throw error.response.data.message;
        } else {
            throw error.message
        }
    }
}
