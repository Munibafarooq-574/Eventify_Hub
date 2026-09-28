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

export interface SponsoredCampaignsPage {
  items: SponsoredCampaign[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface SponsoredCampaignQuery {
  eventCityId?: string;
  categoryIds?: string[];
  page?: number;
  limit?: number;
  viewAll?: boolean;
}

export async function getSponsoredCampaigns(
  query: SponsoredCampaignQuery = {},
): Promise<
  SponsoredCampaign[] | SponsoredCampaignsPage
> {
  try {
    const params = new URLSearchParams();

    if (query.eventCityId) {
      params.append(
        "eventCityId",
        query.eventCityId,
      );
    }

    if (query.categoryIds?.length) {
      params.append(
        "categoryIds",
        query.categoryIds.join(","),
      );
    }

    if (query.page) {
      params.append(
        "page",
        String(query.page),
      );
    }

    if (query.limit) {
      params.append(
        "limit",
        String(query.limit),
      );
    }

    if (query.viewAll) {
      params.append(
        "viewAll",
        "true",
      );
    }

    const queryString = params.toString();

    const response = await growthApi.get<
      | SponsoredCampaign[]
      | SponsoredCampaignsPage
    >(
      `/vendor/growth/campaign/public/active${
        queryString
          ? `?${queryString}`
          : ""
      }`,
    );

    if (query.viewAll) {
      return response as SponsoredCampaignsPage;
    }

    return Array.isArray(response)
      ? response
      : [];
  } catch (error) {
    console.error(
      "Failed to load sponsored campaigns:",
      error,
    );

    if (query.viewAll) {
      return {
        items: [],
        page: query.page || 1,
        limit: query.limit || 10,
        total: 0,
        totalPages: 0,
        hasMore: false,
      };
    }

    return [];
  }
}

export default getSponsoredCampaigns;