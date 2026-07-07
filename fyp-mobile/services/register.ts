import axios, { AxiosRequestConfig } from "axios";
export default async function Register(email: string, password: string, name: string, role: string, buisnessCategory: string, phone?: string) {
    try {
        const url = `http://192.168.1.20:3000/auth/register`;
        const config: AxiosRequestConfig = {
            maxBodyLength: Infinity,
            method: "POST",
            data: { email, password, name, role, buisnessCategories: buisnessCategory, mobileNumber: phone },
            url,
        };

        const response = await axios(config);
        return response.data;
    } catch (error: any) {
        if (error.response && error.response.data && error.response.data.message) {
            throw error.response.data.message;
        } else {
            throw error.message
        }
    }
}