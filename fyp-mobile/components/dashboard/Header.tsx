import { reportMarketplaceLoadError } from '@/services/reportMarketplaceLoadError';
import searchVendors, { VendorSearchResult } from '@/services/searchVendors';
import { getVendorBadgesBulk } from '@/services/getVendorBadgesBulk';
import { VendorBadgeSummary } from '@/types/badge.types';
import { createBookingDraftStore, getUserData } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFocusEffect } from "expo-router/react-navigation";
import React, { useCallback, useState } from 'react';
import { AppState,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// ---- Theme tokens (kept local so no new files/deps are introduced) ----
const COLORS = {
  primary: '#6B1E4F',
  primaryDark: '#4A1436',
  accent: '#D4A657',
  bg: '#FDF2F8',
  card: '#FFFFFF',
  textDark: '#2B1B26',
  textMuted: '#8B7688',
  border: '#F3DCE8',
};

export const HOME_HEADER_COLOR = COLORS.primary;

const Header = ({ unreadNotifications = 0 }: { unreadNotifications?: number }) => {
  const [draft] = useState(createBookingDraftStore);
  const [username, setUsername] = useState(""); // State for username
  const [avatar, setAvatar] = useState(""); // Profile picture URL, if set

  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<VendorSearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [badgeMap, setBadgeMap] = useState<Record<string, VendorBadgeSummary>>({});
  const [cartPackageCount, setCartPackageCount] =
  useState(0);

  const handleSearch = async (text: string) => {
    if (text.trim().length < 2) {
      setResults([]);
      setBadgeMap({});
      setShowDropdown(false);
      return;
    }

    const results = await searchVendors(text);

    setResults(results);
    setShowDropdown(true);

    try {
      const ids = results
        .map(item => item._id)
        .filter(Boolean);

      if (ids.length === 0) {
        setBadgeMap({});
        return;
      }

      const summaries = await getVendorBadgesBulk(ids);

      setBadgeMap(
        Object.fromEntries(
          summaries.map((summary) => [summary.vendorId, summary])
        )
      );
    } catch (error) {
      reportMarketplaceLoadError('Badge lookup failed:', error);

      // Badge failure should never break vendor search
      setBadgeMap({});
    }
  };

  // useFocusEffect instead of plain useEffect: Dashboard is a tab-style
  // screen that stays mounted across navigations (e.g. signup -> dashboard,
  // or switching tabs and coming back). A mount-only useEffect([]) would
  // only ever run once and then keep showing stale/"Guest" data forever
  // after that. useFocusEffect re-runs fetchUsername() every time this
  // screen becomes focused, so it always reflects the latest AsyncStorage
  // user data (fresh signup, login, or profile edit).
  useFocusEffect(
  useCallback(() => {
    fetchUsername();
    fetchCartPackageCount();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void fetchCartPackageCount();
    });
    return () => subscription.remove();
  }, [])
);

  const fetchUsername = async () => {
    try {
      const user = await getUserData();

      if (!user) {
        console.warn('No user data found in storage.');
        setUsername('Guest');
        setAvatar('');
        return;
      }

      setUsername(user?.name || user?.username || 'Guest');
      setAvatar(user?.profileImage || '');
    } catch (error) {
      reportMarketplaceLoadError('fetchUsername error:', error);
      setUsername('Guest');
      setAvatar('');
    }
  };

  const fetchCartPackageCount = async () => {
  try {
    const storedCart =
      await draft.get('cartData');
    if (!draft.isCurrent()) return;

    if (!storedCart) {
      setCartPackageCount(0);
      return;
    }

    const parsedCart =
      JSON.parse(storedCart);

    const count =
      Array.isArray(parsedCart?.vendors)
        ? parsedCart.vendors.reduce(
            (
              total: number,
              vendor: any,
            ) =>
              total +
              (Array.isArray(
                vendor?.packages,
              )
                ? vendor.packages.length
                : 0),
            0,
          )
        : 0;

    setCartPackageCount(count);
  } catch (error) {
    reportMarketplaceLoadError(
      'Cart count error:',
      error,
    );

    setCartPackageCount(0);
  }
};

  return (
    <View style={styles.container}>
      <View style={styles.welcomeCard}>
        <View style={styles.header}>
          <View style={styles.welcomeLeft}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>
                  {username ? username.charAt(0).toUpperCase() : '?'}
                </Text>
              </View>
            )}
            <View style={styles.welcomeTextWrap}>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text numberOfLines={1} style={styles.username}>{username}</Text>
            </View>
          </View>
          <View style={styles.iconGroup}>
            <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={cartPackageCount ? `Cart, ${cartPackageCount} packages` : 'Cart'}
              onPress={() => router.push('/cartmanagement')}>
              <Ionicons name="cart-outline" size={22} color="#FFF" />
              {cartPackageCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartPackageCount > 99 ? '99+' : cartPackageCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={unreadNotifications > 0 ? `Notifications, ${unreadNotifications} unread` : 'Notifications'}
              onPress={() => router.push('/bottomnotification')}>
              <Ionicons name="notifications-outline" size={22} color="#FFF" />
              {unreadNotifications > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.cartBadgeText}>{unreadNotifications > 99 ? '99+' : unreadNotifications}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity style={styles.planButton} activeOpacity={0.8} accessibilityRole="button"
          onPress={() => router.push('/EventDetailsForm')}>
          <Ionicons name="add-circle-outline" size={19} color={COLORS.primaryDark} />
          <Text style={styles.planButtonText}>Plan an Event</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchSection}>
        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <Ionicons name="search-outline" size={20} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search vendors.."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              handleSearch(text);
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setResults([]);
                setShowDropdown(false);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Dropdown */}
        {showDropdown && (
          <View style={styles.dropdownContainer}>
            {results.length > 0 ? (
              <ScrollView
                style={{ maxHeight: 240 }}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
              >
                {results.map(item => (
                  <TouchableOpacity
                    key={item._id}
                    style={styles.dropdownItem}
                    activeOpacity={0.7}
                    onPress={() => {
                      setSearchQuery(item.name);
                      setShowDropdown(false);
                      router.push(`/vendorprofiledetails?id=${item._id}`)
                    }}
                  >
                    <View style={styles.dropdownAvatar}>
                      <Text style={styles.dropdownAvatarText}>
                        {item.name ? item.name.charAt(0).toUpperCase() : '?'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.dropdownNameRow}>
                        <Text style={styles.dropdownName}>{item.name}</Text>

                        {badgeMap[item._id]?.hasBadges && (
                          <View style={styles.badgeDot}>
                            <Text style={styles.badgeIcon}>🏅</Text>
                          </View>
                        )}
                      </View>

                      {!!item.contactDetails?.brandName && (
                        <Text style={styles.dropdownBrand}>
                          {item.contactDetails?.brandName}
                        </Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.noResultContainer}>
                <Ionicons name="alert-circle-outline" size={18} color={COLORS.textMuted} />
                <Text style={styles.noResultText}>No vendor found</Text>
              </View>
            )}
          </View>
        )}
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginTop: 14,
    height: 52,
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  searchInput: {
    flex: 1,
    paddingLeft: 10,
    paddingVertical: 0,
    textAlignVertical: 'center',
    color: COLORS.textDark,
    fontSize: 14,
  },
  dropdownContainer: {
    backgroundColor: COLORS.card,
    marginTop: 8,
    borderRadius: 14,
    elevation: 6,
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    maxHeight: 240,
    zIndex: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dropdownAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dropdownAvatarText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  dropdownName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  dropdownNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  badgeDot: {
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  badgeIcon: {
    fontSize: 10,
  },
  dropdownBrand: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  noResultContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  noResultText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textMuted,
    marginLeft: 6,
  },
  container: { backgroundColor: COLORS.bg },
  searchSection: { paddingHorizontal: 16, paddingBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: {
    width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },

  cartBadge: {
  position: 'absolute',
  top: -5,
  right: -5,
  minWidth: 18,
  height: 18,
  borderRadius: 9,
  backgroundColor: '#D6A943',
  paddingHorizontal: 4,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1.5,
  borderColor: '#FFFFFF',
},

cartBadgeText: {
  color: '#FFFFFF',
  fontSize: 9,
  fontWeight: '800',
},
  notificationBadge: {
    position: 'absolute',
    top: 3,
    right: 3,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderWidth: 1,
    borderColor: COLORS.card,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
    marginHorizontal: 4,
  },
  notificationIcon: {
    padding: 8,
  },
  welcomeCard: {
    backgroundColor: HOME_HEADER_COLOR,
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20, gap: 16,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    shadowColor: COLORS.primaryDark, shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.16, shadowRadius: 8, elevation: 4,
  },
  welcomeTextWrap: { flex: 1 },
  welcomeLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarFallbackText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  welcomeText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.75)',
  },
  username: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 2,
  },
  planButton: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44,
    backgroundColor: '#FFF5E1', paddingHorizontal: 16, borderRadius: 22,
  },
  planButtonText: { color: COLORS.primaryDark, fontSize: 14, fontWeight: '800' },
  cartIconButton: {
    padding: 8,
    marginRight: 4,
  },
});

export default Header;