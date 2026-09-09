// fyp-mobile/components/bdgeneric/BDGenericIndex.tsx

import { CreateGenericBusinessDetailsDto } from "@/dto/CreateGenericBusinessDetails.dto";
import patchBusinessDetails from "@/services/patchBusinessDetails";
import postGenericBusinessDetails from "@/services/postGenericBusinessDetails";
import { getSecureData } from "@/store";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import axios from "axios";
import {
    router,
    useLocalSearchParams,
} from "expo-router";
import React, {
    useEffect,
    useState,
} from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

type YesNo = "YES" | "NO" | null;

type DownPaymentType =
    | "PERCENTAGE"
    | "FIXED"
    | null;

type CancellationPolicy =
    | "REFUNDABLE"
    | "NON-REFUNDABLE"
    | "PARTIALLY REFUNDABLE"
    | null;

const DOWN_PAYMENT_TYPES = [
    {
        label: "PERCENTAGE",
        title: "Percentage",
        icon: "percent",
    },
    {
        label: "FIXED",
        title: "Fixed Amount",
        icon: "money-bill-wave",
    },
] as const;

const CANCELLATION_POLICIES = [
    {
        label: "REFUNDABLE",
        title: "Refundable",
        icon: "undo",
    },
    {
        label: "NON-REFUNDABLE",
        title: "Non-Refundable",
        icon: "ban",
    },
    {
        label: "PARTIALLY REFUNDABLE",
        title: "Partially Refundable",
        icon: "adjust",
    },
] as const;

const SectionTitle = ({
    icon,
    title,
    required,
}: {
    icon: string;
    title: string;
    required?: boolean;
}) => {
    return (
        <View style={styles.sectionTitleRow}>
            <View style={styles.sectionIconWrap}>
                <FontAwesome5
                    name={icon}
                    size={14}
                    color="#780C60"
                />
            </View>

            <Text style={styles.label}>
                {title}

                {required ? (
                    <Text style={styles.requiredStar}>
                        {" "}*
                    </Text>
                ) : null}
            </Text>
        </View>
    );
};

