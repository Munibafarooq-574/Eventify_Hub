import { PackageDto } from "@/dto/CreatePackage.dto";
import postAddPackages from "@/services/postAddPackages";
import { getSecureData } from "@/store";
import { router } from "expo-router";
import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from "react-native";

const PackagesScreen: React.FC = () => {
    const [packages, setPackages] = useState<PackageDto[]>([]);

    const addPackage = () => {
        if (packages.length < 4) {
            setPackages([...packages, { packageName: "", price: 0, services: "" }]);
        }
    };

    const removePackage = (index: number) => {
        const updatedPackages = [...packages];
        updatedPackages.splice(index, 1);
        setPackages(updatedPackages);
    };

    const updatePackage = (index: number, field: string, value: string) => {
        const updatedPackages = [...packages];
        updatedPackages[index] = { ...updatedPackages[index], [field]: value };
        setPackages(updatedPackages);
    };

    const onSubmit = async () => {
        const user = JSON.parse(await getSecureData("user") || "");
        console.log(user);
        await postAddPackages(user._id, { packages: packages });
        router.push("/imagesuploaded")
    }

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Packages</Text>
            <Text style={styles.subHeader}>Enter packages you offer. You can enter up to 10 packages</Text>
            <ScrollView style={styles.scrollContainer}>
                {packages.map((pkg, index) => (
                    <View key={index} style={styles.packageContainer}>
                        <View style={styles.row}>
                            <TextInput
                                style={styles.input}
                                placeholder="Package Name*"
                                value={pkg.packageName}
                                onChangeText={(text) => updatePackage(index, "packageName", text)}
                            />
                            <TextInput
                                style={[styles.input, styles.priceInput]}
                                placeholder="Price*"
                                keyboardType="numeric"
                                value={pkg.price.toString()}
                                onChangeText={(text) => updatePackage(index, "price", text)}
                            />
                        </View>
                        <TextInput
                            style={[styles.input, styles.servicesInput]}
                            placeholder="Services*"
                            multiline
                            value={pkg.services}
                            onChangeText={(text) => updatePackage(index, "services", text)}
                        />
                        <TouchableOpacity onPress={() => removePackage(index)} style={styles.deleteButton}>
                            <Text style={styles.deleteText}>🗑️</Text>
                        </TouchableOpacity>
                    </View>
                ))}
                <View style={styles.addButtonContainer}>
                    <View style={styles.line} />
                    <TouchableOpacity style={styles.addButton} onPress={addPackage}>
                        <Text style={styles.addButtonText}>Create New Package</Text>
                    </TouchableOpacity>
                    <View style={styles.line} />
                </View>

            </ScrollView>
            <View style={styles.footer}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={() => { onSubmit(); }}>
                    <Text style={styles.saveButtonText}>Save & Continue</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8E9F0',
        paddingHorizontal: 20,
        paddingVertical: 20,
        paddingTop: 70,
        paddingBottom: 30,
    },
    header: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 10,
        color: "#000",
    },
    subHeader: {
        fontSize: 14,
        color: "#6A6A6A",
        marginBottom: 20,
    },
    scrollContainer: {
        flex: 1,
        marginBottom: 20,
    },
    packageContainer: {
        backgroundColor: "#FFFFFF",
        borderRadius: 8,
        padding: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: "#D3A4D4",
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 10,
    },
    input: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        borderColor: "#D3A4D4",
        borderWidth: 1,
        borderRadius: 5,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: 14,
        color: "#000",
    },
    priceInput: {
        marginLeft: 10,
    },
    servicesInput: {
        height: 60,
        textAlignVertical: "top",
    },
    deleteButton: {
        alignSelf: "flex-end",
        marginTop: 5,
    },
    deleteText: {
        fontSize: 16,
        color: "#FF0000",
    },
    addButtonContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginVertical: 20, // Adjust the spacing around the button
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: "#780C60", // Line color matching the theme
        marginHorizontal: 10, // Spacing between line and button
    },
    addButton: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderWidth: 1,
        borderColor: "#780C60", // Border color matching the theme
        borderRadius: 25, // Rounded edges for the button
        backgroundColor: "transparent", // Transparent background
    },
    addButtonText: {
        color: "#780C60", // Text color matching the border
        fontSize: 16,
        fontWeight: "bold",
    },

    footer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 20,
    },
    backButton: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        borderColor: "#780C60",
        borderWidth: 1,
        borderRadius: 10,
        paddingVertical: 15,
        marginRight: 10,
        alignItems: "center",
    },
    backButtonText: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#780C60",
    },
    saveButton: {
        flex: 1,
        backgroundColor: "#780C60",
        borderRadius: 10,
        paddingVertical: 15,
        marginLeft: 10,
        alignItems: "center",
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#FFFFFF",
    },

});

export default PackagesScreen;
