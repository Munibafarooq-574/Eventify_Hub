import postGenerateAiPackage from '@/services/postGenerateAiPackage';
import { getSecureData, saveSecureData } from '@/store';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

const AIPackageScreen: React.FC = () => {
    const [stage, setStage] = useState(0);
    const [proceed, setProceed] = useState<boolean>(false);
    const messages = [
        "Please hold on a moment...",
        "Analyzing data requirements...",
        "Selecting optimal AI components...",
        "Finalizing your package...",
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setStage((prevStage) => (prevStage < messages.length - 1 ? prevStage + 1 : prevStage));
        }, 2000); // 2 seconds per stage
        const run = async () => {
            const eventDetailsObj = JSON.parse(await getSecureData("eventDetails") || "");
            const response = await postGenerateAiPackage({ eventDate: eventDetailsObj.eventDate || new Date(), eventName: eventDetailsObj.eventName, services: eventDetailsObj.selectedServices, guests: parseInt(eventDetailsObj.guests), budget: parseInt(eventDetailsObj.budget) })
            console.log("AI Response", response);
            await saveSecureData("aiPackage", JSON.stringify(response));
            setProceed(true);
        };
        run();
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        // Navigate to the next screen after the last stage
        if (stage === messages.length - 1 && proceed) {
            setTimeout(() => {
                router.push("/AIPackage"); // Navigate to the next screen
            }, 1000); // Delay before navigation
        }
    }, [stage, proceed]);

    return (
        <View style={styles.container}>
            <Text style={styles.heading}>Generating Your AI Package</Text>
            <Image
                source={require('@/assets/images/GetStarted.png')} // Replace with your actual image path
                style={styles.image}
            />
            <Text style={styles.subheading}>Generating the Best AI Package for You...</Text>
            <Text style={styles.message}>{messages[stage]}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8E9F0',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        //paddingTop: 70,
    },
    heading: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 20,
        textAlign: 'center',
    },
    subheading: {
        fontSize: 16,
        color: '#000',
        textAlign: 'center',
        marginBottom: 10,
    },
    message: {
        fontSize: 14,
        fontStyle: 'italic',
        color: '#333',
        textAlign: 'center',
        marginTop: 10,
    },
    image: {
        width: 200,
        height: 200,
        marginBottom: 20,
    },
});

export default AIPackageScreen;
