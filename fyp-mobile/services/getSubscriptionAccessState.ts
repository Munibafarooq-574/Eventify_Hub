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

  // A successful HTTP response can still contain an incompatible payload.
  const isObject = (value: unknown) =>
    !!value && typeof value === "object" && !Array.isArray(value);
  if (
    !isObject(access?.subscription) ||
    !isObject(access?.features) ||
    !isObject(access?.limits) ||
    typeof access?.accessAllowed !== "boolean"
  ) {
    throw new Error("Could not verify subscription details. Please try again.");
  }

  return access;
}