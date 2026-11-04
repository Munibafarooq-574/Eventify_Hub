import { growthApi } from "./growthApiClient";

export interface TopVendor {
    vendorId: string;
    averageRating: number;
    totalReviews: number;
    completedOrders: number;
    serviceCities?: string[];
    servesMarketplaceCity?: boolean;
    reliabilityScore: number;
    popularityScore: number;
    vendor: {
        _id: string;
        name: string;
        coverImage?: string;
        contactDetails?: { brandName?: string };
        BusinessDetails?: {
            minimumPrice?: number;
            cityCovered?: string;
        };
        images?: string[];
    };
}

export default async function getPopularVendors(limit: number = 5): Promise<TopVendor[]> {
    return growthApi.get<TopVendor[]>(`/reviews/top-vendors?limit=${limit}`);
}
