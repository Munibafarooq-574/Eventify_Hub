import postVenueBusinessDetails from "@/services/postVenueBusinessDetails";
import patchBusinessDetails from "@/services/patchBusinessDetails";
import { useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import axios from "axios";
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

const VENUE_TYPES = [
    { label: "HALL", icon: "landmark" },
    { label: "OUTDOOR", icon: "tree" },
    { label: "MARQUEE/BANQUET", icon: "warehouse" },
];

const CATERING_OPTIONS = [
    { label: "INTERNAL", icon: "utensils" },
    { label: "EXTERNAL", icon: "truck" },
];

const STAFF_GENDERS = [
    { label: "MALE", icon: "male" },
    { label: "FEMALE", icon: "female" },
    { label: "TRANSGENDER", icon: "transgender-alt" },
];

const BusinessDetailsForm = () => {
    const { edit, userId } = useLocalSearchParams();
    useEffect(() => {
    console.log("Route Params:");
    console.log("edit =", edit);
    console.log("userId =", userId);
}, [edit, userId]);
    const [venueType, setVenueType] = useState<string[]>([]);
    const [expertise, setExpertise] = useState<string>("");
    const [amenities, setAmenities] = useState<string>("");
    const [maximumPeopleCapacity, setMaximumPeopleCapacity] = useState<string>("");
    const [catering, setCatering] = useState<string[]>([]); // multi select
    const [parking, setParking] = useState<"YES" | "NO" | null>(null);
    const [staff, setStaff] = useState<string[]>([]); // multi select
    const [minimumPrice, setMinimumPrice] = useState<string>("");
    const [description, setDescription] = useState<string>("");
    const [additionalInfo, setAdditionalInfo] = useState<string>("");
    const [downPaymentType, setDownPaymentType] = useState<"PERCENTAGE" | "FIXED" | null>(null);
    const [downPayment, setDownPayment] = useState<string>("");
    const [cancellationPolicy, setCancellationPolicy] = useState<
        "REFUNDABLE" | "NON-REFUNDABLE" | "PARTIALLY REFUNDABLE" | null
    >(null);
    const [covidCompliant, setCovidCompliant] = useState<"YES" | "NO" | null>(null);

    const toggleVenueType = (label: string) => {
    setVenueType((prev) =>
        prev.includes(label)
            ? prev.filter((item) => item !== label)
            : [...prev, label]
    );
};
    const toggleCatering = (label: string) => {
        setCatering((prev) =>
            prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
        );
    };

    const toggleStaff = (label: string) => {
        setStaff((prev) =>
            prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
        );
    };

    useEffect(() => {
    if (edit !== "true") return;

    const loadData = async () => {
        try {
            const res = await axios.get(
                `https://eventify-hub.onrender.com/vendor?userId=${userId}`
            );

            const data = res.data.venueBusinessDetails;

            setVenueType(data.typeOfVenue || []);
            setExpertise(data.expertise || "");
            setAmenities(data.amenities || "");
            setMaximumPeopleCapacity(
                data.maximumPeopleCapacity?.toString() || ""
            );
            setCatering(data.catering || []);
            setParking(data.parking ? "YES" : "NO");
            setStaff(data.staff || []);
            setMinimumPrice(data.minimumPrice?.toString() || "");
            setDescription(data.description || "");
            setAdditionalInfo(data.additionalInfo || "");
            setDownPaymentType(data.downPaymentType || null);
            setDownPayment(data.downPayment?.toString() || "");
            setCancellationPolicy(data.cancellationPolicy || null);
            setCovidCompliant(data.covidCompliant || null);
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
            venueType.length === 0 ||
            !expertise ||
            !amenities ||
            catering.length === 0 ||
            parking === null ||
            staff.length === 0 ||
            !description ||
            !downPaymentType ||
            !downPayment ||
            !cancellationPolicy ||
            !covidCompliant
        ) {
            Alert.alert("Error", "Please fill in all the required fields marked with *.");
            return;
        }

        try {
    const user = JSON.parse((await getSecureData("user")) || "");

    const dto = {
        typeOfVenue: venueType,
        expertise,
        amenities,
        maximumPeopleCapacity: maximumPeopleCapacity
            ? Number(maximumPeopleCapacity)
            : undefined,
        catering,
        parking: parking === "YES",
        staff,
        minimumPrice: minimumPrice
            ? Number(minimumPrice)
            : undefined,
        description,
        additionalInfo: additionalInfo || undefined,
        downPaymentType,
        downPayment: Number(downPayment),
        cancellationPolicy,
        covidCompliant,
    };

  if (edit === "true") {

    console.log("PATCH API WILL BE CALLED");

    await patchBusinessDetails(user._id, dto);

    Alert.alert(
        "Success",
        "Business details updated successfully!"
    );

    router.back();

} else {

    console.log("POST API WILL BE CALLED");

    await postVenueBusinessDetails(user._id, dto);

    Alert.alert(
        "Success",
        "Business details saved successfully!"
    );

    router.push("/packages");
}

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
                    <FontAwesome5 name="building" size={22} color="#780C60" />
                </View>
                <Text style={styles.header}>Business Details</Text>
                <Text style={styles.subHeader}>
                    Want to start your venue business with us? Enter your following info details
                </Text>
                <View style={styles.dotsRow}>
                    {[0, 1, 2, 3, 4].map((i) => (
                        <View key={i} style={[styles.dot, i === 1 && styles.dotAccent]} />
                    ))}
                </View>
            </View>

            {/* Venue Type - multi select */}
            <View style={styles.card}>
    <SectionTitle icon="landmark" title="Venue Type" required />
    <Text style={styles.hint}>Select all that apply</Text>

    <View style={styles.chipContainer}>
        {VENUE_TYPES.map((type) => {
            const isSelected = venueType.includes(type.label);

            return (
                <TouchableOpacity
                    key={type.label}
                    activeOpacity={0.85}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => toggleVenueType(type.label)}
                >
                    <FontAwesome5
                        name={type.icon}
                        size={16}
                        style={[
                            styles.chipIcon,
                            isSelected && styles.chipIconSelected,
                        ]}
                    />

                    <Text
                        style={[
                            styles.chipText,
                            isSelected && styles.chipTextSelected,
                        ]}
                    >
                        {type.label}
                    </Text>

                    {isSelected && (
                        <View style={styles.checkBadge}>
                            <FontAwesome5
                                name="check"
                                size={8}
                                color="#780C60"
                            />
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
                    style={[styles.input, styles.textArea]}
                    multiline
                    placeholder={`e.g.
                    - Weddings & Receptions
                    - Corporate Events
                    - Birthday Parties
                    - Mehndi & Barat
                    - Conferences & Seminars`}
                    placeholderTextColor="#B99DAF"
                    value={expertise}
                    onChangeText={setExpertise}
                />
            </View>

            {/* Amenities */}
            {/* Amenities */}
<View style={styles.card}>
    <SectionTitle icon="concierge-bell" title="Amenities" required />

                <TextInput
                style={[styles.input, styles.textArea]}
                multiline
                placeholder={`e.g.
     - Air Conditioning
     - Bridal Room
     - Sound System
     - LED Lighting
     - Free Wi-Fi
     - Valet Parking`}
                placeholderTextColor="#B99DAF"
                value={amenities}
                onChangeText={setAmenities}
            />
        </View>

            {/* Maximum People Capacity */}
            <View style={styles.card}>
                <SectionTitle icon="users" title="Maximum People Capacity" />
                <TextInput
                    style={styles.input}
                    placeholder="Enter maximum people capacity"
                    placeholderTextColor="#B99DAF"
                    keyboardType="numeric"
                    value={maximumPeopleCapacity}
                    onChangeText={setMaximumPeopleCapacity}
                />
            </View>

            {/* Catering - multi select */}
            <View style={styles.card}>
                <SectionTitle icon="utensils" title="Catering" required />
                <Text style={styles.hint}>Select all that apply</Text>
                <View style={styles.chipContainer}>
                    {CATERING_OPTIONS.map((option) => {
                        const isSelected = catering.includes(option.label);
                        return (
                            <TouchableOpacity
                                key={option.label}
                                activeOpacity={0.85}
                                style={[styles.chip, isSelected && styles.chipSelected]}
                                onPress={() => toggleCatering(option.label)}
                            >
                                <FontAwesome5
                                    name={option.icon}
                                    size={16}
                                    style={[styles.chipIcon, isSelected && styles.chipIconSelected]}
                                />
                                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                                    {option.label}
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

            {/* Parking - single select */}
            <View style={styles.card}>
                <SectionTitle icon="parking" title="Parking" required />
                <View style={styles.pillRow}>
                    {["YES", "NO"].map((option) => (
                        <TouchableOpacity
                            key={option}
                            activeOpacity={0.85}
                            style={[styles.pill, parking === option && styles.pillSelected]}
                            onPress={() => setParking(option as "YES" | "NO")}
                        >
                            <Text style={[styles.pillText, parking === option && styles.pillTextSelected]}>
                                {option}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Staff - multi select */}
            <View style={styles.card}>
                <SectionTitle icon="user-friends" title="Staff" required />
                <Text style={styles.hint}>Select all that apply</Text>
                <View style={styles.chipContainer}>
                    {STAFF_GENDERS.map((option) => {
                        const isSelected = staff.includes(option.label);
                        return (
                            <TouchableOpacity
                                key={option.label}
                                activeOpacity={0.85}
                                style={[styles.chip, isSelected && styles.chipSelected]}
                                onPress={() => toggleStaff(option.label)}
                            >
                                <FontAwesome5
                                    name={option.icon}
                                    size={16}
                                    style={[styles.chipIcon, isSelected && styles.chipIconSelected]}
                                />
                                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                                    {option.label}
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
                    placeholder={`e.g.
                    • Spacious wedding venue
                    • Capacity: 500 guests
                    • Elegant lighting
                    • Stage & sound setup
                    • Generator backup`}
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
                    placeholder={`e.g.
                    - Free parking for 50 cars
                    - In-house sound system
                    - Generator backup available
                    - Bridal room available
                    - Wheelchair accessible`}
                    placeholderTextColor="#B99DAF"
                    value={additionalInfo}
                    onChangeText={setAdditionalInfo}
                />
            </View>

            {/* Down Payment Type */}
            <View style={styles.card}>
                <SectionTitle icon="money-bill-wave" title="Down Payment Type" required />
                <View style={styles.pillRow}>
                    {["PERCENTAGE", "FIXED"].map((option) => (
                        <TouchableOpacity
                            key={option}
                            activeOpacity={0.85}
                            style={[styles.pill, downPaymentType === option && styles.pillSelected]}
                            onPress={() => setDownPaymentType(option as "PERCENTAGE" | "FIXED")}
                        >
                            <Text
                                style={[styles.pillText, downPaymentType === option && styles.pillTextSelected]}
                            >
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
        {downPaymentType === "FIXED" && (
            <Text style={styles.currencyPrefix}>Rs.</Text>
        )}

        <TextInput
            style={styles.inputFlex}
            keyboardType="numeric"
            placeholder={
                downPaymentType === "PERCENTAGE"
                    ? "e.g. 20"
                    : "Enter amount"
            }
            placeholderTextColor="#B99DAF"
            value={downPayment}
            onChangeText={setDownPayment}
        />

        {downPaymentType === "PERCENTAGE" && (
            <Text style={styles.currencySuffix}>%</Text>
        )}
    </View>
</View>

            {/* Covid Compliant */}
            <View style={styles.card}>
                <SectionTitle icon="shield-virus" title="Covid Compliant" required />
                <View style={styles.pillRow}>
                    {["YES", "NO"].map((option) => (
                        <TouchableOpacity
                            key={option}
                            activeOpacity={0.85}
                            style={[styles.pill, covidCompliant === option && styles.pillSelected]}
                            onPress={() => setCovidCompliant(option as "YES" | "NO")}
                        >
                            <Text
                                style={[styles.pillText, covidCompliant === option && styles.pillTextSelected]}
                            >
                                {option}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Cancellation Policy */}
            <View style={styles.card}>
                <SectionTitle icon="undo-alt" title="Cancellation Policy" required />
                <View style={styles.pillRowWrap}>
                    {(["REFUNDABLE", "NON-REFUNDABLE", "PARTIALLY REFUNDABLE"] as const).map((policy) => (
                        <TouchableOpacity
                            key={policy}
                            activeOpacity={0.85}
                            style={[styles.pill, cancellationPolicy === policy && styles.pillSelected]}
                            onPress={() => setCancellationPolicy(policy)}
                        >
                            <Text
                                style={[
                                    styles.pillText,
                                    cancellationPolicy === policy && styles.pillTextSelected,
                                ]}
                            >
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
                <TouchableOpacity style={styles.saveButton} activeOpacity={0.9} onPress={submit}>
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
const SectionTitle: React.FC<{ icon: string; title: string; required?: boolean }> = ({
    icon,
    title,
    required,
}) => (
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
        backgroundColor: "#FDF4F8",
        flexGrow: 1,
        paddingTop: 65,
        paddingBottom: 40,
    },

    // Header
    headerWrap: {
        alignItems: "center",
        marginBottom: 24,
    },
    headerIconBadge: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: "#F4D8EC",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 12,
    },
    header: {
        fontSize: 24,
        fontWeight: "800",
        color: "#2A1B26",
        textAlign: "center",
    },
    subHeader: {
        fontSize: 14,
        color: "#8A7A85",
        marginTop: 8,
        textAlign: "center",
        lineHeight: 20,
        maxWidth: 300,
    },
    dotsRow: {
        flexDirection: "row",
        marginTop: 16,
        gap: 6,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#F0D3E6",
    },
    dotAccent: {
        backgroundColor: "#780C60",
        width: 18,
    },

    // Card wrapper for each section
    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 18,
        padding: 16,
        marginBottom: 14,
        shadowColor: "#780C60",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 3,
    },

    sectionTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 4,
    },
    sectionIconWrap: {
        width: 26,
        height: 26,
        borderRadius: 8,
        backgroundColor: "#FBEFF7",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: "700",
        color: "#2A1B26",
    },
    requiredStar: {
        color: "#C0396F",
        fontWeight: "700",
    },
    hint: {
        fontSize: 11,
        color: "#B199AB",
        marginLeft: 34,
        marginBottom: 10,
    },

    // Inputs
    input: {
        borderWidth: 1.5,
        borderColor: "#F0DCEA",
        borderRadius: 12,
        fontSize: 14,
        color: "#2A1B26",
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: "#FEFBFD",
    },
    textArea: {
        minHeight: 70,
        textAlignVertical: "top",
    },
    inputRow: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1.5,
        borderColor: "#F0DCEA",
        borderRadius: 12,
        backgroundColor: "#FEFBFD",
        paddingHorizontal: 12,
    },
    currencyPrefix: {
        fontSize: 14,
        fontWeight: "700",
        color: "#780C60",
        marginRight: 6,
    },
    currencySuffix: {
            fontSize: 14,
            fontWeight: "700",
            color: "#780C60",
            marginLeft: 6,
        },
    inputFlex: {
        flex: 1,
        fontSize: 14,
        color: "#2A1B26",
        paddingVertical: 10,
    },

    // Multi-select chips (Venue Type / Catering / Staff)
    chipContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    chip: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1.5,
        borderColor: "#F0DCEA",
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        backgroundColor: "#FEFBFD",
        position: "relative",
    },
    chipSelected: {
        backgroundColor: "#780C60",
        borderColor: "#780C60",
    },
    chipIcon: {
        color: "#780C60",
        marginRight: 8,
    },
    chipIconSelected: {
        color: "#FFFFFF",
    },
    chipText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#780C60",
        letterSpacing: 0.3,
    },
    chipTextSelected: {
        color: "#FFFFFF",
    },
    checkBadge: {
        position: "absolute",
        top: -6,
        right: -6,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: "#FFFFFF",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#F0DCEA",
    },

    // Single-select pills (Yes/No, payment type, cancellation policy, covid)
    pillRow: {
        flexDirection: "row",
        gap: 10,
    },
    pillRowWrap: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    pill: {
        borderWidth: 1.5,
        borderColor: "#F0DCEA",
        borderRadius: 12,
        paddingVertical: 9,
        paddingHorizontal: 14,
        backgroundColor: "#FEFBFD",
    },
    pillSelected: {
        backgroundColor: "#780C60",
        borderColor: "#780C60",
    },
    pillText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#780C60",
        letterSpacing: 0.3,
    },
    pillTextSelected: {
        color: "#FFFFFF",
    },

    // Bottom buttons
    buttonContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 10,
        gap: 12,
    },
    backButton: {
        flex: 1,
        borderWidth: 1.5,
        borderColor: "#780C60",
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: "center",
        backgroundColor: "#fff",
    },
    backButtonText: {
        color: "#780C60",
        fontWeight: "700",
        fontSize: 14,
    },
    saveButton: {
        flex: 1.4,
        flexDirection: "row",
        backgroundColor: "#780C60",
        paddingVertical: 14,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 14,
        shadowColor: "#780C60",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    buttonText: {
        color: "#FFF",
        fontWeight: "700",
        fontSize: 14,
    },
});