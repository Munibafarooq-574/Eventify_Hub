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

import {
    connectSocket,
    registerUser,
    onNewMessage,
    onMessageDeletedForEveryone,
    listenPresenceUpdate,
    listenTypingStatus,
    listenMessageSeen,
} from '@/utils/socketService';

import BottomNavigationFinal from '../dashboard/BottomNavigationFinal';

const PRIMARY = '#780C60';
const PRIMARY_LIGHT = '#F8E9F0';

const DEFAULT_AVATAR =
    'https://img.freepik.com/premium-vector/man-avatar-profile-picture-isolated-background-avatar-profile-picture-man_1293239-4841.jpg';

// ---------- Helpers ----------

const getMsgText = (m: any) =>
    m?.message ?? m?.content ?? '';

const hasImage = (m: any) => {
    return !!(
        m?.imageUrl ||
        m?.image ||
        m?.media ||
        m?.attachment ||
        m?.photoUrl
    );
};

const isDeleted = (m: any) =>
    !!m?.isDeletedForEveryone;

const getMsgPreview = (m: any) => {
    if (isDeleted(m)) return 'This message was deleted';
    if (hasImage(m)) return 'Photo';
    return getMsgText(m);
};

const getMsgTime = (m: any) =>
    m?.timestamp ??
    m?.createdAt ??
    m?.updatedAt ??
    new Date().toISOString();

const getSenderId = (m: any) => {
    const sender = m?.senderId ?? m?.sender;

    if (typeof sender === 'object' && sender !== null) {
        return sender?._id;
    }

    return sender;
};

// Normalize IDs so ObjectId/string differences don't break comparisons.
const normalizeId = (id: any): string => {
    if (!id) return '';

    if (typeof id === 'object' && id !== null) {
        return String(id._id ?? id.id ?? '');
    }

    return String(id);
};

// WhatsApp-style relative time
const formatListTime = (iso?: string) => {
    if (!iso) return '';

    const d = new Date(iso);
    const now = new Date();

    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    const sameDay = (a: Date, b: Date) =>
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();

    if (sameDay(d, now)) {
        let h = d.getHours();

        const m = d
            .getMinutes()
            .toString()
            .padStart(2, '0');

        const ampm = h >= 12 ? 'PM' : 'AM';

        h = h % 12 || 12;

        return `${h}:${m} ${ampm}`;
    }

    if (diffDays === 1) {
        return 'Yesterday';
    }

    if (diffDays < 7) {
        return d.toLocaleDateString(undefined, {
            weekday: 'long',
        });
    }

    return d.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
    });
};

