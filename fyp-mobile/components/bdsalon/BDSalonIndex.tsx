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

const BusinessDetailsForm = () => {
    const [staffType, setStaffType] = useState<string>("");
    const [expertise, setExpertise] = useState<string>("");
    const [travelsToClientHome, setTravelsToClientHome] = useState<"YES" | "NO" | null>(null);
    const [cityCovered, setCityCovered] = useState<string>("");
    const [staffGender, setStaffGender] = useState<string>("");
    const [minimumPrice, setMinimumPrice] = useState<string>("");
    const [description, setDescription] = useState<string>("");
    const [additionalInfo, setAdditionalInfo] = useState<string>("");
    const [downPaymentType, setDownPaymentType] = useState<"PERCENTAGE" | "FIXED" | null>(null);
    const [downPayment, setDownPayment] = useState<string>("");
    const [covidCompliant, setCovidCompliant] = useState<"YES" | "NO" | null>(null);
    const [cancellationPolicy, setCancellationPolicy] = useState<"REFUNDABLE" | "NON-REFUNDABLE" | "PARTIALLY REFUNDABLE" | null>(null);

    const submit = async () => {
        // console.log("staffType", staffType);
        // console.log("expertise", expertise);
        // console.log("travelsToClientHome", travelsToClientHome);
        // console.log("cityCovered", staffType);
        // console.log("staffGender", expertise);
        // console.log("minimumPrice", minimumPrice);
        // console.log("description", description);
        // console.log("downPaymentType", downPaymentType);
        // console.log("downPayment", downPayment);
        // console.log("covidCompliant", covidCompliant);
        // console.log("cancellationPolicy", cancellationPolicy);
        if (
            staffType && staffType.length === 0 ||
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

        const travel = travelsToClientHome === "YES" ? true : false
        try {
            const user = JSON.parse(await getSecureData("user") || "");
            await postSalonBusinessDetails(user._id, {
                staffType,
                expertise,
                travelsToClientHome: travel ,
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

    function setSelectedCity(text: string): void {
        throw new Error("Function not implemented.");
    }

    console.log("travelsToClientHome", travelsToClientHome);

    return (
        <ScrollView style={styles.container}>
            {/* Title */}
            <Text style={styles.header}>Business Details</Text>
            <Text style={styles.subText}>
                Want to start your business with us? Enter your following info details
            </Text>

            {/* Type */}
            <Text style={styles.label}>Type</Text>
            <View style={styles.typeContainer}>
                {[
                    { label: 'SOLO', icon: 'user' },
                    { label: 'SALON', icon: 'cut' },
                    { label: 'HOME-BASED SALON', icon: 'home' },
                ].map((type) => (
                    <TouchableOpacity
                        key={type.label}
                        style={[
                            styles.typeOption,
                            staffType === type.label && styles.typeSelected,
                        ]}
                        onPress={() => setStaffType(type.label)}
                    >
                        <FontAwesome5 name={type.icon}
                            size={20}
                            style={[
                                styles.staffIcon,
                                staffType === type.label && styles.typeSelectedIcon,
                            ]} />

                        {/* <Icon
                            name={staff.icon}
                            size={20}
                            style={[
                                styles.staffIcon,
                                selectedStaff === staff.label && styles.staffSelectedIcon,
                            ]}
                        /> */}
                        <Text
                            style={[
                                styles.staffText,
                                staffType === type.label && styles.staffSelectedText,
                            ]}
                        >
                            {type.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>


            {/* Expertise */}
            <Text style={styles.label}>Expertise* </Text>
            <TextInput style={styles.input} onChangeText={(text) => { setExpertise(text); }} placeholder="Enter expertise" />

            {/* Travels to Client Home */}
            <Text style={styles.label}>Travels to Client Home*</Text>
            <View style={styles.covidContainer}>
                {['YES', 'NO'].map((option) => (
                    <TouchableOpacity
                        key={option}
                        style={[
                            styles.covidOption,
                            travelsToClientHome === option && styles.covidSelected,
                        ]}
                        onPress={() => {console.log(option); setTravelsToClientHome(option as "YES" || "NO")}}
                    >
                        <Text
                            style={[
                                styles.covidText,
                                travelsToClientHome === option && styles.covidSelectedText,
                            ]}
                        >
                            {option}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* City Covered */}
            <Text style={styles.label}>City Covered*</Text>
            <TextInput
                style={styles.input}
                placeholder="Select Cities"
                value={cityCovered}
                onChangeText={setCityCovered}
            />

            {/* Staff */}
            <Text style={styles.label}>Staff</Text>
            <View style={styles.staffContainer}>
                {[
                    { label: 'MALE', icon: 'male' },
                    { label: 'FEMALE', icon: 'female' },
                    { label: 'TRANSGENDER', icon: 'transgender-alt' },
                ].map((staff) => (
                    <TouchableOpacity
                        key={staff.label}
                        style={[
                            styles.staffOption,
                            staffGender === staff.label && styles.staffSelected,
                        ]}
                        onPress={() => setStaffGender(staff.label)}
                    >
                        <FontAwesome5 name={staff.icon}
                            size={20}
                            style={[
                                styles.staffIcon,
                                staffGender === staff.label && styles.staffSelectedIcon,
                            ]} />

                        {/* <Icon
                            name={staff.icon}
                            size={20}
                            style={[
                                styles.staffIcon,
                                selectedStaff === staff.label && styles.staffSelectedIcon,
                            ]}
                        /> */}
                        <Text
                            style={[
                                styles.staffText,
                                staffGender === staff.label && styles.staffSelectedText,
                            ]}
                        >
                            {staff.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Minimum Price */}
            <Text style={styles.label}>Minimum Price</Text>
            <TextInput style={styles.input} onChangeText={(text) => { setMinimumPrice(text) }} keyboardType="numeric" />

            {/* Description */}
            <Text style={styles.label}>Description *</Text>
            <TextInput
                style={styles.input}
                placeholder="Enter Description"
                value={description}
                onChangeText={setDescription}
            />

            {/* Down Payment Type */}

            <Text style={styles.label}>Down Payment Type*</Text>
            <View style={styles.covidContainer}>
                {['PERCENTAGE', 'FIXED'].map((option) => (
                    <TouchableOpacity
                        key={option}
                        style={[
                            styles.covidOption,
                            downPaymentType === option && styles.covidSelected,
                        ]}
                        onPress={() => setDownPaymentType(option as 'PERCENTAGE' || "FIXED")}
                    >
                        <Text
                            style={[
                                styles.covidText,
                                downPaymentType === option && styles.covidSelectedText,
                            ]}
                        >
                            {option}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>


            {/* Down Payment */}
            <Text style={styles.label}>Down Payment *</Text>
            <TextInput
                style={styles.input}
                placeholder="Enter Down Payment"
                keyboardType="numeric"
                value={downPayment}
                onChangeText={setDownPayment}
            />
            {/* Covid Compliant */}
            <Text style={styles.label}>Covid Compliant*</Text>
            <View style={styles.covidContainer}>
                {['YES', 'NO'].map((option) => (
                    <TouchableOpacity
                        key={option}
                        style={[
                            styles.covidOption,
                            covidCompliant === option && styles.covidSelected,
                        ]}
                        onPress={() => setCovidCompliant(option as "YES" || "NO")}
                    >
                        <Text
                            style={[
                                styles.covidText,
                                covidCompliant === option && styles.covidSelectedText,
                            ]}
                        >
                            {option}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Refund Policy */}
            <Text style={styles.label}>Refund Policy*</Text>
            <View style={styles.covidContainer}>
                {['REFUNDABLE', 'NON-REFUNDABLE', 'PARTIALLY REFUNDABLE'].map(
                    (policy) => (
                        <TouchableOpacity
                            key={policy}
                            style={[
                                styles.covidOption,
                                cancellationPolicy === policy && styles.covidSelected,
                            ]}
                            onPress={() => setCancellationPolicy(policy as 'REFUNDABLE' || 'NON-REFUNDABLE' || 'PARTIALLY REFUNDABLE')}
                        >
                            <Text
                                style={[
                                    styles.covidText,
                                    cancellationPolicy === policy && styles.covidSelectedText,
                                ]}
                            >
                                {policy}
                            </Text>
                        </TouchableOpacity>
                    )
                )}
            </View>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.saveButton}
                    onPress={() => {
                        submit();
                    }}>
                    <Text style={styles.buttonText}>Save & Continue</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

export default BusinessDetailsForm;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8E9F0', padding: 20, paddingTop: 70, },
    header: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
    subText: { color: "#333", marginBottom: 15 },
    // label: { fontSize: 14, fontWeight: "bold", marginVertical: 10 },
    // input: {
    //     backgroundColor: "#fff",
    //     borderWidth: 1,
    //     borderColor: "#C97BAA",
    //     borderRadius: 5,
    //     padding: 10,
    //     marginBottom: 10,
    // },
    // textArea: {
    //     backgroundColor: "#fff",
    //     borderWidth: 1,
    //     borderColor: "#C97BAA",
    //     borderRadius: 5,
    //     padding: 10,
    //   //  height: 80,
    //     //textAlignVertical: "top",
    //     marginBottom: 10,
    // },
    row: { flexDirection: "row", marginBottom: 10, gap: 10 },
    button: {
        borderWidth: 1,
        borderColor: "#C97BAA",
        borderRadius: 5,
        paddingVertical: 10,
        paddingHorizontal: 15,
    },
    selectedButton: {
        backgroundColor: "#C97BAA",
    },
    //buttonText: { color: "#C97BAA" },
    selectedButtonText: { color: "#fff" },
    footer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 20,
    },
    secondaryButton: {
        backgroundColor: "#E0D4DB",
        padding: 10,
        borderRadius: 5,
    },
    primaryButton: {
        backgroundColor: "#6D2057",
        padding: 10,
        borderRadius: 5,
    },
    footerText: { color: "#fff", fontWeight: "bold", textAlign: "center" },
    staffContainer: {
        flexDirection: 'row', // Align items horizontally
        //justifyContent: 'space-between', // Add spacing between items
        marginBottom: 16,
    },

    staffOption: {
        flexDirection: 'row', // Align icon and text horizontally
        alignItems: 'center', // Center items vertically
        borderWidth: 2,
        borderColor: '#B085A6', // Light purple border
        borderRadius: 10, // Rounded corners
        paddingVertical: 10, // Vertical padding
        paddingHorizontal: 12, // Horizontal padding to allow space around text
        backgroundColor: '#FBEFF7', // Light background color
        marginHorizontal: 5, // Space between boxes
    },

    staffSelected: {
        backgroundColor: '#780C60', // Selected box background color
        borderColor: '#780C60',
    },

    staffIcon: {
        color: '#780C60', // Default icon color
        fontSize: 20,
        marginRight: 2, // Space between icon and text
    },

    staffSelectedIcon: {
        color: '#FFF', // White color for selected icon
    },

    staffText: {
        fontSize: 8,
        color: '#780C60', // Default text color
        fontWeight: '600',
    },

    staffSelectedText: {
        color: '#FFF', // White color for selected text
    },
    covidContainer: {
        // flexDirection: 'row',
        // justifyContent: 'space-between',
        // marginBottom: 16,
        flexDirection: 'row', // Align items horizontally
        //justifyContent: 'space-between', // Add spacing between items
        marginBottom: 16,
    },
    covidOption: {
        // padding: 10,
        // borderWidth: 1,
        // borderColor: '#B3A3A3',
        // borderRadius: 8,
        // flex: 1,
        // alignItems: 'center',
        // marginHorizontal: 4,
        flexDirection: 'row', // Align icon and text horizontally
        alignItems: 'center', // Center items vertically
        borderWidth: 2,
        borderColor: '#B085A6', // Light purple border
        borderRadius: 10, // Rounded corners
        paddingVertical: 10, // Vertical padding
        paddingHorizontal: 12, // Horizontal padding to allow space around text
        backgroundColor: '#FBEFF7', // Light background color
        marginHorizontal: 5, // Space between boxes
    },
    covidSelected: {
        // backgroundColor: '#FBEFF7',
        // borderColor: '#800080',
        backgroundColor: '#780C60', // Selected box background color
        borderColor: '#780C60',
    },
    covidText: {
        // fontSize: 14,
        // color: '#666',
        fontSize: 8,
        color: '#780C60', // Default text color
        fontWeight: '600',
    },
    covidSelectedText: {
        // color: "#780C60",
        // fontWeight: 'bold',
        color: '#FFF', // White color for selected text
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    backButton: {
        flex: 1,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#780C60',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    backButtonText: {
        color: '#780C60',
        fontWeight: '600',
    },
    saveButton: {
        flex: 1,
        backgroundColor: "#780C60",
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 8,
    },
    buttonText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
    label: {
        fontSize: 14,
        fontWeight: 'bold',
        marginVertical: 8,
    },
    input: {
        borderBottomWidth: 1,
        borderBottomColor: '#B3A3A3',
        fontSize: 14,
        paddingVertical: 5,
        marginBottom: 16,
    },
    textArea: {
        //     backgroundColor: "#fff",
        //     borderWidth: 1,
        //     borderColor: "#C97BAA",
        //     borderRadius: 5,
        //     padding: 10,
        //   //  height: 80,
        //     //textAlignVertical: "top",
        //     marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#B3A3A3',
        fontSize: 14,
        paddingVertical: 5,
        marginBottom: 16,
    },
    typeContainer: {
        flexDirection: 'row', // Align items horizontally
        //justifyContent: 'space-between', // Add spacing between items
        marginBottom: 16,
    },

    typeOption: {
        flexDirection: 'row', // Align icon and text horizontally
        alignItems: 'center', // Center items vertically
        borderWidth: 2,
        borderColor: '#B085A6', // Light purple border
        borderRadius: 10, // Rounded corners
        paddingVertical: 10, // Vertical padding
        paddingHorizontal: 12, // Horizontal padding to allow space around text
        backgroundColor: '#FBEFF7', // Light background color
        marginHorizontal: 5, // Space between boxes
    },

    typeSelected: {
        backgroundColor: '#780C60', // Selected box background color
        borderColor: '#780C60',
    },

    typeIcon: {
        color: '#780C60', // Default icon color
        fontSize: 20,
        marginRight: 2, // Space between icon and text
    },

    typeSelectedIcon: {
        color: '#FFF', // White color for selected icon
    },

    typeText: {
        fontSize: 8,
        color: '#780C60', // Default text color
        fontWeight: '600',
    },

    typeSelectedText: {
        color: '#FFF', // White color for selected text
    },
});
