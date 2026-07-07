import postVenueBusinessDetails from "@/services/postVenueBusinessDetails";
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
    // States
    // const [venueType, setVenueType] = useState<string | null>(null);
    // const [catering, setCatering] = useState<string | null>(null);
    // const [parking, setParking] = useState<boolean | null>(null);
    // const [staff, setStaff] = useState<string | null>(null);
    // const [cancellationPolicy, setCancellationPolicy] = useState<string | null>(null);
    // const [covidCompliant, setCovidCompliant] = useState<boolean | null>(null);


    const [expertise, setExpertise] = useState<string>(""); // Text input
    const [amenities, setAmenities] = useState<string>(""); // Text input
    const [maximumPeopleCapacity, setMaximumPeopleCapacity] = useState<number | undefined>(); // Optional number
    const [catering, setCatering] = useState<string>(""); // Multiple selections ['INTERNAL', 'EXTERNAL']
    const [parking, setParking] = useState<boolean>(false); // YES/NO boolean
    const [staff, setStaff] = useState<string>(""); // Multiple selections ['MALE', 'FEMALE', 'TRANSGENDER']
    const [minimumPrice, setMinimumPrice] = useState<number | undefined>(); // Optional number
    const [description, setDescription] = useState<string>(""); // Required text
    const [additionalInfo, setAdditionalInfo] = useState<string | undefined>(""); // Optional text
    const [downPaymentType, setDownPaymentType] = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE"); // Dropdown
    const [downPayment, setDownPayment] = useState<number>(0); // Numeric input
    const [cancellationPolicy, setCancellationPolicy] = useState<"REFUNDABLE" | "NON-REFUNDABLE" | "PARTIALLY REFUNDABLE">("REFUNDABLE"); // Dropdown
    const [covidCompliant, setCovidCompliant] = useState<"YES" | "NO" | null>(null); // YES/NO
    const [venueType, setVenueType] = useState<string | null>(null);

    const submit = async () => {
        if (!expertise || !amenities || !maximumPeopleCapacity || !catering || !parking ||
            !minimumPrice || !staff || !description
            || !additionalInfo || !downPaymentType || !downPayment || !cancellationPolicy ||
            !covidCompliant || !venueType) {
            Alert.alert("Error", "Please fill in all the required fields marked with *.");
            return;
        }

        try {
            const user = JSON.parse(await getSecureData("user") || "");
            await postVenueBusinessDetails(user._id, {
                typeOfVenue: venueType,
                expertise: expertise,
                amenities: amenities,
                maximumPeopleCapacity: Number(),
                catering: catering,
                parking: true,
                staff: staff,
                minimumPrice: Number(minimumPrice),
                description: String(description),
                additionalInfo: String(additionalInfo),
                downPaymentType: downPaymentType as 'PERCENTAGE' | 'FIXED',
                downPayment: Number(downPayment),
                cancellationPolicy: cancellationPolicy as 'REFUNDABLE' | 'NON-REFUNDABLE' | 'PARTIALLY REFUNDABLE',
                covidCompliant: covidCompliant as 'YES' | 'NO',
            });
            Alert.alert("Success", "Business details saved successfully!");
            router.push("/packages");
        } catch (error) {
            console.error("Error:", error);
            Alert.alert("Error", "Something went wrong. Please try again.");
        }
    };



    // Reusable Toggle Button Component
    const ToggleButton = ({
        options,
        state,
        setState,
    }: {
        options: string[];
        state: string | null;
        setState: (value: string) => void;
    }) => (
        <View style={styles.row}>
            {options.map((option) => (
                <TouchableOpacity
                    key={option}
                    style={[
                        styles.toggleButton,
                        state === option && styles.toggleButtonSelected,
                    ]}
                    onPress={() => setState(option)}
                >
                    <Text
                        style={[
                            styles.toggleButtonText,
                            state === option && styles.toggleButtonTextSelected,
                        ]}
                    >
                        {option}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    // Reusable Yes/No Buttons
    const YesNoButtons = ({
        label,
        state,
        setState,
    }: {
        label: string;
        state: boolean | null;
        setState: (value: boolean) => void;
    }) => (
        <View style={styles.section}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.row}>
                <TouchableOpacity
                    style={[
                        styles.toggleButton,
                        state === true && styles.toggleButtonSelected,
                    ]}
                    onPress={() => setState(true)}
                >
                    <Text
                        style={[
                            styles.toggleButtonText,
                            state === true && styles.toggleButtonTextSelected,
                        ]}
                    >
                        YES
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.toggleButton,
                        state === false && styles.toggleButtonSelected,
                    ]}
                    onPress={() => setState(false)}
                >
                    <Text
                        style={[
                            styles.toggleButtonText,
                            state === false && styles.toggleButtonTextSelected,
                        ]}
                    >
                        NO
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.header}>Business Details</Text>
            <Text style={styles.subText}>
                Want to start your business with us? Enter your following info
                details
            </Text>

            {/* Venue Type */}
            <Text style={styles.label}>Venue Type</Text>
            <View style={styles.staffContainer}>
                {[
                    { label: "Hall".toUpperCase(), icon: "landmark" }, // FontAwesome5 icon for hall
                    { label: "Outdoor".toUpperCase(), icon: "tree" }, // FontAwesome5 icon for outdoor
                    { label: "Marquee/Banquet".toUpperCase(), icon: "warehouse" },
                ].map((staff) => (
                    <TouchableOpacity
                        key={staff.label}
                        style={[
                            styles.staffOption,
                            venueType === staff.label && styles.staffSelected,
                        ]}
                        onPress={() => setVenueType(staff.label)}
                    >
                        <FontAwesome5 name={staff.icon}
                            size={20}
                            style={[
                                styles.staffIcon,
                                venueType === staff.label && styles.staffSelectedIcon,
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
                                venueType === staff.label && styles.staffSelectedText,
                            ]}
                        >
                            {staff.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Expertise */}
            <Text style={styles.label}>Expertise*</Text>
            <TextInput
                style={styles.input}
                placeholder="Enter expertise"
                value={expertise} // Bind the expertise state
                onChangeText={(text) => setExpertise(text)} // Update expertise state on change
            />

            {/* Amenities */}
            <Text style={styles.label}>Amenities*</Text>
            <TextInput
                style={styles.input}
                placeholder="Enter amenities"
                value={amenities} // Bind the amenities state
                onChangeText={(text) => setAmenities(text)} // Update amenities state on change
            />

            {/* Maximum People Capacity */}
            <Text style={styles.label}>Maximum People Capacity</Text>
            <TextInput
                style={styles.input}
                placeholder="Enter maximum people capacity"
                keyboardType="numeric"
                value={maximumPeopleCapacity?.toString() || ""} // Bind the state as a string
                onChangeText={(text) =>
                    setMaximumPeopleCapacity(text ? parseInt(text, 10) : undefined) // Convert input to number
                }
            />

            {/* Catering */}
            <Text style={styles.label}>Catering*</Text>
            <View style={styles.covidContainer}>
                {["INTERNAL".toUpperCase(), "EXTERNAL".toUpperCase()].map((option) => (
                    <TouchableOpacity
                        key={option}
                        style={[
                            styles.covidOption,
                            catering.includes(option) && styles.covidSelected, // Fix: Use includes
                        ]}
                        onPress={() => {
                            setCatering(option);
                        }}
                    >
                        <Text
                            style={[
                                styles.covidText,
                                catering.includes(option) && styles.covidSelectedText, // Fix: Use includes
                            ]}
                        >
                            {option}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Parking */}
            <Text style={styles.label}>Parking*</Text>
            <View style={styles.covidContainer}>
                {['YES', 'NO'].map((option) => (
                    <TouchableOpacity
                        key={option}
                        style={[
                            styles.covidOption,
                            parking === (option === "YES") && styles.covidSelected,
                        ]}
                        onPress={() => setParking((option === "YES"))}
                    >
                        <Text
                            style={[
                                styles.covidText,
                                parking === (option === "YES") && styles.covidSelectedText,
                            ]}
                        >
                            {option}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Staff */}
            <Text style={styles.label}>Staff</Text>
            <View style={styles.staffContainer}>
                {[
                    { label: "MALE", icon: "male" },
                    { label: "FEMALE", icon: "female" },
                    { label: "TRANSGENDER", icon: "transgender-alt" },
                ].map((stafff) => (
                    <TouchableOpacity
                        key={stafff.label}
                        style={[
                            styles.staffOption,
                            staff.includes(stafff.label) && styles.staffSelected, // Use .includes() to check selection
                        ]}
                        onPress={() => {
                            setStaff(stafff.label);
                        }}
                    >
                        <FontAwesome5
                            name={stafff.icon}
                            size={20}
                            style={[
                                styles.staffIcon,
                                staff.includes(stafff.label) && styles.staffSelectedIcon, // Use .includes() to check selection
                            ]}
                        />
                        <Text
                            style={[
                                styles.staffText,
                                staff.includes(stafff.label) && styles.staffSelectedText, // Use .includes() to check selection
                            ]}
                        >
                            {stafff.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>


            {/* Minimum Price */}
            <Text style={styles.label}>Minimum Price</Text>
            <TextInput
                style={styles.input}
                placeholder="Enter minimum price"
                keyboardType="numeric"
                value={minimumPrice?.toString() || ""} // Bind the state as a string
                onChangeText={(text) =>
                    setMinimumPrice(text ? parseInt(text, 10) : undefined) // Convert input to number
                }
            />

            {/* Description */}
            <Text style={styles.label}>Description *</Text>
            <TextInput
                style={styles.textArea}
                placeholder="Enter description"
                multiline
                value={description} // Bind the state
                onChangeText={(text) => setDescription(text)} // Update state on input
            />

            {/* Additional Info */}
            <Text style={styles.label}>Additional Info</Text>
            <TextInput
                style={styles.input}
                placeholder="Enter additional information"
                value={additionalInfo || ""} // Bind the state (handles undefined)
                onChangeText={(text) => setAdditionalInfo(text || undefined)} // Update state (handles empty string)
            />

            {/* Down Payment Type */}
            <Text style={styles.label}>Down Payment Type*</Text>
            <View style={styles.covidContainer}>
                {["PERCENTAGE", "FIXED"].map((option) => (
                    <TouchableOpacity
                        key={option}
                        style={[
                            styles.covidOption,
                            downPaymentType === option && styles.covidSelected, // Highlight selected option
                        ]}
                        onPress={() => setDownPaymentType(option as "PERCENTAGE" | "FIXED")}

                    >
                        <Text
                            style={[
                                styles.covidText,
                                downPaymentType === option && styles.covidSelectedText, // Style selected text
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
                value={downPayment?.toString() || ""} // Convert number to string for display
                onChangeText={(text) =>
                    setDownPayment(text ? parseInt(text, 10) || 0 : 0) // Default to 0
                }

            />



            {/* Refund Policy */}
            <Text style={styles.label}>Cancellation Policy*</Text>
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

            {/* Covid Compliant */}
            <Text style={styles.label}>Covid Compliant*</Text>
            <View style={styles.covidContainer}>
                {['YES', 'NO'].map((option) => (
                    <TouchableOpacity
                        key={option}
                        style={[
                            styles.covidOption,
                            covidCompliant === option && styles.covidSelected, // Compare directly to the option string
                        ]}
                        onPress={() => setCovidCompliant(option as "YES" || "NO")} // Set the option string directly
                    >
                        <Text
                            style={[
                                styles.covidText,
                                covidCompliant === option && styles.covidSelectedText, // Compare directly to the option string
                            ]}
                        >
                            {option}
                        </Text>
                    </TouchableOpacity>
                ))}
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
    container: { flex: 1, padding: 20, backgroundColor: '#F8E9F0', paddingTop: 70, },
    header: { fontSize: 24, fontWeight: "bold", marginBottom: 10 },
    subText: { color: "#333", marginBottom: 20 },
    label: {
        fontSize: 14,
        fontWeight: 'bold',
        marginVertical: 8,
    },
    input: {
        borderBottomWidth: 1,
        borderColor: "#ccc",
        padding: 8,
        marginBottom: 10,
    },
    textArea: {
        borderBottomWidth: 1,
        borderBottomColor: '#B3A3A3',
        fontSize: 14,
        paddingVertical: 5,
        marginBottom: 16,
    },
    row: { flexDirection: "row", gap: 10, marginVertical: 10 },
    toggleButton: {
        flex: 1,
        padding: 10,
        borderWidth: 1,
        borderColor: "#B085A6",
        borderRadius: 8,
        backgroundColor: "#FBEFF7",
        alignItems: "center",
    },
    toggleButtonSelected: {
        backgroundColor: "#780C60",
        borderColor: "#780C60",
    },
    toggleButtonText: {
        color: "#780C60",
        fontWeight: "600",
    },
    toggleButtonTextSelected: {
        color: "#FFF",
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
    section: { marginBottom: 20 },
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
});