const MessagesScreen: React.FC = () => {
    const [conversations, setConversations] =
        useState<any[]>([]);

    const [loading, setLoading] =
        useState<boolean>(true);

    const [refreshing, setRefreshing] =
        useState<boolean>(false);

    // Client-side unread overrides.
    const [unreadOverrides, setUnreadOverrides] =
        useState<Record<string, number>>({});

    // userId -> online
    const [onlineMap, setOnlineMap] =
        useState<Record<string, boolean>>({});

    // chatId -> typing
    const [typingMap, setTypingMap] =
        useState<Record<string, boolean>>({});

    // Current logged-in user ID
    const myUserIdRef = useRef<string>('');

    // Chats waiting for messagesSeen confirmation
    const pendingReadConfirmRef =
        useRef<Set<string>>(new Set());

    // Prevent duplicate socket message delivery
    const processedMessageIdsRef =
        useRef<Set<string>>(new Set());

    const updateOverrides = useCallback(
        (
            updater: (
                prev: Record<string, number>
            ) => Record<string, number>
        ) => {
            setUnreadOverrides(
                prev => updater(prev)
            );
        },
        []
    );

    // ---------- Fetch conversations ----------

    const fetchConversations = useCallback(
        async (silent = false) => {
            try {
                if (!silent) {
                    setLoading(true);
                }

                const rawUser =
                    await getSecureData('user');

                const user = rawUser
                    ? JSON.parse(rawUser)
                    : null;

                if (!user) {
                    throw new Error('user not found');
                }

                myUserIdRef.current =
                    normalizeId(user._id);

                const data =
                    (await getConversationList(
                        user._id
                    )) || [];

                setConversations(prevConvos => {
                    const prevMap = new Map(
                        prevConvos.map(c => [
                            normalizeId(c.chatId),
                            c,
                        ])
                    );

                    const merged = data.map(
                        (c: any) => {
                            const chatId =
                                normalizeId(
                                    c.chatId
                                );

                            const prev =
                                prevMap.get(chatId);

                            if (
                                prev?.lastMessage &&
                                hasImage(
                                    prev.lastMessage
                                )
                            ) {
                                const prevTime =
                                    new Date(
                                        getMsgTime(
                                            prev.lastMessage
                                        )
                                    ).getTime();

                                const freshTime =
                                    c.lastMessage
                                        ? new Date(
                                              getMsgTime(
                                                  c.lastMessage
                                              )
                                          ).getTime()
                                        : 0;

                                if (
                                    prevTime >=
                                    freshTime
                                ) {
                                    return {
                                        ...c,
                                        lastMessage:
                                            prev.lastMessage,
                                    };
                                }
                            }

                            return c;
                        }
                    );

                    // Most recent chat first
                    merged.sort(
                        (a: any, b: any) => {
                            const aTime =
                                a.lastMessage
                                    ? new Date(
                                          getMsgTime(
                                              a.lastMessage
                                          )
                                      ).getTime()
                                    : 0;

                            const bTime =
                                b.lastMessage
                                    ? new Date(
                                          getMsgTime(
                                              b.lastMessage
                                          )
                                      ).getTime()
                                    : 0;

                            return bTime - aTime;
                        }
                    );

                    return merged;
                });

                // ---------- Online state ----------

                setOnlineMap(prev => {
                    const merged = {
                        ...prev,
                    };

                    data.forEach((c: any) => {
                        const participant =
                            c.participants?.[0];

                        const participantId =
                            normalizeId(
                                participant?._id
                            );

                        if (
                            participantId &&
                            !(
                                participantId in
                                merged
                            )
                        ) {
                            merged[
                                participantId
                            ] =
                                !!participant?.isOnline;
                        }
                    });

                    return merged;
                });

                // ---------- Unread state ----------

                setUnreadOverrides(() => {
                    const next: Record<
                        string,
                        number
                    > = {};

                    data.forEach((c: any) => {
                        const chatId =
                            normalizeId(
                                c.chatId
                            );

                        next[chatId] =
                            pendingReadConfirmRef.current.has(
                                chatId
                            )
                                ? 0
                                : Number(
                                      c.unreadCount
                                  ) || 0;
                    });

                    return next;
                });
            } catch (error) {
                console.error(
                    'Error fetching conversations:',
                    error
                );
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        []
    );

    // ============================================================
    // SOCKET SETUP
    // ============================================================

    useEffect(() => {
        // Shared singleton socket
        connectSocket();

        // Register current user
        (async () => {
            try {
                const rawUser =
                    await getSecureData('user');

                const user = rawUser
                    ? JSON.parse(rawUser)
                    : null;

                if (user?._id) {
                    myUserIdRef.current =
                        normalizeId(user._id);

                    registerUser(
                        normalizeId(user._id)
                    );
                }
            } catch (error) {
                console.error(
                    'Socket user registration error:',
                    error
                );
            }
        })();

        // Initial conversation fetch
        fetchConversations();

        // ========================================================
        // NEW MESSAGE
        // ========================================================

        const offNewMessage = onNewMessage(
            (incoming: any) => {
                const msgId =
                    normalizeId(incoming?._id);

                // Prevent duplicate message delivery
                if (msgId) {
                    if (
                        processedMessageIdsRef.current.has(
                            msgId
                        )
                    ) {
                        return;
                    }

                    processedMessageIdsRef.current.add(
                        msgId
                    );
                }

                const chatId =
                    normalizeId(
                        incoming?.chatId
                    );

                if (!chatId) {
                    fetchConversations(true);
                    return;
                }

                // -----------------------------------------------
                // Move conversation to top immediately
                // -----------------------------------------------

                setConversations(prev => {
                    const idx =
                        prev.findIndex(
                            c =>
                                normalizeId(
                                    c.chatId
                                ) === chatId
                        );

                    if (idx === -1) {
                        fetchConversations(true);
                        return prev;
                    }

                    const updatedConvo = {
                        ...prev[idx],

                        lastMessage: {
                            _id: incoming?._id,

                            message:
                                getMsgText(
                                    incoming
                                ),

                            imageUrl:
                                incoming?.imageUrl ||
                                incoming?.image ||
                                incoming?.media ||
                                incoming?.attachment ||
                                incoming?.photoUrl ||
                                '',

                            timestamp:
                                getMsgTime(
                                    incoming
                                ),
                        },
                    };

                    const rest =
                        prev.filter(
                            (_, i) =>
                                i !== idx
                        );

                    return [
                        updatedConvo,
                        ...rest,
                    ];
                });

                // -----------------------------------------------
                // Increment unread ONLY for incoming messages
                // -----------------------------------------------

                const senderId =
                    normalizeId(
                        getSenderId(
                            incoming
                        )
                    );

                const myUserId =
                    normalizeId(
                        myUserIdRef.current
                    );

                if (
                    senderId &&
                    myUserId &&
                    senderId !== myUserId
                ) {
                    // This chat is no longer waiting for read
                    // confirmation because a new message arrived.
                    pendingReadConfirmRef.current.delete(
                        chatId
                    );

                    updateOverrides(
                        prev => ({
                            ...prev,

                            [chatId]:
                                (prev[chatId] ||
                                    0) + 1,
                        })
                    );
                }
            }
        );

        // ========================================================
        // MESSAGE DELETED
        // ========================================================

        const offDeleted =
            onMessageDeletedForEveryone(
                (payload: any) => {
                    setConversations(prev =>
                        prev.map(chat => {
                            if (
                                normalizeId(
                                    chat.lastMessage?._id
                                ) ===
                                normalizeId(
                                    payload?.messageId
                                )
                            ) {
                                return {
                                    ...chat,

                                    lastMessage: {
                                        ...chat.lastMessage,

                                        message:
                                            'This message was deleted',

                                        isDeletedForEveryone:
                                            true,
                                    },
                                };
                            }

                            return chat;
                        })
                    );
                }
            );

        // ========================================================
        // PRESENCE
        // ========================================================

        const offPresence =
            listenPresenceUpdate(
                (payload: any) => {
                    const userId =
                        normalizeId(
                            payload?.userId
                        );

                    if (!userId) return;

                    setOnlineMap(prev => ({
                        ...prev,

                        [userId]:
                            !!payload?.isOnline,
                    }));
                }
            );

        // ========================================================
        // TYPING INDICATOR
        // ========================================================

        const offTyping =
            listenTypingStatus(
                (payload: any) => {
                    const chatId =
                        normalizeId(
                            payload?.chatId
                        );

                    if (!chatId) return;

                    const isTyping =
                        !!payload?.isTyping;

                    setTypingMap(prev => {
                        if (
                            prev[chatId] ===
                            isTyping
                        ) {
                            return prev;
                        }

                        return {
                            ...prev,

                            [chatId]:
                                isTyping,
                        };
                    });
                }
            );

        // ========================================================
        // MESSAGE SEEN
        // ========================================================

        const offMessagesSeen =
            listenMessageSeen(
                (payload: any) => {
                    const chatId =
                        normalizeId(
                            payload?.chatId
                        );

                    const seenBy =
                        normalizeId(
                            payload?.seenBy
                        );

                    if (!chatId) return;

                    if (
                        seenBy &&
                        seenBy ===
                            myUserIdRef.current
                    ) {
                        pendingReadConfirmRef.current.delete(
                            chatId
                        );

                        updateOverrides(
                            prev => ({
                                ...prev,

                                [chatId]: 0,
                            })
                        );
                    }
                }
            );

        // ========================================================
        // CLEANUP
        // ========================================================

        return () => {
            offNewMessage();
            offDeleted();
            offPresence();
            offTyping();
            offMessagesSeen();

            // IMPORTANT:
            // Do NOT disconnect shared socket here.
        };

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ============================================================
    // REFRESH WHEN SCREEN GETS FOCUS
    // ============================================================

    useFocusEffect(
        useCallback(() => {
            fetchConversations(true);
        }, [fetchConversations])
    );

    // ============================================================
    // MANUAL REFRESH
    // ============================================================

    const handleRefresh = () => {
        setRefreshing(true);
        fetchConversations(true);
    };

    // ============================================================
    // OPEN CONVERSATION
    // ============================================================

    const handleConversationClick = async (
        item: any
    ) => {
        const participant =
            item.participants?.[0] || {};

        const chatId =
            normalizeId(item.chatId);

        await saveSecureData(
            'chatId',
            chatId
        );

        await saveSecureData(
            'receiverId',
            normalizeId(
                participant._id
            )
        );

        await saveSecureData(
            'receiverName',
            participant.displayName ||
                participant.name ||
                'Conversation'
        );

        await saveSecureData(
            'receiverAvatar',
            participant.avatar || ''
        );

        // Optimistically clear badge
        pendingReadConfirmRef.current.add(
            chatId
        );

        // Safety timeout
        setTimeout(() => {
            pendingReadConfirmRef.current.delete(
                chatId
            );
        }, 15000);

        updateOverrides(prev => ({
            ...prev,

            [chatId]: 0,
        }));

        router.push('/message');
    };

    // ============================================================
    // RENDER CONVERSATION
    // ============================================================

    const renderMessage = ({
        item,
    }: {
        item: typeof conversations[0];
    }) => {
        const participant =
            item.participants?.[0] || {};

        const chatId =
            normalizeId(item.chatId);

        const unread =
            unreadOverrides[chatId] ??
            Number(item.unreadCount) ??
            0;

        const participantId =
            normalizeId(
                participant._id
            );

        const isOnline = participantId
            ? !!onlineMap[participantId]
            : false;

        const isTyping =
            !!typingMap[chatId];

        return (
            <TouchableOpacity
                style={styles.messageContainer}
                activeOpacity={0.7}
                onPress={() =>
                    handleConversationClick(
                        item
                    )
                }
            >
                {/* Avatar */}
                <View style={styles.avatarWrap}>
                    <Image
                        source={{
                            uri:
                                participant.avatar ||
                                DEFAULT_AVATAR,
                        }}
                        style={styles.avatar}
                    />

                    {isOnline && (
                        <View
                            style={
                                styles.onlineDot
                            }
                        />
                    )}
                </View>

                {/* Text */}
                <View style={styles.textContainer}>
                    <Text
                        style={styles.title}
                        numberOfLines={1}
                    >
                        {participant.displayName ||
                            participant.name ||
                            'Unknown'}
                    </Text>

                    <View
                        style={
                            styles.subtitleRow
                        }
                    >
                        {item.lastMessage &&
                            hasImage(
                                item.lastMessage
                            ) &&
                            !isDeleted(
                                item.lastMessage
                            ) && (
                                <Ionicons
                                    name="camera"
                                    size={13}
                                    color={
                                        unread > 0
                                            ? PRIMARY
                                            : '#8A8A8A'
                                    }
                                    style={{
                                        marginRight: 4,
                                    }}
                                />
                            )}

                        <Text
                            style={[
                                styles.subtitle,

                                unread > 0 &&
                                    styles.subtitleUnread,

                                isDeleted(
                                    item.lastMessage
                                ) &&
                                    styles.subtitleDeleted,

                                isTyping &&
                                    styles.subtitleTyping,
                            ]}
                            numberOfLines={1}
                        >
                            {isTyping
                                ? 'typing...'
                                : item.lastMessage
                                ? getMsgPreview(
                                      item.lastMessage
                                  )
                                : 'No messages yet'}
                        </Text>
                    </View>
                </View>

                {/* Right side */}
                <View
                    style={
                        styles.rightContainer
                    }
                >
                    <Text style={styles.time}>
                        {item.lastMessage
                            ? formatListTime(
                                  getMsgTime(
                                      item.lastMessage
                                  )
                              )
                            : ''}
                    </Text>

                    {unread > 0 && (
                        <View
                            style={
                                styles.unreadBadge
                            }
                        >
                            <Text
                                style={
                                    styles.unreadText
                                }
                            >
                                {unread > 99
                                    ? '99+'
                                    : unread}
                            </Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    // ============================================================
    // UI
    // ============================================================

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={
                        styles.headerIconBtn
                    }
                    onPress={() =>
                        router.back()
                    }
                >
                    <Ionicons
                        name="arrow-back"
                        size={22}
                        color="#FFFFFF"
                    />
                </TouchableOpacity>

                <View
                    style={
                        styles.headerTitleWrap
                    }
                >
                    <Text
                        style={
                            styles.headerTitle
                        }
                    >
                        Messages
                    </Text>

                    <Text
                        style={
                            styles.headerSubtitle
                        }
                    >
                        {conversations.length}{' '}
                        {conversations.length ===
                        1
                            ? 'conversation'
                            : 'conversations'}
                    </Text>
                </View>
            </View>

            {/* Messages List */}
            <FlatList
                data={conversations}
                renderItem={renderMessage}
                keyExtractor={item =>
                    normalizeId(
                        item.chatId
                    )
                }
                contentContainerStyle={
                    styles.list
                }
                showsVerticalScrollIndicator={
                    false
                }
                refreshControl={
                    <RefreshControl
                        refreshing={
                            refreshing
                        }
                        onRefresh={
                            handleRefresh
                        }
                        tintColor={
                            PRIMARY
                        }
                        colors={[
                            PRIMARY,
                        ]}
                    />
                }
                ListEmptyComponent={
                    !loading ? (
                        <View
                            style={
                                styles.emptyState
                            }
                        >
                            <View
                                style={
                                    styles.emptyIconCircle
                                }
                            >
                                <Ionicons
                                    name="chatbubble-ellipses-outline"
                                    size={34}
                                    color={
                                        PRIMARY
                                    }
                                />
                            </View>

                            <Text
                                style={
                                    styles.emptyTitle
                                }
                            >
                                No conversations yet
                            </Text>

                            <Text
                                style={
                                    styles.emptySubtitle
                                }
                            >
                                Your chats with
                                clients will
                                show up here
                                once they
                                message you
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
        paddingTop:
            Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 22,
        borderBottomLeftRadius: 26,
        borderBottomRightRadius: 26,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
        marginBottom: 8,
    },

    headerIconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor:
            'rgba(255,255,255,0.15)',
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
        shadowOffset: {
            width: 0,
            height: 2,
        },
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

    onlineDot: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#3ED598',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },

    textContainer: {
        flex: 1,
        paddingRight: 8,
    },

    subtitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 3,
    },

    title: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1A1A1A',
    },

    subtitle: {
        fontSize: 13,
        color: '#8A8A8A',
    },

    subtitleUnread: {
        color: '#3A3A3A',
        fontWeight: '600',
    },

    subtitleDeleted: {
        fontSize: 14,
        fontStyle: 'italic',
        color: '#9E9E9E',
    },

    subtitleTyping: {
        color: PRIMARY,
        fontStyle: 'italic',
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
        shadowOffset: {
            width: 0,
            height: 2,
        },
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