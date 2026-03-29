import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
    ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../theme';
import { adminService } from '../../services/adminService';

export default function AdminDashboardScreen() {
    const [stats, setStats] = useState({
        totalVendors: 0,
        totalCustomers: 0,
        activeVendors: 0,
        suspendedVendors: 0,
    });
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const [statsResult, activitiesResult] = await Promise.all([
                adminService.getDashboardStats(),
                adminService.getRecentActivities(6),
            ]);

            if (statsResult.data) setStats(statsResult.data);
            if (activitiesResult.data) setActivities(activitiesResult.data);
        } catch (err) {
            console.error('Dashboard load error:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const formatNumber = (num) => {
        if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
        return num.toString();
    };

    const getTimeAgo = (dateStr) => {
        if (!dateStr) return '';
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins} min ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return `${days}d ago`;
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <View style={styles.logoIcon}>
                            <MaterialIcons name="insights" size={24} color={Colors.white} />
                        </View>
                        <Text style={styles.headerTitle}>Monitoring Focus</Text>
                    </View>
                    <View style={styles.avatarWrap}>
                        <MaterialIcons name="admin-panel-settings" size={26} color={Colors.primary} />
                    </View>
                </View>

                {/* Stats Grid — 2x2 */}
                <View style={styles.statsGrid}>
                    <View style={[styles.statCard, { borderLeftColor: Colors.primary }]}>
                        <Text style={styles.statLabel}>TOTAL VENDORS</Text>
                        <Text style={styles.statValue}>{formatNumber(stats.totalVendors)}</Text>
                        <View style={styles.statFooter}>
                            <MaterialIcons name="trending-up" size={14} color={Colors.primary} />
                            <Text style={styles.statFooterText}>Verified</Text>
                        </View>
                    </View>
                    <View style={[styles.statCard, { borderLeftColor: '#2563eb' }]}>
                        <Text style={styles.statLabel}>TOTAL CUSTOMERS</Text>
                        <Text style={styles.statValue}>{formatNumber(stats.totalCustomers)}</Text>
                        <View style={styles.statFooter}>
                            <MaterialIcons name="trending-up" size={14} color="#2563eb" />
                            <Text style={[styles.statFooterText, { color: '#2563eb' }]}>Users</Text>
                        </View>
                    </View>
                    <View style={[styles.statCard, { borderLeftColor: '#16a34a' }]}>
                        <Text style={styles.statLabel}>ACTIVE SHOPS</Text>
                        <Text style={styles.statValue}>{formatNumber(stats.activeVendors)}</Text>
                        <View style={styles.statFooter}>
                            <MaterialIcons name="check-circle" size={14} color="#16a34a" />
                            <Text style={[styles.statFooterText, { color: '#16a34a' }]}>Verified</Text>
                        </View>
                    </View>
                    <View style={[styles.statCard, { borderLeftColor: '#dc2626' }]}>
                        <Text style={styles.statLabel}>SUSPENDED{'\n'}VENDORS</Text>
                        <Text style={styles.statValue}>{stats.suspendedVendors}</Text>
                        <View style={styles.statFooter}>
                            <MaterialIcons name="cancel" size={14} color="#dc2626" />
                            <Text style={[styles.statFooterText, { color: '#dc2626' }]}>Recent action</Text>
                        </View>
                    </View>
                </View>

                {/* Recent Activities */}
                <View style={styles.activitySection}>
                    <View style={styles.activityHeader}>
                        <Text style={styles.sectionTitle}>Recent Activities</Text>
                        <TouchableOpacity>
                            <Text style={styles.viewAllText}>View All</Text>
                        </TouchableOpacity>
                    </View>

                    {activities.length === 0 ? (
                        <View style={styles.emptyWrap}>
                            <MaterialIcons name="inbox" size={40} color={Colors.gray300} />
                            <Text style={styles.emptyText}>No recent activities</Text>
                        </View>
                    ) : (
                        activities.map((a) => (
                            <View key={a.id} style={styles.activityItem}>
                                <View style={styles.activityImgWrap}>
                                    {a.image ? (
                                        <Image source={{ uri: a.image }} style={styles.activityImg} />
                                    ) : (
                                        <View style={[styles.activityImg, styles.activityImgPlaceholder]}>
                                            <MaterialIcons name="storefront" size={20} color={Colors.gray400} />
                                        </View>
                                    )}
                                </View>
                                <View style={styles.activityInfo}>
                                    <Text style={styles.activityName}>{a.name}</Text>
                                    <Text style={styles.activityDesc}>{a.description}</Text>
                                </View>
                                <View style={[
                                    styles.statusBadge,
                                    a.status === 'Suspended' && styles.statusBadgeSuspended,
                                ]}>
                                    <Text style={[
                                        styles.statusBadgeText,
                                        a.status === 'Suspended' && styles.statusBadgeTextSuspended,
                                    ]}>
                                        {a.status}
                                    </Text>
                                </View>
                            </View>
                        ))
                    )}
                </View>
                <View style={{ height: 100 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8faf9' },
    loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    logoIcon: {
        width: 44, height: 44, borderRadius: 12, backgroundColor: '#0a2e0a',
        alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.textMain },
    avatarWrap: {
        width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: Colors.primary,
        alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0fdf4',
    },
    statsGrid: {
        flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 12,
    },
    statCard: {
        width: '47%', padding: 16, borderRadius: 16, backgroundColor: Colors.white,
        borderWidth: 1, borderColor: Colors.gray100, borderLeftWidth: 3,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
    },
    statLabel: {
        fontSize: 10, fontWeight: '700', color: Colors.gray500, letterSpacing: 0.5, marginBottom: 8,
    },
    statValue: { fontSize: 28, fontWeight: '800', color: Colors.textMain },
    statFooter: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
    statFooterText: { fontSize: 11, fontWeight: '500', color: Colors.primary },
    activitySection: { paddingHorizontal: 20, marginTop: 28 },
    activityHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
    },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.textMain },
    viewAllText: { fontSize: 13, fontWeight: '600', color: Colors.gray500 },
    activityItem: {
        flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14,
        backgroundColor: Colors.white, marginBottom: 10,
        borderWidth: 1, borderColor: Colors.gray100,
    },
    activityImgWrap: { marginRight: 12 },
    activityImg: {
        width: 48, height: 48, borderRadius: 12, backgroundColor: Colors.gray200,
    },
    activityImgPlaceholder: {
        alignItems: 'center', justifyContent: 'center',
    },
    activityInfo: { flex: 1 },
    activityName: { fontSize: 15, fontWeight: '700', color: Colors.textMain },
    activityDesc: { fontSize: 12, color: Colors.gray500, marginTop: 2 },
    statusBadge: {
        paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
        backgroundColor: '#dcfce7',
    },
    statusBadgeSuspended: { backgroundColor: '#fef2f2' },
    statusBadgeText: { fontSize: 11, fontWeight: '700', color: '#15803d' },
    statusBadgeTextSuspended: { color: '#dc2626' },
    emptyWrap: { alignItems: 'center', paddingVertical: 40 },
    emptyText: { fontSize: 14, color: Colors.gray400, marginTop: 8 },
});
