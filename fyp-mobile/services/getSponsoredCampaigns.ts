import { growthApi } from "./growthApiClient";

export interface SponsoredCampaignPackage {
  _id: string;
  packageName: string;
  description?: string;
  price?: number;
  images?: string[];
}

export interface SponsoredCampaign {
  _id: string;

  title: string;
  image: string;
  description: string;
  offerLabel?: string | null;

  startDate: string;
  endDate: string;

  vendorId: string;
  vendorName: string;
  brandName?: string | null;

  categoryId: string;
  packageId: string;

  package: SponsoredCampaignPackage;

  sponsored: true;
}

export async function getSponsoredCampaigns(): Promise<
  SponsoredCampaign[]
> {
  try {
    const response =
      await growthApi.get<SponsoredCampaign[]>(
        "/vendor/growth/campaign/public/active",
      );

    return Array.isArray(response) ? response : [];
  } catch (error) {
    console.error(
      "Failed to load sponsored campaigns:",
      error,
    );

    return [];
  }
}

export default getSponsoredCampaigns;