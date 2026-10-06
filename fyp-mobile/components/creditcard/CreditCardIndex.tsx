

// fyp-mobile/components/creditcard/CreditCardIndex.tsx
import { Ionicons } from '@expo/vector-icons';
import createPayment from '@/services/createPayment';
import payRemainingAmount from '@/services/payRemainingAmount';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TextInputProps,
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
const PRIMARY_DEEP = '#5A0848';

const formatCurrency = (value: number) => `Rs. ${Math.round(value || 0).toLocaleString('en-PK')}`;

// Groups digits into "1234 5678 9012 3456" as the user types.
const formatCardNumber = (raw: string) => {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
};

// Auto-inserts the slash for "MM/YY".
const formatExpiry = (raw: string) => {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};

// ───────────────────────── UI helpers ─────────────────────────

/** Soft one-time entrance, staggered by delay. */
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

type FieldProps = TextInputProps & {
  label: string;
  icon: any;
  valid?: boolean;
  containerStyle?: any;
};

/** Labelled input with focus highlight and a green tick when valid. */
const Field = React.forwardRef<TextInput, FieldProps>(
  (
    {
      label,
      icon,
      valid,
      containerStyle,
      onFocus,
      onBlur,
      ...rest
    },
    ref,
  ) => {
    return (
      <View style={containerStyle}>
        <Text style={styles.label}>
          {label}
        </Text>

        <View style={styles.inputContainer}>
          <View style={styles.inputIconWrap}>
            <Ionicons
              name={icon}
              size={16}
              color={PRIMARY}
            />
          </View>

          <TextInput
            ref={ref}
            placeholderTextColor="#B9A6B3"
            style={styles.input}
            {...rest}
            onFocus={onFocus}
            onBlur={onBlur}
          />

          {!!valid && (
            <Ionicons
              name="checkmark-circle"
              size={20}
              color="#278A4B"
            />
          )}
        </View>
      </View>
    );
  },
);
Field.displayName = 'Field';

