import { router } from "expo-router";
import React from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";

const SummaryScreen = () => {
    const { width, height } = useWindowDimensions();

    // Responsive scaling helpers
    const isSmall = width < 360;
    const isTablet = width >= 600;
    const scale = (size: number) => Math.round((width / 390) * size);
    const maxContentWidth = isTablet ? 560 : "100%";

    return (
        <ScrollView
            contentContainerStyle={[
                styles.container,
                {
                    minHeight: height,
                    paddingHorizontal: isSmall ? 16 : 20,
                    paddingTop: Math.max(50, height * 0.07),
                    paddingBottom: 30,
                },
            ]}
            showsVerticalScrollIndicator={false}
        >
            <View style={[styles.content, { maxWidth: maxContentWidth as any }]}>
                {/* Header (centered, no back button) */}
                <View style={styles.header}>
                    <Text style={[styles.title, { fontSize: Math.min(scale(26), 32) }]}>
                        Summary
                    </Text>
                    <View style={styles.titleUnderline} />
                </View>

                {/* Progress Bar */}
                <View style={styles.progress}>
                    <View style={[styles.progressStep, styles.completedStep]} />
                    <View style={styles.progressConnector} />
                    <View style={[styles.progressStep, styles.completedStep]} />
                    <View style={styles.progressConnector} />
                    <View style={styles.progressStep} />
                </View>

                {/* Vendor Message Section */}
                <View style={styles.vendorMessageBox}>
                    <View style={styles.checkCircle}>
                        <Text style={styles.checkMark}>✓</Text>
                    </View>

                    <Text style={[styles.vendorMessageTitle, { fontSize: isSmall ? 18 : 20 }]}>
                        Booking Request Sent
                    </Text>

                    <Text style={[styles.vendorMessageText, { fontSize: isSmall ? 13 : 14 }]}>
                        Your booking request has been sent to the selected vendors.
                        Payment will become available separately for each vendor after
                        they accept your request.
                    </Text>
                </View>

                {/* What happens next */}
                <View style={styles.statusCard}>
                    <Text style={styles.statusTitle}>What happens next?</Text>

                    <View style={styles.statusRow}>
                        <View style={styles.numberColumn}>
                            <Text style={styles.statusNumber}>1</Text>
                            <View style={styles.numberLine} />
                        </View>
                        <Text style={styles.statusText}>
                            Vendors review your booking request.
                        </Text>
                    </View>

                    <View style={styles.statusRow}>
                        <View style={styles.numberColumn}>
                            <Text style={styles.statusNumber}>2</Text>
                            <View style={styles.numberLine} />
                        </View>
                        <Text style={styles.statusText}>
                            Each vendor accepts or rejects independently.
                        </Text>
                    </View>

                    <View style={[styles.statusRow, { marginBottom: 0 }]}>
                        <View style={styles.numberColumn}>
                            <Text style={styles.statusNumber}>3</Text>
                        </View>
                        <Text style={styles.statusText}>
                            After acceptance, the required down payment becomes available.
                        </Text>
                    </View>
                </View>

                {/* Button Section */}
                <View style={styles.buttonSection}>
                    <TouchableOpacity
                        style={styles.primaryButton}
                        activeOpacity={0.85}
                        onPress={() => router.push("/myevents")}
                    >
                        <Text style={styles.primaryButtonText}>View My Bookings</Text>
                    </TouchableOpacity>

                    {/* Go to Dashboard Button */}
                    <TouchableOpacity
                        style={styles.dashboardButton}
                        activeOpacity={0.85}
                        onPress={() => router.push("/dashboard")}
                    >
                        <Text style={styles.dashboardButtonText}>Go to Dashboard</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: "#FCEFF8",
        alignItems: "center",
    },
    content: {
        flex: 1,
        width: "100%",
        justifyContent: "space-between",
    },

    /* Header */
    header: {
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 26,
    },
    title: {
        fontWeight: "800",
        color: "#780C60",
        letterSpacing: 0.5,
        textAlign: "center",
    },
    titleUnderline: {
        width: 46,
        height: 4,
        borderRadius: 2,
        backgroundColor: "#780C60",
        opacity: 0.35,
        marginTop: 8,
    },

    /* Progress */
    progress: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 28,
        paddingHorizontal: 4,
    },
    progressStep: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: "#E0E0E0",
    },
    completedStep: {
        backgroundColor: "#780C60",
        shadowColor: "#780C60",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 4,
        elevation: 3,
    },
    progressConnector: {
        height: 3,
        flex: 1,
        borderRadius: 2,
        backgroundColor: "#780C60",
    },

    /* Success card */
    vendorMessageBox: {
        backgroundColor: "#E8F5E9",
        paddingVertical: 24,
        paddingHorizontal: 18,
        borderRadius: 20,
        marginBottom: 24,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#CBE8CF",
        shadowColor: "#278A4B",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 3,
    },
    checkCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "#278A4B",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 14,
        shadowColor: "#278A4B",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    checkMark: {
        color: "#FFFFFF",
        fontSize: 28,
        fontWeight: "900",
        lineHeight: 32,
    },
    vendorMessageTitle: {
        color: "#278A4B",
        fontWeight: "800",
        marginBottom: 8,
        textAlign: "center",
    },
    vendorMessageText: {
        color: "#2E7D32",
        fontWeight: "500",
        textAlign: "center",
        lineHeight: 21,
    },

    /* Status card */
    statusCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 20,
        marginBottom: 28,
        borderWidth: 1,
        borderColor: "#F0DCE7",
        shadowColor: "#780C60",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    statusTitle: {
        fontSize: 17,
        fontWeight: "800",
        color: "#2A1F27",
        marginBottom: 18,
    },
    statusRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 14,
    },
    numberColumn: {
        alignItems: "center",
        marginRight: 14,
    },
    statusNumber: {
        width: 30,
        height: 30,
        lineHeight: 30,
        borderRadius: 15,
        backgroundColor: "#780C60",
        color: "#FFFFFF",
        fontSize: 13,
        fontWeight: "800",
        textAlign: "center",
        overflow: "hidden",
    },
    numberLine: {
        width: 2,
        height: 22,
        backgroundColor: "#F0DCE7",
        marginTop: 4,
        marginBottom: -18,
    },
    statusText: {
        flex: 1,
        fontSize: 13.5,
        color: "#6F646B",
        lineHeight: 20,
        paddingTop: 4,
    },

    /* Buttons */
    buttonSection: {
        width: "100%",
    },
    primaryButton: {
        backgroundColor: "#780C60",
        borderRadius: 14,
        paddingVertical: 15,
        alignItems: "center",
        marginBottom: 14,
        shadowColor: "#780C60",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    primaryButtonText: {
        color: "#FFF",
        fontSize: 16,
        fontWeight: "bold",
        letterSpacing: 0.3,
    },
    dashboardButton: {
        backgroundColor: "#FFFFFF",
        borderWidth: 1.5,
        borderColor: "#780C60",
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: "center",
    },
    dashboardButtonText: {
        color: "#780C60",
        fontSize: 16,
        fontWeight: "bold",
        letterSpacing: 0.3,
    },
});

export default SummaryScreen;