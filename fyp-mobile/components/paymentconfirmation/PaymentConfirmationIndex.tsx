import getPaymentStatus from '@/services/getPaymentStatus';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import { router, useLocalSearchParams } from 'expo-router';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

const PRIMARY = '#780C60';
const PRIMARY_LIGHT = '#F8E9F0';
const TICKET_BG = '#FFFFFF';
const SUCCESS = '#278A4B';

const formatCurrency = (value: number) =>
  `Rs. ${Math.round(value || 0).toLocaleString('en-PK')}`;

const toOrderRef = (id?: string) => {
  if (!id) {
    return 'EH-N/A';
  }
  return `EH-${id.slice(-8).toUpperCase()}`;
};

/* ---------- Ticket helpers ---------- */

const DashedLine = () => (
  <View style={styles.dashedWrap}>
    <View style={styles.dashedInner} />
  </View>
);

const Notches = () => (
  <>
    <View style={[styles.notch, styles.notchLeft]} />
    <View style={[styles.notch, styles.notchRight]} />
  </>
);

const ScallopedBottom = () => {
  const [width, setWidth] = useState(0);
  const size = 16;
  const gap = 8;
  const count = width ? Math.ceil(width / (size + gap)) + 1 : 0;

  return (
    <View
      style={styles.scallopWrap}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.scallopCircle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              left: i * (size + gap) + gap / 2 - 4,
              top: 12 - size / 2,
            },
          ]}
        />
      ))}
    </View>
  );
};