const CreditCardPaymentScreen = () => {
  const { vendorOrderId, amount, paymentType } = useLocalSearchParams<{
    vendorOrderId?: string;
    amount?: string;
    paymentType?: 'DOWN_PAYMENT' | 'REMAINING';
  }>();

  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Responsive breakpoints: phones, tablets (portrait), tablets (landscape)
  const isTablet = width >= 700;
  const isWide = width >= 960;
  const contentMaxWidth = isWide ? 980 : isTablet ? 560 : 9999;
  const sidePad = isTablet ? 24 : 16;
  const innerWidth = Math.min(width - sidePad * 2, contentMaxWidth);
  const columnWidth = isWide ? (innerWidth - 24) / 2 : innerWidth;
  const cardWidth = Math.min(columnWidth, 400);
  const cardHeight = cardWidth / 1.586;
  const cardNumberFont = Math.max(15, Math.min(22, cardWidth * 0.058));

  const amountPayable = Number(amount || 0);

  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [rememberCard, setRememberCard] = useState(false);
  const [sendReceipt, setSendReceipt] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const nameRef = useRef<TextInput>(null);
  const numberRef = useRef<TextInput>(null);
  const expiryRef = useRef<TextInput>(null);
  const cvvRef = useRef<TextInput>(null);

  // Card flip (CVV focus shows the back of the card)
  const flip = useRef(new Animated.Value(0)).current;
  const flipTo = (value: 0 | 1) =>
    Animated.timing(flip, {
      toValue: value,
      duration: 480,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();

  const frontRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });

  const nameValid = cardholderName.trim().length > 1;
  const numberValid = cardNumber.replace(/\s/g, '').length === 16;
  const expiryValid = /^\d{2}\/\d{2}$/.test(expiry);
  const cvvValid = cvv.length >= 3;

  const isValid = useMemo(() => {
    return (
      cardholderName.trim().length > 1 &&
      cardNumber.replace(/\s/g, '').length === 16 &&
      /^\d{2}\/\d{2}$/.test(expiry) &&
      cvv.length >= 3
    );
  }, [cardholderName, cardNumber, expiry, cvv]);

  // Preview text for the card face
  const previewNumber = cardNumber
    .replace(/\s/g, '')
    .padEnd(16, '•')
    .replace(/(.{4})/g, '$1 ')
    .trim();

  const handlePayNow = async () => {
    if (!isValid || submitting || !vendorOrderId) {
      return;
    }

    try {
      setSubmitting(true);

      const payment =
        paymentType === 'REMAINING'
          ? await payRemainingAmount(vendorOrderId, 'card')
          : await createPayment(vendorOrderId, 'card');

      Alert.alert(
        'Payment Initiated',
        paymentType === 'REMAINING'
          ? 'Your remaining payment request has been created and is awaiting confirmation.'
          : 'Your down payment request has been created and is awaiting confirmation.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/myevents'),
          },
        ],
      );

      console.log('[Payment Initiated]', payment);
    } catch (error: any) {
      console.error('Payment initiation failed:', error);

      const rawMessage = error?.response?.data?.message;

      const safeMessage =
        typeof rawMessage === 'string'
          ? rawMessage
          : typeof rawMessage?.message === 'string'
            ? rawMessage.message
            : typeof error?.message === 'string'
              ? error.message
              : 'Could not initiate payment. Please try again.';

      Alert.alert('Payment Failed', safeMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const topPad = Math.max(insets.top, 24) + 10;
  const typeLabel = paymentType === 'REMAINING' ? 'Remaining payment' : 'Down payment';

  // ───────────── Card preview (flip) ─────────────
  const cardPreview = (
    <View
      style={[
        styles.cardShadow,
        { width: cardWidth, height: cardHeight, alignSelf: isWide ? 'center' : 'center' },
      ]}
    >
      {/* Front */}
      <Animated.View
        style={[
          styles.cardFace,
          { transform: [{ perspective: 1000 }, { rotateY: frontRotate }] },
        ]}
      >
        <View style={styles.cardCircleA} />
        <View style={styles.cardCircleB} />

        <View style={styles.cardTopRow}>
          <View style={styles.chip}>
            <View style={styles.chipLineH} />
            <View style={styles.chipLineV} />
          </View>

          <View style={styles.cardTopRight}>
            <Ionicons
              name="wifi-outline"
              size={20}
              color="rgba(255,255,255,0.85)"
              style={{ transform: [{ rotate: '90deg' }] }}
            />
            <View style={styles.brandChip}>
              <Image
                source={require('@/assets/images/mastercard.png')}
                style={styles.cardBrandIcon}
                resizeMode="contain"
              />
            </View>
          </View>
        </View>

        <Text
          style={[styles.cardPreviewNumber, { fontSize: cardNumberFont }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {previewNumber}
        </Text>

        <View style={styles.cardPreviewBottomRow}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.cardPreviewLabel}>CARD HOLDER</Text>
            <Text style={styles.cardPreviewValue} numberOfLines={1}>
              {cardholderName ? cardholderName.toUpperCase() : 'YOUR NAME'}
            </Text>
          </View>
          <View>
            <Text style={styles.cardPreviewLabel}>EXPIRES</Text>
            <Text style={styles.cardPreviewValue}>{expiry || 'MM/YY'}</Text>
          </View>
        </View>
      </Animated.View>

      {/* Back */}
      <Animated.View
        style={[
          styles.cardFace,
          styles.cardBack,
          { transform: [{ perspective: 1000 }, { rotateY: backRotate }] },
        ]}
      >
        <View style={styles.magStripe} />

        <View style={styles.cvvRow}>
          <View style={styles.signatureStrip} />
          <View style={styles.cvvBox}>
            <Text style={styles.cvvBoxText}>{cvv ? '•'.repeat(cvv.length) : '•••'}</Text>
          </View>
        </View>
        <Text style={styles.cvvHint}>3-digit security code (CVV)</Text>
      </Animated.View>
    </View>
  );

  const secureNote = (
    <View style={styles.secureNote}>
      <Ionicons name="shield-checkmark-outline" size={15} color="#278A4B" />
      <Text style={styles.secureNoteText}>
        Your card details are encrypted and never stored on our servers
      </Text>
    </View>
  );

  const formSection = (
    <View>
      <Field
        ref={nameRef}
        label="Cardholder Name"
        icon="person-outline"
        placeholder="Name as shown on card"
        value={cardholderName}
        onChangeText={setCardholderName}
        autoCapitalize="words"
        returnKeyType="next"
        onSubmitEditing={() => numberRef.current?.focus()}
        valid={nameValid}
        containerStyle={styles.fieldGap}
      />

      <Field
        ref={numberRef}
        label="Card Number"
        icon="card-outline"
        placeholder="1234 5678 9012 3456"
        keyboardType="numeric"
        value={cardNumber}
        onChangeText={(t) => {
          const formatted = formatCardNumber(t);
          setCardNumber(formatted);
          if (formatted.length === 19) expiryRef.current?.focus();
        }}
        maxLength={19}
        valid={numberValid}
        containerStyle={styles.fieldGap}
      />

      <View style={styles.row}>
        <Field
          ref={expiryRef}
          label="Expiry"
          icon="calendar-outline"
          placeholder="MM/YY"
          keyboardType="numeric"
          value={expiry}
          onChangeText={(t) => {
            const formatted = formatExpiry(t);
            setExpiry(formatted);
            if (formatted.length === 5) cvvRef.current?.focus();
          }}
          maxLength={5}
          valid={expiryValid}
          containerStyle={{ flex: 1 }}
        />

        <Field
          ref={cvvRef}
          label="CVV"
          icon="lock-closed-outline"
          placeholder="CVV"
          keyboardType="numeric"
          secureTextEntry
          value={cvv}
          onChangeText={(t) => setCvv(t.replace(/\D/g, '').slice(0, 4))}
          maxLength={4}
          onFocus={() => flipTo(1)}
          onBlur={() => flipTo(0)}
          valid={cvvValid}
          containerStyle={{ flex: 1 }}
        />
      </View>

      <View style={styles.switchCard}>
        <View style={styles.switchRow}>
          <View style={styles.switchIcon}>
            <Ionicons name="bookmark-outline" size={16} color={PRIMARY} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchTitle}>Remember this card</Text>
            <Text style={styles.switchSubtitle}>Save for faster checkout next time</Text>
          </View>
          <Switch
            value={rememberCard}
            onValueChange={setRememberCard}
            trackColor={{ false: '#E3D3DD', true: ACCENT }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.switchDivider} />

        <View style={styles.switchRow}>
          <View style={styles.switchIcon}>
            <Ionicons name="mail-outline" size={16} color={PRIMARY} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchTitle}>Email me a receipt</Text>
            <Text style={styles.switchSubtitle}>Sent right after payment succeeds</Text>
          </View>
          <Switch
            value={sendReceipt}
            onValueChange={setSendReceipt}
            trackColor={{ false: '#E3D3DD', true: ACCENT }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ───── Header ───── */}
      <View style={[styles.header, { paddingTop: topPad }]}>
        <View style={styles.headerCircleA} pointerEvents="none" />
        <View style={styles.headerCircleB} pointerEvents="none" />

        <View style={[styles.headerInner, { maxWidth: contentMaxWidth }]}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Card Payment</Text>
            <Text style={styles.headerSubtitle}>Secure card checkout</Text>
          </View>

          <View style={styles.headerIconBtn}>
            <Ionicons name="lock-closed" size={17} color="#FFFFFF" />
          </View>
        </View>
      </View>

      {/* ───── Content ───── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: sidePad }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
        <View style={[styles.contentWrap, { maxWidth: contentMaxWidth }]}>
          {isWide ? (
            <View style={styles.wideRow}>
              <FadeInUp style={{ flex: 1, alignItems: 'center' }}>
                {cardPreview}
                {secureNote}
              </FadeInUp>
              <FadeInUp delay={120} style={{ flex: 1 }}>
                {formSection}
              </FadeInUp>
            </View>
          ) : (
            <>
              <FadeInUp style={{ alignItems: 'center' }}>{cardPreview}</FadeInUp>
              <FadeInUp delay={120} style={{ marginTop: 22 }}>
                {formSection}
              </FadeInUp>
              <FadeInUp delay={200}>{secureNote}</FadeInUp>
            </>
          )}
        {/* ───── Pay section inside scroll ───── */}
<View
  style={[
    styles.footer,
    {
      marginTop: 24,
      marginBottom:
        Math.max(insets.bottom, 12) + 12,
    },
  ]}
>
  <View
    style={[
      styles.footerInner,
      {
        maxWidth:
          isWide
            ? 560
            : contentMaxWidth,
      },
    ]}
  >
    <View style={styles.amountRow}>
      <View>
        <Text style={styles.amountLabel}>
          Amount Payable
        </Text>

        <Text style={styles.amountType}>
          {typeLabel}
        </Text>
      </View>

      <Text style={styles.amountValue}>
        {formatCurrency(
          amountPayable,
        )}
      </Text>
    </View>

    <TouchableOpacity
      style={[
        styles.payButton,
        !isValid &&
          styles.payButtonDisabled,
      ]}
      onPress={handlePayNow}
      disabled={
        !isValid ||
        submitting
      }
      activeOpacity={0.85}
    >
      <Text
        style={styles.payButtonText}
        numberOfLines={1}
      >
        {submitting
          ? 'Processing...'
          : `Pay ${formatCurrency(
              amountPayable,
            )}`}
      </Text>

      {!submitting && (
        <Ionicons
          name="lock-closed"
          size={16}
          color="#FFFFFF"
        />
      )}
    </TouchableOpacity>
  </View>
</View>

</View>
</ScrollView>
    </KeyboardAvoidingView>
  );
};

