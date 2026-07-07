import postCateringBusinessDetails from '@/services/postCateringBusinessDetails';
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
    const [expertise, setExpertise] = useState('');
    const [travelsToClientHome, setTravelsToClientHome] = useState(false);
    const [selectedCity, setSelectedCity] = useState('');
    const [staffGender, setStaffGender] = useState('');

    const [foodTesting, setFoodTesting] = useState(false);
    const [soundSystem, setSoundSystem] = useState(false);
    const [decoration, setDecoration] = useState(false);
    const [seatingArrangement, setSeatingArrangement] = useState(false);
    const [waiters, setWaiters] = useState(false);
    const [cutlery, setCutlery] = useState(false);

    const [minimumPrice, setMinimumPrice] = useState('');
    const [description, setDescription] = useState('');
    const [downPaymentType, setDownPaymentType] = useState('');
    const [downPayment, setDownPayment] = useState('');
    const [cancellationPolicy, setCancellationPolicy] = useState('');
    const [covidCompliant, setCovidCompliant] = useState('');

    const submit = async () => {
        console.log(foodTesting, decoration, soundSystem, seatingArrangement, waiters, cutlery, covidCompliant,
             cancellationPolicy, staffGender, travelsToClientHome);
        // if (!foodTesting || !decoration || !soundSystem || !seatingArrangement || !waiters || !cutlery || !covidCompliant ||
        //     !cancellationPolicy || !staffGender || !travelsToClientHome || parseFloat(downPayment) === 0) {
        //     Alert.alert("Error", "Please fill in all the required fields marked with *.");
        //     return;
        // }

        try {

            const user = JSON.parse(await getSecureData("user") || "");
            // console.log(user);
            await postCateringBusinessDetails(user._id, {
                expertise,
                travelsToClientHome: true,
                cityCovered: selectedCity,
                staff: staffGender,
                provideFoodTesting: true,
                provideDecoration: true,
                provideSoundSystem: true,
                provideSeatingArrangement: true,
                provideWaiters: true,
                provideCutleryAndPlates: true,
                minimumPrice: Number(minimumPrice),
                description,
                additionalInfo: String(),
                downPaymentType: downPaymentType as 'PERCENTAGE' | 'FIXED',
                downPayment: Number(),
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

    const renderYesNoButtons = (
        question: string,
        state: string | null,
        setState: React.Dispatch<React.SetStateAction<string | null>>
    ) => (
        <View>
            <Text style={styles.question}>{question}</Text>
            <View style={styles.row}>
                {["YES", "NO"].map((option) => (
                    <TouchableOpacity
                        key={option}
                        style={[
                            styles.button,
                            state === option && styles.selectedButton,
                        ]}
                        onPress={() => setState(option)}
                    >
                        <Text
                            style={[
                                styles.buttonText,
                                state === option && styles.selectedButtonText,
                            ]}
                        >
                            {option}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.header}>Business Details</Text>
            <Text style={styles.subText}>
                Want to start your business with us? Enter your following info details
            </Text>

            {/* Expertise */}
            <Text style={styles.label}>Expertise*</Text>
            <TextInput style={styles.input} onChangeText={(text) => { setExpertise(text) }} placeholder="Enter expertise" />

            {/* Travels to Client Home */}
            <Text style={styles.label}>Travels to Client Home*</Text>
            <View style={styles.covidContainer}>
                {['YES', 'NO'].map((option) => (
                    <TouchableOpacity
                        key={option}
                        style={[
                            styles.covidOption,
                            travelsToClientHome === (option === 'YES') && styles.covidSelected,
                        ]}
                        onPress={() => setTravelsToClientHome((option === 'YES'))}
                    >
                        <Text
                            style={[
                                styles.covidText,
                                travelsToClientHome === (option === 'YES') && styles.covidSelectedText,
                            ]}
                        >
                            {option}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* City Covered */}
            <Text style={styles.label}>City Covered*</Text>
            <TextInput style={styles.input} onChangeText={(text) => { setSelectedCity(text) }} placeholder="Select Cities" />

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

            {/* Additional Yes/No Questions */}
            {/* {renderYesNoButtons("Do you provide food testing?", foodTesting, setFoodTesting)}
            {renderYesNoButtons("Do you provide decoration?", decoration, setDecoration)}
            {renderYesNoButtons("Do you provide sound system?", soundSystem, setSoundSystem)}
            {renderYesNoButtons(
                "Do you provide seating arrangement?",
                seatingArrangement,
                setSeatingArrangement
            )}
            {renderYesNoButtons("Do you provide waiters/bairay?", waiters, setWaiters)}
            {renderYesNoButtons(
                "Do you provide cutlery and plates?",
                cutlery,
                setCutlery
            )} */}
            {/* "Do you provide food testing?" */}
            <Text style={styles.label}>Do you provide food testing?</Text>
            <View style={styles.covidContainer}>
                {['YES', 'NO'].map((option) => (
                    <TouchableOpacity
                        key={option}
                        style={[
                            styles.covidOption,
                            foodTesting === (option === 'YES') && styles.covidSelected,
                        ]}
                        onPress={() => setFoodTesting(option === 'YES')}

                    >
                        <Text
                            style={[
                                styles.covidText,
                                foodTesting === (option === 'YES') && styles.covidSelectedText,
                            ]}
                        >
                            {option}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Do you provide sound system? */}
            <Text style={styles.label}>Do you provide sound system?</Text>
            <View style={styles.covidContainer}>
                {['YES', 'NO'].map((option) => (
                    <TouchableOpacity
                        key={option}
                        style={[
                            styles.covidOption,
                            soundSystem === (option === 'YES') && styles.covidSelected,
                        ]}
                        onPress={() => setSoundSystem((option === 'YES'))}
                    >
                        <Text
                            style={[
                                styles.covidText,
                                soundSystem === (option === 'YES') && styles.covidSelectedText,
                            ]}
                        >
                            {option}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Do you provide decoration? */}
            <Text style={styles.label}>Do you provide decoration?</Text>
            <View style={styles.covidContainer}>
                {['YES', 'NO'].map((option) => (
                    <TouchableOpacity
                        key={option}
                        style={[
                            styles.covidOption,
                            decoration === (option === 'YES') && styles.covidSelected,
                        ]}
                        onPress={() => setDecoration((option === 'YES'))}
                    >
                        <Text
                            style={[
                                styles.covidText,
                                decoration === (option === 'YES') && styles.covidSelectedText,
                            ]}
                        >
                            {option}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Do you provide seating arrangement? */}
            <Text style={styles.label}>Do you provide seating arrangement?</Text>
            <View style={styles.covidContainer}>
                {['YES', 'NO'].map((option) => (
                    <TouchableOpacity
                        key={option}
                        style={[
                            styles.covidOption,
                            seatingArrangement === (option === 'YES') && styles.covidSelected,
                        ]}
                        onPress={() => setSeatingArrangement((option === 'YES'))}
                    >
                        <Text
                            style={[
                                styles.covidText,
                                seatingArrangement === (option === 'YES') && styles.covidSelectedText,
                            ]}
                        >
                            {option}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Do you provide waiters/bairay? */}
            <Text style={styles.label}>Do you provide waiters/bairay?</Text>
            <View style={styles.covidContainer}>
                {['YES', 'NO'].map((option) => (
                    <TouchableOpacity
                        key={option}
                        style={[
                            styles.covidOption,
                            waiters === (option === 'YES') && styles.covidSelected,
                        ]}
                        onPress={() => setWaiters((option === 'YES'))}
                    >
                        <Text
                            style={[
                                styles.covidText,
                                waiters === (option === 'YES') && styles.covidSelectedText,
                            ]}
                        >
                            {option}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Do you provide cutlery and plates? */}
            <Text style={styles.label}>Do you provide cutlery and plates?</Text>
            <View style={styles.covidContainer}>
                {['YES', 'NO'].map((option) => (
                    <TouchableOpacity
                        key={option}
                        style={[
                            styles.covidOption,
                            cutlery === (option === 'YES') && styles.covidSelected,
                        ]}
                        onPress={() => setCutlery((option === 'YES'))}
                    >
                        <Text
                            style={[
                                styles.covidText,
                                cutlery === (option === 'YES') && styles.covidSelectedText,
                            ]}
                        >
                            {option}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Minimum Price */}
            <Text style={styles.label}>Minimum Price</Text>
            <TextInput style={styles.input} onChangeText={(text) => { setMinimumPrice(text) }} keyboardType="numeric" />

            {/* Description */}
            <Text style={styles.label}>Description *</Text>
            <TextInput style={styles.textArea} onChangeText={(text) => { setDescription(text) }} multiline placeholder="Enter description" />

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

    question: { fontSize: 14, marginVertical: 8, fontWeight: "500" },
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
