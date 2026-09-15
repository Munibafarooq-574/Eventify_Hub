// fyp-mobile/services/getSubscriptionAccessState.ts

import { growthApi } from "./growthApiClient";

import type {
  SubscriptionAccessState,
} from "../types/subscription.types";

export async function getSubscriptionAccessState(
  vendorId: string,
): Promise<SubscriptionAccessState> {
  const access =
    await growthApi.get<SubscriptionAccessState>(
      `/vendor/growth/subscription/access/${vendorId}`,
    );

  console.log(
    "[SUBSCRIPTION ACCESS SERVICE]",
    JSON.stringify(access, null, 2),
  );

  return access;
}