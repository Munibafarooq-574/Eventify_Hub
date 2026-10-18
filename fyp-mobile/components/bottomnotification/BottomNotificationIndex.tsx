import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons, FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import BottomNavigationFinal from '../dashboard/BottomNavigationFinal';
import getUserNotifications from '@/services/getNotifications';
import { getSecureData, getUserData } from '@/store';

const NotificationsScreen: React.FC = () => {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const requestId = useRef(0);
    const loadNotifications = useCallback(async () => {
        const request = ++requestId.current;
        setRefreshing(true); setError('');
        try {
            const saved = await getUserData();
            const raw = saved ? null : await getSecureData('user');
            const user = saved || (raw ? JSON.parse(raw) : null);
            if (!user?._id) throw new Error('Please sign in again.');
            const data = await getUserNotifications(user._id);
            if (request === requestId.current) setNotifications(Array.isArray(data) ? data : []);
        } catch {
            if (request === requestId.current) setError('Unable to load notifications. Pull down to retry.');
        } finally {
            if (request === requestId.current) setRefreshing(false);
        }
    }, []);
    useFocusEffect(useCallback(() => {
        setNotifications([]);
        void loadNotifications();
        return () => { ++requestId.current; };
    }, [loadNotifications]));

    const renderNotification = ({ item }: { item: any }) => {
        let icon;
        switch (item.type) {
            case 'REFUND_UPDATE':
                icon = <Ionicons name="receipt-outline" size={24} color="#7B2869" />;
                break;
            case 'Trending':
                icon = <MaterialCommunityIcons name="fire" size={24} color="orange" />;
                break;
            case 'Comment':
                icon = <FontAwesome name="comment" size={24} color="blue" />;
                break;
            case 'Upvote':
                icon = <MaterialCommunityIcons name="arrow-up-bold" size={24} color="green" />;
                break;
            default:
                icon = <Ionicons name="notifications" size={24} color="gray" />;
        }

        return (
            <TouchableOpacity key={item._id} style={styles.notificationContainer} disabled={item.type !== 'REFUND_UPDATE'} accessibilityRole={item.type === 'REFUND_UPDATE' ? 'button' : undefined} onPress={() => router.push({ pathname: '/myevents', params: { orderId: item.orderId || '' } })}>
                <View style={styles.iconContainer}>{icon}</View>
                <View style={styles.textContainer}>
                    <Text style={styles.notificationType}>{item.title || item.type}</Text>
                    <Text style={styles.notificationDescription}>{item.body}</Text>
                </View>
                <Text style={styles.notificationTime}>
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </TouchableOpacity>
        );
    };


    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#800080" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
            </View>

            {!!error && <Text accessibilityRole="alert" style={{ padding: 16, color: '#A9273B' }}>{error}</Text>}
            {/* Notifications List */}
            <FlatList
                refreshing={refreshing}
                onRefresh={loadNotifications}
                ListEmptyComponent={!refreshing && !error ? <Text style={{ padding: 20 }}>No notifications yet.</Text> : null}
                data={notifications}
                renderItem={renderNotification}
                keyExtractor={(item) => item._id}
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
        paddingTop: 70,
        paddingBottom: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: '#FBEFF7',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
        marginLeft: 16,
    },
    list: {
        paddingHorizontal: 16,
    },
    notificationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    iconContainer: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
    },
    notificationType: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
    },
    notificationDescription: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    notificationTime: {
        fontSize: 12,
        color: '#666',
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
});

export default NotificationsScreen;
