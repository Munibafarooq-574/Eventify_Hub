// fyp-mobile/services/campaignAnalytics.ts

import { growthApi } from "./growthApiClient";

export async function recordCampaignImpression(
  campaignId: string,
): Promise<void> {
  await growthApi.post(
    `/vendor/growth/campaign/public/${campaignId}/impression`,
    {},
  );
}

export async function recordCampaignClick(
  campaignId: string,
): Promise<void> {
  await growthApi.post(
    `/vendor/growth/campaign/public/${campaignId}/click`,
    {},
  );
}

export async function recordCampaignPackageVisit(
  campaignId: string,
): Promise<void> {
  await growthApi.post(
    `/vendor/growth/campaign/public/${campaignId}/package-visit`,
    {},
  );
}