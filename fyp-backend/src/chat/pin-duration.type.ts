// fyp-backend/src/chat/pin-duration.type.ts

export type PinDuration = '24h' | '7d' | '30d';

export const PIN_DURATION_MS: Record<PinDuration, number> = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
};

export function isValidPinDuration(value: unknown): value is PinDuration {
    return value === '24h' || value === '7d' || value === '30d';
}