import postSalonBusinessDetails from '@/services/postSalonBusinessDetails';
import { getSecureData } from "@/store";
import { FontAwesome5 } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

const STAFF_TYPES = [
    { label: 'SOLO', icon: 'user' },
    { label: 'SALON', icon: 'cut' },
    { label: 'HOME-BASED SALON', icon: 'home' },
];

const STAFF_GENDERS = [
    { label: 'MALE', icon: 'male' },
    { label: 'FEMALE', icon: 'female' },
    { label: 'TRANSGENDER', icon: 'transgender-alt' },
];

const BusinessDetailsForm = () => {
    // Single-select: vendor picks exactly one business type
    const [staffType, setStaffType] = useState<string | null>(null);
    const [expertise, setExpertise] = useState<string>("");
    const [travelsToClientHome, setTravelsToClientHome] = useState<"YES" | "NO" | null>(null);
    const [cityCovered, setCityCovered] = useState<string>("");
    // Multi-select: vendor can offer more than one staff gender
    const [staffGender, setStaffGender] = useState<string[]>([]);
    const [minimumPrice, setMinimumPrice] = useState<string>("");
    const [description, setDescription] = useState<string>("");
    const [additionalInfo, setAdditionalInfo] = useState<string>("");
    const [downPaymentType, setDownPaymentType] = useState<"PERCENTAGE" | "FIXED" | null>(null);
    const [downPayment, setDownPayment] = useState<string>("");
    const [covidCompliant, setCovidCompliant] = useState<"YES" | "NO" | null>(null);
    const [cancellationPolicy, setCancellationPolicy] = useState<"REFUNDABLE" | "NON-REFUNDABLE" | "PARTIALLY REFUNDABLE" | null>(null);

    const toggleStaffGender = (label: string) => {
        setStaffGender((prev) =>
            prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
        );
    };

    const submit = async () => {
        if (
            !staffType ||
            !expertise ||
            travelsToClientHome === null ||
            !cityCovered ||
            staffGender.length === 0 ||
            !minimumPrice ||
            !description ||
            !downPaymentType ||
            !downPayment ||
            !covidCompliant ||
            !cancellationPolicy
        ) {
            Alert.alert("Error", "Please fill in all required fields marked with *.");
            return;
        }

        const travel = travelsToClientHome === "YES" ? true : false;

        try {
            const user = JSON.parse(await getSecureData("user") || "");
            await postSalonBusinessDetails(user._id, {
                staffType,
                expertise,
                travelsToClientHome: travel,
                cityCovered,
                staffGender,
                minimumPrice: Number(minimumPrice),
                description,
                additionalInfo: additionalInfo || undefined,
                downPaymentType,
                downPayment: Number(downPayment),
                covidCompliant,
                cancellationPolicy,
            });
            Alert.alert("Success", "Business details saved successfully!");
            router.push("/packages");
        } catch (error) {
            console.error("Error:", error);
            Alert.alert("Error", "Something went wrong. Please try again.");
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

            {/* Header */}
            <View style={styles.headerWrap}>
                <View style={styles.headerIconBadge}>
                    <FontAwesome5 name="cut" size={22} color="#780C60" />
                </View>
                <Text style={styles.header}>Business Details</Text>
                <Text style={styles.subHeader}>
                    Want to start your business with us? Enter your following info details
                </Text>
                <View style={styles.dotsRow}>
                    {[0, 1, 2, 3, 4].map((i) => (
                        <View key={i} style={[styles.dot, i === 2 && styles.dotAccent]} />
                    ))}
                </View>
            </View>

            {/* Type - single select */}
            <View style={styles.card}>
                <SectionTitle icon="cut" title="Type" required />
                <View style={styles.chipContainer}>
                    {STAFF_TYPES.map((type) => {
                        const isSelected = staffType === type.label;
                        return (
                            <TouchableOpacity
                                key={type.label}
                                activeOpacity={0.85}
                                style={[styles.chip, isSelected && styles.chipSelected]}
                                onPress={() => setStaffType(type.label)}
                            >
                                <FontAwesome5
                                    name={type.icon}
                                    size={16}
                                    style={[styles.chipIcon, isSelected && styles.chipIconSelected]}
                                />
                                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                                    {type.label}
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

            {/* Expertise */}
            <View style={styles.card}>
                <SectionTitle icon="star" title="Expertise" required />
                <TextInput
                    style={styles.input}
                    placeholder="Enter expertise"
                    placeholderTextColor="#B99DAF"
                    value={expertise}
                    onChangeText={setExpertise}
                />
            </View>

            {/* Travels to Client Home - single select */}
            <View style={styles.card}>
                <SectionTitle icon="route" title="Travels to Client Home" required />
                <View style={styles.pillRow}>
                    {['YES', 'NO'].map((option) => (
                        <TouchableOpacity
                            key={option}
                            activeOpacity={0.85}
                            style={[styles.pill, travelsToClientHome === option && styles.pillSelected]}
                            onPress={() => setTravelsToClientHome(option as "YES" | "NO")}
                        >
                            <Text style={[styles.pillText, travelsToClientHome === option && styles.pillTextSelected]}>
                                {option}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* City Covered */}
            <View style={styles.card}>
                <SectionTitle icon="map-marker-alt" title="City Covered" required />
                <TextInput
                    style={styles.input}
                    placeholder="Select Cities"
                    placeholderTextColor="#B99DAF"
                    value={cityCovered}
                    onChangeText={setCityCovered}
                />
            </View>

            {/* Staff - multi select */}
            <View style={styles.card}>
                <SectionTitle icon="users" title="Staff" required />
                <Text style={styles.hint}>Select all that apply</Text>
                <View style={styles.chipContainer}>
                    {STAFF_GENDERS.map((staff) => {
                        const isSelected = staffGender.includes(staff.label);
                        return (
                            <TouchableOpacity
                                key={staff.label}
                                activeOpacity={0.85}
                                style={[styles.chip, isSelected && styles.chipSelected]}
                                onPress={() => toggleStaffGender(staff.label)}
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

            {/* Minimum Price */}
            <View style={styles.card}>
                <SectionTitle icon="tag" title="Minimum Price" />
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

            {/* Description */}
            <View style={styles.card}>
                <SectionTitle icon="align-left" title="Description" required />
                <TextInput
                    style={[styles.input, styles.textArea]}
                    multiline
                    placeholder="Enter Description"
                    placeholderTextColor="#B99DAF"
                    value={description}
                    onChangeText={setDescription}
                />
            </View>

            {/* Additional Info */}
            <View style={styles.card}>
                <SectionTitle icon="sticky-note" title="Additional Info" />
                <TextInput
                    style={[styles.input, styles.textArea]}
                    multiline
                    placeholder="Add any special notes..."
                    placeholderTextColor="#B99DAF"
                    value={additionalInfo}
                    onChangeText={setAdditionalInfo}
                />
            </View>

            {/* Down Payment Type */}
            <View style={styles.card}>
                <SectionTitle icon="money-bill-wave" title="Down Payment Type" required />
                <View style={styles.pillRow}>
                    {['PERCENTAGE', 'FIXED'].map((option) => (
                        <TouchableOpacity
                            key={option}
                            activeOpacity={0.85}
                            style={[styles.pill, downPaymentType === option && styles.pillSelected]}
                            onPress={() => setDownPaymentType(option as "PERCENTAGE" | "FIXED")}
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
                    <Text style={styles.currencyPrefix}>Rs.</Text>
                    <TextInput
                        style={styles.inputFlex}
                        placeholder="Enter Down Payment"
                        placeholderTextColor="#B99DAF"
                        keyboardType="numeric"
                        value={downPayment}
                        onChangeText={setDownPayment}
                    />
                </View>
            </View>

            {/* Covid Compliant */}
            <View style={styles.card}>
                <SectionTitle icon="shield-virus" title="Covid Compliant" required />
                <View style={styles.pillRow}>
                    {['YES', 'NO'].map((option) => (
                        <TouchableOpacity
                            key={option}
                            activeOpacity={0.85}
                            style={[styles.pill, covidCompliant === option && styles.pillSelected]}
                            onPress={() => setCovidCompliant(option as "YES" | "NO")}
                        >
                            <Text style={[styles.pillText, covidCompliant === option && styles.pillTextSelected]}>
                                {option}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Refund Policy */}
            <View style={styles.card}>
                <SectionTitle icon="undo-alt" title="Refund Policy" required />
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
                    <Text style={styles.buttonText}>Save & Continue</Text>
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

export default BusinessDetailsForm;

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

    // Chips (Type single-select / Staff multi-select)
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