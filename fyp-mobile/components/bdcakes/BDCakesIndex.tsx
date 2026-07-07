import { FontAwesome5 } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

const CakeBusinessDetailsScreen: React.FC = () => {
    const [selectedCakeType, setSelectedCakeType] = useState<string | null>(null);
    const [deliveryOption, setDeliveryOption] = useState<string | null>(null);
    const [deliveryToHome, setDeliveryToHome] = useState<string | null>(null);
    const [downPaymentType, setDownPaymentType] = useState<string>("");
    const [downPayment, setDownPayment] = useState<string>("");
    const [covidCompliant, setCovidCompliant] = useState<"YES" | "NO" | null>(null);
    const [cancellationPolicy, setCancellationPolicy] = useState<"REFUNDABLE" | "NON-REFUNDABLE" | "PARTIALLY REFUNDABLE" | null>(null);

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.header}>Business Details</Text>
            <Text style={styles.subHeader}>
                Want to start your cake business with us? Enter the following details
            </Text>

            {/* Cake Type */}
            {/* Staff */}
            <Text style={styles.label}>Cake Type*</Text>
            <View style={styles.staffContainer}>
                {[
                    { label: 'WEDDING', icon: 'ring' },
                    { label: 'BIRTHDAY', icon: 'birthday-cake' },
                    { label: 'CUSTOM', icon: 'cogs' },

                ].map((staff) => (
                    <TouchableOpacity
                        key={staff.label}
                        style={[
                            styles.staffOption,
                            selectedCakeType === staff.label && styles.staffSelected,
                        ]}
                        onPress={() => setSelectedCakeType(staff.label)}
                    >
                        <FontAwesome5 name={staff.icon}
                            size={20}
                            style={[
                                styles.staffIcon,
                                selectedCakeType === staff.label && styles.staffSelectedIcon,
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
                                selectedCakeType === staff.label && styles.staffSelectedText,
                            ]}
                        >
                            {staff.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Starting Price */}
            <Text style={styles.label}>Starting Price*</Text>
            <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="Enter price"
            //placeholderTextColor="#C4B5FD"
            />

            {/* Delivery Options */}
            {/* Staff */}
            <Text style={styles.label}>Delivery Options*</Text>
            <View style={styles.staffContainer}>
                {[
                    { label: 'Same Day', icon: 'ring' },
                    { label: 'Scheduled', icon: 'birthday-cake' },
                    { label: 'No-Delivery', icon: 'cogs' },

                ].map((staff) => (
                    <TouchableOpacity
                        key={staff.label}
                        style={[
                            styles.staffOption,
                            deliveryOption === staff.label && styles.staffSelected,
                        ]}
                        onPress={() => setDeliveryOption(staff.label)}
                    >
                        <FontAwesome5 name={staff.icon}
                            size={20}
                            style={[
                                styles.staffIcon,
                                deliveryOption === staff.label && styles.staffSelectedIcon,
                            ]} />
                        <Text
                            style={[
                                styles.staffText,
                                deliveryOption === staff.label && styles.staffSelectedText,
                            ]}
                        >
                            {staff.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Delivery to Home */}
            <Text style={styles.label}>Delivery to Home*</Text>
            <View style={styles.covidContainer}>
                {['YES', 'NO'].map((option) => (
                    <TouchableOpacity
                        key={option}
                        style={[
                            styles.covidOption,
                            deliveryToHome === option && styles.covidSelected, // Compare strings
                        ]}
                        onPress={() => setDeliveryToHome(option)} // Set the string value directly
                    >
                        <Text
                            style={[
                                styles.covidText,
                                deliveryToHome === option && styles.covidSelectedText,
                            ]}
                        >
                            {option}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Cake Description */}
            <Text style={styles.label}>Cake Description*</Text>
            <TextInput
                style={[styles.input, styles.textArea]}
                multiline
                placeholder="Describe your cake offerings..."
            //  placeholderTextColor="#C4B5FD"
            />

            {/* Additional Notes */}
            <Text style={styles.label}>Additional Notes</Text>
            <TextInput
                style={[styles.input, styles.textArea]}
                multiline
                placeholder="Add any special notes..."
            // placeholderTextColor="#C4B5FD"
            />
            {/* Down Payment Type */}

            <Text style={styles.label}>Down Payment Type*</Text>
            <View style={styles.covidContainer}>
                {['PERCENTAGE', 'FIXED AMOUNT'].map((option) => (
                    <TouchableOpacity
                        key={option}
                        style={[
                            styles.covidOption,
                            downPaymentType === option && styles.covidSelected,
                        ]}
                        onPress={() => setDownPaymentType(option)}
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

            {/* Buttons */}
            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.saveButton}
                    onPress={() => {
                        //  submit();
                    }}>
                    <Text style={styles.buttonText}>Save & Continue</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
        backgroundColor: '#F8E9F0',
        flexGrow: 1,
        paddingTop: 70,
    },
    header: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
    },
    subHeader: {
        fontSize: 14,
        color: '#6B7280',
        marginVertical: 10,
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
        borderBottomWidth: 1,
        borderBottomColor: '#B3A3A3',
        fontSize: 14,
        paddingVertical: 5,
        marginBottom: 16,
    },
    buttonGroup: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    button: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#E9D5FF',
        borderRadius: 8,
        paddingVertical: 10,
        marginHorizontal: 5,
        alignItems: 'center',
    },
    selectedButton: {
        backgroundColor: '#C084FC',
        borderColor: '#A855F7',
    },

    selectedButtonText: {
        color: '#FFF',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },

    saveButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
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
});

export default CakeBusinessDetailsScreen;
