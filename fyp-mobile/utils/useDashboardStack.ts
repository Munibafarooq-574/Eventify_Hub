import { CommonActions, useNavigationContainerRef } from 'expo-router';
import { useCallback } from 'react';

export type DashboardRoute = '/dashboard' | '/vendordashboard';
export type DashboardTabRoute = DashboardRoute | '/myevents' | '/vendormyevents' |
    '/vendormessages' | '/bottomnotification' | '/vendorordersummary' | '/account' | '/vendoraccount';

// Root routes are flat in app/_layout. Preserve the mounted dashboard when changing tabs.
export function useDashboardStack() {
    const navigation = useNavigationContainerRef();
    return useCallback((dashboard: DashboardRoute, tab: DashboardTabRoute = dashboard, preserveDashboard = false) => {
        if (!navigation.isReady()) return false;
        const current = navigation.getRootState();
        if (!current) return false;
        const dashboardName = dashboard.slice(1);
        const root = preserveDashboard && current.routes[0]?.name === dashboardName
            ? current.routes[0] : { name: dashboardName };
        const routes = tab === dashboard ? [root] : [root, { name: tab.slice(1) }];
        navigation.dispatch({
            ...CommonActions.reset({ ...current, stale: false, index: routes.length - 1, routes }),
            target: current.key,
        });
        return true;
    }, [navigation]);
}
