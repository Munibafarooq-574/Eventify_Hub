import { CreateCakeBusinessDetailsDto } from "../dto/CreateCakeBusinessDetails.dto";
import axios, { AxiosRequestConfig } from "axios";

export default async function postCakeBusinessDetails(
    userId: string,
    cakeBusinessDetails: CreateCakeBusinessDetailsDto
) {
    const url = `https://eventify-hub.onrender.com/vendor/buisnessDetails?userId=${userId}`;

    const config: AxiosRequestConfig = {
        method: "POST",
        url,
        data: cakeBusinessDetails,
        maxBodyLength: Infinity,
    };

    const response = await axios(config);

    return response.data;
}