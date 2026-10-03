// fyp-mobile/components/vendorCoupons/CouponsScreen.tsx

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
Linking,
TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Ticket, Percent, Plus } from 'lucide-react-native';

import { getVendorCoupons } from '../../services/getVendorCoupons';
import { deleteVendorCoupon } from '../../services/deleteVendorCoupon';
import { getVendorDiscountCodes } from '../../services/getVendorDiscountCodes';
import { deleteVendorDiscountCode } from '../../services/deleteVendorDiscountCode';
import { getVendorSubscription } from '../../services/getVendorSubscription';
import { getSubscriptionPlans } from '../../services/getSubscriptionPlans';
import {
  DiscountAudience,
  DiscountKind,
  DiscountStatus,
  VendorDiscount,
} from '../../types/discount.types';
import * as Clipboard from 'expo-clipboard';
import axios from 'axios';

// TODO: swap these for EventifyHub's existing theme constants if you have
// a theme/colors file already (e.g. src/theme/colors.ts).
// Brand color (used only for header + primary buttons, as requested):
const tintColorLight = '#7D0C72';
const tintColorDark = '#7D0C72';

const COLORS = {
  primary: tintColorLight,
  primaryDark: '#57084F',
  primaryLight: '#F8E9F6',
  text: '#1F2937',
  muted: '#6B7280',
  border: '#ECE7EA',
  background: '#FAF7F9',
  card: '#FFFFFF',
  success: '#059669',
  warning: '#B45309',
  danger: '#DC2626',
};

const STATUS_COLOR: Record<DiscountStatus, string> = {
  [DiscountStatus.ACTIVE]: COLORS.success,
  [DiscountStatus.EXPIRED]: COLORS.muted,
  [DiscountStatus.CANCELLED]: COLORS.danger,
  [DiscountStatus.EXHAUSTED]: COLORS.warning,
};

type EntryTab = 'coupon' | 'discountCode';

const TAB_CONFIG: Record<EntryTab, { label: string; Icon: typeof Ticket; emptyText: string }> = {
  coupon: { label: 'Coupons', Icon: Ticket, emptyText: 'No coupons yet. Create one to attract more bookings.' },
  discountCode: { label: 'Discount Codes', Icon: Percent, emptyText: 'No discount codes yet. Create one to run a promotion.' },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function discountSummary(entry: VendorDiscount): string {
  return entry.discountType === DiscountKind.PERCENTAGE
    ? `${entry.discountValue}% OFF`
    : `Rs. ${entry.discountValue.toLocaleString()} OFF`;
}

function audienceLabel(
  audience?: string,
): string {
  switch (audience) {
    case 'NEW_CLIENTS':
      return 'New Clients';

    case 'SELECTED_CLIENTS':
      return 'Selected Clients';

    case 'EVERYONE':
    default:
      return 'Everyone';
  }
}
export default function CouponsScreen() {
  const router = useRouter();
const insets = useSafeAreaInsets();

  const { vendorId, initialTab, refresh } = useLocalSearchParams<{
    vendorId?: string;
    initialTab?: string;
    refresh?: string;
  }>();

  const vendorIdValue = Array.isArray(vendorId) ? vendorId[0] : vendorId;

  const initialTabValue = Array.isArray(initialTab) ? initialTab[0] : initialTab;

  const [activeTab, setActiveTab] = useState<EntryTab>(initialTabValue === 'discountCode' ? 'discountCode' : 'coupon');

  const [entries, setEntries] = useState<VendorDiscount[]>([]);
  const [limit, setLimit] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shareEntry, setShareEntry] =
  useState<VendorDiscount | null>(null);

  const [showEmailInput, setShowEmailInput] =
  useState(false);

const [recipientEmail, setRecipientEmail] =
  useState('');

const [sendingEmail, setSendingEmail] =
  useState(false);

    const [notifyingId, setNotifyingId] =
      useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!vendorIdValue) {
      setError('Missing vendorId');
      setLoading(false);
      return;
    }
    try {
      setError(null);
      setLoading(true);
      const [mine, subscription, plans] = await Promise.all([
        activeTab === 'coupon' ? getVendorCoupons(vendorIdValue) : getVendorDiscountCodes(vendorIdValue),
        getVendorSubscription(vendorIdValue),
        getSubscriptionPlans(),
      ]);
      setEntries(mine);
      const planDef = plans.find((p) => p.key === subscription.plan);
      setLimit((activeTab === 'coupon' ? planDef?.limits.couponLimit : planDef?.limits.discountCodeLimit) ?? 0);
    } catch (e: any) {
      setError(e?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [vendorIdValue, activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData, refresh]);

  const activeCount = useMemo(() => entries.filter((e) => e.status === DiscountStatus.ACTIVE).length, [entries]);
  const atLimit = activeCount >= limit;

  const handleCancel = (entry: VendorDiscount) => {
    Alert.alert(`Cancel ${TAB_CONFIG[activeTab].label.slice(0, -1)}`, `Deactivate "${entry.code}"? Customers won't be able to use it anymore.`, [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            setCancellingId(entry._id);
            if (activeTab === 'coupon') {
              await deleteVendorCoupon(vendorIdValue, entry._id);
            } else {
              await deleteVendorDiscountCode(vendorIdValue, entry._id);
            }
            await loadData();
          } catch (e: any) {
            Alert.alert('Could not cancel', e?.message || 'Something went wrong');
          } finally {
            setCancellingId(null);
          }
        },
      },
    ]);
  };

  const getShareMessage = (
  entry: VendorDiscount,
) => {
  const discount = discountSummary(entry);

  return (
    `🎉 Get ${discount} on Eventify Hub.\n` +
    `Use code: ${entry.code}\n` +
    `Valid till ${formatDate(entry.endDate)}`
  );
};