const PaymentConfirmationScreen = () => {
  const { vendorOrderId } = useLocalSearchParams<{
    vendorOrderId?: string;
  }>();

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<any>(null);
  const qrRef = useRef<any>(null);

  const loadPayment = useCallback(async () => {
    if (!vendorOrderId) {
      setError('Missing booking reference.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await getPaymentStatus(vendorOrderId);

      if (!data?.latestSuccessfulPayment) {
        setPaymentData(null);
        setError('No confirmed payment receipt is available yet.');
        return;
      }

      setPaymentData(data);
    } catch (err) {
      console.error('Error loading payment receipt:', err);
      setError('Could not load payment receipt.');
    } finally {
      setLoading(false);
    }
  }, [vendorOrderId]);

  useEffect(() => {
    loadPayment();
  }, [loadPayment]);

  const successfulPayment = paymentData?.latestSuccessfulPayment;

  const amountPaid = Number(successfulPayment?.amount || 0);
  const paymentMethod = String(successfulPayment?.method || 'N/A');
  const paymentType = String(successfulPayment?.type || '');

  const transactionRef =
    successfulPayment?.transactionRef ||
    successfulPayment?.paymentId ||
    'N/A';

  const orderRef = useMemo(() => toOrderRef(vendorOrderId), [vendorOrderId]);

  const paidAt = useMemo(
    () =>
      successfulPayment?.paidAt ? new Date(successfulPayment.paidAt) : null,
    [successfulPayment?.paidAt],
  );

  const dateTimeLabel =
    paidAt && !Number.isNaN(paidAt.getTime())
      ? `${paidAt.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })} · ${paidAt.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })}`
      : 'N/A';

  const paymentTypeLabel =
    paymentType === 'DOWN_PAYMENT'
      ? 'Down Payment'
      : paymentType === 'REMAINING'
        ? 'Remaining Payment'
        : paymentType || 'N/A';

  const paymentMethodLabel =
    paymentMethod === 'card'
      ? 'Credit / Debit Card'
      : paymentMethod === 'jazzcash'
        ? 'JazzCash'
        : paymentMethod === 'easypaisa'
          ? 'EasyPaisa'
          : paymentMethod;

  const details = [
    { label: 'Order Reference', value: orderRef },
    { label: 'Payment Type', value: paymentTypeLabel },
    { label: 'Amount Paid', value: formatCurrency(amountPaid) },
    { label: 'Payment Method', value: paymentMethodLabel },
    { label: 'Transaction Reference', value: String(transactionRef) },
    { label: 'Date & Time', value: dateTimeLabel },
    { label: 'Status', value: 'Successful' },
  ];

  // Data stored inside the QR code (keep it short & non-sensitive)
 const verificationUrl =
  String(
    successfulPayment
      ?.verificationUrl ||
      '',
  );

const qrValue =
  verificationUrl;
  const handleSaveReceipt = async () => {
    if (saving) return;

   setSaving(true);

try {
  let qrDataUrl = '';

  if (
    qrRef.current &&
    verificationUrl
  ) {
    qrDataUrl =
      await new Promise<string>(
        (resolve) => {
          qrRef.current.toDataURL(
            (data: string) => {
              resolve(
                `data:image/png;base64,${data}`,
              );
            },
          );
        },
      );
  }
      const html = `
        <html>
          <head>
            <style>
              body {
                font-family: Arial, sans-serif;
                padding: 24px;
                color: #1A1A1A;
              }

              .brand {
                font-size: 20px;
                font-weight: 800;
                color: ${PRIMARY};
                margin-bottom: 4px;
              }

              .muted {
                color: #8A8A8A;
                font-size: 12px;
                margin-bottom: 20px;
              }

              .row {
                display: flex;
                justify-content: space-between;
                padding: 10px 0;
                border-bottom: 1px dashed #F0DDEA;
              }

              .label {
                color: #8A8A8A;
                font-size: 13px;
              }

              .value {
                font-weight: 700;
                font-size: 13px;
              }

              .total {
                font-size: 18px;
                font-weight: 800;
                color: ${PRIMARY};
              }

              .qr-section {
              text-align: center;
              margin-top: 28px;
              padding-top: 22px;
              border-top: 1px dashed #780C60;
            }

            .qr-title {
              font-size: 13px;
              font-weight: 700;
              margin-bottom: 12px;
            }

            .qr-image {
              width: 120px;
              height: 120px;
}
            </style>
          </head>

          <body>
            <div class="brand">Eventify Hub</div>
            <div class="muted">Payment Receipt</div>

            ${details
              .map(
                (detail) => `
                  <div class="row">
                    <span class="label">${detail.label}</span>
                    <span class="value ${
                      detail.label === 'Amount Paid' ? 'total' : ''
                    }">${detail.value}</span>
                  </div>
                `,
              )
              .join('')}
              ${qrDataUrl
  ? `
    <div class="qr-section">
      <div class="qr-title">
        Scan to verify this payment
      </div>

      <img
        src="${qrDataUrl}"
        class="qr-image"
      />
    </div>
  `
  : ''}
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });

      await Share.share({
        url: uri,
        message: 'Here is your Eventify Hub payment receipt.',
      });
    } catch (err) {
      console.error('Error saving receipt:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerState]}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={styles.subtitle}>Loading receipt...</Text>
      </View>
    );
  }

  if (error || !successfulPayment) {
    return (
      <View style={[styles.container, styles.centerState]}>
        <Ionicons name="receipt-outline" size={52} color={PRIMARY} />

        <Text style={styles.title}>Receipt Unavailable</Text>

        <Text style={styles.subtitle}>
          {error || 'No confirmed payment found.'}
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.replace('/myevents')}
        >
          <Text style={styles.primaryButtonText}>Back to My Bookings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={20} color={PRIMARY} />
      </TouchableOpacity>

      {/* ================= TICKET ================= */}
      <View style={styles.ticketOuter}>
        {/* Glow layers */}
        <View style={[styles.glow, styles.glow3]} />
        <View style={[styles.glow, styles.glow2]} />
        <View style={[styles.glow, styles.glow1]} />

        <View style={styles.ticket}>
          {/* ---- Header ---- */}
          <View style={styles.ticketHeader}>
            <Text style={styles.brand}>Eventify Hub</Text>
            <Ionicons name="receipt-outline" size={20} color="#B9B9B9" />
          </View>

          <View style={styles.successCircleOuter}>
            <View style={styles.successCircle}>
              <Ionicons name="checkmark" size={36} color="#FFFFFF" />
            </View>
          </View>

          <Text style={styles.title}>Payment Successful</Text>

          <Text style={styles.subtitle}>
            Your payment has been confirmed successfully.
          </Text>

          <View style={styles.amountBlock}>
            <Text style={styles.amountLabel}>Amount Paid</Text>
            <Text style={styles.amountValue}>{formatCurrency(amountPaid)}</Text>
          </View>

          {/* ---- Divider 1 ---- */}
          <View style={styles.dividerRow}>
            <Notches />
            <DashedLine />
          </View>

          {/* ---- Details ---- */}
          <View style={styles.detailsWrap}>
            <Text style={styles.cardTitle}>Payment Details</Text>

            {details.map((row, index) => (
              <View
                key={row.label}
                style={[
                  styles.cardRow,
                  index === details.length - 1 && styles.cardRowLast,
                ]}
              >
                <Text style={styles.cardLabel}>{row.label}</Text>

                <Text
                  style={[
                    styles.cardValue,
                    row.label === 'Amount Paid' && styles.cardValueTotal,
                    row.label === 'Status' && styles.cardValueSuccess,
                  ]}
                >
                  {row.value}
                </Text>
              </View>
            ))}
          </View>

          {/* ---- Divider 2 ---- */}
          <View style={styles.dividerRow}>
            <Notches />
            <DashedLine />
          </View>

          {/* ---- QR ---- */}
          <View style={styles.qrSection}>
            <Text style={styles.thanks}>Thank you for choosing us!</Text>
            <Text style={styles.qrHint}>
              Scan this QR code to verify your booking.
            </Text>

            <View style={styles.qrBox}>
              {qrValue ? (
            <QRCode
              value={qrValue}
              size={110}
              color="#1A1A1A"
              backgroundColor="#FFFFFF"
              getRef={(ref) => {
                qrRef.current = ref;
              }}
            />
          ) : (
            <Text style={styles.qrHint}>
              Verification QR unavailable.
            </Text>
          )}
            </View>

            <View style={styles.receiptNote}>
              <Ionicons name="mail-outline" size={14} color={SUCCESS} />
              <Text style={styles.receiptNoteText}>
                A copy of this receipt has been emailed to you.
              </Text>
            </View>
          </View>

          <ScallopedBottom />
        </View>
      </View>

      {/* ================= ACTIONS ================= */}
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={handleSaveReceipt}
        disabled={saving}
      >
        <Ionicons name="download-outline" size={18} color={PRIMARY} />

        <Text style={styles.secondaryButtonText}>
          {saving ? 'Preparing receipt...' : 'Save / Share Receipt'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => router.replace('/myevents')}
      >
        <Text style={styles.primaryButtonText}>View Booking</Text>
        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.doneLink}
        onPress={() => router.replace('/dashboard')}
      >
        <Text style={styles.doneLinkText}>Back to Dashboard</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default PaymentConfirmationScreen;

const NOTCH = 26;

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
  },

  centerState: {
    justifyContent: 'center',
  },

  backButton: {
    alignSelf: 'flex-start',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },

  /* ---------- Ticket ---------- */
  ticketOuter: {
    width: '100%',
    marginTop: 6,
  },

  glow: {
    position: 'absolute',
    backgroundColor: PRIMARY,
  },
  glow1: {
    top: -6,
    bottom: 0,
    left: -6,
    right: -6,
    borderRadius: 30,
    opacity: 0.1,
  },
  glow2: {
    top: -14,
    bottom: -4,
    left: -14,
    right: -14,
    borderRadius: 38,
    opacity: 0.07,
  },
  glow3: {
    top: -24,
    bottom: -8,
    left: -24,
    right: -24,
    borderRadius: 46,
    opacity: 0.04,
  },

  ticket: {
    width: '100%',
    backgroundColor: TICKET_BG,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(120,12,96,0.25)',
    borderBottomWidth: 0,
    paddingTop: 18,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 10,
  },

  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    marginBottom: 8,
  },

  brand: {
    fontSize: 16,
    fontWeight: '800',
    color: PRIMARY,
    letterSpacing: 1.2,
  },

  successCircleOuter: {
    alignSelf: 'center',
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: 'rgba(39,138,75,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 14,
  },

  successCircle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: SUCCESS,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: SUCCESS,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 14,
    elevation: 8,
  },

  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 13,
    color: '#8A8A8A',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 19,
    paddingHorizontal: 20,
  },

  amountBlock: {
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 22,
  },

  amountLabel: {
    color: '#8A8A8A',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
  },

  amountValue: {
    color: PRIMARY,
    fontSize: 30,
    fontWeight: '900',
    marginTop: 4,
  },

  /* ---------- Dashed divider + notches ---------- */
  dividerRow: {
    height: 1,
    justifyContent: 'center',
  },

  dashedWrap: {
    marginHorizontal: 22,
    height: 1,
    overflow: 'hidden',
  },

  dashedInner: {
    height: 2,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: PRIMARY,
    borderRadius: 1,
    opacity: 0.55,
  },

  notch: {
    position: 'absolute',
    width: NOTCH,
    height: NOTCH,
    borderRadius: NOTCH / 2,
    backgroundColor: PRIMARY_LIGHT,
    top: -NOTCH / 2 + 0.5,
    zIndex: 2,
  },
  notchLeft: {
    left: -NOTCH / 2 - 1,
  },
  notchRight: {
    right: -NOTCH / 2 - 1,
  },

  /* ---------- Details ---------- */
  detailsWrap: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 20,
  },

  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 10,
  },

  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F5EAF1',
    gap: 14,
  },

  cardRowLast: {
    borderBottomWidth: 0,
  },

  cardLabel: {
    fontSize: 12,
    color: '#8A8A8A',
    fontWeight: '600',
    flex: 1,
  },

  cardValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1,
    textAlign: 'right',
  },

  cardValueTotal: {
    color: PRIMARY,
    fontWeight: '800',
  },

  cardValueSuccess: {
    color: SUCCESS,
    fontWeight: '800',
  },

  /* ---------- QR ---------- */
  qrSection: {
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 14,
  },

  thanks: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4A4A4A',
  },

  qrHint: {
    fontSize: 11,
    color: '#8A8A8A',
    marginTop: 4,
    marginBottom: 14,
    textAlign: 'center',
  },

  qrBox: {
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E3E3E3',
    backgroundColor: '#FFFFFF',
  },

  receiptNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
  },

  receiptNoteText: {
    fontSize: 11,
    color: '#8A8A8A',
    flexShrink: 1,
  },

  /* ---------- Scalloped bottom ---------- */
  scallopWrap: {
    height: 12,
    backgroundColor: TICKET_BG,
    overflow: 'hidden',
    width: '100%',
    marginTop: 6,
  },

  scallopCircle: {
    position: 'absolute',
    backgroundColor: PRIMARY_LIGHT,
  },

  /* ---------- Buttons ---------- */
  secondaryButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    borderWidth: 1.5,
    borderColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 30,
  },

  secondaryButtonText: {
    color: PRIMARY,
    fontWeight: '800',
    fontSize: 13,
  },

  primaryButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 12,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },

  doneLink: {
    marginTop: 16,
    paddingVertical: 6,
  },

  doneLinkText: {
    color: '#8A8A8A',
    fontSize: 12,
    fontWeight: '700',
  },
});