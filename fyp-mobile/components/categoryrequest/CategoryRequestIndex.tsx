import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Easing,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

const CategoryRequestIndex: React.FC = () => {
    const [categoryName, setCategoryName] = useState("");
    const [description, setDescription] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(40)).current;

    const image = require("@/assets/images/GetStarted.png");

    React.useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
                easing: Easing.out(Easing.ease),
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
                easing: Easing.out(Easing.ease),
            }),
        ]).start();
    }, []);

    const handleSubmit = async () => {
        if (!categoryName.trim()) {
            Alert.alert(
                "Category Required",
                "Please enter your business category name."
            );
            return;
        }

        if (!description.trim()) {
            Alert.alert(
                "Description Required",
                "Please describe the service you provide."
            );
            return;
        }

        try {
            setIsSubmitting(true);

            /**
             * Backend Category Request API will be connected here.
             * For now, UI flow is ready.
             */

            Alert.alert(
                "Request Ready",
                "Your category request form is ready. Backend submission will be connected next."
            );
        } catch (error) {
            console.error("Category request error:", error);

            Alert.alert(
                "Error",
                "Unable to submit category request. Please try again."
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
        >
            <Animated.View
                style={[
                    styles.header,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                    },
                ]}
            >
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                    activeOpacity={0.85}
                >
                    <Ionicons
                        name="arrow-back"
                        size={22}
                        color="#780C60"
                    />
                </TouchableOpacity>

                <View style={styles.textContainer}>
                    <Text style={styles.title}>
                        Can't Find Your{"\n"}
                        <Text style={styles.titleHighlight}>
                            Business Category?
                        </Text>
                    </Text>

                    <Text style={styles.subtitle}>
                        Tell us about the service you provide. Your request
                        will be reviewed before a new category is added to
                        Eventify Hub.
                    </Text>
                </View>

                <View style={styles.logoWrapper}>
                    <Image
                        source={image}
                        style={styles.logo}
                    />
                </View>
            </Animated.View>

            <Animated.View
                style={{
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                }}
            >
                <View style={styles.card}>
                    <View style={styles.labelRow}>
                        <Ionicons
                            name="pricetag-outline"
                            size={20}
                            color="#780C60"
                        />

                        <Text style={styles.label}>
                            Service Category Name
                            <Text style={styles.required}> *</Text>
                        </Text>
                    </View>

                    <Text style={styles.helperText}>
                        Example: Florist, Wedding Transport, Event Security
                    </Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Enter category name"
                        placeholderTextColor="#A98AA3"
                        value={categoryName}
                        onChangeText={setCategoryName}
                        maxLength={80}
                    />

                    <Text style={styles.counter}>
                        {categoryName.length}/80
                    </Text>
                </View>

                <View style={styles.card}>
                    <View style={styles.labelRow}>
                        <Ionicons
                            name="document-text-outline"
                            size={20}
                            color="#780C60"
                        />

                        <Text style={styles.label}>
                            Describe Your Service
                            <Text style={styles.required}> *</Text>
                        </Text>
                    </View>

                    <Text style={styles.helperText}>
                        Briefly explain what your business provides.
                    </Text>

                    <TextInput
                        style={[
                            styles.input,
                            styles.textArea,
                        ]}
                        placeholder="Example: We provide fresh flower decoration for weddings, birthdays and corporate events..."
                        placeholderTextColor="#A98AA3"
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        textAlignVertical="top"
                        maxLength={500}
                    />

                    <Text style={styles.counter}>
                        {description.length}/500
                    </Text>
                </View>

                <View style={styles.infoCard}>
                    <View style={styles.infoIcon}>
                        <Ionicons
                            name="information-circle-outline"
                            size={22}
                            color="#780C60"
                        />
                    </View>

                    <View style={styles.infoContent}>
                        <Text style={styles.infoTitle}>
                            What happens next?
                        </Text>

                        <Text style={styles.infoText}>
                            Eventify Hub will review your request to prevent
                            duplicate categories. Once approved, the category
                            can be used during vendor registration.
                        </Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={[
                        styles.submitButton,
                        (!categoryName.trim() ||
                            !description.trim() ||
                            isSubmitting) &&
                            styles.disabledButton,
                    ]}
                    disabled={
                        !categoryName.trim() ||
                        !description.trim() ||
                        isSubmitting
                    }
                    onPress={handleSubmit}
                    activeOpacity={0.9}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <>
                            <Text style={styles.submitText}>
                                Submit Request
                            </Text>

                            <Ionicons
                                name="arrow-forward"
                                size={20}
                                color="#FFFFFF"
                            />
                        </>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.backToCategoriesButton}
                    onPress={() => router.back()}
                    activeOpacity={0.85}
                >
                    <Text style={styles.backToCategoriesText}>
                        Back to Categories
                    </Text>
                </TouchableOpacity>
            </Animated.View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingTop: 70,
        paddingBottom: 45,
        backgroundColor: "#fceefc",
    },

    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 28,
        backgroundColor: "#FFFFFF",
        padding: 20,
        borderRadius: 28,
        elevation: 6,
        shadowColor: "#780C60",
        shadowOpacity: 0.12,
        shadowRadius: 10,
    },

    backButton: {
        position: "absolute",
        left: 15,
        top: 15,
        zIndex: 10,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#FCE8F8",
        justifyContent: "center",
        alignItems: "center",
    },

    textContainer: {
        flex: 1,
        paddingTop: 35,
        paddingRight: 10,
    },

    title: {
        fontSize: 27,
        fontWeight: "900",
        color: "#3c003c",
        lineHeight: 37,
    },

    titleHighlight: {
        color: "#780C60",
        fontSize: 30,
    },

    subtitle: {
        marginTop: 13,
        fontSize: 14,
        lineHeight: 22,
        color: "#666666",
    },

    logoWrapper: {
        width: 95,
        height: 95,
        borderRadius: 48,
        backgroundColor: "#FCE8F8",
        justifyContent: "center",
        alignItems: "center",
        marginLeft: 5,
        elevation: 5,
    },

    logo: {
        width: 70,
        height: 70,
        resizeMode: "contain",
    },

    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 22,
        padding: 18,
        marginBottom: 18,
        borderWidth: 1.5,
        borderColor: "#F1CCE8",
        elevation: 4,
        shadowColor: "#780C60",
        shadowOpacity: 0.08,
        shadowRadius: 7,
    },

    labelRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 5,
    },

    label: {
        marginLeft: 8,
        color: "#3c003c",
        fontSize: 16,
        fontWeight: "800",
    },

    required: {
        color: "#E15A45",
    },

    helperText: {
        fontSize: 12,
        color: "#8E7789",
        marginBottom: 12,
        marginLeft: 28,
        lineHeight: 18,
    },

    input: {
        minHeight: 54,
        backgroundColor: "#FFF8FD",
        borderWidth: 1.5,
        borderColor: "#E9C9E2",
        borderRadius: 16,
        paddingHorizontal: 15,
        paddingVertical: 14,
        fontSize: 15,
        color: "#333333",
    },

    textArea: {
        minHeight: 140,
    },

    counter: {
        marginTop: 7,
        textAlign: "right",
        fontSize: 11,
        color: "#A98AA3",
    },

    infoCard: {
        flexDirection: "row",
        backgroundColor: "#F8E6F5",
        borderRadius: 20,
        padding: 17,
        marginBottom: 22,
        borderWidth: 1,
        borderColor: "#E7BFDE",
    },

    infoIcon: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: "#FFFFFF",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },

    infoContent: {
        flex: 1,
    },

    infoTitle: {
        color: "#780C60",
        fontSize: 15,
        fontWeight: "800",
        marginBottom: 5,
    },

    infoText: {
        color: "#66515F",
        fontSize: 13,
        lineHeight: 20,
    },

    submitButton: {
        minHeight: 58,
        backgroundColor: "#780C60",
        borderRadius: 18,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        elevation: 6,
        shadowColor: "#780C60",
        shadowOpacity: 0.25,
        shadowRadius: 8,
    },

    disabledButton: {
        backgroundColor: "#D8A6D3",
        elevation: 0,
    },

    submitText: {
        color: "#FFFFFF",
        fontSize: 17,
        fontWeight: "800",
        marginRight: 8,
    },

    backToCategoriesButton: {
        marginTop: 15,
        minHeight: 52,
        backgroundColor: "#FFFFFF",
        borderRadius: 18,
        borderWidth: 2,
        borderColor: "#780C60",
        justifyContent: "center",
        alignItems: "center",
    },

    backToCategoriesText: {
        color: "#780C60",
        fontSize: 16,
        fontWeight: "800",
    },
});

export default CategoryRequestIndex;