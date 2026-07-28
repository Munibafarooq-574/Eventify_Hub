import { useState, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import postAddPackages from '@/services/postAddPackages';
import updatePackage from '@/services/updatePackage';
import { getSecureData } from '@/store';

// Defined outside the component so it's a stable reference — passing a fresh
// object literal to Stack.Screen on every re-render (e.g. every keystroke)
// makes expo-router re-apply navigation options each time, which was
// interrupting focus and closing the keyboard right after it opened.
const screenOptions = { headerShown: false };

export default function VendorPackagesScreen() {
    const { packageId } = useLocalSearchParams();
    const isEditMode = !!packageId;

    const [packageName, setPackageName] = useState('');
    const [price, setPrice] = useState('');
    const [services, setServices] = useState('');
    const [loading, setLoading] = useState(false);

    // UI-only state — purely cosmetic, doesn't touch save logic
    const [focusedField, setFocusedField] = useState<string | null>(null);

    // Stable handlers (don't change identity on every keystroke)
    const focusName = useCallback(() => setFocusedField('name'), []);
    const focusPrice = useCallback(() => setFocusedField('price'), []);
    const focusServices = useCallback(() => setFocusedField('services'), []);
    const clearFocus = useCallback(() => setFocusedField(null), []);

    const handleSave = async () => {
        setLoading(true);
        try {
            // ✅ Same pattern as onboarding PackagesScreen — get user object, then _id
            const userData = JSON.parse((await getSecureData('user')) || '{}');
            const userId: string | undefined = userData?._id;

            if (!userId) {
                Alert.alert('Error', 'Could not find logged-in vendor. Please log in again.');
                setLoading(false);
                return;
            }

            if (isEditMode) {
                await updatePackage(packageId as string, {
                    packageName,
                    price: Number(price),
                    services,
                });
            } else {
                await postAddPackages(userId, {
                    packages: [
                        {
                            packageName,
                            price: Number(price),
                            services,
                        },
                    ],
                });
            }
            router.back();
        } catch (err) {
            console.error(err);
            Alert.alert('Error', 'Could not save package. Try again.');
        } finally {
            setLoading(false);
        }
    };

    const isFormValid = packageName.trim().length > 0 && price.trim().length > 0;
    const insets = useSafeAreaInsets();

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: '#FAF6F9' }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
        >
            {/* Hide the default native stack header (the black bar) */}
            <Stack.Screen options={screenOptions} />

            <ScrollView
                style={styles.container}
                contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 48 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Back button — respects the notch/status bar on every device */}
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Text style={styles.backButtonIcon}>‹</Text>
                </TouchableOpacity>

                {/* Header */}
                <View style={styles.headerWrap}>
                    <Text style={styles.heading}>
                        {isEditMode ? 'Edit Package' : 'Add New Package'}
                    </Text>
                    <Text style={styles.subheading}>
                        {isEditMode
                            ? 'Update the details of this package'
                            : 'Build a package clients will love'}
                    </Text>
                </View>

                {/* Form Card */}
                <View style={styles.card}>
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Package Name</Text>
                        <TextInput
                            style={[
                                styles.input,
                                focusedField === 'name' && styles.inputFocused,
                            ]}
                            value={packageName}
                            onChangeText={setPackageName}
                            onFocus={focusName}
                            onBlur={clearFocus}
                            placeholder="e.g. Simple Birthday Package"
                            placeholderTextColor="#9C9CA3"
                        />
                    </View>

                 <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Price</Text>

                    <View style={styles.priceContainer}>
                        <Text style={styles.pricePrefix}>Rs.</Text>

                        <TextInput
                            style={styles.priceInput}
                            value={price}
                            onChangeText={setPrice}
                            onFocus={focusPrice}
                            onBlur={clearFocus}
                            keyboardType="numeric"
                            placeholder="2500"
                            placeholderTextColor="#9C9CA3"
                        />
                    </View>
                </View>
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>What's Included</Text>
                        <TextInput
                            style={[
                                styles.input,
                                styles.textArea,
                                focusedField === 'services' && styles.inputFocused,
                            ]}
                            value={services}
                            onChangeText={setServices}
                            onFocus={focusServices}
                            onBlur={clearFocus}
                            multiline
                            placeholder="Describe what's included in this package — e.g. decoration, photography, cake..."
                            placeholderTextColor="#9C9CA3"
                        />
                    </View>
                </View>

                {/* Live preview */}
                {(packageName || price) && (
                    <View style={styles.previewCard}>
                        <Text style={styles.previewTag}>PREVIEW</Text>
                        <View style={styles.previewRow}>
                            <Text style={styles.previewName}>
                                {packageName || 'Package Name'}
                            </Text>
                            {!!price && (
                                <Text style={styles.previewPrice}>Rs. {price}</Text>
                            )}
                        </View>
                        {!!services && (
                            <Text style={styles.previewServices}>
                                {services}
                            </Text>
                        )}
                    </View>
                )}

                {/* Save button */}
                <TouchableOpacity
                    style={[
                        styles.saveButton,
                        (!isFormValid || loading) && styles.saveButtonDisabled,
                    ]}
                    onPress={handleSave}
                    disabled={loading || !isFormValid}
                    activeOpacity={0.85}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.saveButtonText}>
                            {isEditMode ? 'Save Changes' : 'Save Package'}
                        </Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => router.back()}
                    disabled={loading}
                >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#FAF6F9' },

    backButton: {
        width: 42,
        height: 42,
        borderRadius: 14,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#221A20',
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
    },
    backButtonIcon: {
        fontSize: 26,
        fontWeight: '700',
        color: '#7B2869',
        marginTop: -2,
    },
    headerWrap: {
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 24,
    },
    heading: { fontSize: 24, fontWeight: '800', color: '#221A20', textAlign: 'center' },
    subheading: { fontSize: 13.5, color: '#8A7A85', marginTop: 4, textAlign: 'center' },

    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 18,
        shadowColor: '#221A20',
        shadowOpacity: 0.06,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 2,
        marginBottom: 16,
    },
    fieldGroup: { marginBottom: 20 },
    label: { fontSize: 16, fontWeight: '700', color: '#221A20', marginBottom: 8 },

    input: {
        borderWidth: 1.5,
        borderColor: '#EFE0EB',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: '#221A20',
        backgroundColor: '#FCFAFB',
    },
    inputFocused: {
        borderColor: '#7B2869',
        backgroundColor: '#FFFFFF',
        shadowColor: '#7B2869',
        shadowOpacity: 0.12,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    textArea: {
        height: 130,
        textAlignVertical: 'top',
    },

  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#EFE0EB',
    borderRadius: 14,
    backgroundColor: '#FCFAFB',
    paddingHorizontal: 14,
    height: 50,
},
   pricePrefix: {
    fontSize: 15,
    fontWeight: '700',
    color: '#7B2869',
    marginRight: 8,
},

priceInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: '#221A20',
    paddingVertical: 0,
},

    previewCard: {
        backgroundColor: '#FDF3FA',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F0DCEB',
        padding: 14,
        marginBottom: 20,
    },
    previewTag: {
        fontSize: 10,
        fontWeight: '800',
        color: '#B589A6',
        letterSpacing: 1,
        marginBottom: 6,
    },
    previewRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    previewName: {
        fontSize: 15,
        fontWeight: '800',
        color: '#221A20',
        flex: 1,
        marginRight: 8,
    },
    previewPrice: { fontSize: 15, fontWeight: '800', color: '#7B2869' },
    previewServices: { fontSize: 12.5, color: '#8A7A85', marginTop: 6, lineHeight: 18 },

    saveButton: {
        backgroundColor: '#7B2869',
        borderRadius: 26,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#7B2869',
        shadowOpacity: 0.3,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
        elevation: 4,
    },
    saveButtonDisabled: {
        backgroundColor: '#C9A9BF',
        shadowOpacity: 0,
        elevation: 0,
    },
    saveButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15.5 },

    cancelButton: {
        alignItems: 'center',
        paddingVertical: 14,
    },
    cancelButtonText: { color: '#8A7A85', fontWeight: '600', fontSize: 14 },
});