import getPaymentStatus from '@/services/getPaymentStatus';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import {
  router,
  useLocalSearchParams,
} from 'expo-router';
import React, {
  useCallback,
  useEffect,
  useMemo,
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

const PRIMARY = '#780C60';
const PRIMARY_LIGHT = '#F8E9F0';

const formatCurrency = (
  value: number,
) =>
  `Rs. ${Math.round(
    value || 0,
  ).toLocaleString('en-PK')}`;

const toOrderRef = (
  id?: string,
) => {
  if (!id) {
    return 'EH-N/A';
  }

  return `EH-${id
    .slice(-8)
    .toUpperCase()}`;
};

const PaymentConfirmationScreen =
  () => {
    const { vendorOrderId } =
      useLocalSearchParams<{
        vendorOrderId?: string;
      }>();

    const [saving, setSaving] =
      useState(false);

    const [loading, setLoading] =
      useState(true);

    const [error, setError] =
      useState<string | null>(null);

    const [
      paymentData,
      setPaymentData,
    ] = useState<any>(null);

    const loadPayment =
      useCallback(async () => {
        if (!vendorOrderId) {
          setError(
            'Missing booking reference.',
          );
          setLoading(false);
          return;
        }

        try {
          setLoading(true);
          setError(null);

          const data =
            await getPaymentStatus(
              vendorOrderId,
            );

          if (
            !data
              ?.latestSuccessfulPayment
          ) {
            setPaymentData(null);

            setError(
              'No confirmed payment receipt is available yet.',
            );

            return;
          }

          setPaymentData(data);
        } catch (err) {
          console.error(
            'Error loading payment receipt:',
            err,
          );

          setError(
            'Could not load payment receipt.',
          );
        } finally {
          setLoading(false);
        }
      }, [vendorOrderId]);

    useEffect(() => {
      loadPayment();
    }, [loadPayment]);

    const successfulPayment =
      paymentData
        ?.latestSuccessfulPayment;

    const amountPaid = Number(
      successfulPayment?.amount ||
        0,
    );

    const paymentMethod = String(
      successfulPayment?.method ||
        'N/A',
    );

    const paymentType = String(
      successfulPayment?.type || '',
    );

    const transactionRef =
      successfulPayment
        ?.transactionRef ||
      successfulPayment?.paymentId ||
      'N/A';

    const orderRef = useMemo(
      () =>
        toOrderRef(
          vendorOrderId,
        ),
      [vendorOrderId],
    );

    const paidAt = useMemo(
      () =>
        successfulPayment?.paidAt
          ? new Date(
              successfulPayment.paidAt,
            )
          : null,
      [successfulPayment?.paidAt],
    );

    const dateTimeLabel =
      paidAt &&
      !Number.isNaN(
        paidAt.getTime(),
      )
        ? `${paidAt.toLocaleDateString(
            'en-GB',
            {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            },
          )} · ${paidAt.toLocaleTimeString(
            'en-US',
            {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            },
          )}`
        : 'N/A';

    const paymentTypeLabel =
      paymentType ===
      'DOWN_PAYMENT'
        ? 'Down Payment'
        : paymentType ===
            'REMAINING'
          ? 'Remaining Payment'
          : paymentType || 'N/A';

    const paymentMethodLabel =
      paymentMethod === 'card'
        ? 'Credit / Debit Card'
        : paymentMethod ===
            'jazzcash'
          ? 'JazzCash'
          : paymentMethod ===
              'easypaisa'
            ? 'EasyPaisa'
            : paymentMethod;

    const details = [
      {
        label:
          'Order Reference',
        value: orderRef,
      },

      {
        label:
          'Payment Type',
        value:
          paymentTypeLabel,
      },

      {
        label:
          'Amount Paid',
        value:
          formatCurrency(
            amountPaid,
          ),
      },

      {
        label:
          'Payment Method',
        value:
          paymentMethodLabel,
      },

      {
        label:
          'Transaction Reference',
        value: String(
          transactionRef,
        ),
      },

      {
        label:
          'Date & Time',
        value:
          dateTimeLabel,
      },

      {
        label: 'Status',
        value: 'Successful',
      },
    ];

    const handleSaveReceipt =
      async () => {
        if (saving) return;

        setSaving(true);

        try {
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
                    border-bottom: 1px solid #F0DDEA;
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
                </style>
              </head>

              <body>
                <div class="brand">
                  Eventify Hub
                </div>

                <div class="muted">
                  Payment Receipt
                </div>

                ${details
                  .map(
                    (
                      detail,
                    ) => `
                      <div class="row">
                        <span class="label">
                          ${detail.label}
                        </span>

                        <span
                          class="value ${
                            detail.label ===
                            'Amount Paid'
                              ? 'total'
                              : ''
                          }"
                        >
                          ${detail.value}
                        </span>
                      </div>
                    `,
                  )
                  .join('')}
              </body>
            </html>
          `;

          const { uri } =
            await Print.printToFileAsync(
              {
                html,
              },
            );

          await Share.share({
            url: uri,
            message:
              'Here is your Eventify Hub payment receipt.',
          });
        } catch (err) {
          console.error(
            'Error saving receipt:',
            err,
          );
        } finally {
          setSaving(false);
        }
      };

    if (loading) {
      return (
        <View
          style={[
            styles.container,
            styles.centerState,
          ]}
        >
          <ActivityIndicator
            size="large"
            color={PRIMARY}
          />

          <Text
            style={styles.subtitle}
          >
            Loading receipt...
          </Text>
        </View>
      );
    }

    if (
      error ||
      !successfulPayment
    ) {
      return (
        <View
          style={[
            styles.container,
            styles.centerState,
          ]}
        >
          <Ionicons
            name="receipt-outline"
            size={52}
            color={PRIMARY}
          />

          <Text
            style={styles.title}
          >
            Receipt Unavailable
          </Text>

          <Text
            style={styles.subtitle}
          >
            {error ||
              'No confirmed payment found.'}
          </Text>

          <TouchableOpacity
            style={
              styles.primaryButton
            }
            onPress={() =>
              router.replace(
                '/myevents',
              )
            }
          >
            <Text
              style={
                styles.primaryButtonText
              }
            >
              Back to My Bookings
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView
        contentContainerStyle={
          styles.container
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <TouchableOpacity
          style={
            styles.backButton
          }
          onPress={() =>
            router.back()
          }
        >
          <Ionicons
            name="arrow-back"
            size={20}
            color={PRIMARY}
          />
        </TouchableOpacity>

        <View
          style={
            styles.successCircleOuter
          }
        >
          <View
            style={
              styles.successCircle
            }
          >
            <Ionicons
              name="checkmark"
              size={44}
              color="#FFFFFF"
            />
          </View>
        </View>

        <Text
          style={styles.title}
        >
          Payment Successful
        </Text>

        <Text
          style={styles.subtitle}
        >
          Your payment has been
          confirmed successfully.
        </Text>

        <View
          style={
            styles.amountPill
          }
        >
          <Text
            style={
              styles.amountPillLabel
            }
          >
            Amount Paid
          </Text>

          <Text
            style={
              styles.amountPillValue
            }
          >
            {formatCurrency(
              amountPaid,
            )}
          </Text>
        </View>

        <View
          style={styles.card}
        >
          <Text
            style={
              styles.cardTitle
            }
          >
            Payment Details
          </Text>

          {details.map(
            (
              row,
              index,
            ) => (
              <View
                key={row.label}
                style={[
                  styles.cardRow,
                  index ===
                    details.length -
                      1 &&
                    styles.cardRowLast,
                ]}
              >
                <Text
                  style={
                    styles.cardLabel
                  }
                >
                  {row.label}
                </Text>

                <Text
                  style={[
                    styles.cardValue,
                    row.label ===
                      'Status' &&
                      styles.cardValueSuccess,
                  ]}
                >
                  {row.value}
                </Text>
              </View>
            ),
          )}
        </View>

        <View
          style={
            styles.receiptNote
          }
        >
          <Ionicons
            name="mail-outline"
            size={14}
            color="#278A4B"
          />

          <Text
            style={
              styles.receiptNoteText
            }
          >
            A copy of this receipt
            has been emailed to you.
          </Text>
        </View>

        <TouchableOpacity
          style={
            styles.secondaryButton
          }
          onPress={
            handleSaveReceipt
          }
          disabled={saving}
        >
          <Ionicons
            name="download-outline"
            size={18}
            color={PRIMARY}
          />

          <Text
            style={
              styles.secondaryButtonText
            }
          >
            {saving
              ? 'Preparing receipt...'
              : 'Save / Share Receipt'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={
            styles.primaryButton
          }
          onPress={() =>
            router.replace(
              '/myevents',
            )
          }
        >
          <Text
            style={
              styles.primaryButtonText
            }
          >
            View Booking
          </Text>

          <Ionicons
            name="arrow-forward"
            size={18}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.doneLink}
          onPress={() =>
            router.replace(
              '/dashboard',
            )
          }
        >
          <Text
            style={
              styles.doneLinkText
            }
          >
            Back to Dashboard
          </Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

export default PaymentConfirmationScreen;

const styles =
  StyleSheet.create({
    container: {
      flexGrow: 1,
      backgroundColor:
        PRIMARY_LIGHT,
      alignItems: 'center',
      paddingHorizontal: 22,
      paddingTop:
        Platform.OS === 'ios'
          ? 60
          : 40,
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
      backgroundColor:
        '#FFFFFF',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 10,
    },

    successCircleOuter: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor:
        'rgba(39,138,75,0.12)',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 10,
      marginBottom: 22,
    },

    successCircle: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor:
        '#278A4B',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor:
        '#278A4B',
      shadowOffset: {
        width: 0,
        height: 6,
      },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 5,
    },

    title: {
      fontSize: 22,
      fontWeight: '800',
      color: '#1A1A1A',
    },

    subtitle: {
      fontSize: 13,
      color: '#8A8A8A',
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 19,
      paddingHorizontal: 10,
    },

    amountPill: {
      backgroundColor:
        PRIMARY,
      borderRadius: 20,
      paddingVertical: 16,
      paddingHorizontal: 28,
      alignItems: 'center',
      marginTop: 22,
      width: '100%',
    },

    amountPillLabel: {
      color:
        'rgba(255,255,255,0.75)',
      fontSize: 11,
      fontWeight: '600',
    },

    amountPillValue: {
      color: '#FFFFFF',
      fontSize: 26,
      fontWeight: '900',
      marginTop: 4,
    },

    card: {
      width: '100%',
      backgroundColor:
        '#FFFFFF',
      borderRadius: 18,
      padding: 18,
      marginTop: 18,
      borderWidth: 1,
      borderColor:
        '#F0DDEA',
    },

    cardTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: '#1A1A1A',
      marginBottom: 10,
    },

    cardRow: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
      paddingVertical: 9,
      borderBottomWidth: 1,
      borderBottomColor:
        '#F5EAF1',
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

    cardValueSuccess: {
      color: '#278A4B',
      fontWeight: '800',
    },

    receiptNote: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 14,
    },

    receiptNoteText: {
      fontSize: 11,
      color: '#8A8A8A',
      flex: 1,
    },

    secondaryButton: {
      flexDirection: 'row',
      justifyContent:
        'center',
      alignItems: 'center',
      gap: 8,
      width: '100%',
      borderWidth: 1.5,
      borderColor:
        PRIMARY,
      borderRadius: 14,
      paddingVertical: 14,
      marginTop: 26,
    },

    secondaryButtonText: {
      color: PRIMARY,
      fontWeight: '800',
      fontSize: 13,
    },

    primaryButton: {
      flexDirection: 'row',
      justifyContent:
        'center',
      alignItems: 'center',
      gap: 8,
      width: '100%',
      backgroundColor:
        PRIMARY,
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