export default CreditCardPaymentScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PRIMARY_LIGHT },

  // ── Header
  header: {
    backgroundColor: PRIMARY,
    paddingBottom: 22,
    paddingHorizontal: 18,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
    alignItems: 'center',
  },
  headerCircleA: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255,255,255,0.07)',
    top: -70,
    right: -40,
  },
  headerCircleB: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: ACCENT,
    opacity: 0.3,
    bottom: -45,
    left: -25,
  },
  headerInner: {
    width: '100%',
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

  // ── Content
  scrollContent: { paddingTop: 22, paddingBottom: 28 },
  contentWrap: { width: '100%', alignSelf: 'center' },
  wideRow: { flexDirection: 'row', gap: 24, alignItems: 'flex-start' },

  // ── Card preview
  cardShadow: {
    backgroundColor: PRIMARY,
    borderRadius: 22,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  cardFace: {
    ...StyleSheet.absoluteFill,
    borderRadius: 22,
    backgroundColor: PRIMARY,
    padding: 18,
    justifyContent: 'space-between',
    overflow: 'hidden',
    backfaceVisibility: 'hidden',
  },
  cardBack: {
    backgroundColor: PRIMARY_DEEP,
    paddingHorizontal: 0,
    paddingTop: 22,
    justifyContent: 'flex-start',
  },
  cardCircleA: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255,255,255,0.07)',
    top: -70,
    right: -50,
  },
  cardCircleB: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: ACCENT,
    opacity: 0.35,
    bottom: -45,
    left: -25,
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTopRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chip: {
    width: 40,
    height: 30,
    borderRadius: 7,
    backgroundColor: PRIMARY_LIGHT,
    opacity: 0.92,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  chipLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: 'rgba(120,12,96,0.35)',
  },
  chipLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1.5,
    backgroundColor: 'rgba(120,12,96,0.35)',
  },
  brandChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  cardBrandIcon: { width: 34, height: 22 },
  cardPreviewNumber: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  cardPreviewBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  cardPreviewLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  cardPreviewValue: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', marginTop: 3 },

  magStripe: { height: 40, backgroundColor: '#1A0414' },
  cvvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
    paddingHorizontal: 18,
    gap: 10,
  },
  signatureStrip: {
    flex: 1,
    height: 36,
    borderRadius: 6,
    backgroundColor: PRIMARY_LIGHT,
    opacity: 0.9,
  },
  cvvBox: {
    minWidth: 62,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  cvvBoxText: { color: PRIMARY, fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  cvvHint: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10.5,
    fontWeight: '600',
    textAlign: 'right',
    paddingHorizontal: 18,
    marginTop: 8,
  },

  // ── Form
  fieldGap: { marginBottom: 14 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '700', color: '#5A4A54', marginBottom: 6 },
  labelFocused: { color: PRIMARY },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 10,
    borderWidth: 1.5,
    borderColor: '#F0DDEA',
  },
  inputContainerFocused: {
    borderColor: PRIMARY,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 3,
  },
  inputIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  inputIconWrapFocused: { backgroundColor: PRIMARY },
  input: { flex: 1, fontSize: 14.5, color: '#1A1A1A', paddingVertical: 14, minWidth: 0 },

  switchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F0DDEA',
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  switchIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchTitle: { fontSize: 13.5, fontWeight: '700', color: '#1A1A1A' },
  switchSubtitle: { fontSize: 11, color: '#8A8A8A', marginTop: 2 },
  switchDivider: { height: 1, backgroundColor: '#F5EAF1', marginVertical: 12 },

  secureNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#E6F7EA',
  },
  secureNoteText: { flex: 1, fontSize: 11.5, color: '#278A4B', fontWeight: '700', lineHeight: 16 },

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
  amountType: { fontSize: 11, color: PRIMARY, fontWeight: '700', marginTop: 2 },
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