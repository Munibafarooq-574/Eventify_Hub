import getConversationList from '@/services/getConversationList';
import { getSecureData, saveSecureData } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    FlatList,
    Image,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { io, Socket } from 'socket.io-client';
import BottomNavigationFinal from '../dashboard/BottomNavigationFinal';

const PRIMARY = "#780C60";
const PRIMARY_LIGHT = "#F8E9F0";
const SOCKET_URL = 'https://eventify-hub.onrender.com';
const DEFAULT_AVATAR =
    "https://img.freepik.com/premium-vector/man-avatar-profile-picture-isolated-background-avatar-profile-picture-man_1293239-4841.jpg";
const UNREAD_OVERRIDES_KEY = "chatUnreadOverrides";

// ---------- helpers ----------
const getMsgText = (m: any) => m?.message ?? m?.content ?? "";
const getMsgTime = (m: any) => m?.timestamp ?? m?.createdAt ?? m?.updatedAt ?? new Date().toISOString();
const getSenderId = (m: any) => {
    const s = m?.senderId ?? m?.sender;
    return typeof s === "object" && s !== null ? s._id : s;
};

const loadOverrides = async (): Promise<Record<string, number>> => {
    try {
        const raw = await getSecureData(UNREAD_OVERRIDES_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
};

const persistOverrides = (map: Record<string, number>) => {
    saveSecureData(UNREAD_OVERRIDES_KEY, JSON.stringify(map)).catch((e) =>
        console.error("Failed to persist unread overrides", e)
    );
};

// WhatsApp-style relative time for the conversation list ("10:45 AM" for
// today, "Yesterday", weekday name for the last week, else a short date).
const formatListTime = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    const sameDay = (a: Date, b: Date) =>
        a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

    if (sameDay(d, now)) {
        let h = d.getHours();
        const m = d.getMinutes().toString().padStart(2, "0");
        const ampm = h >= 12 ? "PM" : "AM";
        h = h % 12 || 12;
        return `${h}:${m} ${ampm}`;
    }
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return d.toLocaleDateString(undefined, { weekday: "long" });
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

const MessagesScreen: React.FC = () => {
    const [conversations, setConversations] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    // Unread counts are tracked entirely on the client from this point on:
    // seeded once from the backend's value the first time we see a chat,
    // then incremented by exactly 1 per genuine incoming message and reset
    // to 0 the moment the user opens that conversation. This is what makes
    // the badge match "however many messages actually arrived" instead of
    // being stuck at whatever fixed number the backend happens to send.
    const [unreadOverrides, setUnreadOverrides] = useState<Record<string, number>>({});
    const overridesRef = useRef<Record<string, number>>({});
    const myUserIdRef = useRef<string>("");
    const socketRef = useRef<Socket | null>(null);

    const updateOverrides = useCallback((updater: (prev: Record<string, number>) => Record<string, number>) => {
        setUnreadOverrides((prev) => {
            const updated = updater(prev);
            overridesRef.current = updated;
            persistOverrides(updated);
            return updated;
        });
    }, []);

    const fetchConversations = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const rawUser = await getSecureData("user");
            const user = rawUser ? JSON.parse(rawUser) : null;
            if (!user) throw new Error("user not found");
            myUserIdRef.current = user._id;

            const data = (await getConversationList(user._id)) || [];
            setConversations(data);

            // Seed the local override only for chats we haven't tracked yet,
            // so we never stomp on a count the user already interacted with.
            const stored = await loadOverrides();
            const merged = { ...stored };
            let changed = false;
            data.forEach((c: any) => {
                if (!(c.chatId in merged)) {
                    merged[c.chatId] = Number(c.unreadCount) || 0;
                    changed = true;
                }
            });
            overridesRef.current = merged;
            setUnreadOverrides(merged);
            if (changed) persistOverrides(merged);
        } catch (error) {
            console.error('Error fetching conversations:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        const socketConnection = io(SOCKET_URL);
        socketRef.current = socketConnection;

        fetchConversations();

        socketConnection.on("newMessage", (incoming: any) => {
            const chatId = incoming?.chatId;
            if (!chatId) {
                fetchConversations(true);
                return;
            }

            // Move the affected conversation to the top with a live preview
            // instead of waiting on a full list refetch for every message.
            setConversations((prev) => {
                const idx = prev.findIndex((c) => c.chatId === chatId);
                if (idx === -1) {
                    fetchConversations(true);
                    return prev;
                }
                const updatedConvo = {
                    ...prev[idx],
                    lastMessage: { message: getMsgText(incoming), timestamp: getMsgTime(incoming) },
                };
                const rest = prev.filter((_, i) => i !== idx);
                return [updatedConvo, ...rest];
            });

            const senderId = getSenderId(incoming);
            if (senderId && senderId !== myUserIdRef.current) {
                updateOverrides((prev) => ({ ...prev, [chatId]: (prev[chatId] || 0) + 1 }));
            }
        });

        return () => {
            socketConnection.disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Refresh conversation list every time this screen regains focus (e.g.
    // coming back from a chat) - unread overrides are merged, not overwritten.
    useFocusEffect(
        useCallback(() => {
            fetchConversations(true);
        }, [fetchConversations])
    );

    const handleRefresh = () => {
        setRefreshing(true);
        fetchConversations(true);
    };

    const handleConversationClick = async (item: any) => {
        const participant = item.participants?.[0] || {};
        await saveSecureData("chatId", item.chatId);
        await saveSecureData("receiverId", participant._id || "");
        await saveSecureData("receiverName", participant.name || "Conversation");
        await saveSecureData("receiverAvatar", participant.avatar || "");

        // Clear the badge immediately - the whole point of opening the chat.
        updateOverrides((prev) => ({ ...prev, [item.chatId]: 0 }));

        router.push(`/message`);
        if (socketRef.current) {
            socketRef.current.emit("joinConversation", {
                chatId: item.chatId,
                userId: myUserIdRef.current,
            });
        }
    };

    const renderMessage = ({ item }: { item: typeof conversations[0] }) => {
        const participant = item.participants?.[0] || {};
        const unread = unreadOverrides[item.chatId] ?? Number(item.unreadCount) ?? 0;

        return (
            <TouchableOpacity
                style={styles.messageContainer}
                activeOpacity={0.7}
                onPress={() => handleConversationClick(item)}
            >
                <View style={styles.avatarWrap}>
                    <Image source={{ uri: participant.avatar || DEFAULT_AVATAR }} style={styles.avatar} />
                </View>

                <View style={styles.textContainer}>
                    <Text style={styles.title} numberOfLines={1}>{participant.name || "Unknown"}</Text>
                    <Text
                        style={[
                            styles.subtitle,
                            unread > 0 && styles.subtitleUnread,
                        ]}
                        numberOfLines={1}
                    >
                        {item.lastMessage ? getMsgText(item.lastMessage) : "No messages yet"}
                    </Text>
                </View>
                <View style={styles.rightContainer}>
                    <Text style={styles.time}>
                        {item.lastMessage ? formatListTime(getMsgTime(item.lastMessage)) : ""}
                    </Text>
                    {unread > 0 && (
                        <View style={styles.unreadBadge}>
                            <Text style={styles.unreadText}>{unread > 99 ? "99+" : unread}</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

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
                keyExtractor={(item, index) => `${item.chatId}-${index}`}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={PRIMARY} colors={[PRIMARY]} />
                }
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconCircle}>
                                <Ionicons name="chatbubble-ellipses-outline" size={34} color={PRIMARY} />
                            </View>
                            <Text style={styles.emptyTitle}>No conversations yet</Text>
                            <Text style={styles.emptySubtitle}>
                                Your chats with clients will show up here once they message you
                            </Text>
                        </View>
                    ) : null
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