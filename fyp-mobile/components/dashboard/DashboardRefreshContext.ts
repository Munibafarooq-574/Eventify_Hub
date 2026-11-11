import { useIsFocused } from "@react-navigation/native";
import { createContext, useContext, useEffect } from "react";
import { reportMarketplaceLoadError } from "@/services/reportMarketplaceLoadError";

type Reload = () => Promise<unknown>;
export const DashboardRefreshContext = createContext<Set<Reload> | null>(null);

export function useDashboardSectionLoad(load: (signal: AbortSignal, refreshing: boolean) => Promise<unknown>, refreshOnFocus = false) {
  const sections = useContext(DashboardRefreshContext);
  const focused = useIsFocused();
  const enabled = !refreshOnFocus || focused;

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let pending: Promise<unknown> | undefined;
    const reload = (refreshing = true) => {
      if (!pending) {
        pending = load(controller.signal, refreshing)
          .catch(error => reportMarketplaceLoadError("Dashboard section unavailable:", error))
          .finally(() => { pending = undefined; });
      }
      return pending;
    };
    sections?.add(reload);
    void reload(false);

    return () => {
      controller.abort();
      sections?.delete(reload);
    };
  }, [load, sections, enabled]);
}
