// fyp-mobile/components/paymentmethod/PaymentMethodIndex.tsx
import getBookingFinancials from '@/services/getBookingFinancials';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Large system font sizes ko limit karo taake layout na tootay
(Text as any).defaultProps = {
  ...((Text as any).defaultProps || {}),
  maxFontSizeMultiplier: 1.2,
};

const PRIMARY = '#780C60';
const PRIMARY_LIGHT = '#F8E9F0';
const ACCENT = '#B84B9A';

const STEPS = ['Cart', 'Payment', 'Confirm'];
const CURRENT_STEP = 1; // 0-indexed: Payment is active

type Method = {
  id: number;
  name: string;
  description: string;
  icon: any;
  route: '/creditcard' | '/jazzcash' | '/easypaisa';
};

const METHODS: Method[] = [
  {
    id: 1,
    name: 'Credit / Debit Card',
    description: 'Visa, Mastercard & more',
    icon: require('@/assets/images/mastercard.png'),
    route: '/creditcard',
  },
  {
    id: 2,
    name: 'JazzCash',
    description: 'Pay from your JazzCash wallet',
    icon: require('@/assets/images/jazzcash.png'),
    route: '/jazzcash',
  },
  {
    id: 3,
    name: 'EasyPaisa',
    description: 'Easypaisa mobile account required',
    icon: require('@/assets/images/easypaisa.png'),
    route: '/easypaisa',
  },
];

const formatCurrency = (value: number) => `Rs. ${Math.round(value || 0).toLocaleString('en-PK')}`;

// Shape returned by /payment/vendor-order/:id/financials.
// Adjust these field names if your backend response uses different keys.
type BookingFinancials = {
  vendorOrderId: string;
  totalAmount: number;

  downPaymentType?: string | null;
  downPaymentPercentage?: number | null;
  downPaymentAmount: number;

  remainingAmount: number;

  paidSoFar: number;
  outstandingAmount: number;

  fullyPaid: boolean;
  paymentStatus: string;
  paymentDeadline?: string | null;

  serviceName?: string;
};

// ───────────────────────── UI helpers ─────────────────────────

