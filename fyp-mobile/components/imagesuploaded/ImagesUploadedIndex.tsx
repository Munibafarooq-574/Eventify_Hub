// ImageUploadScreen.tsx
import { uploadMultipleImages } from "@/services/uploadMultipleImages";
import { getSecureData } from "@/store";
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Alert,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";

const ImageUploadScreen: React.FC = () => {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [images, setImages] = useState<string[]>([]);
    const [uploading, setUploading] = useState<boolean>(false);
    const navigation = useNavigation();

    useEffect(() => {
        (async () => {
            // Request media library permissions
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
            }
        })();
    }, []);

    const handleFileUpload = async () => {
        try {
            // Launch image picker
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: true, // Allows multiple image selection
                quality: 0.7, // Adjust image quality as needed
            });

            if (!result.canceled) {
                const selectedUris = result.assets.map((asset: { uri: any; }) => asset.uri);
                // Enforce a maximum of 30 images
                if (images.length + selectedUris.length > 30) {
                    Alert.alert('Limit Exceeded', 'You can upload up to 30 images.');
                    return;
                }
                setImages(prevImages => [...prevImages, ...selectedUris]);
            }
        } catch (error) {
            console.error("Error picking images:", error);
            Alert.alert('Error', 'An error occurred while picking images.');
        }
    };

    const handleDeleteImage = (index: number) => {
        setImages(prevImages => {
            const updated = [...prevImages];
            updated.splice(index, 1);
            return updated;
        });
    };

    const handleSaveAndContinue = async () => {
        try {
            setUploading(true);
            const user = JSON.parse(await getSecureData("user") || "");
            await uploadMultipleImages(user._id, images);
            // Retrieve the token from AsyncStorage
            // const token = await AsyncStorage.getItem('access_token');
            // if (!token) {
            //     Alert.alert('Authentication Error', 'No access token found. Please log in again.');
            //     return;
            // }

            // // Call the API to upload contact details and images
            // const response = await postContactDetails(contactDetails, images, token);
            router.push("/vendorreview");
            // // Navigate to the next screen   
            // navigation.navigate("/VendorReview"); // Adjust the route name as per your navigation setup
        } catch (error: any) {
            console.error("Failed to create contact details:", error.response?.data || error.message);
            Alert.alert('Upload Error', 'Failed to upload contact details. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header Section */}
            <Text style={styles.header}>Images</Text>
            <Text style={styles.subHeader}>Upload images{"\n"}You can upload up to 30 images</Text>
            <Text style={styles.subHeader}>The first picture will be set as your cover photo*</Text>

            {/* Upload Card */}
            <TouchableOpacity style={styles.uploadCard} onPress={handleFileUpload}>
                {/* Placeholder Icon */}
                <View style={styles.iconContainer}>
                    <Text style={styles.icon}>📷</Text>
                </View>
                {/* Upload Text */}
                <Text style={styles.uploadText}>Tap to select images{"\n"}or drag and drop a file here</Text>
                {/* Choose File Button */}
                <TouchableOpacity style={styles.chooseFileButton} onPress={handleFileUpload}>
                    <Text style={styles.chooseFileButtonText}>Choose File</Text>
                </TouchableOpacity>
            </TouchableOpacity>

            {/* Photos Section */}
            <View style={styles.photosSection}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.photosScroll}
                >
                    {images.map((imgUri, index) => (
                        <View key={index} style={styles.imageContainer}>
                            <TouchableOpacity onPress={() => setSelectedImage(imgUri)}>
                                <Image source={{ uri: imgUri }} style={styles.photo} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={() => handleDeleteImage(index)}
                            >
                                <Text style={styles.deleteButtonText}>X</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </ScrollView>
            </View>

            {/* Footer Buttons */}
            <View style={styles.footer}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.buttonBack}>
                    <Text style={styles.buttonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.saveButton, (uploading || images.length === 0) && styles.disabledButton]}
                    onPress={handleSaveAndContinue}
                    disabled={uploading || images.length === 0}
                >
                    <Text style={styles.saveButtonText}>
                        {uploading ? "Uploading..." : "Save & Continue"}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Modal to view selected image */}
            <Modal
                visible={!!selectedImage}
                transparent
                onRequestClose={() => setSelectedImage(null)}
            >
                <View style={styles.modalBackground}>
                    <View style={styles.modalContent}>
                        {selectedImage && (
                            <Image
                                source={{ uri: selectedImage }}
                                style={styles.enlargedImage}
                                resizeMode="contain"
                            />
                        )}
                        <TouchableOpacity
                            onPress={() => setSelectedImage(null)}
                            style={styles.closeButton}
                        >
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
        marginTop: 20,
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
        flex: 1,
        backgroundColor: "#780C60",
        borderRadius: 10,
        paddingVertical: 15,
        alignItems: "center",
        marginLeft: 10,
    },
    disabledButton: {
        backgroundColor: "#A467A6",
    },
    saveButtonText: {
        color: "#FFFFFF",
        fontWeight: "bold",
    },
    photosSection: {
        padding: 16,
        paddingBottom: 30,
    },
    photosScroll: {
        flexDirection: 'row',
    },
    imageContainer: {
        position: 'relative',
        marginRight: 8,
    },
    photo: {
        width: 100,
        height: 100,
        borderRadius: 8,
    },
    deleteButton: {
        position: 'absolute',
        top: 5,
        right: 5,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 15,
        width: 25,
        height: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    modalBackground: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '90%',
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 10,
        alignItems: 'center',
    },
    enlargedImage: {
        width: '100%',
        height: 300,
        marginBottom: 20,
    },
    closeButton: {
        backgroundColor: '#780C60',
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
    closeButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});

export default ImageUploadScreen;
