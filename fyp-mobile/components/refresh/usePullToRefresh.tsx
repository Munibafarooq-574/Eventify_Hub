import { useRef, useState } from "react";
import { RefreshControl } from "react-native";
import { reportMarketplaceLoadError } from "@/services/reportMarketplaceLoadError";

// Match the native spinner on Client My Events.
export const PULL_TO_REFRESH_COLOR = "#7B2869";

export function usePullToRefresh(reload: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  const inFlight = useRef(false);

  const onRefresh = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRefreshing(true);
    try {
      await reload();
    } catch (error) {
      reportMarketplaceLoadError("Screen refresh failed:", error);
    } finally {
      inFlight.current = false;
      setRefreshing(false);
    }
  };

  return {
    refreshing,
    refreshControl: (
      <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PULL_TO_REFRESH_COLOR} colors={[PULL_TO_REFRESH_COLOR]} />
    ),
  };
}
