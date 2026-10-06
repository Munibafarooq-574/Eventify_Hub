import getPaymentStatus from '@/services/getPaymentStatus';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { router, useLocalSearchParams } from 'expo-router';
import ReceiptShape, { ReceiptDivider } from './ReceiptShape';
import { LinearGradient } from 'expo-linear-gradient';
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
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <style>
    @page {
      size: 210mm 297mm;
      margin: 0;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    html, body {
      margin: 0;
      padding: 0;
      width: 210mm;
      height: 296mm;
      overflow: hidden;
      background-color: #F8E9F0;
      font-family: Arial, Helvetica, sans-serif;
      color: #1A1A1A;
    }

    .page {
      width: 210mm;
      height: 296mm;
      padding: 20px 18px;
      overflow: hidden;
      background-color: #F8E9F0;
      page-break-after: avoid;
      break-after: avoid;
    }

    .receipt {
      max-width: 600px;
      margin: 0 auto;
      background: #FFFFFF;
      border-radius: 22px;
      overflow: hidden;
      border: 2px solid #780C60;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* ---------- HEADER ---------- */
    .header {
      background-color: #780C60;
      padding: 18px 24px;
      border-bottom: 5px solid #E8A6D3;
    }

    .header-table {
      width: 100%;
      border-collapse: collapse;
    }

    .brand {
      font-size: 24px;
      font-weight: 900;
      letter-spacing: 1px;
      color: #FFFFFF !important;
    }

    .receipt-label {
      margin-top: 4px;
      font-size: 12px;
      font-weight: 600;
      color: #F8D7EE !important;
      letter-spacing: 0.5px;
    }

    .header-badge {
      text-align: right;
      vertical-align: middle;
    }

    .badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 20px;
      background-color: #FFFFFF;
      color: #780C60 !important;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1px;
    }

    /* ---------- CONTENT ---------- */
    .content {
      padding: 20px 24px 18px;
    }

    .success-wrap {
      text-align: center;
    }

    .success-circle {
      display: inline-block;
      width: 56px;
      height: 56px;
      line-height: 46px;
      border-radius: 50%;
      background-color: #278A4B;
      color: #FFFFFF !important;
      font-size: 30px;
      font-weight: bold;
      border: 5px solid #CFEBD9;
    }

    .success-title {
      margin-top: 10px;
      font-size: 22px;
      font-weight: 900;
      color: #1A1A1A;
    }

    .success-subtitle {
      margin-top: 4px;
      font-size: 12px;
      font-weight: 600;
      color: #555555;
    }

    /* ---------- AMOUNT ---------- */
    .amount-card {
      margin-top: 16px;
      padding: 14px;
      border-radius: 16px;
      background-color: #780C60;
      text-align: center;
    }

    .amount-label {
      color: #F8D7EE !important;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 2px;
    }

    .amount {
      margin-top: 4px;
      color: #FFFFFF !important;
      font-size: 32px;
      font-weight: 900;
    }

    /* ---------- DETAILS ---------- */
    .divider {
      margin: 16px 0;
      border-top: 2px dashed #C98BB8;
    }

    .section-title {
      font-size: 14px;
      font-weight: 900;
      color: #780C60;
      margin-bottom: 8px;
      letter-spacing: 0.5px;
      border-left: 5px solid #780C60;
      padding-left: 8px;
    }

    .details-card {
      border: 1.5px solid #D9B3CC;
      border-radius: 14px;
      padding: 2px 14px;
      background-color: #FDF6FA;
    }

    .row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 14px;
      padding: 9px 0;
      border-bottom: 1px solid #E6CCDD;
    }

    .row:last-child {
      border-bottom: none;
    }

    .label {
      width: 42%;
      font-size: 12px;
      color: #4A4A4A;
      font-weight: 700;
    }

    .value {
      width: 58%;
      text-align: right;
      font-size: 12px;
      color: #111111;
      font-weight: 800;
      word-break: break-word;
    }

    .status-success {
      display: inline-block;
      color: #FFFFFF !important;
      background-color: #278A4B;
      padding: 3px 10px;
      border-radius: 12px;
      font-weight: 800;
      width: auto;
      margin-left: auto;
    }

    /* ---------- QR ---------- */
    .qr-section {
      text-align: center;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .qr-title {
      font-size: 14px;
      font-weight: 900;
      color: #1A1A1A;
    }

    .qr-subtitle {
      color: #555555;
      font-size: 11px;
      font-weight: 600;
      margin-top: 4px;
      margin-bottom: 10px;
    }

    .qr-box {
      display: inline-block;
      padding: 8px;
      border: 2px solid #780C60;
      border-radius: 14px;
      background-color: #FFFFFF;
    }

    .qr-image {
      width: 110px;
      height: 110px;
      display: block;
    }

    .verified {
      display: inline-block;
      margin-top: 10px;
      padding: 6px 14px;
      border-radius: 20px;
      background-color: #E3F5E9;
      border: 1px solid #278A4B;
      color: #1B6B38 !important;
      font-size: 11px;
      font-weight: 800;
    }

    /* ---------- FOOTER ---------- */
    .footer {
      margin-top: 14px;
      padding-top: 10px;
      border-top: 1px solid #D9B3CC;
      text-align: center;
      color: #555555;
      font-size: 10px;
      font-weight: 600;
      line-height: 1.6;
    }

    .footer strong {
      color: #780C60;
    }
  </style>
</head>

<body>
  <div class="page">
    <div class="receipt">

      <div class="header">
        <table class="header-table">
          <tr>
            <td>
              <div class="brand">Eventify Hub</div>
              <div class="receipt-label">Official Payment Receipt</div>
            </td>
            <td class="header-badge">
              <span class="badge">PAID</span>
            </td>
          </tr>
        </table>
      </div>

      <div class="content">

        <div class="success-wrap">
          <div class="success-circle">✓</div>
          <div class="success-title">Payment Successful</div>
          <div class="success-subtitle">
            Your payment has been confirmed successfully.
          </div>
        </div>

        <div class="amount-card">
          <div class="amount-label">AMOUNT PAID</div>
          <div class="amount">
            ${formatCurrency(amountPaid)}
          </div>
        </div>

        <div class="divider"></div>

        <div class="section-title">Payment Details</div>

        <div class="details-card">

          ${details
            .map(
              (detail) => `
                <div class="row">

                  <div class="label">
                    ${detail.label}
                  </div>

                  <div
                    class="value ${
                      detail.label === 'Status'
                        ? 'status-success'
                        : ''
                    }"
                  >
                    ${detail.value}
                  </div>

                </div>
              `,
            )
            .join('')}

        </div>

        ${
          qrDataUrl
            ? `
              <div class="divider"></div>

              <div class="qr-section">

                <div class="qr-title">
                  Verify this payment
                </div>

                <div class="qr-subtitle">
                  Scan this QR code to verify this receipt
                  directly with Eventify Hub.
                </div>

                <div class="qr-box">
                  <img
                    src="${qrDataUrl}"
                    class="qr-image"
                  />
                </div>

                <br />

                <div class="verified">
                  ✓ Secure Verification
                </div>

              </div>
            `
            : ''
        }

        <div class="footer">
          Thank you for choosing <strong>Eventify Hub</strong>.<br />
          This receipt was generated electronically.
        </div>

      </div>
    </div>
  </div>
</body>
</html>
`;
      const { uri } =
  await Print.printToFileAsync({
    html,
  });

const sharingAvailable =
  await Sharing.isAvailableAsync();

if (!sharingAvailable) {
  throw new Error(
    'Sharing is not available on this device.',
  );
}

await Sharing.shareAsync(
  uri,
  {
    mimeType: 'application/pdf',
    dialogTitle:
      'Share Eventify Hub Payment Receipt',
    UTI: 'com.adobe.pdf',
  },
);
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
    <View style={{ flex: 1, backgroundColor: PRIMARY_LIGHT }}>
      {/* Purple shading: upar se neeche fade */}
      <LinearGradient
        colors={[
          'rgba(120,12,96,0.30)',
          'rgba(120,12,96,0.10)',
          'rgba(248,233,240,0)',
        ]}
        locations={[0, 0.45, 1]}
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 420 }}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ================= TICKET ================= */}
        <ReceiptShape style={{ width: '100%' }}>
          <View style={{ height: 18 }} />

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

          <ReceiptDivider id="top" />

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

          <ReceiptDivider id="bottom" />

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
                <Text style={styles.qrHint}>Verification QR unavailable.</Text>
              )}
            </View>

            <View style={styles.receiptNote}>
              <Ionicons name="mail-outline" size={14} color={SUCCESS} />
              <Text style={styles.receiptNoteText}>
                A copy of this receipt has been emailed to you.
              </Text>
            </View>
          </View>
        </ReceiptShape>

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
    </View>
  );
};

export default PaymentConfirmationScreen;

const NOTCH = 22;

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
  marginTop: 0,
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

  borderTopLeftRadius: 10,
  borderTopRightRadius: 10,

  borderWidth: 1,
  borderColor: 'rgba(120,12,96,0.28)',

  borderBottomWidth: 0,

  paddingTop: 18,

  shadowColor: PRIMARY,
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.28,
  shadowRadius: 14,
  elevation: 8,

  overflow: 'visible',
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
  marginHorizontal: 24,
  height: 2,
  overflow: 'hidden',
},

dashedInner: {
  height: 2,
  borderTopWidth: 1.4,
  borderStyle: 'dashed',
  borderColor: PRIMARY,
  opacity: 0.65,
},

notch: {
  position: 'absolute',
  width: NOTCH,
  height: NOTCH,
  borderRadius: NOTCH / 2,

  backgroundColor: PRIMARY_LIGHT,

  top: -NOTCH / 2,
  zIndex: 10,
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
  height: 18,
  backgroundColor: TICKET_BG,
  overflow: 'hidden',
  width: '100%',
  marginTop: 2,
},

scallopCircle: {
  position: 'absolute',
  backgroundColor: PRIMARY_LIGHT,

  borderWidth: 1,
  borderColor: 'rgba(120,12,96,0.05)',
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
    scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
  },

});