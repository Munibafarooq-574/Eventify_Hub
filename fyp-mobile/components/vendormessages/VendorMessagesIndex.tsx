import getConversationList from '@/services/getConversationList';
import { getSecureData, saveSecureData } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { io } from 'socket.io-client';
import BottomNavigationFinal from '../dashboard/BottomNavigationFinal';

const MessagesScreen: React.FC = () => {
    const [conversations, setConversations] = useState<any[]>([]);
    const [socket, setSocket] = useState<any>(null);
    // const [loggedIn]

    useEffect(() => {
        // Establish socket connection to backend
        const socketConnection = io('http://13.233.214.252:3000'); // Use the actual backend URL
        setSocket(socketConnection);

        // Fetch conversation list from backend when component mounts
        fetchConversations();

        // Listen for new messages
        socketConnection.on('newMessage', (message) => {
            // Update the conversations or show a notification for the new message
            console.log('Received new message:', message);
            // You can update the state of conversations here
        });

        // Cleanup on component unmount
        return () => {
            socketConnection.disconnect();
        };
    }, []);

    const fetchConversations = async () => {
        try {
            // Assuming you have an API endpoint to get conversations for the current user
            const user = JSON.parse(await getSecureData("user") || "");
            if (!user) {
                throw "user not found";
            }
            const data = await getConversationList(user._id);
            setConversations(data);
        } catch (error) {
            console.error('Error fetching conversations:', error);
        }
    };

    useEffect(() => {
        console.log(conversations)
    }, [conversations]);

    const handleConversationClick = async (chatId: string) => {
        // Navigate to the conversation detail screen (or load messages)
        await saveSecureData("chatId", chatId);
        router.push(`/message`);
        socket.emit('joinConversation', chatId); // Join the conversation room
    };

    const renderMessage = ({ item }: { item: typeof conversations[0] }) => (
        <TouchableOpacity
            key={item.chatId}
            style={styles.messageContainer}
            onPress={() => handleConversationClick(item.chatId)}
        >
            {/* <Image source={{ uri: item.avatar }} style={styles.avatar} />*/}
            <Image source={{ uri: "https://img.freepik.com/premium-vector/man-avatar-profile-picture-isolated-background-avatar-profile-picture-man_1293239-4841.jpg" }} style={styles.avatar} />

            <View style={styles.textContainer}>
                <Text style={styles.title}>{item.participants[0].name}</Text>
                <Text style={styles.subtitle}>{item.lastMessage ? item.lastMessage.message : "No Message"}</Text>
            </View>
            <View style={styles.rightContainer}>
                <Text style={styles.time}>{item.lastMessage ? new Date(item.lastMessage.timestamp).toDateString() : ""}</Text>
                {item.unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{item.unreadCount}</Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#800080" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Messages</Text>
                <TouchableOpacity>
                    <Ionicons name="settings-outline" size={24} color="#800080" />
                </TouchableOpacity>
            </View>

            {/* Messages List */}
            <FlatList
                data={conversations}
                renderItem={renderMessage}
                keyExtractor={(item) => item.chatId}
                contentContainerStyle={styles.list}
            />

            <BottomNavigationFinal />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8E9F0',
        paddingTop: 50,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 40,
        paddingBottom: 16,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
    },
    list: {
        paddingHorizontal: 16,
    },
    messageContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    rightContainer: {
        alignItems: 'flex-end',
    },
    time: {
        fontSize: 12,
        color: '#666',
    },
    unreadBadge: {
        backgroundColor: '#800080',
        borderRadius: 12,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginTop: 4,
    },
    unreadText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    bottomNavigation: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: 80,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
        position: 'absolute',
        bottom: 0,
        width: '100%',
    },
});

export default MessagesScreen;
