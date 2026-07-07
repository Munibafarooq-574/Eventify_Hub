// import { router } from "expo-router";
// import React from "react";
// import {
//     View,
//     Text,
//     StyleSheet,
//     TouchableOpacity,
//     Image,
//     ScrollView,
// } from "react-native";

// const PaymentMethodScreen = () => {
//     const methods = [
//         {
//             id: 1,
//             name: "Credit/Debit Card",
//             description: "",
//             icon: require("@/assets/images/GetStarted.png"), // Replace with your image path
//         },
//         {
//             id: 2,
//             name: "JazzCash",
//             description: "",
//             icon: require("@/assets/images/GetStarted.png"), // Replace with your image path
//         },
//         {
//             id: 3,
//             name: "EasyPaisa",
//             description: "Easypaisa mobile account required",
//             icon: require("@/assets/images/GetStarted.png"), // Replace with your image path
//         },
//     ];

//     return (
//         <ScrollView style={styles.container}>
//             {/* Header */}
//             <View style={styles.header}>
//                 <TouchableOpacity onPress={() => router.back()}>
//                     <Text style={styles.backArrow}>←</Text>
//                 </TouchableOpacity>
//                 <Text style={styles.title}>Select Payment Method</Text>
//             </View>

//             {/* Progress Bar */}
//             <View style={styles.progress}>
//                 <View style={[styles.progressStep, styles.completedStep]} />
//                 <View style={styles.progressConnector} />
//                 <View style={[styles.progressStep, styles.completedStep]} />
//                 <View style={styles.progressConnector} />
//                 <View style={styles.progressStep} />
//             </View>

//             {/* Payment Methods */}
//             <Text style={styles.sectionTitle}>Payment Method</Text>
//             {methods.map((method) => (
//                 <TouchableOpacity key={method.id} style={styles.methodCard}>
//                     <Image source={method.icon} style={styles.methodIcon} />
//                     <View>
//                         <Text style={styles.methodName}>{method.name}</Text>
//                         {method.description ? (
//                             <Text style={styles.methodDescription}>{method.description}</Text>
//                         ) : null}
//                     </View>
//                 </TouchableOpacity>
//             ))}

//             {/* Amount Payable Section */}
//             <View style={styles.amountContainer}>
//                 <Text style={styles.amountLabel}>Amount Payable</Text>
//                 <Text style={styles.amountValue}>Rs.449,181/-</Text>
//             </View>

//             {/* Pay Now Button */}
//             <TouchableOpacity
//                 style={styles.payNowButton}
//                 onPress={() => router.push('/creditcard')}
//             >
//                 <Text style={styles.payNowText}>Pay Now</Text>
//             </TouchableOpacity>
//         </ScrollView>
//     );
// };

// const styles = StyleSheet.create({
//     container: {
//         flex: 1,
//         backgroundColor: '#F8E9F0',
//         paddingHorizontal: 20,
//         paddingTop: 70,
//     },
//     header: {
//         flexDirection: "row",
//         alignItems: "center",
//         marginBottom: 20,
//     },
//     backArrow: {
//         fontSize: 18,
//         color: "#8A2BE2",
//         marginRight: 10,
//     },
//     title: {
//         fontSize: 20,
//         fontWeight: "bold",
//         color: "#000",
//     },
//     progress: {
//         flexDirection: "row",
//         alignItems: "center",
//         justifyContent: "center",
//         marginBottom: 30,
//     },
//     progressStep: {
//         width: 15,
//         height: 15,
//         borderRadius: 7.5,
//         backgroundColor: '#780C60', // Dark purple color
//     },
//     completedStep: {
//         backgroundColor: '#780C60', // Dark purple color
//     },
//     progressConnector: {
//         height: 2,
//         width: 30,
//         backgroundColor: '#780C60', // Dark purple color
//     },
//     sectionTitle: {
//         fontSize: 16,
//         fontWeight: "bold",
//         color: "#555",
//         marginBottom: 10,
//     },
//     methodCard: {
//         flexDirection: "row",
//         alignItems: "center",
//         backgroundColor: "#FFF",
//         borderRadius: 10,
//         padding: 10,
//         marginBottom: 15,
//         shadowColor: "#000",
//         shadowOpacity: 0.1,
//         shadowRadius: 10,
//         elevation: 5,
//     },
//     methodIcon: {
//         width: 40,
//         height: 40,
//         marginRight: 10,
//     },
//     methodName: {
//         fontSize: 16,
//         fontWeight: "bold",
//         color: "#333",
//     },
//     methodDescription: {
//         fontSize: 12,
//         color: "#999",
//     },
//     amountContainer: {
//         flexDirection: "row",
//         justifyContent: "space-between",
//         marginTop: 20,
//         marginBottom: 20,
//         borderTopWidth: 1,
//         borderTopColor: "#DDD",
//         paddingTop: 20,
//     },
//     amountLabel: {
//         fontSize: 16,
//         fontWeight: "bold",
//         color: "#333",
//     },
//     amountValue: {
//         fontSize: 20,
//         fontWeight: "bold",
//         color: '#780C60', // Dark purple color
//     },
//     payNowButton: {
//         backgroundColor: '#780C60', // Dark purple color
//         borderRadius: 5,
//         paddingVertical: 15,
//         alignItems: "center",
//     },
//     payNowText: {
//         color: "#FFF",
//         fontSize: 16,
//         fontWeight: "bold",
//     },
// });

