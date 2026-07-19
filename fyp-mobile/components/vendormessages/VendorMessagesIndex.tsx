import getConversationList from '@/services/getConversationList';
import { getSecureData, saveSecureData } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    FlatList,
    Image,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { io } from 'socket.io-client';
import BottomNavigationFinal from '../dashboard/BottomNavigationFinal';

const PRIMARY = "#780C60";
const PRIMARY_LIGHT = "#F8E9F0";

const MessagesScreen: React.FC = () => {
    const [conversations, setConversations] = useState<any[]>([]);
    const [socket, setSocket] = useState<any>(null);
    // const [loggedIn]

    useEffect(() => {
        // Establish socket connection to backend
        const socketConnection = io('https://eventify-hub.onrender.com'); // Use the actual backend URL
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
            //key={item.chatId}
            style={styles.messageContainer}
            activeOpacity={0.7}
            onPress={() => handleConversationClick(item.chatId)}
        >
            <View style={styles.avatarWrap}>
                {/* <Image source={{ uri: item.avatar }} style={styles.avatar} />*/}
                <Image source={{ uri: "https://img.freepik.com/premium-vector/man-avatar-profile-picture-isolated-background-avatar-profile-picture-man_1293239-4841.jpg" }} style={styles.avatar} />
            </View>

            <View style={styles.textContainer}>
                <Text style={styles.title} numberOfLines={1}>{item.participants[0].name}</Text>
                <Text
                    style={[
                        styles.subtitle,
                        item.unreadCount > 0 && styles.subtitleUnread,
                    ]}
                    numberOfLines={1}
                >
                    {item.lastMessage ? item.lastMessage.message : "No Message"}
                </Text>
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
                <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                </TouchableOpacity>

                <View style={styles.headerTitleWrap}>
                    <Text style={styles.headerTitle}>Messages</Text>
                    <Text style={styles.headerSubtitle}>
                        {conversations.length} {conversations.length === 1 ? "conversation" : "conversations"}
                    </Text>
                </View>

            </View>

            {/* Messages List */}
            <FlatList
                data={conversations}
                renderItem={renderMessage}
                //keyExtractor={(item) => item.chatId}
                keyExtractor={(item, index) => `${item.chatId}-${index}`}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconCircle}>
                            <Ionicons name="chatbubble-ellipses-outline" size={34} color={PRIMARY} />
                        </View>
                        <Text style={styles.emptyTitle}>No conversations yet</Text>
                        <Text style={styles.emptySubtitle}>
                            Your chats with clients will show up here once they message you
                        </Text>
                    </View>
                }
            />

            <BottomNavigationFinal />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: PRIMARY_LIGHT,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        backgroundColor: PRIMARY,
        paddingHorizontal: 18,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 22,
        borderBottomLeftRadius: 26,
        borderBottomRightRadius: 26,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
        marginBottom: 8,
    },
    headerIconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
    marginRight: 40,
},
    headerTitle: {
        fontSize: 19,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    headerSubtitle: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.75)',
        marginTop: 2,
    },
    list: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 110,
        flexGrow: 1,
    },
    messageContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 16,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    avatarWrap: {
        marginRight: 14,
        borderRadius: 28,
        padding: 2,
        borderWidth: 1.5,
        borderColor: PRIMARY_LIGHT,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    textContainer: {
        flex: 1,
        paddingRight: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    subtitle: {
        fontSize: 13,
        color: '#8A8A8A',
        marginTop: 3,
    },
    subtitleUnread: {
        color: '#3A3A3A',
        fontWeight: '600',
    },
    rightContainer: {
        alignItems: 'flex-end',
    },
    time: {
        fontSize: 11,
        color: '#B0B0B0',
        fontWeight: '500',
    },
    unreadBadge: {
        backgroundColor: PRIMARY,
        borderRadius: 12,
        minWidth: 20,
        height: 20,
        paddingHorizontal: 6,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 6,
    },
    unreadText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: 'bold',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
        paddingHorizontal: 30,
    },
    emptyIconCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    emptySubtitle: {
        fontSize: 12,
        color: '#8A8A8A',
        textAlign: 'center',
        lineHeight: 18,
    },
});

export default MessagesScreen;