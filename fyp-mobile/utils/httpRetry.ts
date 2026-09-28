// fyp-mobile/utils/httpRetry.ts

import { AxiosError } from "axios";

// ===========================================================
// Retry-with-backoff for API calls
// -----------------------------------------------------------
// Our backend runs on Render.com's free tier, which "sleeps"
// after ~15 minutes idle. The first request after that wakes
// it up, but can take 30-60s — during that window the request
// times out or Cloudflare returns a generic 520/502/503/504
// instead of a real response.
//
// This is NOT an app bug and NOT something the user did wrong,
// so instead of showing an error immediately, every API call
// that uses this helper gets one automatic silent retry after
// a short delay. If it still fails after that, we give up and
// let the caller show its normal error/retry UI.
// ===========================================================

const RETRYABLE_STATUS_CODES = new Set([520, 502, 503, 504]);

export interface RetryOptions {
  /** How many extra attempts to make after the first failure. Default: 1 */
  retries?: number;
  /** How long to wait before each retry, in ms. Default: 4000 */
  delayMs?: number;
  /** Called right before each retry attempt (useful for logging). */
  onRetry?: (attempt: number, error: unknown) => void;
}

function isRetryableError(error: unknown): boolean {
  const axiosError = error as AxiosError;

  const status = axiosError?.response?.status;

  if (status && RETRYABLE_STATUS_CODES.has(status)) {
    return true;
  }

  // No response at all (timeout, dropped connection, server not
  // answering yet during cold start) is also worth one retry.
  if (
    axiosError?.code === "ECONNABORTED" ||
    (axiosError?.isAxiosError && !axiosError?.response)
  ) {
    return true;
  }

  return false;
}

/**
 * Wraps any async request function and automatically retries it
 * once (by default) if it fails with a retryable server/network
 * error. Non-retryable errors (400, 401, 404, validation errors,
 * etc.) are thrown immediately without waiting.
 *
 * Usage:
 *   const response = await withRetry(() => axios(config));
 */
export async function withRetry<T>(
  request: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const { retries = 1, delayMs = 4000, onRetry } = options;

  let attempt = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await request();
    } catch (error) {
      const canRetry = isRetryableError(error) && attempt < retries;

      if (!canRetry) {
        throw error;
      }

      attempt += 1;
      onRetry?.(attempt, error);

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}