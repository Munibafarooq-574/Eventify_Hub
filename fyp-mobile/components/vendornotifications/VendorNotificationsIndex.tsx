import { FontAwesome, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import BottomNavigationFinal from "../dashboard/BottomNavigationFinal";
import getUserNotifications from '@/services/getNotifications';
import { getSecureData } from '@/store';

const NotificationsScreen: React.FC = () => {
    const [notifications, setNotifications] = useState<any[]>([]);
    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const user = await getSecureData("user") || ""; // Assuming full user object is stored
                const parsedUser = JSON.parse(user);
                const data = await getUserNotifications(parsedUser._id);
                setNotifications(data);
            } catch (error) {
                console.error("Failed to fetch notifications:", error);
            }
        };

        fetchNotifications();
    }, []);

    const getIconConfig = (type: string) => {
        switch (type) {
            case 'Trending':
                return {
                    icon: <MaterialCommunityIcons name="fire" size={20} color="#FF8A00" />,
                    bg: '#FFF1E0',
                };
            case 'Comment':
                return {
                    icon: <FontAwesome name="comment" size={18} color="#2D7DD2" />,
                    bg: '#E7F1FC',
                };
            case 'Upvote':
                return {
                    icon: <MaterialCommunityIcons name="arrow-up-bold" size={20} color="#2FAE60" />,
                    bg: '#E7F8EE',
                };
            default:
                return {
                    icon: <Ionicons name="notifications" size={20} color="#780C60" />,
                    bg: '#F3D9EC',
                };
        }
    };

    const renderNotification = ({ item }: { item: any }) => {
        const { icon, bg } = getIconConfig(item.type);

        return (
            <View style={styles.notificationContainer}>
                <View style={[styles.iconContainer, { backgroundColor: bg }]}>
                    {icon}
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.notificationType}>{item.type}</Text>
                    <Text style={styles.notificationDescription} numberOfLines={2}>
                        {item.body}
                    </Text>
                </View>
                <Text style={styles.notificationTime}>
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.headerIconButton}
                    activeOpacity={0.75}
                >
                    <Ionicons name="arrow-back" size={22} color="#780C60" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
                <View style={styles.headerIconButtonPlaceholder} />
            </View>

            {/* Notifications List */}
            {notifications.length === 0 ? (
                <View style={styles.emptyState}>
                    <View style={styles.emptyIconCircle}>
                        <Ionicons name="notifications-off-outline" size={30} color="#780C60" />
                    </View>
                    <Text style={styles.emptyTitle}>No notifications yet</Text>
                    <Text style={styles.emptyText}>
                        You'll see updates about trends, comments and
                        upvotes here once they arrive.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    renderItem={renderNotification}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* Bottom Navigation */}
            <BottomNavigationFinal />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FDF5FB',
        paddingTop: 70,
        paddingBottom: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 18,
    },
    headerIconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',

        shadowColor: '#780C60',
        shadowOpacity: 0.12,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
    },
    headerIconButtonPlaceholder: {
        width: 40,
        height: 40,
    },
    headerTitle: {
        fontSize: 19,
        fontWeight: '800',
        color: '#3D1633',
    },
    list: {
        paddingHorizontal: 16,
        paddingBottom: 10,
    },
    notificationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        paddingVertical: 14,
        paddingHorizontal: 14,
        marginBottom: 12,

        borderWidth: 1,
        borderColor: '#F1D5E8',

        shadowColor: '#780C60',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
    },
    iconContainer: {
        width: 42,
        height: 42,
        borderRadius: 21,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    textContainer: {
        flex: 1,
        marginRight: 8,
    },
    notificationType: {
        fontSize: 15,
        fontWeight: '700',
        color: '#2E2130',
    },
    notificationDescription: {
        fontSize: 13,
        color: '#8A7A85',
        marginTop: 3,
        lineHeight: 18,
    },
    notificationTime: {
        fontSize: 11,
        color: '#B196A6',
        fontWeight: '600',
        alignSelf: 'flex-start',
    },

    // Empty state

    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
        marginBottom: 80,
    },
    emptyIconCircle: {
        width: 74,
        height: 74,
        borderRadius: 37,
        backgroundColor: '#F3D9EC',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#3D1633',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 13.5,
        color: '#8A7A85',
        textAlign: 'center',
        lineHeight: 19,
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
    navItem: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconImage: {
        width: 37,
        height: 37,
        marginBottom: 5,
    },
    navText: {
        fontSize: 10,
        color: '#000000',
    },
    homeButton: {
        transform: [{ translateY: -10 }],
    },
});

export default NotificationsScreen;