const handleCopyCode = async (
  entry: VendorDiscount,
) => {
  await Clipboard.setStringAsync(entry.code);

  Alert.alert(
    'Copied',
    'Discount code copied',
  );
};

const handleWhatsAppShare = async (
  entry: VendorDiscount,
) => {
  await Clipboard.setStringAsync(entry.code);

  const message =
    getShareMessage(entry);

  const url =
    `https://wa.me/?text=${encodeURIComponent(
      message,
    )}`;

  try {
    await Linking.openURL(url);
    setShareEntry(null);
  } catch {
    Alert.alert(
      'Could not open WhatsApp',
      'The discount code has still been copied.',
    );
  }
};
const handleEmailShare = (
  entry: VendorDiscount,
) => {
  setRecipientEmail('');
  setShowEmailInput(true);
};

const handleSendDiscountEmail = async () => {
  if (!shareEntry || !vendorIdValue) {
    return;
  }

  const email = recipientEmail
    .trim()
    .toLowerCase();

  if (!email) {
    Alert.alert(
      'Email required',
      'Please enter the recipient email address.',
    );
    return;
  }

  const emailPattern =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    Alert.alert(
      'Invalid email',
      'Please enter a valid email address.',
    );
    return;
  }

  try {
    setSendingEmail(true);

    await axios.post(
      `https://eventify-hub.onrender.com/vendor/growth/discount/discount-code/${shareEntry._id}/send-email?vendorId=${vendorIdValue}`,
      {
        email,
      },
    );

    Alert.alert(
      'Email Sent',
      'The branded discount offer has been emailed successfully.',
    );

    setRecipientEmail('');
    setShowEmailInput(false);
    setShareEntry(null);
  } catch (e: any) {
    Alert.alert(
      'Could not send email',
      e?.response?.data?.message ||
        e?.message ||
        'Something went wrong',
    );
  } finally {
    setSendingEmail(false);
  }
};

const handleNotifySelectedClients =
  async (entry: VendorDiscount) => {
    if (!vendorIdValue) {
      return;
    }

    try {
      setNotifyingId(entry._id);

      const response = await axios.post(
        `https://eventify-hub.onrender.com/vendor/growth/discount/discount-code/${entry._id}/notify-selected?vendorId=${vendorIdValue}`,
      );

      const notified =
        Number(
          response.data?.notifiedCount || 0,
        );

      const skipped =
        Number(
          response.data?.skippedCount || 0,
        );

      Alert.alert(
        'Notifications Sent',
        skipped > 0
          ? `${notified} client(s) notified. ${skipped} client(s) could not receive push notifications.`
          : `${notified} selected client(s) notified.`,
      );
    } catch (e: any) {
      Alert.alert(
        'Could not notify clients',
        e?.response?.data?.message ||
          e?.message ||
          'Something went wrong',
      );
    } finally {
      setNotifyingId(null);
    }
  };

  const handleCreatePress = () => {
    if (atLimit) {
      Alert.alert(
        'Limit reached',
        `You can have up to ${limit} active ${TAB_CONFIG[activeTab].label.toLowerCase()} on your plan. Cancel one or upgrade for more.`,
        [
          { text: 'OK', style: 'cancel' },
          {
            text: 'View Plans',
            onPress: () =>
              router.push({
                pathname: '/subscriptionscreen',
                params: { vendorId: vendorIdValue },
              }),
          },
        ],
      );
      return;
    }

    if (activeTab === 'coupon') {
      router.push({
        pathname: '/createcouponscreen',
        params: { vendorId: vendorIdValue },
      });
    } else {
      router.push({
        pathname: '/creatediscountcodescreen',
        params: { vendorId: vendorIdValue },
      });
    }
  };
