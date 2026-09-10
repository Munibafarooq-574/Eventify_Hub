import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import React, { useRef, useState } from "react";
import axios from "axios";

import {
    ActivityIndicator,
    Alert,
    Animated,
    Easing,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";


// PRODUCTION - Render update ke baad:
const CATEGORY_REQUEST_URL =
    "https://eventify-hub.onrender.com/category/requests";

const EMAIL_REGEX =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CategoryRequestIndex: React.FC = () => {
    const [requesterName, setRequesterName] =
        useState("");

    const [requesterEmail, setRequesterEmail] =
        useState("");

    const [categoryName, setCategoryName] =
        useState("");

    const [description, setDescription] =
        useState("");

    const [isSubmitting, setIsSubmitting] =
        useState(false);

    const fadeAnim =
        useRef(new Animated.Value(0)).current;

    const slideAnim =
        useRef(new Animated.Value(40)).current;

    const image =
        require("@/assets/images/GetStarted.png");

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
    }, [fadeAnim, slideAnim]);

    const handleSubmit = async () => {
        const cleanRequesterName =
            requesterName.trim();

        const cleanRequesterEmail =
            requesterEmail
                .trim()
                .toLowerCase();

        const requestedName =
            categoryName.trim();

        const requestedDescription =
            description.trim();

        if (!cleanRequesterName) {
            Alert.alert(
                "Name Required",
                "Please enter your name."
            );
            return;
        }

        if (cleanRequesterName.length < 2) {
            Alert.alert(
                "Invalid Name",
                "Name must contain at least 2 characters."
            );
            return;
        }

        if (!cleanRequesterEmail) {
            Alert.alert(
                "Email Required",
                "Please enter your email address."
            );
            return;
        }

        if (
            !EMAIL_REGEX.test(
                cleanRequesterEmail
            )
        ) {
            Alert.alert(
                "Invalid Email",
                "Please enter a valid email address, for example name@example.com."
            );
            return;
        }

        if (!requestedName) {
            Alert.alert(
                "Category Required",
                "Please enter your service category name."
            );
            return;
        }

        if (requestedName.length < 2) {
            Alert.alert(
                "Invalid Category",
                "Category name must contain at least 2 characters."
            );
            return;
        }

        if (!requestedDescription) {
            Alert.alert(
                "Description Required",
                "Please describe the service you provide."
            );
            return;
        }

        if (
            requestedDescription.length < 5
        ) {
            Alert.alert(
                "Description Too Short",
                "Please provide a little more detail about your service."
            );
            return;
        }

        if (isSubmitting) {
            return;
        }

        try {
            setIsSubmitting(true);

            const response =
                await axios.post(
                    CATEGORY_REQUEST_URL,
                    {
                        requesterName:
                            cleanRequesterName,

                        requesterEmail:
                            cleanRequesterEmail,

                        requestedName,

                        description:
                            requestedDescription,
                    },
                    {
                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        timeout: 30000,
                    }
                );

            console.log(
                "Category request submitted successfully:",
                response.data
            );

            Alert.alert(
                "Request Submitted",
                "Your category request has been submitted successfully and is waiting for Admin review.",
                [
                    {
                        text: "OK",

                        onPress: () => {
                            setRequesterName("");
                            setRequesterEmail("");
                            setCategoryName("");
                            setDescription("");

                            router.back();
                        },
                    },
                ],
                {
                    cancelable: false,
                }
            );
        } catch (error: any) {
            console.error(
                "Category request error:",
                error?.response?.data ||
                    error?.message ||
                    error
            );

            const backendMessage =
                error?.response?.data
                    ?.message;

            let message =
                "Unable to submit category request. Please try again.";

            if (
                Array.isArray(
                    backendMessage
                )
            ) {
                message =
                    backendMessage.join(
                        "\n"
                    );
            } else if (
                typeof backendMessage ===
                "string"
            ) {
                message =
                    backendMessage;
            } else if (
                backendMessage &&
                typeof backendMessage ===
                    "object" &&
                typeof backendMessage.message ===
                    "string"
            ) {
                message =
                    backendMessage.message;
            } else if (
                error?.code ===
                "ECONNABORTED"
            ) {
                message =
                    "The server is taking too long to respond. Please try again.";
            } else if (
                !error?.response
            ) {
                message =
                    "Unable to connect to Eventify Hub. Please check your internet connection and try again.";
            }

            Alert.alert(
                "Unable to Submit Request",
                message
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const emailValid =
        EMAIL_REGEX.test(
            requesterEmail
                .trim()
                .toLowerCase()
        );

    const formValid =
        requesterName.trim().length >= 2 &&
        emailValid &&
        categoryName.trim().length >= 2 &&
        description.trim().length >= 5;

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: false,
                }}
            />

            <KeyboardAvoidingView
                style={styles.screen}
                behavior={
                    Platform.OS === "ios"
                        ? "padding"
                        : undefined
                }
            >
                <ScrollView
                    contentContainerStyle={
                        styles.container
                    }
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={
                        false
                    }
                >
                    <Animated.View
                        style={[
                            styles.header,
                            {
                                opacity:
                                    fadeAnim,

                                transform: [
                                    {
                                        translateY:
                                            slideAnim,
                                    },
                                ],
                            },
                        ]}
                    >
                        <TouchableOpacity
                            style={
                                styles.backButton
                            }
                            onPress={() =>
                                router.back()
                            }
                            activeOpacity={0.85}
                        >
                            <Ionicons
                                name="arrow-back"
                                size={22}
                                color="#780C60"
                            />
                        </TouchableOpacity>

                        <View
                            style={
                                styles.textContainer
                            }
                        >
                            <Text
                                style={
                                    styles.title
                                }
                            >
                                Can't Find Your
                                {"\n"}

                                <Text
                                    style={
                                        styles.titleHighlight
                                    }
                                >
                                    Business
                                    Category?
                                </Text>
                            </Text>

                            <Text
                                style={
                                    styles.subtitle
                                }
                            >
                                Tell us about the
                                service you provide.
                                Your request will be
                                reviewed before a new
                                category is added to
                                Eventify Hub.
                            </Text>
                        </View>

                        <View
                            style={
                                styles.logoWrapper
                            }
                        >
                            <Image
                                source={image}
                                style={
                                    styles.logo
                                }
                            />
                        </View>
                    </Animated.View>

                    <Animated.View
                        style={{
                            opacity:
                                fadeAnim,

                            transform: [
                                {
                                    translateY:
                                        slideAnim,
                                },
                            ],
                        }}
                    >
                        {/* REQUESTER NAME */}
                        <View
                            style={
                                styles.card
                            }
                        >
                            <View
                                style={
                                    styles.labelRow
                                }
                            >
                                <Ionicons
                                    name="person-outline"
                                    size={20}
                                    color="#780C60"
                                />

                                <Text
                                    style={
                                        styles.label
                                    }
                                >
                                    Your Name

                                    <Text
                                        style={
                                            styles.required
                                        }
                                    >
                                        {" "}
                                        *
                                    </Text>
                                </Text>
                            </View>

                            <Text
                                style={
                                    styles.helperText
                                }
                            >
                                Enter the name of the
                                person submitting this
                                category request.
                            </Text>

                            <TextInput
                                style={
                                    styles.input
                                }
                                placeholder="Enter your full name"
                                placeholderTextColor="#A98AA3"
                                value={
                                    requesterName
                                }
                                onChangeText={
                                    setRequesterName
                                }
                                maxLength={80}
                                editable={
                                    !isSubmitting
                                }
                                autoCapitalize="words"
                                autoCorrect={false}
                                returnKeyType="next"
                            />

                            <Text
                                style={
                                    styles.counter
                                }
                            >
                                {
                                    requesterName.length
                                }
                                /80
                            </Text>
                        </View>

                        {/* EMAIL */}
                        <View
                            style={
                                styles.card
                            }
                        >
                            <View
                                style={
                                    styles.labelRow
                                }
                            >
                                <Ionicons
                                    name="mail-outline"
                                    size={20}
                                    color="#780C60"
                                />

                                <Text
                                    style={
                                        styles.label
                                    }
                                >
                                    Your Email

                                    <Text
                                        style={
                                            styles.required
                                        }
                                    >
                                        {" "}
                                        *
                                    </Text>
                                </Text>
                            </View>

                            <Text
                                style={
                                    styles.helperText
                                }
                            >
                                Enter a valid email
                                address for this
                                request.
                            </Text>

                            <TextInput
                                style={[
                                    styles.input,

                                    requesterEmail
                                        .length >
                                        0 &&
                                    !emailValid
                                        ? styles.inputError
                                        : null,
                                ]}
                                placeholder="example@email.com"
                                placeholderTextColor="#A98AA3"
                                value={
                                    requesterEmail
                                }
                                onChangeText={
                                    setRequesterEmail
                                }
                                editable={
                                    !isSubmitting
                                }
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                maxLength={150}
                                returnKeyType="next"
                            />

                            {requesterEmail.length >
                                0 &&
                            !emailValid ? (
                                <Text
                                    style={
                                        styles.errorText
                                    }
                                >
                                    Please enter a
                                    valid email
                                    address.
                                </Text>
                            ) : null}
                        </View>

                        {/* CATEGORY */}
                        <View
                            style={
                                styles.card
                            }
                        >
                            <View
                                style={
                                    styles.labelRow
                                }
                            >
                                <Ionicons
                                    name="pricetag-outline"
                                    size={20}
                                    color="#780C60"
                                />

                                <Text
                                    style={
                                        styles.label
                                    }
                                >
                                    Service Category
                                    Name

                                    <Text
                                        style={
                                            styles.required
                                        }
                                    >
                                        {" "}
                                        *
                                    </Text>
                                </Text>
                            </View>

                            <Text
                                style={
                                    styles.helperText
                                }
                            >
                                Example: Florist,
                                Wedding Transport,
                                Event Security
                            </Text>

                            <TextInput
                                style={
                                    styles.input
                                }
                                placeholder="Enter service category name"
                                placeholderTextColor="#A98AA3"
                                value={
                                    categoryName
                                }
                                onChangeText={
                                    setCategoryName
                                }
                                maxLength={80}
                                editable={
                                    !isSubmitting
                                }
                                autoCapitalize="words"
                                returnKeyType="next"
                            />

                            <Text
                                style={
                                    styles.counter
                                }
                            >
                                {
                                    categoryName.length
                                }
                                /80
                            </Text>
                        </View>

                        {/* DESCRIPTION */}
                        <View
                            style={
                                styles.card
                            }
                        >
                            <View
                                style={
                                    styles.labelRow
                                }
                            >
                                <Ionicons
                                    name="document-text-outline"
                                    size={20}
                                    color="#780C60"
                                />

                                <Text
                                    style={
                                        styles.label
                                    }
                                >
                                    Describe Your
                                    Service

                                    <Text
                                        style={
                                            styles.required
                                        }
                                    >
                                        {" "}
                                        *
                                    </Text>
                                </Text>
                            </View>

                            <Text
                                style={
                                    styles.helperText
                                }
                            >
                                Briefly explain what
                                your business
                                provides.
                            </Text>

                            <TextInput
                                style={[
                                    styles.input,
                                    styles.textArea,
                                ]}
                                placeholder="Example: We provide fresh flower decoration for weddings, birthdays and corporate events..."
                                placeholderTextColor="#A98AA3"
                                value={
                                    description
                                }
                                onChangeText={
                                    setDescription
                                }
                                multiline
                                textAlignVertical="top"
                                maxLength={500}
                                editable={
                                    !isSubmitting
                                }
                            />

                            <Text
                                style={
                                    styles.counter
                                }
                            >
                                {
                                    description.length
                                }
                                /500
                            </Text>
                        </View>

                        {/* INFO */}
                        <View
                            style={
                                styles.infoCard
                            }
                        >
                            <View
                                style={
                                    styles.infoIcon
                                }
                            >
                                <Ionicons
                                    name="information-circle-outline"
                                    size={22}
                                    color="#780C60"
                                />
                            </View>

                            <View
                                style={
                                    styles.infoContent
                                }
                            >
                                <Text
                                    style={
                                        styles.infoTitle
                                    }
                                >
                                    What happens
                                    next?
                                </Text>

                                <Text
                                    style={
                                        styles.infoText
                                    }
                                >
                                    Eventify Hub
                                    will review your
                                    request to prevent
                                    duplicate
                                    categories. Once
                                    approved, the
                                    category can be
                                    used during vendor
                                    registration.
                                </Text>
                            </View>
                        </View>

                        {/* SUBMIT */}
                        <TouchableOpacity
                            style={[
                                styles.submitButton,

                                (!formValid ||
                                    isSubmitting) &&
                                    styles.disabledButton,
                            ]}
                            disabled={
                                !formValid ||
                                isSubmitting
                            }
                            onPress={
                                handleSubmit
                            }
                            activeOpacity={0.9}
                        >
                            {isSubmitting ? (
                                <>
                                    <ActivityIndicator
                                        color="#FFFFFF"
                                        size="small"
                                    />

                                    <Text
                                        style={
                                            styles.submittingText
                                        }
                                    >
                                        Submitting...
                                    </Text>
                                </>
                            ) : (
                                <>
                                    <Text
                                        style={
                                            styles.submitText
                                        }
                                    >
                                        Submit
                                        Request
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
                            style={
                                styles.backToCategoriesButton
                            }
                            onPress={() =>
                                router.back()
                            }
                            activeOpacity={0.85}
                            disabled={
                                isSubmitting
                            }
                        >
                            <Text
                                style={
                                    styles.backToCategoriesText
                                }
                            >
                                Back to Categories
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </>
    );
};

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#fceefc",
    },

    container: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingTop: 35,
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

    inputError: {
        borderColor: "#D14343",
    },

    errorText: {
        marginTop: 7,
        color: "#C53B3B",
        fontSize: 12,
        fontWeight: "600",
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

    submittingText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "800",
        marginLeft: 10,
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