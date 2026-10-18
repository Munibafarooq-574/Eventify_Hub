import { useCallback, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import getClientRefunds, { type ClientRefund } from '@/services/getClientRefunds';

// Same authenticated participant feed for client and vendor, scoped by the server.
export default function useRefundUpdates(refreshOnFocus = true) {
  const [refunds, setRefunds] = useState<Record<string, ClientRefund>>({});
  const [refundLoading, setLoading] = useState(true);
  const [refundError, setError] = useState(false);
  const generation = useRef(0);
  const loadRefunds = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true);
    try {
      const records = await getClientRefunds();
      if (request === generation.current) {
        setRefunds(Object.fromEntries(records.map(record => [record.vendorOrderId, record])));
        setError(false);
      }
    } catch { if (request === generation.current) setError(true); }
    finally { if (request === generation.current) setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => {
    setRefunds({});
    if (refreshOnFocus) void loadRefunds();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void loadRefunds(); });
    const timer = setInterval(() => { if (AppState.currentState === 'active') void loadRefunds(); }, 30000);
    return () => { ++generation.current; clearInterval(timer); subscription.remove(); };
  }, [loadRefunds, refreshOnFocus]));
  return { refunds, refundLoading, refundError, loadRefunds };
}
