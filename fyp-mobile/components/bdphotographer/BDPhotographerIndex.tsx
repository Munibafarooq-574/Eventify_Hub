
import postPhotographyBusinessDetails from '@/services/postPhotographyBusinessDetails';
import { getSecureData } from '@/store';
import { FontAwesome5 } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const BusinessDetailsScreen: React.FC = () => {
    const [selectedCity, setSelectedCity] = useState<string>("");
    const [selectedStaff, setSelectedStaff] = useState<string>("");
    const [description, setDescription] = useState<string>("");
    const [additionalInfo, setAdditionalInfo] = useState<string>("");
    const [downPaymentType, setDownPaymentType] = useState<string>("");
    const [downPayment, setDownPayment] = useState<string>("");
    const [covidCompliant, setCovidCompliant] = useState<string>("");
    const [refundPolicy, setRefundPolicy] = useState<string>("");

    const submit = async () => {
        if (!selectedCity || !selectedStaff || !description || !additionalInfo || !downPaymentType || !downPayment || !covidCompliant || !refundPolicy) {
            Alert.alert("Error", "Please fill in all the required fields marked with *.");
            return;
        }

        try {
            const user = JSON.parse(await getSecureData("user") || "");
            await postPhotographyBusinessDetails(user._id, {
                cityCovered: selectedCity,
                staff: selectedStaff,
                minimumPrice: Number(),
                description,
                additionalInfo,
                downPaymentType: downPaymentType as 'PERCENTAGE' | 'FIXED',
                downPayment: Number(downPayment),
                covidCompliant: covidCompliant as 'YES' | 'NO',
                covidRefundPolicy: refundPolicy as 'REFUNDABLE' | 'NON-REFUNDABLE' | 'PARTIALLY REFUNDABLE',
            });
            Alert.alert("Success", "Business details saved successfully!");
            router.push("/packages");
        } catch (error) {
            console.error("Error:", error);
            Alert.alert("Error", "Something went wrong. Please try again.");
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Business Details</Text>
            <Text style={styles.subtitle}>
                Want to start your business with us? Enter your following info details
            </Text>

            {/* City Covered */}
            <Text style={styles.label}>City Covered*</Text>
            <TextInput
                style={styles.input}
                placeholder="Select Cities"
                value={selectedCity}
                onChangeText={setSelectedCity}
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
                            selectedStaff === staff.label && styles.staffSelected,
                        ]}
                        onPress={() => setSelectedStaff(staff.label)}
                    >
                        <FontAwesome5 name={staff.icon}
                            size={20}
                            style={[
                                styles.staffIcon,
                                selectedStaff === staff.label && styles.staffSelectedIcon,
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
                                selectedStaff === staff.label && styles.staffSelectedText,
                            ]}
                        >
                            {staff.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>


            {/* Minimum Price */}
            <Text style={styles.label}>Minimum Price</Text>
            <TextInput
                style={styles.input}
                placeholder="Enter Minimum Price"
                keyboardType="numeric"
            />

            {/* Description */}
            <Text style={styles.label}>Description *</Text>
            <TextInput
                style={styles.input}
                placeholder="Enter Description"
                value={description}
                onChangeText={setDescription}
            />

            {/* Additional Info */}
            <Text style={styles.label}>Additional Info</Text>
            <TextInput
                style={styles.input}
                placeholder="Enter Additional Information"
                value={additionalInfo}
                onChangeText={setAdditionalInfo}
            />

            {/* Down Payment Type
            <Text style={styles.label}>Down Payment Type</Text>
            <View style={styles.dropdown}>
                <Picker
                    selectedValue={downPaymentType}
                    onValueChange={(itemValue: string) => setDownPaymentType(itemValue)}
                    mode="dropdown" // Ensures the dropdown opens in a menu
                >
                    <Picker.Item label="Percentage" value="Percentage" />
                    <Picker.Item label="Fixed Amount" value="Fixed Amount" />
                </Picker>
            </View> */}

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
                        onPress={() => setCovidCompliant(option)}
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
                                refundPolicy === policy && styles.covidSelected,
                            ]}
                            onPress={() => setRefundPolicy(policy)}
                        >
                            <Text
                                style={[
                                    styles.covidText,
                                    refundPolicy === policy && styles.covidSelectedText,
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8E9F0',
        padding: 20,
        paddingTop: 70,
        paddingBottom: 30,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
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

    // staffContainer: {
    //     flexDirection: 'row',
    //     justifyContent: 'space-around', // Equal spacing
    //     marginBottom: 16,
    // },
    // staffOption: {
    //     flexDirection: 'row',
    //     alignItems: 'center',
    //     paddingVertical: 12,
    //     paddingHorizontal: 16, // Adequate spacing around the text and icon
    //     borderWidth: 2,
    //     borderColor: '#780C60', // Purple border color
    //     borderRadius: 20, // Rounded rectangle shape
    //     backgroundColor: '#FBEFF7', // Light purple background
    //     flex: 1,
    //     marginHorizontal: 8, // Space between boxes
    // },
    // staffSelected: {
    //     backgroundColor: '#780C60', // Dark purple background when selected
    // },
    // staffText: {
    //     fontSize: 16,
    //     color: '#780C60', // Text color matches border
    //     marginLeft: 10,
    //     fontWeight: '600',
    // },
    // staffSelectedText: {
    //     color: '#FFF', // White text for selected option
    // },
    // staffIcon: {
    //     color: '#780C60', // Icon color matches border
    //     fontSize: 20, // Slightly larger icon
    // },
    // staffSelectedIcon: {
    //     color: '#FFF', // White icon for selected option
    // },
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
    dropdownContainer: {
        borderWidth: 1,
        borderColor: '#D3C3C3',
        borderRadius: 8,
        backgroundColor: '#FFF',
        overflow: 'hidden',
        paddingHorizontal: 10,
    },

    picker: {
        color: '#666',
        fontSize: 16,
        height: 50, // Adjust picker height
        width: '100%',
    },
    dropdown: {
        borderWidth: 1,
        borderColor: '#B3A3A3',
        borderRadius: 8,
        marginBottom: 16,
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
});

export default BusinessDetailsScreen;