/** Single soft entrance for the page content. */
const FadeInUp = ({
  delay = 0,
  children,
  style,
}: {
  delay?: number;
  children: React.ReactNode;
  style?: any;
}) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 450,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [delay, progress]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [18, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

/** Payment method row with press feedback + animated check. */
const MethodCard = ({
  method,
  selected,
  onPress,
}: {
  method: Method;
  selected: boolean;
  onPress: () => void;
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const check = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(check, {
      toValue: selected ? 1 : 0,
      friction: 6,
      tension: 160,
      useNativeDriver: true,
    }).start();
  }, [selected, check]);

  const pressIn = () =>
    Animated.spring(scale, { toValue: 0.97, speed: 40, bounciness: 0, useNativeDriver: true }).start();
  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, speed: 24, bounciness: 6, useNativeDriver: true }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={[styles.methodCard, selected && styles.methodCardSelected]}
      >
        <View style={[styles.methodIconWrap, selected && styles.methodIconWrapSelected]}>
          <Image source={method.icon} style={styles.methodIcon} resizeMode="contain" />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.methodName}>{method.name}</Text>
          <Text style={styles.methodDescription}>{method.description}</Text>
        </View>

        <View style={[styles.radioOuter, selected && styles.radioOuterActive]}>
          <Animated.View
            style={{
              opacity: check,
              transform: [{ scale: check }],
            }}
          >
            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const PaymentMethodScreen = () => {
  // vendorOrderId is passed in as a route param when navigating here, e.g.
  // router.push({ pathname: '/paymentmethod', params: { vendorOrderId } })
  const { vendorOrderId } = useLocalSearchParams<{ vendorOrderId?: string }>();

  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Responsive breakpoints: phones, tablets (portrait), tablets (landscape)
  const isTablet = width >= 700;
  const isWide = width >= 960;
  const contentMaxWidth = isWide ? 1000 : isTablet ? 640 : 9999;
  const amountFontSize = width < 340 ? 32 : isTablet ? 52 : 40;

  const [selectedMethod, setSelectedMethod] = useState<number | null>(null);
  const [financials, setFinancials] = useState<BookingFinancials | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const progressAnim = useRef(new Animated.Value(0)).current;

  const loadFinancials = useCallback(async () => {
    if (!vendorOrderId) {
      setError('Missing booking reference.');
      setLoading(false);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const data = await getBookingFinancials(vendorOrderId);
      setFinancials(data);
    } catch (err) {
      console.error('Error fetching booking financials:', err);
      setError('Could not load payment details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [vendorOrderId]);

  useEffect(() => {
    loadFinancials();
  }, [loadFinancials]);

  const selected = METHODS.find((m) => m.id === selectedMethod);

  // Whichever amount is actually due right now: down payment first,
  // then the remaining balance once the down payment is settled.
  const normalizedPaymentStatus = String(financials?.paymentStatus || '').toUpperCase();

  const isRemainingPayment = normalizedPaymentStatus === 'PARTIALLY_PAID';

  const amountDue = !financials
    ? 0
    : isRemainingPayment
      ? Number(financials.outstandingAmount || 0)
      : Number(financials.downPaymentAmount || 0);

  const amountLabel = !financials
    ? 'Amount Payable'
    : isRemainingPayment
      ? 'Remaining Payment'
      : 'Down Payment';

  const downPaymentSettled =
    normalizedPaymentStatus === 'PARTIALLY_PAID' || normalizedPaymentStatus === 'PAID';

  // Progress (display only)
  const paidPercent =
    financials && Number(financials.totalAmount) > 0
      ? Math.max(
          0,
          Math.min(100, (Number(financials.paidSoFar || 0) / Number(financials.totalAmount)) * 100),
        )
      : 0;

  useEffect(() => {
    if (!financials) return;
    Animated.timing(progressAnim, {
      toValue: paidPercent,
      duration: 800,
      delay: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [financials, paidPercent, progressAnim]);

  const deadlineText = (() => {
    if (!financials?.paymentDeadline) return null;
    const d = new Date(financials.paymentDeadline);
    return Number.isNaN(d.getTime()) ? null : d.toLocaleString();
  })();

  const handlePayNow = () => {
    if (!selected || !financials) {
      return;
    }

    router.push({
      pathname: selected.route,
      params: {
        vendorOrderId,
        amount: String(amountDue),

        paymentType: isRemainingPayment ? 'REMAINING' : 'DOWN_PAYMENT',
      },
    });
  };

  const topPad = Math.max(insets.top, 24) + 10;

  // ───────────── Loading / error ─────────────
  if (loading) {
    return (
      <View style={[styles.container, styles.centerState]}>
        <View style={styles.stateIconWrap}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
        <Text style={styles.loadingText}>Loading payment details...</Text>
      </View>
    );
  }

  if (error || !financials) {
    return (
      <View style={[styles.container, styles.centerState]}>
        <View style={[styles.stateIconWrap, { backgroundColor: '#FDEAEC' }]}>
          <Ionicons name="alert-circle-outline" size={42} color="#D9534F" />
        </View>
        <Text style={styles.errorTitle}>Couldn't load payment details</Text>
        <Text style={styles.errorText}>{error || 'Something went wrong.'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadFinancials} activeOpacity={0.85}>
          <Ionicons name="refresh" size={14} color="#FFFFFF" />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ───────────── Pieces ─────────────
  const summaryCard = (
    <View style={styles.breakdownCard}>
      <View style={styles.breakdownHeader}>
        <View style={styles.breakdownIcon}>
          <Ionicons name="receipt-outline" size={16} color={PRIMARY} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.breakdownTitle}>Payment summary</Text>
          {!!financials.serviceName && (
            <Text style={styles.breakdownServiceName} numberOfLines={1}>
              {financials.serviceName}
            </Text>
          )}
        </View>
      </View>

      {/* Progress */}
      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
                extrapolate: 'clamp',
              }),
            },
          ]}
        />
      </View>
      <Text style={styles.progressCaption}>
        {Math.round(paidPercent)}% paid of {formatCurrency(financials.totalAmount)}
      </Text>

      <View style={styles.breakdownRow}>
        <Text style={styles.breakdownLabel}>Total</Text>
        <Text style={styles.breakdownValue}>{formatCurrency(financials.totalAmount)}</Text>
      </View>

      <View style={styles.breakdownRow}>
        <View style={styles.labelWithBadge}>
          <Text style={styles.breakdownLabel}>Down Payment</Text>
          {downPaymentSettled && (
            <View style={styles.paidBadge}>
              <Ionicons name="checkmark" size={10} color="#278A4B" />
              <Text style={styles.paidBadgeText}>Paid</Text>
            </View>
          )}
        </View>
        <Text style={[styles.breakdownValue, downPaymentSettled && styles.breakdownValuePaid]}>
          {formatCurrency(financials.downPaymentAmount)}
        </Text>
      </View>

      <View style={styles.breakdownDivider} />

      <View style={styles.breakdownRow}>
        <Text style={styles.breakdownLabelBold}>Remaining</Text>
        <Text style={styles.breakdownValueBold}>
  {formatCurrency(
    normalizedPaymentStatus ===
      'PARTIALLY_PAID'
      ? financials.outstandingAmount
      : financials.remainingAmount,
  )}
</Text>
      </View>
    </View>
  );

  const methodsSection = (
    <View>
      <Text style={styles.sectionTitle}>Choose how you'd like to pay</Text>
      <Text style={styles.sectionSubtitle}>
        Your payment is processed securely. We never store your card details.
      </Text>

      {METHODS.map((method) => (
        <MethodCard
          key={method.id}
          method={method}
          selected={selectedMethod === method.id}
          onPress={() => setSelectedMethod(method.id)}
        />
      ))}

      <View style={styles.secureNote}>
        <Ionicons name="shield-checkmark-outline" size={15} color="#278A4B" />
        <Text style={styles.secureNoteText}>256-bit encrypted secure payment</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
    {/* Purple backdrop: iOS bounce par upar purple dikhe */}
      <View style={styles.topBackdrop} pointerEvents="none" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
      {/* ───── Header with amount hero ───── */}
      <View style={[styles.header, { paddingTop: topPad }]}>
        <View style={styles.headerCircleA} pointerEvents="none" />
        <View style={styles.headerCircleB} pointerEvents="none" />

        <View style={[styles.headerInner, { maxWidth: contentMaxWidth }]}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.headerTitleWrap}>
              <Text style={styles.headerTitle}>Payment</Text>
              <Text style={styles.headerSubtitle}>Step 2 of 3</Text>
            </View>

            <View style={styles.headerIconBtn} />
          </View>

          <View style={styles.heroBlock}>
            <View style={styles.heroChip}>
              <Ionicons name="wallet-outline" size={12} color="#FFFFFF" />
              <Text style={styles.heroChipText}>{amountLabel} due</Text>
            </View>

            <Text
              style={[styles.heroAmount, { fontSize: amountFontSize }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {formatCurrency(amountDue)}
            </Text>

            {!!deadlineText && (
              <View style={styles.heroDeadline}>
                <Ionicons name="alarm-outline" size={13} color="rgba(255,255,255,0.85)" />
                <Text style={styles.heroDeadlineText}>Pay before {deadlineText}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

            {/* ───── Content ───── */}
        <View
          style={[
            styles.contentWrap,
            { maxWidth: contentMaxWidth, paddingHorizontal: isTablet ? 24 : 16 },
          ]}
        >
          {/* Stepper */}
          <FadeInUp style={styles.stepperCard}>
            <View style={styles.stepperRow}>
              {STEPS.map((label, index) => {
                const done = index < CURRENT_STEP;
                const active = index === CURRENT_STEP;

                return (
                  <React.Fragment key={label}>
                    <View style={styles.stepItem}>
                      <View style={[styles.stepDot, (done || active) && styles.stepDotActive]}>
                        {done ? (
                          <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                        ) : (
                          <Text style={[styles.stepDotText, active && styles.stepDotTextActive]}>
                            {index + 1}
                          </Text>
                        )}
                      </View>
                      <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>
                        {label}
                      </Text>
                    </View>

                    {index < STEPS.length - 1 && (
                      <View style={[styles.stepConnector, done && styles.stepConnectorActive]} />
                    )}
                  </React.Fragment>
                );
              })}
            </View>
          </FadeInUp>

          {isWide ? (
            <View style={styles.wideRow}>
              <FadeInUp delay={90} style={{ flex: 0.9 }}>
                {summaryCard}
              </FadeInUp>
              <FadeInUp delay={170} style={{ flex: 1.1 }}>
                {methodsSection}
              </FadeInUp>
            </View>
          ) : (
            <>
              <FadeInUp delay={90}>{summaryCard}</FadeInUp>
              <FadeInUp delay={170}>{methodsSection}</FadeInUp>
            </>
          )}
        </View>
      </ScrollView>

      {/* ───── Sticky footer ───── */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>
        <View style={[styles.footerInner, { maxWidth: isWide ? 640 : contentMaxWidth }]}>
          <View style={styles.amountRow}>
            <View>
              <Text style={styles.amountLabel}>{amountLabel}</Text>
              {!!selected && (
                <Text style={styles.amountVia}>via {selected.name}</Text>
              )}
            </View>
            <Text style={styles.amountValue}>{formatCurrency(amountDue)}</Text>
          </View>

          <TouchableOpacity
            style={[styles.payButton, !selected && styles.payButtonDisabled]}
            onPress={handlePayNow}
            disabled={!selected}
            activeOpacity={0.85}
          >
            {!selected && <Ionicons name="card-outline" size={18} color="#FFFFFF" />}
            <Text style={styles.payButtonText} numberOfLines={1}>
              {selected ? `Pay with ${selected.name}` : 'Select a payment method'}
            </Text>
            {selected && <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default PaymentMethodScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PRIMARY_LIGHT },

  // ── States
  centerState: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  stateIconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: PRIMARY,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  loadingText: { marginTop: 16, fontSize: 13, color: '#8A8A8A', fontWeight: '600' },
  errorTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A1A', marginTop: 18 },
  errorText: { fontSize: 12.5, color: '#8A8A8A', textAlign: 'center', marginTop: 6, lineHeight: 18 },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 18,
    backgroundColor: PRIMARY,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  backLink: { marginTop: 14, padding: 6 },
  backLinkText: { color: PRIMARY, fontSize: 13, fontWeight: '700' },

  // ── Header
  header: {
    backgroundColor: PRIMARY,
    paddingBottom: 30,
    paddingHorizontal: 18,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    alignItems: 'center',
  },
  headerCircleA: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.07)',
    top: -80,
    right: -50,
  },
  headerCircleB: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: ACCENT,
    opacity: 0.35,
    bottom: -50,
    left: -30,
  },
  headerInner: { width: '100%' },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleWrap: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  heroBlock: { alignItems: 'center', marginTop: 22 },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  heroChipText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  heroAmount: {
    color: '#FFFFFF',
    fontWeight: '900',
    marginTop: 10,
    letterSpacing: 0.3,
    maxWidth: '100%',
  },
  heroDeadline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
  },
  heroDeadlineText: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600' },

  // ── Content
    scrollContent: { flexGrow: 1, paddingBottom: 24, backgroundColor: PRIMARY_LIGHT },
  topBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 320,
    backgroundColor: PRIMARY,
  },
  contentWrap: { width: '100%', alignSelf: 'center' },
  wideRow: { flexDirection: 'row', gap: 20, alignItems: 'flex-start' },

  stepperCard: {
    backgroundColor: '#FFFFFF',
    marginTop: 18,
    marginBottom: 18,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  stepperRow: { flexDirection: 'row', alignItems: 'center' },
  stepItem: { alignItems: 'center', width: 64 },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#EFEFEF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: { backgroundColor: PRIMARY },
  stepDotText: { fontSize: 12, fontWeight: '700', color: '#999999' },
  stepDotTextActive: { color: '#FFFFFF' },
  stepLabel: { fontSize: 11, color: '#999999', marginTop: 6, fontWeight: '600' },
  stepLabelActive: { color: PRIMARY, fontWeight: '800' },
  stepConnector: { flex: 1, height: 2, backgroundColor: '#EFEFEF', marginBottom: 18 },
  stepConnectorActive: { backgroundColor: PRIMARY },

  // ── Summary
  breakdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: '#F0DDEA',
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  breakdownIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakdownTitle: { fontSize: 14, fontWeight: '800', color: '#1A1A1A' },
  breakdownServiceName: { fontSize: 12, fontWeight: '700', color: PRIMARY, marginTop: 2 },

  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: PRIMARY_LIGHT,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: PRIMARY,
  },
  progressCaption: {
    fontSize: 11,
    color: '#8A8A8A',
    fontWeight: '600',
    marginTop: 6,
    marginBottom: 8,
  },

  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    gap: 10,
  },
  labelWithBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 10,
    backgroundColor: '#E6F7EA',
  },
  paidBadgeText: { fontSize: 10, fontWeight: '800', color: '#278A4B' },
  breakdownLabel: { fontSize: 12.5, color: '#8A8A8A', fontWeight: '600' },
  breakdownValue: { fontSize: 13.5, color: '#1A1A1A', fontWeight: '700' },
  breakdownValuePaid: { color: '#278A4B' },
  breakdownDivider: { height: 1, backgroundColor: '#F0DDEA', marginVertical: 8 },
  breakdownLabelBold: { fontSize: 13.5, color: '#1A1A1A', fontWeight: '800' },
  breakdownValueBold: { fontSize: 18, color: PRIMARY, fontWeight: '900' },

  // ── Methods
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  sectionSubtitle: { fontSize: 12, color: '#8A8A8A', marginTop: 4, marginBottom: 16, lineHeight: 17 },

  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#F0DDEA',
  },
  methodCardSelected: {
    borderColor: PRIMARY,
    backgroundColor: '#FFF7FB',
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 4,
  },
  methodIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: PRIMARY_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  methodIconWrapSelected: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F0DDEA' },
  methodIcon: { width: 30, height: 30 },
  methodName: { fontSize: 14.5, fontWeight: '700', color: '#1A1A1A' },
  methodDescription: { fontSize: 11.5, color: '#8A8A8A', marginTop: 2 },

  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D9C4D1',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  radioOuterActive: { borderColor: PRIMARY, backgroundColor: PRIMARY },

  secureNote: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#E6F7EA',
  },
  secureNoteText: { fontSize: 11.5, color: '#278A4B', fontWeight: '700' },

  // ── Footer
  footer: {
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
    paddingHorizontal: 16,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
    alignItems: 'center',
  },
  footerInner: { width: '100%' },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  amountLabel: { fontSize: 13, color: '#8A8A8A', fontWeight: '600' },
  amountVia: { fontSize: 11, color: PRIMARY, fontWeight: '700', marginTop: 2 },
  amountValue: { fontSize: 22, fontWeight: '900', color: PRIMARY },

  payButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: PRIMARY,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  payButtonDisabled: {
    backgroundColor: '#D9C4D1',
    shadowOpacity: 0,
    elevation: 0,
  },
  payButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14.5, flexShrink: 1 },
});