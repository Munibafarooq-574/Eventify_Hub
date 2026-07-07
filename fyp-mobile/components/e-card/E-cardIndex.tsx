import React, { useState } from 'react';
import { View, Text, TextInput, Image, Button, StyleSheet, ActivityIndicator, ScrollView, Alert } from 'react-native';
import axios from 'axios';

interface ECardData {
    eventType: string;
    name: string;
    date: string;
    venue: string;
    theme: string;
}

interface ECardResponse {
    message: string;
    image: string;
}

export default function ECardGenerator() {
    const [form, setForm] = useState<ECardData>({
        eventType: '',
        name: '',
        date: '',
        venue: '',
        theme: '',
    });

    const [ecard, setEcard] = useState<ECardResponse | null>(null);
    const [loading, setLoading] = useState(false);

    const handleInputChange = (key: keyof ECardData, value: string) => {
        setForm({ ...form, [key]: value });
    };

    const handleSubmit = async () => {
        if (!form.eventType || !form.name || !form.date || !form.venue || !form.theme) {
            Alert.alert('Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            const res = await axios.post('http://YOUR_LOCAL_IP:3000/ecard/generate', form);
            setEcard(res.data);
        } catch (error) {
            Alert.alert('Error', 'Failed to generate e-card');
            console.error(error);
        }
        setLoading(false);
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>🎉 Generate Event E-Card</Text>
            {['eventType', 'name', 'date', 'venue', 'theme'].map(key => (
                <TextInput
                    key={key}
                    placeholder={`Enter ${key}`}
                    style={styles.input}
                    value={form[key as keyof ECardData]}
                    onChangeText={value => handleInputChange(key as keyof ECardData, value)}
                />
            ))}

            <Button title="Generate E-Card" onPress={handleSubmit} />
            {loading && <ActivityIndicator size="large" style={{ marginTop: 20 }} />}

            {ecard && (
                <>
                    <Image source={{ uri: ecard.image }} style={styles.image} />
                    <Text style={styles.message}>{ecard.message}</Text>
                </>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 70,
        backgroundColor: '#F8EAF2',
        flexGrow: 1,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        marginBottom: 12,
        padding: 10,
        fontSize: 16,
    },
    image: {
        height: 300,
        width: '100%',
        resizeMode: 'contain',
        marginTop: 20,
    },
    message: {
        fontSize: 16,
        marginTop: 15,
        textAlign: 'center',
    },
});
