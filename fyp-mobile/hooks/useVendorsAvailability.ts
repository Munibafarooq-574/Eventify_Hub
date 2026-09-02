// fyp-mobile/hooks/useVendorsAvailability.ts
import checkVendorsAvailability, {
  AvailabilityCheckResult,
} from '@/services/checkVendorsAvailability';
import { useEffect, useState } from 'react';

interface Params {
  vendorIds: string[];
  eventDate: string | null; // "2026-09-10"
  startTime: string | null; // "17:00"
  durationMinutes: number | null;
}

export function useVendorsAvailability({
  vendorIds,
  eventDate,
  startTime,
  durationMinutes,
}: Params) {
  const [results, setResults] = useState<Record<string, AvailabilityCheckResult>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!vendorIds.length || !eventDate || !startTime || !durationMinutes) {
      setResults({});
      return;
    }

    let cancelled = false;
    setLoading(true);

    checkVendorsAvailability({ vendorIds, eventDate, startTime, durationMinutes })
      .then((res) => {
        if (cancelled) return;
        const map: Record<string, AvailabilityCheckResult> = {};
        res.forEach((r) => (map[r.vendorId] = r));
        setResults(map);
      })
      .catch((err) => console.error('Availability check failed:', err))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorIds.join(','), eventDate, startTime, durationMinutes]);

  return { results, loading };
}