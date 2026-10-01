import { getPublicDashboardCoupons } from '@/services/getPublicDashboardCoupons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const PublicCouponOffers: React.FC = () => {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCoupons = async () => {
      try {
        const result = await getPublicDashboardCoupons(10);
        setCoupons(Array.isArray(result) ? result : []);
      } catch (error) {
        console.error(
          'Failed to load public coupons:',
          error,
        );
        setCoupons([]);
      } finally {
        setLoading(false);
      }
    };

    loadCoupons();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator />
      </View>
    );
  }

  if (coupons.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        Special Offers
      </Text>

      {coupons.map((coupon) => {
        const discountText =
          coupon.discountType === 'percentage'
            ? `${coupon.discountValue}% OFF`
            : `Rs. ${coupon.discountValue} OFF`;

        const validTill = coupon.endDate
          ? new Date(coupon.endDate).toLocaleDateString(
              'en-GB',
              {
                day: 'numeric',
                month: 'short',
              },
            )
          : '';

        return (
          <View
            key={coupon._id}
            style={styles.card}
          >
            <Text style={styles.discount}>
              🎉 {discountText}
            </Text>

            <Text style={styles.code}>
              Use {coupon.code}
            </Text>

            {!!validTill && (
              <Text style={styles.validity}>
                Valid till {validTill}
              </Text>
            )}

            <TouchableOpacity
              onPress={() => {
                if (!coupon.vendorId) return;

                router.push({
                  pathname:
                    '/vendorprofiledetails/[vendorId]',
                  params: {
                    vendorId:
                      typeof coupon.vendorId === 'string'
                        ? coupon.vendorId
                        : coupon.vendorId._id,
                  },
                } as any);
              }}
            >
              <Text style={styles.viewOffer}>
                View Offer →
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: 20,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2B1B26',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3DCE8',
  },
  discount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6B1E4F',
  },
  code: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2B1B26',
    marginTop: 6,
  },
  validity: {
    fontSize: 13,
    color: '#8B7688',
    marginTop: 4,
  },
  viewOffer: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B1E4F',
    marginTop: 12,
  },
  loadingContainer: {
    paddingVertical: 20,
  },
});

export default PublicCouponOffers;