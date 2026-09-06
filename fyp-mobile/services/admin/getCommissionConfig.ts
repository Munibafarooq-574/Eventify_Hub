// fyp-mobile/services/admin/getCommissionConfig.ts
import axios from "axios";

export default async function getCommissionConfig() {
    const { data } = await axios.get(`https://eventify-hub.onrender.com/admin/commission`);
    return data;
}

export async function updateCommissionConfig(percentage: number) {
    const { data } = await axios.patch(`https://eventify-hub.onrender.com/admin/commission`, {
        platformCommissionPercentage: percentage,
    });
    return data;
}