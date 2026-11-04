import { growthApi } from "./growthApiClient";

export type VendorSearchResult = {
    _id: string;
    name: string;
    contactDetails?: { brandName?: string };
};

const searchVendors = async (query: string) => {
    try {
        return await growthApi.get<VendorSearchResult[]>(`/auth/search?q=${encodeURIComponent(query)}`);
    } catch (error) {
        console.error("Error searching users:", error);
        return [];
    }
};

export default searchVendors;
