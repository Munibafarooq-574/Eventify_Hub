import getPaymentStatus from '@/services/getPaymentStatus';
import { getCardOwnerId, assertCardOwner, listDemoCards, rememberDemoCard, removeDemoCard, type SavedDemoCard } from '@/services/demoSavedCards';
import { DEMO_CARD_OPTIONS, formatCardNumber, formatExpiry, validateCardForm, cardPaymentAmount, isExpiryValid } from '@/utils/cardPaymentValidation';


// fyp-mobile/components/creditcard/CreditCardIndex.tsx
import { Ionicons } from '@expo/vector-icons';
import createPayment from '@/services/createPayment';
import payRemainingAmount from '@/services/payRemainingAmount';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  Animated,
  Easing,
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

const PRIMARY = '#780C60';
const PRIMARY_LIGHT = '#F8E9F0';
const ACCENT = '#B84B9A';
const PRIMARY_DEEP = '#5A0848';

const formatCurrency = (value: number) => `Rs. ${Math.round(value || 0).toLocaleString('en-PK')}`;

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
  const [progress] = useState(() => new Animated.Value(0));

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
  error?: string;
  containerStyle?: any;
};

/** Labelled input with focus highlight and a green tick when valid. */
const Field = React.forwardRef<TextInput, FieldProps>(
  (
    {
      label,
      icon,
      valid,
      error,
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
            autoCorrect={false}
            autoComplete="off"
            importantForAutofill="no"
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
        {!!error && <Text accessibilityRole="alert" style={styles.fieldError}>{error}</Text>}
      </View>
    );
  },
);
Field.displayName = 'Field';

