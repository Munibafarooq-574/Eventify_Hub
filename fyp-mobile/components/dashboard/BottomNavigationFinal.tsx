import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { router, useFocusEffect, usePathname, type Href } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import getConversationList from '@/services/getConversationList';
import getUserNotifications from '@/services/getNotifications';
import getVendorOrderStats from '@/services/getVendorOrderStats';
import { getSecureData, getUserData } from '@/store';
import { connectSocket, listenMessageSeen, onMessageDeletedForEveryone, onNewMessage, registerUser } from '@/utils/socketService';

type Tab = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: Href;
  color: string;
  badge?: 'messages' | 'notifications' | 'orders';
};

const messages: Tab = {
  label: 'Messages', icon: 'chatbubble-outline', route: '/vendormessages', color: '#60E6FF', badge: 'messages',
};
const organizerTabs: Tab[] = [
  { label: 'My Events', icon: 'calendar-outline', route: '/myevents', color: '#FFD474' },
  messages,
  { label: 'Home', icon: 'home-outline', route: '/dashboard', color: '#FF737D' },
  { label: 'Notifications', icon: 'notifications-outline', route: '/bottomnotification', color: '#A3EC77', badge: 'notifications' },
  { label: 'Account', icon: 'person-outline', route: '/account', color: '#8FAAFF' },
];
const vendorTabs: Tab[] = [
  { ...organizerTabs[0], route: '/vendormyevents' },
  messages,
  { ...organizerTabs[2], route: '/vendordashboard' },
  { label: 'My Orders', icon: 'receipt-outline', route: '/vendorordersummary', color: '#A3EC77', badge: 'orders' },
  { ...organizerTabs[4], route: '/vendoraccount' },
];

type BadgeCounts = Record<NonNullable<Tab['badge']>, number>;
let tabTransition: { route: Href; from: number } | undefined;
let badgeSnapshot: { userId: string; token: string; counts: BadgeCounts } | undefined;
const emptyCounts: BadgeCounts = { messages: 0, notifications: 0, orders: 0 };
const countUnreadConversations = (rows: { unreadCount?: number }[]) =>
  rows.filter(row => Number(row.unreadCount) > 0).length;
type NotificationItem = { _id?: string; isRead?: boolean };

