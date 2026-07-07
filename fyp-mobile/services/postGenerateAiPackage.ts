
import axios, { AxiosRequestConfig } from "axios";

export interface SmartPackageInput {
    eventName: string;
    eventDate: Date;
    guests: number;
    services: string[];  // services requested by user
    budget: number;
}

export default async function postGenerateAiPackage(packageInput: SmartPackageInput) {
    const url = `http://13.233.214.252:3000/vendor/ai-package`;
    // const url = `http://192.168.100.15:3000/vendor/ai-package`;
    const config: AxiosRequestConfig = {
        maxBodyLength: Infinity,
        method: "POST",
        url,
        data: packageInput,
    };

    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error("Error fetching vendor categories:", error);
        throw error;
    }
}