// export default PaymentMethodScreen;
import { router } from "expo-router";
import React, { useState } from "react";
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const PaymentMethodScreen = () => {
    const [selectedMethod, setSelectedMethod] = useState<number | null>(null);


    const methods = [
        {
            id: 1,
            name: "Credit/Debit Card",
            description: "",
            icon: require("@/assets/images/mastercard.png"), // Replace with your image path
        },
        {
            id: 2,
            name: "JazzCash",
            description: "",
            icon: require("@/assets/images/jazzcash.png"), // Replace with your image path
        },
        {
            id: 3,
            name: "EasyPaisa",
            description: "Easypaisa mobile account required",
            icon: require("@/assets/images/easypaisa.png"), // Replace with your image path
        },
    ];

    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.backArrow}>←</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Select Payment Method</Text>
            </View>

            {/* Progress Bar */}
            <View style={styles.progress}>
                <View style={[styles.progressStep, styles.completedStep]} />
                <View style={styles.progressConnector} />
                <View style={[styles.progressStep, styles.completedStep]} />
                <View style={styles.progressConnector} />
                <View style={styles.progressStep} />
            </View>

            {/* Payment Methods */}
            <Text style={styles.sectionTitle}>Payment Method</Text>
            {methods.map((method) => (
                <TouchableOpacity
                    key={method.id}
                    style={[
                        styles.methodCard,
                        selectedMethod === method.id && styles.selectedMethodCard, // Highlight selected
                    ]}
                    onPress={() => setSelectedMethod(method.id)} // Update selected method
                >
                    <Image source={method.icon} style={styles.methodIcon} />
                    <View>
                        <Text style={styles.methodName}>{method.name}</Text>
                        {method.description ? (
                            <Text style={styles.methodDescription}>{method.description}</Text>
                        ) : null}
                    </View>
                </TouchableOpacity>
            ))}

            {/* Amount Payable Section */}
            <View style={styles.amountContainer}>
                <Text style={styles.amountLabel}>Amount Payable</Text>
                <Text style={styles.amountValue}>Rs.449,181/-</Text>
            </View>

            {/* Pay Now Button */}
            <TouchableOpacity
                style={styles.payNowButton}
                onPress={() => {
                    if (selectedMethod === 1) {
                        router.push('/creditcard'); // Proceed if a method is selected
                    }
                    else if (selectedMethod === 2) {
                        router.push('/jazzcash'); // Proceed if a method is selected
                    }
                    else if (selectedMethod === 3) {
                        router.push('/easypaisa'); // Proceed if a method is selected
                    } else {
                        alert("Please select a payment method.");
                    }
                }}
            >
                <Text style={styles.payNowText}>Pay Now</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8E9F0',
        paddingHorizontal: 20,
        paddingTop: 70,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
    },
    backArrow: {
        fontSize: 18,
        color: '#780C60', // Dark purple color
        marginRight: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#000",
    },
    progress: {
        flexDirection: "row",
        alignItems: "center",
    },
    progressStep: {
        width: 15,
        height: 15,
        borderRadius: 7.5,
        backgroundColor: "#780C60",
    },
    completedStep: {
        backgroundColor: '#780C60', // Dark purple color
    },
    progressConnector: {
        height: 2,
        flex: 1,
        backgroundColor: '#780C60', // Dark purple color
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#555",
        marginBottom: 10,
    },
    methodCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFF",
        borderRadius: 10,
        padding: 10,
        marginBottom: 15,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    selectedMethodCard: {
        borderColor: '#780C60', // Highlight border color
        borderWidth: 2,
    },
    methodIcon: {
        width: 40,
        height: 40,
        marginRight: 10,
    },
    methodName: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
    },
    methodDescription: {
        fontSize: 12,
        color: "#999",
    },
    amountContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 20,
        marginBottom: 20,
        borderTopWidth: 1,
        borderTopColor: "#DDD",
        paddingTop: 20,
    },
    amountLabel: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
    },
    amountValue: {
        fontSize: 20,
        fontWeight: "bold",
        color: '#780C60', // Dark purple color
    },
    payNowButton: {
        backgroundColor: '#780C60', // Dark purple color
        borderRadius: 5,
        paddingVertical: 15,
        alignItems: "center",
    },
    payNowText: {
        color: "#FFF",
        fontSize: 16,
        fontWeight: "bold",
    },
});

export default PaymentMethodScreen;
