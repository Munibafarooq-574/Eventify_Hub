import axios, { AxiosRequestConfig } from "axios";

export default async function postContactDetails(userId: string, contactDetails: FormData) {
    console.log(userId, contactDetails)
    const url = `http://13.233.214.252:3000/vendor/contactDetails?userId=${userId}`;
    const config: AxiosRequestConfig = {
        maxBodyLength: Infinity,
        method: "POST",
        url,
        data: contactDetails,
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    };

    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.log(error);
        console.error("Error fetching vendor categories:", error);
        throw error;
    }
}
