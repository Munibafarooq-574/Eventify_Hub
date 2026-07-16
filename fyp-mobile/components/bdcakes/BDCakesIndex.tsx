import postCakeBusinessDetails from "@/services/postCakeBusinessDetails";
import patchBusinessDetails from "@/services/patchBusinessDetails";
import { getSecureData } from "@/store";
import { Alert } from "react-native";
import { FontAwesome5 } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import axios from "axios";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

const CAKE_TYPES = [
    { label: 'WEDDING', icon: 'ring' },
    { label: 'BIRTHDAY', icon: 'birthday-cake' },
    { label: 'CUSTOM', icon: 'cogs' },
];

const DELIVERY_OPTIONS = [
    { label: 'Same Day', icon: 'shipping-fast' },
    { label: 'Scheduled', icon: 'calendar-alt' },
    { label: 'No-Delivery', icon: 'store' },
];

const DOWN_PAYMENT_TYPES = ['PERCENTAGE', 'FIXED AMOUNT'] as const;
type DownPaymentType = typeof DOWN_PAYMENT_TYPES[number] | "";

const CakeBusinessDetailsScreen: React.FC = () => {
    const { edit, userId } = useLocalSearchParams();

    useEffect(() => {
        console.log("Route Params:");
        console.log("edit =", edit);
        console.log("userId =", userId);
    }, [edit, userId]);

    // Multi-select: vendor can offer more than one cake type / delivery option
    const [selectedCakeTypes, setSelectedCakeTypes] = useState<string[]>([]);
    const [deliveryOptions, setDeliveryOptions] = useState<string[]>([]);

    const [deliveryToHome, setDeliveryToHome] = useState<string | null>(null);
    const [expertise, setExpertise] = useState("");
    const [cityCovered, setCityCovered] = useState("");
    const [downPaymentType, setDownPaymentType] = useState<DownPaymentType>("");
    const [downPayment, setDownPayment] = useState<string>("");
    const [covidCompliant, setCovidCompliant] = useState<"YES" | "NO" | null>(null);
    const [cancellationPolicy, setCancellationPolicy] = useState<"REFUNDABLE" | "NON-REFUNDABLE" | "PARTIALLY REFUNDABLE" | null>(null);
    const [minimumPrice, setMinimumPrice] = useState("");
    const [description, setDescription] = useState("");
    const [additionalInfo, setAdditionalInfo] = useState("");

    const toggleCakeType = (label: string) => {
        setSelectedCakeTypes((prev) =>
            prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
        );
    };

    const toggleDeliveryOption = (label: string) => {
        setDeliveryOptions((prev) =>
            prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
        );
    };

    // Autofill existing data when editing
    useEffect(() => {
        if (edit !== "true") return;

        const loadData = async () => {
            try {
                const res = await axios.get(
                    `https://eventify-hub.onrender.com/vendor?userId=${userId}`
                );

                const data = res.data.cakeBusinessDetails;

                setSelectedCakeTypes(data.cakeTypes || []);
                setMinimumPrice(data.minimumPrice?.toString() || "");
                setDeliveryOptions(data.deliveryOptions || []);
                setDeliveryToHome(data.deliveryToHome ? "YES" : "NO");
                setExpertise(data.expertise || "");
                setCityCovered(data.cityCovered || "");
                setDescription(data.description || "");
                setAdditionalInfo(data.additionalInfo || "");
                setDownPaymentType(data.downPaymentType || "");
                setDownPayment(data.downPayment?.toString() || "");
                setCovidCompliant(data.covidCompliant || null);
                setCancellationPolicy(data.cancellationPolicy || null);
            } catch (err) {
                console.log(err);
            }
        };

        loadData();
    }, []);

    const submit = async () => {
        console.log("EDIT PARAM:", edit);
        console.log("USER ID PARAM:", userId);

        if (
            selectedCakeTypes.length === 0 ||
            !minimumPrice ||
            deliveryOptions.length === 0 ||
            deliveryToHome === null ||
            !expertise ||
            !cityCovered ||
            !description ||
            !downPaymentType ||
            !downPayment ||
            covidCompliant === null ||
            cancellationPolicy === null
        ) {
            Alert.alert("Error", "Please fill all required fields.");
            return;
        }

        try {
            const user = JSON.parse(await getSecureData("user") || "");

            const dto = {
                cakeTypes: selectedCakeTypes,
                minimumPrice: Number(minimumPrice),
                deliveryOptions,
                expertise,
                cityCovered,
                deliveryToHome: deliveryToHome === "YES",
                description,
                additionalInfo,
                downPaymentType,
                downPayment: Number(downPayment),
                covidCompliant,
                cancellationPolicy,
            };

            if (edit === "true") {
                console.log("PATCH API WILL BE CALLED");

                await patchBusinessDetails(user._id, dto);

                Alert.alert("Success", "Business details updated successfully!");

                router.back();
            } else {
                console.log("POST API WILL BE CALLED");

                await postCakeBusinessDetails(user._id, dto);

                Alert.alert("Success", "Business Details Saved");

                router.push("/packages");
            }
        } catch (error) {
            console.log(error);
            Alert.alert("Error", "Something went wrong.");
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

            {/* Header */}
            <View style={styles.headerWrap}>
                <View style={styles.headerIconBadge}>
                    <FontAwesome5 name="birthday-cake" size={22} color="#780C60" />
                </View>
                <Text style={styles.header}>Business Details</Text>
                <Text style={styles.subHeader}>
                    Want to start your cake business with us? Tell us a bit about what you offer.
                </Text>
                <View style={styles.dotsRow}>
                    {[0, 1, 2, 3, 4].map((i) => (
                        <View key={i} style={[styles.dot, i === 2 && styles.dotAccent]} />
                    ))}
                </View>
            </View>

            {/* Cake Type - multi select */}
            <View style={styles.card}>
                <SectionTitle icon="birthday-cake" title="Cake Type" required />
                <Text style={styles.hint}>Select all that apply</Text>
                <View style={styles.chipContainer}>
                    {CAKE_TYPES.map((staff) => {
                        const isSelected = selectedCakeTypes.includes(staff.label);
                        return (
                            <TouchableOpacity
                                key={staff.label}
                                activeOpacity={0.85}
                                style={[styles.chip, isSelected && styles.chipSelected]}
                                onPress={() => toggleCakeType(staff.label)}
                            >
                                <FontAwesome5
                                    name={staff.icon}
                                    size={16}
                                    style={[styles.chipIcon, isSelected && styles.chipIconSelected]}
                                />
                                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                                    {staff.label}
                                </Text>
                                {isSelected && (
                                    <View style={styles.checkBadge}>
                                        <FontAwesome5 name="check" size={8} color="#780C60" />
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* Starting Price */}
            <View style={styles.card}>
                <SectionTitle icon="tag" title="Starting Price" required />
                <View style={styles.inputRow}>
                    <Text style={styles.currencyPrefix}>Rs.</Text>
                    <TextInput
                        style={styles.inputFlex}
                        keyboardType="numeric"
                        placeholder="Enter price"
                        placeholderTextColor="#B99DAF"
                        value={minimumPrice}
                        onChangeText={setMinimumPrice}
                    />
                </View>
            </View>

            {/* Delivery Options - multi select */}
            <View style={styles.card}>
                <SectionTitle icon="shipping-fast" title="Delivery Options" required />
                <Text style={styles.hint}>Select all that apply</Text>
                <View style={styles.chipContainer}>
                    {DELIVERY_OPTIONS.map((staff) => {
                        const isSelected = deliveryOptions.includes(staff.label);
                        return (
                            <TouchableOpacity
                                key={staff.label}
                                activeOpacity={0.85}
                                style={[styles.chip, isSelected && styles.chipSelected]}
                                onPress={() => toggleDeliveryOption(staff.label)}
                            >
                                <FontAwesome5
                                    name={staff.icon}
                                    size={16}
                                    style={[styles.chipIcon, isSelected && styles.chipIconSelected]}
                                />
                                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                                    {staff.label}
                                </Text>
                                {isSelected && (
                                    <View style={styles.checkBadge}>
                                        <FontAwesome5 name="check" size={8} color="#780C60" />
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* Delivery to Home - single select */}
            <View style={styles.card}>
                <SectionTitle icon="home" title="Delivery to Home" required />
                <View style={styles.pillRow}>
                    {['YES', 'NO'].map((option) => (
                        <TouchableOpacity
                            key={option}
                            activeOpacity={0.85}
                            style={[styles.pill, deliveryToHome === option && styles.pillSelected]}
                            onPress={() => setDeliveryToHome(option)}
                        >
                            <Text style={[styles.pillText, deliveryToHome === option && styles.pillTextSelected]}>
                                {option}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
            {/* Expertise */}
             <View style={styles.card}>
                <SectionTitle
                    icon="award"
                    title="Expertise"
                    required
                />

                 <TextInput
                      style={[styles.input, styles.textArea]}
                      multiline
                      placeholder={`Examples:
              • Wedding Cakes
              • Fondant Cakes
              • Buttercream Cakes
              • Floral Cake Designs
              • 3-Tier Cakes
              • Customized Theme Cakes`}
                         placeholderTextColor="#B99DAF"
                         value={expertise}
                         onChangeText={setExpertise}
                        />
                    </View>

            {/* City Covered */}
            <View style={styles.card}>
            <SectionTitle
                icon="map-marker-alt"
                title="City Covered"
                required
            />

            <TextInput
                style={styles.input}
                placeholder="Example: Karachi, Lahore, Islamabad"
                placeholderTextColor="#B99DAF"
                value={cityCovered}
                onChangeText={setCityCovered}
            />
        </View>
            {/* Cake Description */}
            <View style={styles.card}>
                <SectionTitle icon="align-left" title="Cake Description" required />
                <TextInput
                    style={[styles.input, styles.textArea]}
                    multiline
                    placeholder={`Examples:
• Customized wedding cakes
• Birthday cakes
• Premium fondant designs
• Fresh cream cakes
• Theme based cakes
• Eggless cakes available`}
                    placeholderTextColor="#B99DAF"
                    value={description}
                    onChangeText={setDescription}
                />
            </View>

            {/* Additional Notes */}
            <View style={styles.card}>
                <SectionTitle icon="sticky-note" title="Additional Notes" />
                <TextInput
                    style={[styles.input, styles.textArea]}
                    multiline
                    placeholder={`Examples:
• Free tasting available
• Advance booking required
• Delivery charges may apply
• Midnight delivery available
• Premium packaging included
• Freshly baked on order`}
                    placeholderTextColor="#B99DAF"
                    value={additionalInfo}
                    onChangeText={setAdditionalInfo}
                />
            </View>

            {/* Down Payment Type */}
            <View style={styles.card}>
                <SectionTitle icon="money-bill-wave" title="Down Payment Type" required />
                <View style={styles.pillRow}>
                    {['PERCENTAGE', 'FIXED AMOUNT'].map((option) => (
                        <TouchableOpacity
                            key={option}
                            activeOpacity={0.85}
                            style={[styles.pill, downPaymentType === option && styles.pillSelected]}
                            onPress={() => setDownPaymentType(option as DownPaymentType)}
                        >
                            <Text style={[styles.pillText, downPaymentType === option && styles.pillTextSelected]}>
                                {option}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Down Payment */}
            <View style={styles.card}>
                <SectionTitle icon="wallet" title="Down Payment" required />
                <View style={styles.inputRow}>
                    <Text style={styles.currencyPrefix}>
                  {downPaymentType === "PERCENTAGE" ? "%" : "Rs."}
                </Text>
                    <TextInput
                        style={styles.inputFlex}
                        placeholder={
                    downPaymentType === "PERCENTAGE"
                        ? "Example: 30"
                        : "Example: 5000"
                }
                        placeholderTextColor="#B99DAF"
                        keyboardType="numeric"
                        value={downPayment}
                        onChangeText={setDownPayment}
                    />
                </View>
            </View>

            {/* Cancellation Policy */}
            <View style={styles.card}>
                <SectionTitle icon="undo-alt" title="Cancellation Policy" required />
                <View style={styles.pillRowWrap}>
                    {(['REFUNDABLE', 'NON-REFUNDABLE', 'PARTIALLY REFUNDABLE'] as const).map((policy) => (
                        <TouchableOpacity
                            key={policy}
                            activeOpacity={0.85}
                            style={[styles.pill, cancellationPolicy === policy && styles.pillSelected]}
                            onPress={() => setCancellationPolicy(policy)}
                        >
                            <Text style={[styles.pillText, cancellationPolicy === policy && styles.pillTextSelected]}>
                                {policy}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Covid Compliant */}
            <View style={styles.card}>
                <SectionTitle icon="shield-virus" title="Covid Compliant" required />
                <View style={styles.pillRow}>
                    {(['YES', 'NO'] as const).map((option) => (
                        <TouchableOpacity
                            key={option}
                            activeOpacity={0.85}
                            style={[styles.pill, covidCompliant === option && styles.pillSelected]}
                            onPress={() => setCovidCompliant(option)}
                        >
                            <Text style={[styles.pillText, covidCompliant === option && styles.pillTextSelected]}>
                                {option}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.85}>
                    <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.saveButton}
                    activeOpacity={0.9}
                    onPress={() => {
                         submit();
                    }}>
                    <Text style={styles.buttonText}>
    {edit === "true"
        ? "Update Details"
        : "Save & Continue"}
</Text>
                    <FontAwesome5 name="arrow-right" size={13} color="#FFF" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
            </View>

            <View style={{ height: 30 }} />
        </ScrollView>
    );
};

// Small reusable section title with icon + optional required marker
const SectionTitle: React.FC<{ icon: string; title: string; required?: boolean }> = ({ icon, title, required }) => (
    <View style={styles.sectionTitleRow}>
        <View style={styles.sectionIconWrap}>
            <FontAwesome5 name={icon} size={12} color="#780C60" />
        </View>
        <Text style={styles.label}>
            {title}
            {required ? <Text style={styles.requiredStar}> *</Text> : null}
        </Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        padding: 20,
        backgroundColor: '#FDF4F8',
        flexGrow: 1,
        paddingTop: 65,
        paddingBottom: 40,
    },

    // Header
    headerWrap: {
        alignItems: 'center',
        marginBottom: 24,
    },
    headerIconBadge: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#F4D8EC',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    header: {
        fontSize: 24,
        fontWeight: '800',
        color: '#2A1B26',
        textAlign: 'center',
    },
    subHeader: {
        fontSize: 14,
        color: '#8A7A85',
        marginTop: 8,
        textAlign: 'center',
        lineHeight: 20,
        maxWidth: 300,
    },
    dotsRow: {
        flexDirection: 'row',
        marginTop: 16,
        gap: 6,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#F0D3E6',
    },
    dotAccent: {
        backgroundColor: '#780C60',
        width: 18,
    },

    // Card wrapper for each section
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 16,
        marginBottom: 14,
        shadowColor: '#780C60',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 3,
    },

    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    sectionIconWrap: {
        width: 26,
        height: 26,
        borderRadius: 8,
        backgroundColor: '#FBEFF7',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: '#2A1B26',
    },
    requiredStar: {
        color: '#C0396F',
        fontWeight: '700',
    },
    hint: {
        fontSize: 11,
        color: '#B199AB',
        marginLeft: 34,
        marginBottom: 10,
    },

    // Inputs
    input: {
        borderWidth: 1.5,
        borderColor: '#F0DCEA',
        borderRadius: 12,
        fontSize: 14,
        color: '#2A1B26',
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: '#FEFBFD',
    },
    textArea: {
        minHeight: 70,
        textAlignVertical: 'top',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#F0DCEA',
        borderRadius: 12,
        backgroundColor: '#FEFBFD',
        paddingHorizontal: 12,
    },
    currencyPrefix: {
        fontSize: 14,
        fontWeight: '700',
        color: '#780C60',
        marginRight: 6,
    },
    inputFlex: {
        flex: 1,
        fontSize: 14,
        color: '#2A1B26',
        paddingVertical: 10,
    },

    // Multi-select chips (Cake Type / Delivery Options)
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#F0DCEA',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        backgroundColor: '#FEFBFD',
        position: 'relative',
    },
    chipSelected: {
        backgroundColor: '#780C60',
        borderColor: '#780C60',
    },
    chipIcon: {
        color: '#780C60',
        marginRight: 8,
    },
    chipIconSelected: {
        color: '#FFFFFF',
    },
    chipText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#780C60',
        letterSpacing: 0.3,
    },
    chipTextSelected: {
        color: '#FFFFFF',
    },
    checkBadge: {
        position: 'absolute',
        top: -6,
        right: -6,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F0DCEA',
    },

    // Single-select pills (Yes/No, payment type, cancellation policy, covid)
    pillRow: {
        flexDirection: 'row',
        gap: 10,
    },
    pillRowWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    pill: {
        borderWidth: 1.5,
        borderColor: '#F0DCEA',
        borderRadius: 12,
        paddingVertical: 9,
        paddingHorizontal: 14,
        backgroundColor: '#FEFBFD',
    },
    pillSelected: {
        backgroundColor: '#780C60',
        borderColor: '#780C60',
    },
    pillText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#780C60',
        letterSpacing: 0.3,
    },
    pillTextSelected: {
        color: '#FFFFFF',
    },

    // Bottom buttons
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
        gap: 12,
    },
    backButton: {
        flex: 1,
        borderWidth: 1.5,
        borderColor: '#780C60',
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    backButtonText: {
        color: '#780C60',
        fontWeight: '700',
        fontSize: 14,
    },
    saveButton: {
        flex: 1.4,
        flexDirection: 'row',
        backgroundColor: '#780C60',
        paddingVertical: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 14,
        shadowColor: '#780C60',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    buttonText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 14,
    },
});

export default CakeBusinessDetailsScreen;