const BDGenericIndex = () => {
    const { edit, userId } =
        useLocalSearchParams();

    const [categoryName, setCategoryName] =
        useState("Your Business");

    const [travelsToClientHome, setTravelsToClientHome] =
        useState<YesNo>(null);

    const [cityCovered, setCityCovered] =
        useState("");

    const [minimumPrice, setMinimumPrice] =
        useState("");

    const [description, setDescription] =
        useState("");

    const [additionalInfo, setAdditionalInfo] =
        useState("");

    const [downPaymentType, setDownPaymentType] =
        useState<DownPaymentType>(null);

    const [downPayment, setDownPayment] =
        useState("");

    const [cancellationPolicy, setCancellationPolicy] =
        useState<CancellationPolicy>(null);

    const [isLoading, setIsLoading] =
        useState(false);

    useEffect(() => {
        const loadCategoryName = async () => {
            try {
                const storedCategoryName =
                    await getSecureData(
                        "categoryName"
                    );

                if (storedCategoryName) {
                    setCategoryName(
                        storedCategoryName
                    );
                }
            } catch (error) {
                console.log(
                    "Category name load error:",
                    error
                );
            }
        };

        loadCategoryName();
    }, []);

    useEffect(() => {
        if (edit !== "true") {
            return;
        }

        const loadExistingData =
            async () => {
                try {
                    const res =
                        await axios.get(
                            `https://eventify-hub.onrender.com/vendor?userId=${userId}`
                        );

                    const data =
                        res.data
                            ?.genericBusinessDetails;

                    if (!data) {
                        return;
                    }

                    setDescription(
                        data.description || ""
                    );

                    setCityCovered(
                        data.cityCovered || ""
                    );

                    setMinimumPrice(
                        data.minimumPrice
                            ?.toString() || ""
                    );

                    setAdditionalInfo(
                        data.additionalInfo || ""
                    );

                    setTravelsToClientHome(
                        data.travelsToClientHome ===
                            true
                            ? "YES"
                            : data.travelsToClientHome ===
                                false
                              ? "NO"
                              : null
                    );

                    setDownPaymentType(
                        data.downPaymentType ||
                            null
                    );

                    setDownPayment(
                        data.downPayment
                            ?.toString() || ""
                    );

                    setCancellationPolicy(
                        data.cancellationPolicy ||
                            null
                    );
                } catch (error) {
                    console.log(
                        "Generic business details load error:",
                        error
                    );
                }
            };

        loadExistingData();
    }, [edit, userId]);

    const submit = async () => {
        if (
            !description.trim() ||
            !cityCovered.trim() ||
            !minimumPrice ||
            travelsToClientHome === null ||
            !downPaymentType ||
            !downPayment ||
            !cancellationPolicy
        ) {
            Alert.alert(
                "Missing Information",
                "Please fill all required fields."
            );

            return;
        }

        const parsedMinimumPrice =
            Number(minimumPrice);

        const parsedDownPayment =
            Number(downPayment);

        if (
            Number.isNaN(parsedMinimumPrice) ||
            parsedMinimumPrice < 0
        ) {
            Alert.alert(
                "Invalid Price",
                "Please enter a valid starting price."
            );

            return;
        }

        if (
            Number.isNaN(parsedDownPayment) ||
            parsedDownPayment < 0
        ) {
            Alert.alert(
                "Invalid Down Payment",
                "Please enter a valid down payment."
            );

            return;
        }

        if (
            downPaymentType ===
                "PERCENTAGE" &&
            parsedDownPayment > 100
        ) {
            Alert.alert(
                "Invalid Percentage",
                "Percentage down payment cannot be more than 100%."
            );

            return;
        }

        try {
            setIsLoading(true);

            const storedUser =
                await getSecureData("user");

            if (!storedUser) {
                Alert.alert(
                    "Session Error",
                    "User information was not found. Please login again."
                );

                return;
            }

            const user =
                JSON.parse(storedUser);

            if (!user?._id) {
                Alert.alert(
                    "Session Error",
                    "User ID was not found."
                );

                return;
            }

            const dto: CreateGenericBusinessDetailsDto =
                {
                    description:
                        description.trim(),

                    cityCovered:
                        cityCovered.trim(),

                    minimumPrice:
                        parsedMinimumPrice,

                    additionalInfo:
                        additionalInfo.trim() ||
                        undefined,

                    travelsToClientHome:
                        travelsToClientHome ===
                        "YES",

                    downPaymentType,

                    downPayment:
                        parsedDownPayment,

                    cancellationPolicy,

                    customFields: {},
                };

            if (edit === "true") {
                await patchBusinessDetails(
                    user._id,
                    dto
                );

                Alert.alert(
                    "Success",
                    "Business details updated successfully!"
                );

                router.back();

                return;
            }

            await postGenericBusinessDetails(
                user._id,
                dto
            );

            Alert.alert(
                "Success",
                "Business details saved successfully!"
            );

            router.push("/packages");
        } catch (error: any) {
            console.error(
                "Generic Business Details Error:",
                error
            );

            const message =
                error?.response?.data
                    ?.message;

            Alert.alert(
                "Error",
                Array.isArray(message)
                    ? message.join("\n")
                    : message ||
                          "Something went wrong. Please try again."
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ScrollView
            contentContainerStyle={
                styles.container
            }
            showsVerticalScrollIndicator={
                false
            }
            keyboardShouldPersistTaps="handled"
        >
            {/* Header */}

            <View style={styles.headerWrap}>
                <TouchableOpacity
                    style={
                        styles.backButton
                    }
                    activeOpacity={0.8}
                    onPress={() =>
                        router.back()
                    }
                >
                    <Ionicons
                        name="arrow-back"
                        size={22}
                        color="#780C60"
                    />
                </TouchableOpacity>

                <View
                    style={
                        styles.headerIconBadge
                    }
                >
                    <FontAwesome5
                        name="briefcase"
                        size={22}
                        color="#780C60"
                    />
                </View>

                <Text
                    style={styles.header}
                >
                    Business Details
                </Text>

                <Text
                    style={styles.categoryTitle}
                >
                    {categoryName}
                </Text>

                <Text
                    style={styles.subHeader}
                >
                    Tell customers about your
                    business, pricing and service
                    preferences.
                </Text>

                <View
                    style={styles.dotsRow}
                >
                    {[0, 1, 2, 3, 4].map(
                        (i) => (
                            <View
                                key={i}
                                style={[
                                    styles.dot,
                                    i === 2 &&
                                        styles.dotAccent,
                                ]}
                            />
                        )
                    )}
                </View>
            </View>

            {/* Description */}

            <View style={styles.card}>
                <SectionTitle
                    icon="align-left"
                    title="Business Description"
                    required
                />

                <Text
                    style={styles.hint}
                >
                    Tell clients what services
                    you provide.
                </Text>

                <TextInput
                    style={[
                        styles.input,
                        styles.textArea,
                    ]}
                    multiline
                    textAlignVertical="top"
                    placeholder="Describe your business, services and experience..."
                    placeholderTextColor="#B99DAF"
                    value={description}
                    onChangeText={
                        setDescription
                    }
                    maxLength={1000}
                />

                <Text
                    style={
                        styles.characterCount
                    }
                >
                    {description.length}/1000
                </Text>
            </View>

            {/* City */}

            <View style={styles.card}>
                <SectionTitle
                    icon="map-marker-alt"
                    title="City Covered"
                    required
                />

                <TextInput
                    style={styles.input}
                    placeholder="Example: Lahore"
                    placeholderTextColor="#B99DAF"
                    value={cityCovered}
                    onChangeText={
                        setCityCovered
                    }
                />
            </View>

            {/* Travel */}

            <View style={styles.card}>
                <SectionTitle
                    icon="route"
                    title="Travels to Client Location"
                    required
                />

                <View
                    style={styles.pillRow}
                >
                    {["YES", "NO"].map(
                        (option) => {
                            const selected =
                                travelsToClientHome ===
                                option;

                            return (
                                <TouchableOpacity
                                    key={
                                        option
                                    }
                                    activeOpacity={
                                        0.85
                                    }
                                    style={[
                                        styles.pill,
                                        selected &&
                                            styles.pillSelected,
                                    ]}
                                    onPress={() =>
                                        setTravelsToClientHome(
                                            option as
                                                | "YES"
                                                | "NO"
                                        )
                                    }
                                >
                                    <FontAwesome5
                                        name={
                                            option ===
                                            "YES"
                                                ? "check-circle"
                                                : "times-circle"
                                        }
                                        size={15}
                                        style={[
                                            styles.pillIcon,
                                            selected &&
                                                styles.pillIconSelected,
                                        ]}
                                    />

                                    <Text
                                        style={[
                                            styles.pillText,
                                            selected &&
                                                styles.pillTextSelected,
                                        ]}
                                    >
                                        {option}
                                    </Text>
                                </TouchableOpacity>
                            );
                        }
                    )}
                </View>
            </View>

            {/* Starting Price */}

            <View style={styles.card}>
                <SectionTitle
                    icon="tag"
                    title="Starting Price"
                    required
                />

                <View
                    style={styles.inputRow}
                >
                    <Text
                        style={
                            styles.currencyPrefix
                        }
                    >
                        Rs.
                    </Text>

                    <TextInput
                        style={
                            styles.inputFlex
                        }
                        keyboardType="numeric"
                        placeholder="Enter starting price"
                        placeholderTextColor="#B99DAF"
                        value={minimumPrice}
                        onChangeText={(text) =>
                            setMinimumPrice(
                                text.replace(
                                    /[^0-9]/g,
                                    ""
                                )
                            )
                        }
                    />
                </View>
            </View>

            {/* Down Payment Type */}

            <View style={styles.card}>
                <SectionTitle
                    icon="wallet"
                    title="Down Payment Type"
                    required
                />

                <View
                    style={
                        styles.chipContainer
                    }
                >
                    {DOWN_PAYMENT_TYPES.map(
                        (item) => {
                            const selected =
                                downPaymentType ===
                                item.label;

                            return (
                                <TouchableOpacity
                                    key={
                                        item.label
                                    }
                                    activeOpacity={
                                        0.85
                                    }
                                    style={[
                                        styles.chip,
                                        selected &&
                                            styles.chipSelected,
                                    ]}
                                    onPress={() =>
                                        setDownPaymentType(
                                            item.label
                                        )
                                    }
                                >
                                    <FontAwesome5
                                        name={
                                            item.icon
                                        }
                                        size={15}
                                        style={[
                                            styles.chipIcon,
                                            selected &&
                                                styles.chipIconSelected,
                                        ]}
                                    />

                                    <Text
                                        style={[
                                            styles.chipText,
                                            selected &&
                                                styles.chipTextSelected,
                                        ]}
                                    >
                                        {
                                            item.title
                                        }
                                    </Text>

                                    {selected && (
                                        <View
                                            style={
                                                styles.checkBadge
                                            }
                                        >
                                            <FontAwesome5
                                                name="check"
                                                size={
                                                    8
                                                }
                                                color="#780C60"
                                            />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        }
                    )}
                </View>
            </View>

            {/* Down Payment */}

            <View style={styles.card}>
                <SectionTitle
                    icon="money-bill-wave"
                    title={
                        downPaymentType ===
                        "PERCENTAGE"
                            ? "Down Payment Percentage"
                            : "Down Payment Amount"
                    }
                    required
                />

                <View
                    style={styles.inputRow}
                >
                    <Text
                        style={
                            styles.currencyPrefix
                        }
                    >
                        {downPaymentType ===
                        "PERCENTAGE"
                            ? "%"
                            : "Rs."}
                    </Text>

                    <TextInput
                        style={
                            styles.inputFlex
                        }
                        keyboardType="numeric"
                        placeholder={
                            downPaymentType ===
                            "PERCENTAGE"
                                ? "Example: 20"
                                : "Example: 5000"
                        }
                        placeholderTextColor="#B99DAF"
                        value={downPayment}
                        onChangeText={(text) =>
                            setDownPayment(
                                text.replace(
                                    /[^0-9]/g,
                                    ""
                                )
                            )
                        }
                    />
                </View>
            </View>

            {/* Cancellation Policy */}

            <View style={styles.card}>
                <SectionTitle
                    icon="file-contract"
                    title="Cancellation Policy"
                    required
                />

                <View
                    style={
                        styles.chipContainer
                    }
                >
                    {CANCELLATION_POLICIES.map(
                        (item) => {
                            const selected =
                                cancellationPolicy ===
                                item.label;

                            return (
                                <TouchableOpacity
                                    key={
                                        item.label
                                    }
                                    activeOpacity={
                                        0.85
                                    }
                                    style={[
                                        styles.chip,
                                        styles.policyChip,
                                        selected &&
                                            styles.chipSelected,
                                    ]}
                                    onPress={() =>
                                        setCancellationPolicy(
                                            item.label
                                        )
                                    }
                                >
                                    <FontAwesome5
                                        name={
                                            item.icon
                                        }
                                        size={14}
                                        style={[
                                            styles.chipIcon,
                                            selected &&
                                                styles.chipIconSelected,
                                        ]}
                                    />

                                    <Text
                                        style={[
                                            styles.chipText,
                                            selected &&
                                                styles.chipTextSelected,
                                        ]}
                                    >
                                        {
                                            item.title
                                        }
                                    </Text>

                                    {selected && (
                                        <View
                                            style={
                                                styles.checkBadge
                                            }
                                        >
                                            <FontAwesome5
                                                name="check"
                                                size={
                                                    8
                                                }
                                                color="#780C60"
                                            />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        }
                    )}
                </View>
            </View>

            {/* Additional Info */}

            <View style={styles.card}>
                <SectionTitle
                    icon="info-circle"
                    title="Additional Information"
                />

                <Text
                    style={styles.hint}
                >
                    Optional
                </Text>

                <TextInput
                    style={[
                        styles.input,
                        styles.textAreaSmall,
                    ]}
                    multiline
                    textAlignVertical="top"
                    placeholder="Anything else clients should know..."
                    placeholderTextColor="#B99DAF"
                    value={additionalInfo}
                    onChangeText={
                        setAdditionalInfo
                    }
                    maxLength={600}
                />
            </View>

            {/* Submit */}

            <TouchableOpacity
                style={[
                    styles.submitButton,
                    isLoading &&
                        styles.submitButtonDisabled,
                ]}
                disabled={isLoading}
                activeOpacity={0.9}
                onPress={submit}
            >
                {isLoading ? (
                    <ActivityIndicator
                        color="#FFFFFF"
                    />
                ) : (
                    <>
                        <Text
                            style={
                                styles.submitButtonText
                            }
                        >
                            {edit === "true"
                                ? "Update Business Details"
                                : "Continue"}
                        </Text>

                        <Ionicons
                            name="arrow-forward"
                            size={21}
                            color="#FFFFFF"
                        />
                    </>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: "#FCEFFC",
        paddingHorizontal: 20,
        paddingTop: 55,
        paddingBottom: 50,
    },

    headerWrap: {
        backgroundColor: "#FFFFFF",
        borderRadius: 28,
        paddingHorizontal: 20,
        paddingVertical: 25,
        alignItems: "center",
        marginBottom: 22,

        shadowColor: "#780C60",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.12,
        shadowRadius: 10,
        elevation: 6,
    },

    backButton: {
        position: "absolute",
        left: 16,
        top: 16,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#FCE8F8",
        alignItems: "center",
        justifyContent: "center",
    },

    headerIconBadge: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: "#FCE8F8",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 13,
    },

    header: {
        fontSize: 27,
        fontWeight: "900",
        color: "#3C003C",
        textAlign: "center",
    },

    categoryTitle: {
        fontSize: 17,
        fontWeight: "800",
        color: "#780C60",
        marginTop: 5,
        textAlign: "center",
    },

    subHeader: {
        marginTop: 10,
        color: "#777",
        fontSize: 14,
        lineHeight: 21,
        textAlign: "center",
        paddingHorizontal: 15,
    },

    dotsRow: {
        flexDirection: "row",
        gap: 7,
        marginTop: 18,
    },

    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#E7C7E0",
    },

    dotAccent: {
        width: 24,
        backgroundColor: "#780C60",
    },

    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 22,
        padding: 18,
        marginBottom: 16,

        borderWidth: 1,
        borderColor: "#F1D1E9",

        shadowColor: "#780C60",
        shadowOffset: {
            width: 0,
            height: 3,
        },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
    },

    sectionTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 11,
    },

    sectionIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#FCE8F8",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 9,
    },

    label: {
        flex: 1,
        fontSize: 15,
        fontWeight: "800",
        color: "#3C003C",
    },

    requiredStar: {
        color: "#E15A45",
    },

    hint: {
        color: "#967A90",
        fontSize: 12,
        marginBottom: 10,
        marginLeft: 2,
    },

    input: {
        backgroundColor: "#FFF8FD",
        borderWidth: 1,
        borderColor: "#EBCFE4",
        borderRadius: 16,
        paddingHorizontal: 15,
        paddingVertical: 14,
        fontSize: 15,
        color: "#333333",
    },

    textArea: {
        minHeight: 130,
    },

    textAreaSmall: {
        minHeight: 100,
    },

    characterCount: {
        marginTop: 7,
        textAlign: "right",
        color: "#A78AA0",
        fontSize: 11,
    },

    pillRow: {
        flexDirection: "row",
        gap: 10,
    },

    pill: {
        flex: 1,
        minHeight: 49,
        borderRadius: 15,
        borderWidth: 1.5,
        borderColor: "#E6C3DD",
        backgroundColor: "#FFF8FD",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        paddingHorizontal: 12,
    },

    pillSelected: {
        backgroundColor: "#780C60",
        borderColor: "#780C60",
    },

    pillText: {
        color: "#780C60",
        fontSize: 14,
        fontWeight: "800",
    },

    pillTextSelected: {
        color: "#FFFFFF",
    },

    pillIcon: {
        color: "#780C60",
        marginRight: 7,
    },

    pillIconSelected: {
        color: "#FFFFFF",
    },

    inputRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFF8FD",
        borderWidth: 1,
        borderColor: "#EBCFE4",
        borderRadius: 16,
        minHeight: 52,
        overflow: "hidden",
    },

    currencyPrefix: {
        minWidth: 52,
        paddingHorizontal: 12,
        color: "#780C60",
        fontWeight: "900",
        fontSize: 15,
        textAlign: "center",
    },

    inputFlex: {
        flex: 1,
        paddingHorizontal: 12,
        paddingVertical: 14,
        color: "#333333",
        fontSize: 15,
    },

    chipContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },

    chip: {
        minHeight: 48,
        borderWidth: 1.5,
        borderColor: "#E6C3DD",
        borderRadius: 15,
        backgroundColor: "#FFF8FD",
        paddingHorizontal: 15,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },

    policyChip: {
        width: "100%",
        justifyContent: "flex-start",
    },

    chipSelected: {
        borderColor: "#780C60",
        backgroundColor: "#780C60",
    },

    chipIcon: {
        color: "#780C60",
        marginRight: 8,
    },

    chipIconSelected: {
        color: "#FFFFFF",
    },

    chipText: {
        color: "#780C60",
        fontSize: 13,
        fontWeight: "800",
    },

    chipTextSelected: {
        color: "#FFFFFF",
    },

    checkBadge: {
        width: 17,
        height: 17,
        borderRadius: 9,
        backgroundColor: "#FFFFFF",
        justifyContent: "center",
        alignItems: "center",
        marginLeft: 9,
    },

    submitButton: {
        backgroundColor: "#780C60",
        borderRadius: 18,
        minHeight: 58,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 9,
        marginTop: 8,

        shadowColor: "#780C60",
        shadowOffset: {
            width: 0,
            height: 5,
        },
        shadowOpacity: 0.28,
        shadowRadius: 8,
        elevation: 8,
    },

    submitButtonDisabled: {
        opacity: 0.65,
    },

    submitButtonText: {
        color: "#FFFFFF",
        fontSize: 17,
        fontWeight: "900",
    },
});

export default BDGenericIndex;