// fyp-mobile/services/getSubscriptionAccessState.ts

import { growthApi } from "./growthApiClient";

import type {
  SubscriptionAccessState,
} from "../types/subscription.types";

export const ACCESS_FRESH_MS = 60_000;
let verifiedAccess: { vendorId: string; token: string; verifiedAt: number; access: SubscriptionAccessState } | undefined;

export function readVerifiedSubscription(vendorId: string, token: string) {
  return verifiedAccess?.vendorId === vendorId && verifiedAccess.token === token ? verifiedAccess : undefined;
}

export function rememberVerifiedSubscription(vendorId: string, token: string, access: SubscriptionAccessState) {
  verifiedAccess = { vendorId, token, verifiedAt: Date.now(), access };
}

export function hasActiveVendorSubscription(access: SubscriptionAccessState | null | undefined) {
  return access?.accessAllowed === true && access.subscriptionRequired === false &&
    Date.parse(access.subscription?.endDate ?? '') > Date.now();
}

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