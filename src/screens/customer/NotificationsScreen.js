import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { notificationService } from '../../services/notificationService';

export default function NotificationsScreen({ navigation }) {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            if (user) fetchNotifications();
        }, [user])
    );

    const fetchNotifications = async () => {
        setLoading(true);
        const { data } = await notificationService.getNotifications(user.id);
        setNotifications(data || []);
        // Mark all as read when viewing
        await notificationService.markAllAsRead(user.id);
        setLoading(false);
    };

    const handleClearAll = () => {
        Alert.alert(
            'Clear Notifications',
            'Are you sure you want to clear all notifications?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear All',
                    style: 'destructive',
                    onPress: async () => {
                        const { error } = await notificationService.deleteAllNotifications(user.id);
                        if (!error) {
                            setNotifications([]);
                        }
                    }
                }
            ]
        );
    };

    const getTimeAgo = (dateStr) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    const getIcon = (type) => {
        switch (type) {
            case 'offer': return { name: 'local-offer', color: '#f59e0b' };
            case 'new_product': return { name: 'new-releases', color: Colors.primary };
            default: return { name: 'notifications', color: Colors.primary };
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <MaterialIcons name="arrow-back" size={24} color={Colors.textMain} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
                {notifications.length > 0 ? (
                    <TouchableOpacity onPress={handleClearAll} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <MaterialIcons name="delete-outline" size={22} color={Colors.redText} />
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 24 }} />
                )}
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : notifications.length === 0 ? (
                <View style={styles.center}>
                    <MaterialIcons name="notifications-none" size={56} color={Colors.gray300} />
                    <Text style={styles.emptyTitle}>No notifications yet</Text>
                    <Text style={styles.emptyText}>
                        Favorite some vendors to get notified when they add new products or offers!
                    </Text>
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
                    {notifications.map((n) => {
                        const icon = getIcon(n.type);
                        return (
                            <View
                                key={n.id}
                                style={[styles.notifCard, !n.is_read && styles.notifUnread]}
                            >
                                <View style={[styles.iconWrap, { backgroundColor: icon.color + '15' }]}>
                                    <MaterialIcons name={icon.name} size={22} color={icon.color} />
                                </View>
                                <View style={styles.notifContent}>
                                    <View style={styles.notifTop}>
                                        <Text style={styles.notifTitle} numberOfLines={1}>{n.title}</Text>
                                        <Text style={styles.notifTime}>{getTimeAgo(n.created_at)}</Text>
                                    </View>
                                    <Text style={styles.notifMessage} numberOfLines={2}>{n.message}</Text>
                                    {n.vendors && (
                                        <Text style={styles.notifVendor}>
                                            From {n.vendors.shop_name}
                                        </Text>
                                    )}
                                </View>
                            </View>
                        );
                    })}
                    <View style={{ height: 40 }} />
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fcf9' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 16, backgroundColor: Colors.white,
        borderBottomWidth: 1, borderBottomColor: Colors.gray100,
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textMain },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textMain, marginTop: 16 },
    emptyText: { fontSize: 14, color: Colors.gray500, textAlign: 'center', marginTop: 8, lineHeight: 20 },
    list: { padding: 16 },
    notifCard: {
        flexDirection: 'row', padding: 14, borderRadius: 14, backgroundColor: Colors.white,
        marginBottom: 10, borderWidth: 1, borderColor: Colors.gray100,
    },
    notifUnread: {
        backgroundColor: '#f0fdf4', borderColor: '#bbf7d0',
    },
    iconWrap: {
        width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
        marginRight: 12,
    },
    notifContent: { flex: 1 },
    notifTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    notifTitle: { fontSize: 14, fontWeight: '700', color: Colors.textMain, flex: 1, marginRight: 8 },
    notifTime: { fontSize: 11, color: Colors.gray500, fontWeight: '500' },
    notifMessage: { fontSize: 13, color: Colors.gray600, marginTop: 4, lineHeight: 18 },
    notifVendor: { fontSize: 11, color: Colors.primary, marginTop: 6, fontWeight: '600' },
});