const seenKey = (userId: string) => `bottom-navigation:viewed-notifications:${userId}`;
async function seenNotificationIds(userId: string): Promise<string[]> {
  const raw = await AsyncStorage.getItem(seenKey(userId));
  try {
    const ids = JSON.parse(raw ?? '[]');
    return Array.isArray(ids) ? ids.filter(id => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export default function BottomNavigationFinal({ viewedNotifications, onNotificationCountChange }: {
  viewedNotifications?: NotificationItem[];
  onNotificationCountChange?: (count: number) => void;
}) {
  const pathname = usePathname();
  const { bottom } = useSafeAreaInsets();
  const [user, setUser] = useState<{ id: string; vendor: boolean }>();
  const [badges, setBadges] = useState(emptyCounts);
  useEffect(() => {
    onNotificationCountChange?.(badges.notifications);
  }, [badges.notifications, onNotificationCountChange]);
  const [width, setWidth] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const position = useRef(new Animated.Value(0)).current;
  const transition = useRef<Animated.CompositeAnimation | null>(null);
  const navigating = useRef(false);
  const tabs = (user?.vendor ?? (pathname.startsWith('/vendor') && pathname !== '/vendormessages'))
    ? vendorTabs : organizerTabs;
  const activeTab = tabs.findIndex(tab => tab.route === pathname);
  const selected = activeTab;
  const accent = tabs[selected]?.color ?? '#FF737D';
  const tabWidth = width / tabs.length;

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (active) setReduceMotion(value);
    }).catch(() => {});
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; listener.remove(); };
  }, []);

  useFocusEffect(useCallback(() => {
    const from = tabTransition?.route === pathname ? tabTransition.from : undefined;
    tabTransition = undefined;
    position.setValue(from ?? Math.max(activeTab, 0));
    if (from !== undefined && activeTab >= 0) {
      transition.current = Animated.timing(position, {
        toValue: activeTab, duration: 240, easing: Easing.bezier(.2, .8, .25, 1), useNativeDriver: true,
      });
      transition.current.start();
    }
    return () => {
      transition.current?.stop();
      transition.current = null;
      navigating.current = false;
    };
  }, [activeTab, pathname, position]));

  useFocusEffect(useCallback(() => {
    let focused = true;
    const running = new Set<keyof BadgeCounts>();
    const queued = new Set<keyof BadgeCounts>();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let userId = '';
    let token = '';
    let vendor = false;
    const publish = (update: Partial<BadgeCounts>) => {
      const cached = badgeSnapshot;
      if (!focused || !cached || cached.userId !== userId || cached.token !== token) return;
      const counts = { ...cached.counts, ...update };
      badgeSnapshot = { userId, token, counts };
      setBadges(counts);
    };
    const refreshBadge = async (key: keyof BadgeCounts, request: () => Promise<unknown>) => {
      if (!focused || !userId || AppState.currentState === 'background') return;
      if (running.has(key)) { queued.add(key); return; }
      running.add(key);
      try {
        await request();
      } catch {
        // Keep the previous count when a background refresh fails.
      } finally {
        running.delete(key);
        if (queued.delete(key)) void refreshBadge(key, request);
      }
    };
    const refresh = () => {
      void refreshBadge('messages', () => getConversationList(userId, rows => {
          publish({ messages: countUnreadConversations(rows) });
        }).then(rows => publish({ messages: countUnreadConversations(rows) })));
      void refreshBadge(vendor ? 'orders' : 'notifications', () => vendor
          ? getVendorOrderStats('Vendor', userId).then(stats => publish({ orders: Number(stats.pending) || 0 }))
          : Promise.all([getUserNotifications(userId), seenNotificationIds(userId)]).then(([items, seen]) => {
              const viewed = new Set(seen);
              const unread = new Set<string>();
              if (Array.isArray(items)) for (const item of items as NotificationItem[]) {
                if (item._id && !item.isRead && !viewed.has(item._id)) unread.add(item._id);
              }
              publish({ notifications: pathname === '/bottomnotification' ? 0 : unread.size });
            }));
    };
    const scheduleRefresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void refresh(), 300);
    };
    let unsubscribe: (() => void)[] = [];
    void Promise.all([getUserData(), getSecureData('token')]).then(([saved, sessionToken]) => {
      if (!focused) return;
      if (!saved?._id || !sessionToken) {
        setUser(undefined);
        setBadges(emptyCounts);
        badgeSnapshot = undefined;
        return;
      }
      token = sessionToken;
      userId = String(saved._id);
      vendor = saved.role === 'Vendor';
      setUser({ id: userId, vendor });
      const cached = badgeSnapshot;
      const counts = cached?.userId === userId && cached.token === token ? cached.counts : emptyCounts;
      badgeSnapshot = { userId, token, counts };
      setBadges(pathname === '/bottomnotification' ? { ...counts, notifications: 0 } : counts);
      const socket = connectSocket();
      // The inbox also registers on mount. Reuse the same connection.
      if (pathname !== '/vendormessages') registerUser(userId);
      socket.on('connect', scheduleRefresh);
      unsubscribe = [
        () => socket.off('connect', scheduleRefresh),
        onNewMessage(scheduleRefresh),
        listenMessageSeen(scheduleRefresh),
        onMessageDeletedForEveryone(scheduleRefresh),
      ];
      void refresh();
    }).catch(() => {});
    const app = AppState.addEventListener('change', state => { if (state === 'active') scheduleRefresh(); });
    const push = Notifications.addNotificationReceivedListener(scheduleRefresh);
    const interval = setInterval(() => void refresh(), 30_000);
    return () => {
      focused = false;
      clearTimeout(timer);
      clearInterval(interval);
      app.remove();
      push.remove();
      unsubscribe.forEach(cleanup => cleanup());
    };
  }, [pathname]));

  useFocusEffect(useCallback(() => {
    if (!user || !viewedNotifications?.length) return;
    const ids = viewedNotifications.flatMap(item => item._id ? [item._id] : []);
    // The notifications API does not have a mark-read operation.
    void seenNotificationIds(user.id).then(previous =>
      AsyncStorage.setItem(seenKey(user.id), JSON.stringify([...new Set([...previous, ...ids])].slice(-1000))),
    ).catch(() => {});
  }, [user, viewedNotifications]));

  const navigate = (tab: Tab) => {
    if (navigating.current || tab.route === pathname || !user) return;
    navigating.current = true;
    tabTransition = !reduceMotion && activeTab >= 0 ? { route: tab.route, from: activeTab } : undefined;
    router.navigate(tab.route);
  };

  return (
    <View pointerEvents="box-none" style={[styles.footer, { bottom: Math.max(6, bottom) }]}>
      <View style={styles.dock} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
        <View pointerEvents="none" style={styles.glass}>
          {Platform.OS === 'ios' && <BlurView intensity={72} tint="light" style={StyleSheet.absoluteFill} />}
          <LinearGradient
            colors={Platform.OS === 'ios' ? ['#FFFFFF78', '#F5E8FA30', '#EBD8F38C'] : ['#FFFFFFC9', '#F4E8F9A8', '#EBD8F3DB']}
            locations={[0, 0.46, 1]}
            style={StyleSheet.absoluteFill}
          />
        </View>
        {selected >= 0 && width > 0 && (
          <Animated.View pointerEvents="none" style={[styles.beam, {
            width: tabWidth,
            transform: [{ translateX: position.interpolate({ inputRange: [0, 1], outputRange: [0, tabWidth] }) }],
          }]}>
            <LinearGradient colors={[`${accent}99`, `${accent}00`]} style={[styles.wash, { borderBottomColor: `${accent}BB` }]} />
            <View style={[styles.beamCap, { backgroundColor: accent, shadowColor: accent }]} />
          </Animated.View>
        )}
        {tabs.map((tab, index) => {
          const isSelected = selected === index;
          const count = tab.badge ? badges[tab.badge] : 0;
          const lift = reduceMotion ? (isSelected ? -10 : 0) : position.interpolate({
            inputRange: [index - 1, index, index + 1], outputRange: [0, -10, 0], extrapolate: 'clamp',
          });
          const scale = reduceMotion || selected < 0 ? 1 : position.interpolate({
            inputRange: [index - 1, index, index + 1], outputRange: [1, 1.18, 1], extrapolate: 'clamp',
          });
          return (
            <Pressable key={tab.label} accessibilityRole="tab" accessibilityState={{ selected: isSelected }}
              accessibilityLabel={count > 0 ? `${tab.label}, ${count} ${tab.badge === 'messages' ? 'unread conversations' : tab.badge === 'orders' ? 'pending orders' : 'unread'}` : tab.label}
              onPress={() => navigate(tab)}
              style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
              <Animated.View style={{ transform: [{ translateY: selected < 0 ? 0 : lift }, { scale }] }}>
                <Ionicons name={tab.icon} size={23} color={isSelected ? '#481E52' : '#725D7B'} />
                {count > 0 && (
                  <View style={[styles.badge, { backgroundColor: tab.color }]}>
                    <Text allowFontScaling={false} style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
                  </View>
                )}
              </Animated.View>
              {isSelected && <Text numberOfLines={1} adjustsFontSizeToFit style={styles.label}>{tab.label}</Text>}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { position: 'absolute', left: 10, right: 10 },
  dock: {
    flexDirection: 'row', height: 60, borderRadius: 21,
    borderWidth: StyleSheet.hairlineWidth, borderColor: '#FFFFFFCF',
    shadowColor: '#684174', shadowOpacity: .18, shadowRadius: 10, shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  glass: { ...StyleSheet.absoluteFill, borderRadius: 21, overflow: 'hidden', backgroundColor: '#F5EBFA32' },
  beam: { position: 'absolute', top: 0, bottom: 0, left: 0, alignItems: 'center' },
  wash: { ...StyleSheet.absoluteFill, marginHorizontal: 3, marginBottom: 3, borderRadius: 15, borderBottomWidth: 1 },
  beamCap: { position: 'absolute', top: -2, height: 4, width: 25, borderRadius: 4, shadowOpacity: .94, shadowRadius: 7, shadowOffset: { width: 0, height: 0 }, elevation: 3 },
  tab: { flex: 1, minWidth: 0, justifyContent: 'center', alignItems: 'center', borderRadius: 16 },
  pressed: { opacity: .75 },
  label: { position: 'absolute', bottom: 7, left: 2, right: 2, textAlign: 'center', color: '#481E52', fontSize: 10, fontWeight: '700' },
  badge: { position: 'absolute', top: -6, left: 16, minWidth: 16, height: 16, paddingHorizontal: 3, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F8EFFB' },
  badgeText: { fontSize: 9, color: '#201825', fontWeight: '800' },
});
