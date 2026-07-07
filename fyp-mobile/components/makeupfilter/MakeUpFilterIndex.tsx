import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { useLocalSearchParams } from "expo-router";

import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
} from 'react-native';

const MakeUpFilterIndex: React.FC = () => {
    const [selectedCity, setSelectedCity] = useState<string | null>(null);
    const [priceRange, setPriceRange] = useState<number>(35000);
    const [selectedRating, setSelectedRating] = useState<string | null>(null); // Only one rating selection
    const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
    const [selectedPolicy, setSelectedPolicy] = useState<string | null>(null);

    const routeParams = useLocalSearchParams();
    const searchQuery = Array.isArray(routeParams?.name) ? routeParams.name[0] : routeParams?.name;

    const cities = ['Karachi', 'Islamabad', 'Rawalpindi', 'Lahore', 'Peshawar', 'Attock', 'Quetta'];
    const ratings = ['5⭐', '≥4⭐', '≥3⭐', '≥2⭐', '≥1⭐']; // Single selection
    const staff = ['Male', 'Female'];
    const cancellationPolicies = ['Refundable', 'Non-Refundable', 'Partially Refundable'];

    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="black" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Filter</Text>
                <TouchableOpacity
                    style={styles.applyButton}
                    onPress={() => {
                        router.push({
                            pathname: "/categoryvendorlisting",
                            params: {
                                name: searchQuery, // ✅ add this
                                city: selectedCity || "",
                                minRating: selectedRating ? selectedRating.replace(/[^\d]/g, "") : "",
                                staff: selectedStaff[0] || "",
                                cancellationPolicy: selectedPolicy || "",
                            },
                        });
                    }}
                >

                    <Text style={styles.applyButtonText}>Apply</Text>
                </TouchableOpacity>
            </View>

            {/* Cities */}
            <Text style={styles.label}>City</Text>
            <View style={styles.optionContainer}>
                {cities.map((city) => (
                    <TouchableOpacity
                        key={city}
                        style={[styles.optionButton, selectedCity === city && styles.selectedOption]}
                        onPress={() => setSelectedCity(city)}
                    >
                        <Text style={[styles.optionText, selectedCity === city && styles.selectedOptionText]}>
                            {city}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Sub Area */}
            <TextInput style={styles.textInput} placeholder="Sub Area" placeholderTextColor="#999" />

            {/* Ratings (Single Selection) */}
            <Text style={styles.label}>Ratings</Text>
            <View style={styles.ratingContainer}>
                {ratings.map((rating) => (
                    <TouchableOpacity
                        key={rating}
                        style={[styles.ratingButton, selectedRating === rating && styles.selectedRating]}
                        onPress={() => setSelectedRating(rating)}
                    >
                        <Text style={[styles.ratingText, selectedRating === rating && styles.selectedRatingText]}>
                            {rating}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Staff */}
            <Text style={styles.label}>Staff</Text>
            <View style={styles.optionContainer}>
                {staff.map((member) => (
                    <TouchableOpacity
                        key={member}
                        style={[styles.optionButton, selectedStaff.includes(member) && styles.selectedOption]}
                        onPress={() => {
                            setSelectedStaff(selectedStaff.includes(member) ? [] : [member]); // Single selection
                        }}
                    >
                        <Text style={[styles.optionText, selectedStaff.includes(member) && styles.selectedOptionText]}>
                            {member}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Cancellation Policy */}
            <Text style={styles.label}>Cancellation Policy</Text>
            <View style={styles.optionContainer}>
                {cancellationPolicies.map((policy) => (
                    <TouchableOpacity
                        key={policy}
                        style={[styles.optionButton, selectedPolicy === policy && styles.selectedOption]}
                        onPress={() => setSelectedPolicy(policy)}
                    >
                        <Text style={[styles.optionText, selectedPolicy === policy && styles.selectedOptionText]}>
                            {policy}
                        </Text>
                    </TouchableOpacity>
                ))}
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
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "bold",
        marginLeft: 12,
    },
    applyButton: {
        backgroundColor: '#8B006D',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
        justifyContent: 'center',
        height: 40,
        marginLeft: 'auto',
    },
    applyButtonText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 14,
        textAlign: 'center',
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#3c003c',
        marginBottom: 10,
    },
    optionContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 20,
    },
    optionButton: {
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingVertical: 10,
        paddingHorizontal: 15,
        margin: 5,
    },
    selectedOption: {
        backgroundColor: '#780C60',
    },
    optionText: {
        fontSize: 14,
        color: '#333',
    },
    selectedOptionText: {
        color: '#fff',
    },
    textInput: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 10,
        marginBottom: 20,
        color: '#333',
    },
    ratingContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between', // Ensures all ratings are in **one line**
        marginBottom: 20,
    },
    ratingButton: {
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingVertical: 10,
        paddingHorizontal: 15,
    },
    selectedRating: {
        backgroundColor: '#780C60',
    },
    ratingText: {
        fontSize: 14,
        color: '#333',
    },
    selectedRatingText: {
        color: '#fff',
    },
});

export default MakeUpFilterIndex;