const CreditCardPaymentScreen = () => {
  const { vendorOrderId, paymentType } = useLocalSearchParams<{
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

  const paymentKind = paymentType || 'DOWN_PAYMENT';
  const [amountPayable, setAmountPayable] = useState<number | null>(null);

  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [rememberCard, setRememberCard] = useState(false);
  const [sendReceipt, setSendReceipt] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [savedCards, setSavedCards] = useState<SavedDemoCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [screenError, setScreenError] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const generation = useRef(0);
  const paymentLock = useRef(false);
  const clearForm = useCallback(() => {
    setCardholderName(''); setCardNumber(''); setExpiry(''); setCvv('');
    setRememberCard(false); setTouched({});
  }, []);
  const loadScreen = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true); setScreenError(''); setOwnerId(null); setSavedCards([]); setAmountPayable(null);
    try {
      if (typeof vendorOrderId !== 'string' || !/^[a-f\d]{24}$/i.test(vendorOrderId)) throw new Error('Open card payment from your booking.');
      const id = await getCardOwnerId();
      const financials = await getPaymentStatus(vendorOrderId);
      const payable = cardPaymentAmount(financials, paymentKind, id);
      const cards = await listDemoCards(id);
      await assertCardOwner(id);
      if (request === generation.current) { setOwnerId(id); setSavedCards(cards); setAmountPayable(payable); }
    } catch (error) {
      if (request === generation.current) setScreenError(error instanceof Error ? error.message : 'Could not load payment details.');
    } finally { if (request === generation.current) setLoading(false); }
  }, [vendorOrderId, paymentKind]);
  useFocusEffect(useCallback(() => {
    clearForm(); void loadScreen();
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') { ++generation.current; clearForm(); setOwnerId(null); setSavedCards([]); }
      else void loadScreen();
    });
    return () => { ++generation.current; subscription.remove(); clearForm(); };
  }, [loadScreen, clearForm]));

  async function selectSavedCard(card: SavedDemoCard) {
    if (!ownerId || paymentLock.current) return;
    const request = generation.current;
    try {
      await assertCardOwner(ownerId);
      const financials = await getPaymentStatus(vendorOrderId!);
      cardPaymentAmount(financials, paymentKind, ownerId);
      if (request !== generation.current) return;
      if (!isExpiryValid(card.expiry)) { Alert.alert('Expired test card', 'Remove this shortcut and enter a new expiry.'); return; }
      const demo = DEMO_CARD_OPTIONS.find(item => item.id === card.demoCardId)!;
      setCardholderName(card.name); setCardNumber(formatCardNumber(demo.number));
      setExpiry(card.expiry); setCvv(''); setRememberCard(true); setTouched({});
      cvvRef.current?.focus();
    } catch (error) { clearForm(); setSavedCards([]); setOwnerId(null); setScreenError(error instanceof Error ? error.message : 'Reload payment details.'); }
  }
  async function removeSavedCard(card: SavedDemoCard) {
    if (!ownerId || paymentLock.current) return;
    const request = generation.current;
    try {
      const financials = await getPaymentStatus(vendorOrderId!);
      cardPaymentAmount(financials, paymentKind, ownerId);
      const cards = await removeDemoCard(ownerId, card.demoCardId);
      if (request === generation.current) setSavedCards(cards);
    } catch { Alert.alert('Unable to remove card', 'Please reload and try again.'); }
  }


  const nameRef = useRef<TextInput>(null);
  const numberRef = useRef<TextInput>(null);
  const expiryRef = useRef<TextInput>(null);
  const cvvRef = useRef<TextInput>(null);

  // Card flip (CVV focus shows the back of the card)
  const [flip] = useState(() => new Animated.Value(0));
  const flipTo = (value: 0 | 1) =>
    Animated.timing(flip, {
      toValue: value,
      duration: 480,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();

  const frontRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });

  const validation = validateCardForm({ name: cardholderName, number: cardNumber, expiry, cvv });
  const nameValid = !validation.errors.name;
  const numberValid = !validation.errors.number;
  const expiryValid = !validation.errors.expiry;
  const cvvValid = !validation.errors.cvv;
  const isValid = validation.valid;
  const previewNumber = cardNumber.replace(/\D/g, '').length >= 4
    ? `•••• •••• •••• ${cardNumber.replace(/\D/g, '').slice(-4)}` : '•••• •••• •••• ••••';
  const handlePayNow = async () => {
    const current = validateCardForm({ name: cardholderName, number: cardNumber, expiry, cvv });
    setTouched({ name: true, number: true, expiry: true, cvv: true });
    if (!current.valid || paymentLock.current || loading || !ownerId || !vendorOrderId || amountPayable == null) return;
    paymentLock.current = true;
    const request = generation.current;
    setSubmitting(true);
    let initiated = false;
    try {
      await assertCardOwner(ownerId);
      const latest = await getPaymentStatus(vendorOrderId);
      const payable = cardPaymentAmount(latest, paymentKind, ownerId);
      await assertCardOwner(ownerId);
      if (request !== generation.current) return;
      if (payable !== amountPayable) {
        setAmountPayable(payable);
        Alert.alert('Amount updated', 'Your booking amount changed. Review it before submitting again.'); return;
      }
      // Phase 12A submits only the method. No card number, expiry or CVV leaves this form.
      if (paymentKind === 'REMAINING') await payRemainingAmount(vendorOrderId, 'card', sendReceipt);
      else await createPayment(vendorOrderId, 'card', sendReceipt);
      initiated = true;
      let saveNotice = '';
      if (rememberCard && current.demo && request === generation.current) {
        try {
          const cards = await rememberDemoCard(ownerId, { demoCardId: current.demo.id, name: cardholderName.trim(), expiry });
          if (request === generation.current) setSavedCards(cards);
        } catch { saveNotice = ' The request was created, but the test-card shortcut could not be saved.'; }
      }
      if (request === generation.current) {
        clearForm(); setOwnerId(null);
        Alert.alert('Test payment request created',
          'Your request is awaiting Admin confirmation. No real card has been charged.' + saveNotice,
          [{ text: 'OK', onPress: () => router.replace('/myevents') }]);
      }
    } catch (error: any) {
      if (request === generation.current && !initiated) {
        const raw = error?.response?.data?.message;
        Alert.alert('Payment request failed', typeof raw === 'string' ? raw : typeof error?.message === 'string' ? error.message : 'Could not initiate payment. Please try again.');
      }
    } finally {
      paymentLock.current = false;
      setCvv(''); setSubmitting(false);
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
              <Text style={{ color: PRIMARY, fontWeight: '700', fontSize: 11 }}>{validation.demo?.brand || 'TEST'}</Text>
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
        <Text style={styles.cvvHint}>{validation.demo?.cvvLength || 3}-digit security code (CVV)</Text>
      </Animated.View>
    </View>
  );

  const secureNote = (
    <View style={styles.secureNote}>
      <Ionicons name="shield-checkmark-outline" size={15} color="#278A4B" />
      <Text style={styles.secureNoteText}>
        Test payments only. Card details are not sent to our API. CVV is never saved.
      </Text>
    </View>
  );

  const formSection = (
    <View>
      <View style={styles.testNotice}>
        <Text style={styles.switchTitle}>Test payment — no real money is charged</Text>
        <Text style={styles.switchSubtitle}>Use a test card below, a current/future expiry and a correctly sized test CVV. These checks do not verify a card with a bank.</Text>
        <View style={styles.testOptions}>{DEMO_CARD_OPTIONS.map(card => <TouchableOpacity key={card.id} disabled={submitting || loading || !ownerId} style={styles.testOption} onPress={() => { setCardNumber(formatCardNumber(card.number)); setCvv(''); setTouched({}); expiryRef.current?.focus(); }}><Text style={styles.switchSubtitle}>{card.brand} test</Text></TouchableOpacity>)}</View>
      </View>
      {loading && <Text style={styles.label}>Loading payment details…</Text>}
      {!!screenError && <View style={styles.testNotice}><Text accessibilityRole="alert" style={styles.fieldError}>{screenError}</Text><TouchableOpacity disabled={submitting} onPress={loadScreen}><Text style={styles.switchTitle}>Reload payment details</Text></TouchableOpacity></View>}
      {!!ownerId && savedCards.length > 0 && <View style={styles.switchCard}>
        <Text style={styles.label}>Saved test cards</Text>
        {savedCards.map(card => {
          const demo = DEMO_CARD_OPTIONS.find(item => item.id === card.demoCardId)!;
          return <View key={card.demoCardId} style={styles.savedRow}>
            <TouchableOpacity disabled={submitting} style={{ flex: 1, paddingVertical: 12 }} accessibilityRole="button" onPress={() => selectSavedCard(card)}>
              <Text style={styles.switchTitle}>{demo.brand} •••• {demo.number.slice(-4)}</Text>
              <Text style={styles.switchSubtitle}>{card.name} · {card.expiry}{!isExpiryValid(card.expiry) ? ' · Expired' : ''}</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={submitting} accessibilityRole="button" accessibilityLabel={`Remove saved ${demo.brand} test card`} style={{ padding: 12 }} onPress={() => removeSavedCard(card)}><Ionicons name="trash-outline" size={20} color={PRIMARY} /></TouchableOpacity>
          </View>;
        })}
      </View>}
      <Field
        ref={nameRef}
        label="Cardholder Name"
        editable={!submitting && !loading && !!ownerId}
        maxLength={80}
        onBlur={() => setTouched(value => ({ ...value, name: true }))}
        error={touched.name ? validation.errors.name : undefined}
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
        label="Test Card Number"
        editable={!submitting && !loading && !!ownerId}
        onBlur={() => setTouched(value => ({ ...value, number: true }))}
        error={touched.number ? validation.errors.number : undefined}
        icon="card-outline"
        placeholder="1234 5678 9012 3456"
        keyboardType="numeric"
        value={cardNumber}
        onChangeText={(t) => {
          const formatted = formatCardNumber(t);
          setCardNumber(formatted);
          setCvv('');
        }}
        maxLength={23}
        valid={numberValid}
        containerStyle={styles.fieldGap}
      />

      <View style={styles.row}>
        <Field
          ref={expiryRef}
          label="Expiry"
          editable={!submitting && !loading && !!ownerId}
          onBlur={() => setTouched(value => ({ ...value, expiry: true }))}
          error={touched.expiry ? validation.errors.expiry : undefined}
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
          editable={!submitting && !loading && !!ownerId}
          error={touched.cvv ? validation.errors.cvv : undefined}
          icon="lock-closed-outline"
          placeholder="CVV"
          keyboardType="numeric"
          secureTextEntry
          value={cvv}
          onChangeText={(t) => setCvv(t.replace(/\D/g, '').slice(0, validation.demo?.cvvLength || 3))}
          maxLength={validation.demo?.cvvLength || 3}
          onFocus={() => flipTo(1)}
          onBlur={() => { flipTo(0); setTouched(value => ({ ...value, cvv: true })); }}
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
            <Text style={styles.switchTitle}>Remember this test card</Text>
            <Text style={styles.switchSubtitle}>Save a shortcut for this account. CVV must be entered again.</Text>
          </View>
          <Switch
            disabled={submitting || loading || !ownerId}
            value={rememberCard}
            onValueChange={setRememberCard}
            trackColor={{ false: '#E3D3DD', true: ACCENT }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.switchDivider} />
        <View style={styles.switchRow}>
          <View style={styles.switchIcon}><Ionicons name="mail-outline" size={16} color={PRIMARY} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchTitle}>Email me a receipt</Text>
            <Text style={styles.switchSubtitle}>Send to my account email after payment confirmation.</Text>
          </View>
          <Switch accessibilityLabel="Email me a receipt" disabled={submitting || loading || !ownerId}
            value={sendReceipt} onValueChange={setSendReceipt}
            trackColor={{ false: '#E3D3DD', true: ACCENT }} thumbColor="#FFFFFF" />
        </View>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
            <Text style={styles.headerSubtitle}>Test card checkout</Text>
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
        {amountPayable == null ? '—' : formatCurrency(amountPayable)}
      </Text>
    </View>

    <TouchableOpacity
      style={[
        styles.payButton,
        (!isValid || submitting || loading || !ownerId) && styles.payButtonDisabled,
      ]}
      onPress={handlePayNow}
      disabled={
        !isValid || submitting || loading || !ownerId || amountPayable == null
      }
      activeOpacity={0.85}
    >
      <Text
        style={[styles.payButtonText, (!isValid || loading || !ownerId) && styles.payButtonTextDisabled]}
        numberOfLines={1}
      >
        {submitting
          ? 'Processing...'
          : 'Submit test payment'}
      </Text>

      {!submitting && (
        <Ionicons
          name="lock-closed"
          size={16}
          color={!isValid || loading || !ownerId ? '#6C5363' : '#FFFFFF'}
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
  fieldError: { color: '#A9273B', fontSize: 12, lineHeight: 18, marginTop: 5 },
  testNotice: { padding: 14, borderRadius: 12, backgroundColor: '#FFF4DE', marginBottom: 16, gap: 8 },
  testOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  testOption: { padding: 10, borderWidth: 1, borderColor: '#D9C4D1', borderRadius: 10, backgroundColor: '#fff' },
  savedRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderColor: '#F0DDEA', marginBottom: 8 },
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
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EEDDE7',
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
    borderRadius: 12,
    minHeight: 52,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  payButtonDisabled: {
    backgroundColor: '#EADDE5',
    shadowOpacity: 0,
    elevation: 0,
  },
  payButtonTextDisabled: { color: '#6C5363' },
  payButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14.5, flexShrink: 1 },
});