const Header = () => (
  <View style={styles.headerContainer}>
    {/* Purple Header */}
    <View
      style={[
        styles.header,
        {
          paddingTop: insets.top + 40,
        },
      ]}
    >
      <View style={styles.headerTopRow}>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft
            size={22}
            color="#FFFFFF"
            strokeWidth={2.5}
          />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {TAB_CONFIG[activeTab].label}
          </Text>

          <Text style={styles.headerSubtitle} numberOfLines={1}>
            Manage your promotional codes
          </Text>
        </View>

        {/* Keeps title perfectly centered */}
        <View style={styles.headerIconBtnPlaceholder} />
      </View>
    </View>

    {/* Separate tabs with spacing below purple header */}
    <View style={styles.tabRow}>
      {(Object.keys(TAB_CONFIG) as EntryTab[]).map((tab) => {
        const selected = activeTab === tab;
        const TabIcon = TAB_CONFIG[tab].Icon;

        return (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              selected && styles.tabActive,
            ]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.8}
          >
            <TabIcon
              size={15}
              color={selected ? COLORS.primary : COLORS.muted}
              strokeWidth={2.25}
            />

            <Text
              style={[
                styles.tabText,
                selected && styles.tabTextActive,
              ]}
            >
              {TAB_CONFIG[tab].label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);
  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>
              <Text style={styles.summaryCount}>{activeCount}</Text>
              <Text style={styles.summaryTotal}> / {limit} active</Text>
            </Text>
            <TouchableOpacity style={styles.createButton} onPress={handleCreatePress} activeOpacity={0.85}>
              <Plus size={15} color="#fff" strokeWidth={2.5} />
              <Text style={styles.createButtonText}>Create</Text>
            </TouchableOpacity>
          </View>

          {entries.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.emptyText}>{TAB_CONFIG[activeTab].emptyText}</Text>
            </View>
          ) : (
            entries.map((entry) => (
              <View key={entry._id} style={styles.card}>
                <View style={styles.entryHeaderRow}>
                  <Text style={styles.entryCode}>{entry.code}</Text>
                  <View style={[styles.statusPill, { backgroundColor: STATUS_COLOR[entry.status] + '1A' }]}>
                    <Text style={[styles.statusPillText, { color: STATUS_COLOR[entry.status] }]}>{entry.status}</Text>
                  </View>
                </View>
                <Text style={styles.entryDiscount}>{discountSummary(entry)}</Text>
                {activeTab === 'discountCode' && (
              <Text style={styles.entryMeta}>
                Audience: {audienceLabel(entry.audience)}
              </Text>
            )}
                <Text style={styles.entryMeta}>
                  Min order: Rs. {entry.minimumOrderAmount.toLocaleString()}
                  {entry.maximumDiscountAmount != null && ` · Max discount: Rs. ${entry.maximumDiscountAmount.toLocaleString()}`}
                </Text>
                <Text style={styles.entryMeta}>
                  {formatDate(entry.startDate)} – {formatDate(entry.endDate)}
                </Text>
                <Text style={styles.entryMeta}>
                  Used {entry.usedCount}/{entry.usageLimit}
                </Text>

{activeTab === 'discountCode' &&
  entry.status === DiscountStatus.ACTIVE && (
    <View style={styles.discountCodeActions}>
      {entry.audience ===
        DiscountAudience.SELECTED_CLIENTS && (
        <TouchableOpacity
          style={styles.notifyButton}
          onPress={() =>
            handleNotifySelectedClients(
              entry,
            )
          }
          disabled={
            notifyingId === entry._id
          }
          activeOpacity={0.85}
        >
          {notifyingId === entry._id ? (
            <ActivityIndicator
              size="small"
              color={COLORS.primary}
            />
          ) : (
            <Text
              style={
                styles.notifyButtonText
              }
            >
              Notify Selected Clients
            </Text>
          )}
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.shareButton}
        onPress={() =>
          setShareEntry(entry)
        }
        activeOpacity={0.85}
      >
        <Text
          style={styles.shareButtonText}
        >
          Share Code
        </Text>
      </TouchableOpacity>
    </View>
  )}
                {entry.status === DiscountStatus.ACTIVE && (
                  <TouchableOpacity style={styles.cancelButton} onPress={() => handleCancel(entry)} disabled={cancellingId === entry._id}>
                    {cancellingId === entry._id ? (
                      <ActivityIndicator size="small" color={COLORS.danger} />
                    ) : (
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}

      <Modal
  visible={!!shareEntry}
  transparent
  animationType="fade"
  onRequestClose={() => {
  setShareEntry(null);
  setShowEmailInput(false);
  setRecipientEmail('');
}}
>
  <View style={styles.modalOverlay}>
    <View style={styles.shareModal}>
      <Text style={styles.shareModalTitle}>
        Share Discount Code
      </Text>

      <Text style={styles.shareModalCode}>
        {shareEntry?.code}
      </Text>

      {shareEntry && (
        <>
          <TouchableOpacity
            style={styles.shareOption}
            onPress={() =>
              handleWhatsAppShare(
                shareEntry,
              )
            }
          >
            <Text
              style={
                styles.shareOptionText
              }
            >
              WhatsApp
            </Text>
          </TouchableOpacity>

         <TouchableOpacity
  style={styles.shareOption}
  onPress={() =>
    handleEmailShare(shareEntry)
  }
>
  <Text style={styles.shareOptionText}>
    Email
  </Text>
</TouchableOpacity>

{showEmailInput && (
  <View style={styles.emailShareBox}>
    <Text style={styles.emailShareLabel}>
      Recipient Email
    </Text>

    <TextInput
      style={styles.emailInput}
      value={recipientEmail}
      onChangeText={setRecipientEmail}
      placeholder="client@example.com"
      placeholderTextColor={COLORS.muted}
      keyboardType="email-address"
      autoCapitalize="none"
      autoCorrect={false}
      editable={!sendingEmail}
    />

    <View style={styles.emailButtonRow}>
      <TouchableOpacity
        style={styles.emailCancelButton}
        onPress={() => {
          setShowEmailInput(false);
          setRecipientEmail('');
        }}
        disabled={sendingEmail}
      >
        <Text style={styles.emailCancelText}>
          Cancel
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.emailSendButton,
          sendingEmail &&
            styles.emailSendButtonDisabled,
        ]}
        onPress={handleSendDiscountEmail}
        disabled={sendingEmail}
        activeOpacity={0.85}
      >
        {sendingEmail ? (
          <ActivityIndicator
            size="small"
            color="#FFFFFF"
          />
        ) : (
          <Text style={styles.emailSendText}>
            Send Email
          </Text>
        )}
      </TouchableOpacity>
    </View>
  </View>
)}

          <TouchableOpacity
            style={styles.shareOption}
            onPress={async () => {
              await handleCopyCode(
                shareEntry,
              );
              setShareEntry(null);
            }}
          >
            <Text
              style={
                styles.shareOptionText
              }
            >
              Copy
            </Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity
        style={styles.closeModalButton}
        onPress={() => {
  setShareEntry(null);
  setShowEmailInput(false);
  setRecipientEmail('');
}}
      >
        <Text
          style={
            styles.closeModalButtonText
          }
        >
          Close
        </Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },

  headerContainer: {
  backgroundColor: COLORS.background,
},

header: {
  backgroundColor: COLORS.primary,
  borderBottomLeftRadius: 26,
  borderBottomRightRadius: 26,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.15,
  shadowRadius: 8,
  elevation: 6,
},

headerTopRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingHorizontal: 18,
  paddingBottom: 22,
},

headerIconBtn: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: 'rgba(255,255,255,0.15)',
  justifyContent: 'center',
  alignItems: 'center',
},

headerIconBtnPlaceholder: {
  width: 40,
  height: 40,
},

headerTitleWrap: {
  flex: 1,
  alignItems: 'center',
},

headerTitle: {
  fontSize: 19,
  fontWeight: '800',
  color: '#FFFFFF',
},

headerSubtitle: {
  fontSize: 12,
  color: 'rgba(255,255,255,0.75)',
  marginTop: 2,
  textAlign: 'center',
},

  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.background,
  },
  tabActive: { backgroundColor: COLORS.primaryLight },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.muted },
  tabTextActive: { color: COLORS.primary },

  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  errorText: { color: COLORS.muted, marginBottom: 12 },
  retryButton: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryButtonText: { color: '#fff', fontWeight: '600' },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  summaryText: { fontSize: 13 },
  summaryCount: { fontWeight: '800', color: COLORS.text },
  summaryTotal: { color: COLORS.muted },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  createButtonText: { color: '#fff', fontWeight: '700', fontSize: 13.5 },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
    shadowColor: '#3B0836',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  emptyText: { fontSize: 13.5, color: COLORS.muted, textAlign: 'center' },

  entryHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  entryCode: { fontSize: 17, fontWeight: '800', color: COLORS.text, letterSpacing: 0.5 },
  statusPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  statusPillText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },

  entryDiscount: { fontSize: 15, fontWeight: '700', color: COLORS.primary, marginTop: 4 },
  entryMeta: { fontSize: 12.5, color: COLORS.muted, marginTop: 4 },

  cancelButton: { marginTop: 12, alignSelf: 'flex-start' },
  cancelButtonText: { color: COLORS.danger, fontSize: 12.5, fontWeight: '700' },
  discountCodeActions: {
  marginTop: 12,
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
},

shareButton: {
  paddingHorizontal: 14,
  paddingVertical: 9,
  borderRadius: 10,
  backgroundColor: COLORS.primary,
},

shareButtonText: {
  color: '#FFFFFF',
  fontSize: 12.5,
  fontWeight: '700',
},

notifyButton: {
  paddingHorizontal: 14,
  paddingVertical: 9,
  borderRadius: 10,
  backgroundColor: COLORS.primaryLight,
  borderWidth: 1,
  borderColor: COLORS.primary,
},

notifyButtonText: {
  color: COLORS.primary,
  fontSize: 12.5,
  fontWeight: '700',
},

modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.45)',
  justifyContent: 'center',
  alignItems: 'center',
  padding: 24,
},

shareModal: {
  width: '100%',
  maxWidth: 360,
  backgroundColor: COLORS.card,
  borderRadius: 18,
  padding: 20,
},

shareModalTitle: {
  fontSize: 17,
  fontWeight: '800',
  color: COLORS.text,
  textAlign: 'center',
},

shareModalCode: {
  marginTop: 8,
  marginBottom: 18,
  fontSize: 22,
  fontWeight: '800',
  color: COLORS.primary,
  textAlign: 'center',
  letterSpacing: 1,
},

shareOption: {
  paddingVertical: 13,
  paddingHorizontal: 14,
  borderRadius: 10,
  backgroundColor: COLORS.background,
  borderWidth: 1,
  borderColor: COLORS.border,
  marginBottom: 9,
  alignItems: 'center',
},

shareOptionText: {
  color: COLORS.text,
  fontSize: 14,
  fontWeight: '700',
},

closeModalButton: {
  marginTop: 5,
  paddingVertical: 10,
  alignItems: 'center',
},
emailShareBox: {
  marginTop: 2,
  marginBottom: 12,
  padding: 14,
  borderRadius: 12,
  backgroundColor: COLORS.primaryLight,
  borderWidth: 1,
  borderColor: COLORS.border,
},

emailShareLabel: {
  fontSize: 12.5,
  fontWeight: '700',
  color: COLORS.text,
  marginBottom: 8,
},

emailInput: {
  width: '100%',
  backgroundColor: COLORS.card,
  borderWidth: 1,
  borderColor: COLORS.border,
  borderRadius: 10,
  paddingHorizontal: 12,
  paddingVertical: 11,
  fontSize: 14,
  color: COLORS.text,
},

emailButtonRow: {
  flexDirection: 'row',
  justifyContent: 'flex-end',
  alignItems: 'center',
  gap: 8,
  marginTop: 10,
},

emailCancelButton: {
  paddingHorizontal: 14,
  paddingVertical: 10,
  borderRadius: 9,
  backgroundColor: COLORS.card,
  borderWidth: 1,
  borderColor: COLORS.border,
},

emailCancelText: {
  color: COLORS.muted,
  fontSize: 12.5,
  fontWeight: '700',
},

emailSendButton: {
  minWidth: 105,
  minHeight: 38,
  paddingHorizontal: 15,
  paddingVertical: 10,
  borderRadius: 9,
  backgroundColor: COLORS.primary,
  alignItems: 'center',
  justifyContent: 'center',
},

emailSendButtonDisabled: {
  opacity: 0.65,
},

emailSendText: {
  color: '#FFFFFF',
  fontSize: 12.5,
  fontWeight: '700',
},
closeModalButtonText: {
  color: COLORS.muted,
  fontSize: 13,
  fontWeight: '600',
},
});