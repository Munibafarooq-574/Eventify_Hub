import searchVendors from '@/services/searchVendors';
import { getVendorBadgesBulk } from '@/services/getVendorBadgesBulk';
import { VendorBadgeSummary } from '@/types/badge.types';
import { getUserData } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Image,
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

const Header: React.FC = () => {
  const [username, setUsername] = useState(""); // State for username
const [avatar, setAvatar] = useState(""); // Profile picture URL, if set

  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [badgeMap, setBadgeMap] = useState<Record<string, VendorBadgeSummary>>({});

  /*const handleSearch = async (text: string) => {
    if (text.trim().length < 2) return;

    const results = await searchVendors(text);
    console.log(results);
    setResults(results);
    setShowDropdown(true);
  };*/

  const handleSearch = async (text: string) => {
  if (text.trim().length < 2) {
    setResults([]);
    setBadgeMap({});
    setShowDropdown(false);
    return;
  }

  const results = await searchVendors(text);
  console.log(results);

  setResults(results);
  setShowDropdown(true);

  try {
    const ids = results
      .map((item: any) => item._id)
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
    console.error('Badge lookup failed:', error);

    // Badge failure should never break vendor search
    setBadgeMap({});
  }
};

  useEffect(() => {
    fetchUsername(); // Fetch username on component mount
  }, []);

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
    setAvatar(user?.contactDetails?.brandLogo || '');
  } catch (error) {
    console.error('fetchUsername error:', error);
    setUsername('Guest');
    setAvatar('');
  }
};

  return (
    <View style={styles.container}>
      {/* Location and Notification */}
      <View style={styles.header}>
        {/* Cart Icon */}

        <View style={styles.brandRow}>
          <View style={styles.logoDot} />
          <Text style={styles.brandText}>Dashboard</Text>
        </View>

        <View style={styles.iconGroup}>
          <TouchableOpacity
            onPress={() => router.push('/cartmanagment')}
            style={styles.iconButton}
            activeOpacity={0.7}
          >
            <Ionicons name="cart-outline" size={22} color={COLORS.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            activeOpacity={0.7}
            onPress={() => router.push('/bottomnotification')}>
            <Ionicons name="notifications-outline" size={22} color={COLORS.primary} />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>
      </View>

            {/* Welcome Section */}
      <View style={styles.welcomeCard}>
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
            <Text style={styles.username}>{username}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.planButton}
          activeOpacity={0.8} // Add touch opacity
          onPress={() => router.push('/EventDetailsForm')} // Add navigation logic
        >
          <Ionicons name="add-circle-outline" size={16} color="#FFF" style={{ marginRight: 6 }} />
          <Text style={styles.planButtonText}>Plan an Event</Text>
        </TouchableOpacity>
      </View>

      <View>
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
        {showDropdown && results.length > 0 && (
          <View style={styles.dropdownContainer}>
            {results.map((item: any) => (
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
                {/*<View style={{ flex: 1 }}>
                  <Text style={styles.dropdownName}>{item.name}</Text>
                  {!!item.contactDetails?.brandName && (
                    <Text style={styles.dropdownBrand}>{item.contactDetails?.brandName}</Text>
                  )}
                </View>*/}
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
    elevation: 6, // shadow for Android
    shadowColor: COLORS.primaryDark, // shadow for iOS
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    maxHeight: 240,
    zIndex: 10, // important if using dropdown over other elements
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
  container: {
    padding: 16,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.accent,
    marginRight: 8,
  },
  brandText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.3,
  },
  iconGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    paddingVertical: 45,
    paddingHorizontal: 18,
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  welcomeTextWrap: {
    flexShrink: 1,
    paddingRight: 10,
  },
    welcomeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  avatarImage: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  planButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  cartIconButton: {
    padding: 8,
    marginRight: 4,
  },
});

export default Header;