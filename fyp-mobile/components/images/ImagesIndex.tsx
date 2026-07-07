import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const ImageUploadScreen: React.FC = () => {
    const handleFileUpload = () => {
        // Handle file selection logic here
    };

    return (
        <View style={styles.container}>
            {/* Header Section */}
            <Text style={styles.header}>Images</Text>
            <Text style={styles.subHeader}>Upload images{"\n"}You can upload up to 30 images</Text>

            {/* Upload Card */}
            <View style={styles.uploadCard}>
                {/* Placeholder Icon */}
                <View style={styles.iconContainer}>
                    <Text style={styles.icon}>📷</Text>
                </View>
                {/* Upload Text */}
                <Text style={styles.uploadText}>Drag and drop a file here{"\n"}to create album</Text>
                {/* Choose File Button */}
                <TouchableOpacity style={styles.chooseFileButton} onPress={handleFileUpload}>
                    <Text style={styles.chooseFileButtonText}>Choose File</Text>
                </TouchableOpacity>
            </View>

            {/* Footer Buttons */}
            <View style={styles.footer}>
                <TouchableOpacity onPress={() => router.back()} style={styles.buttonBack}>
                    <Text style={styles.buttonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton}
                    onPress={() => { router.push("/vendorreview") }}>
                    <Text style={styles.saveButtonText}>Save & Continue</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8E9F0",
        paddingHorizontal: 20,
        paddingVertical: 20,
        paddingTop: 70,
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
    uploadCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 10,
        padding: 20,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "#D3A4D4",
        marginVertical: 30,
    },
    iconContainer: {
        marginBottom: 10,
    },
    icon: {
        fontSize: 40,
        color: "#C4C4C4",
    },
    uploadText: {
        fontSize: 14,
        color: "#6A6A6A",
        textAlign: "center",
        marginBottom: 20,
    },
    chooseFileButton: {
        backgroundColor: "#780C60",
        borderRadius: 20,
        paddingVertical: 10,
        paddingHorizontal: 30,
    },
    chooseFileButtonText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "bold",
    },
    footer: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    buttonBack: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        borderColor: "#780C60",
        borderWidth: 1,
        borderRadius: 10,
        paddingVertical: 15,
        marginRight: 10,
        alignItems: "center",
    },
    buttonText: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#780C60",
    },
    saveButton: {
        padding: 15,
        backgroundColor: "#780C60",
        borderRadius: 10,
        alignItems: "center",
        flex: 1,
        marginLeft: 10,
    },
    saveButtonText: {
        color: "#FFFFFF",
        fontWeight: "bold",
    },
});

export default ImageUploadScreen;
