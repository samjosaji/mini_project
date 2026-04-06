import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl, Alert, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../theme';
import { adminService } from '../../services/adminService';

const STATUS_FILTERS = ['All', 'Pending', 'Reviewed', 'Dismissed'];

function getTimeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
}

function getStatusStyle(status) {
    switch (status) {
        case 'pending':
            return { bg: '#fff7ed', text: '#ea580c', label: 'Pending' };
        case 'reviewed':
            return { bg: '#f0fdf4', text: '#15803d', label: 'Reviewed' };
        case 'dismissed':
            return { bg: '#f3f4f6', text: '#6b7280', label: 'Dismissed' };
        default:
            return { bg: '#f3f4f6', text: '#6b7280', label: status };
    }
}

export default function AdminReportsScreen({ navigation }) {
    const [reports, setReports] = useState([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeFilter, setActiveFilter] = useState('All');

    const loadReports = useCallback(async (showInitialLoader = false) => {
        try {
            const statusFilter = activeFilter === 'All' ? null : activeFilter.toLowerCase();
            const { data, error } = await adminService.getAllVendorReports(statusFilter);
            if (error) throw error;
            setReports(data || []);
        } catch (err) {
            console.error('Error loading reports:', err);
        } finally {
            setInitialLoading(false);
            setRefreshing(false);
        }
    }, [activeFilter]);

    // Initial load on screen focus
    useFocusEffect(
        useCallback(() => {
            if (initialLoading) {
                loadReports(true);
            }
        }, [])
    );

    // Reload when filter changes (without full-screen loader)
    React.useEffect(() => {
        if (!initialLoading) {
            loadReports();
        }
    }, [activeFilter]);

    const onRefresh = () => {
        setRefreshing(true);
        loadReports();
    };

    const handleUpdateStatus = (report, newStatus) => {
        const label = newStatus === 'reviewed' ? 'Mark as Reviewed' : 'Dismiss Report';
        Alert.alert(
            label,
            `Are you sure you want to ${newStatus === 'reviewed' ? 'mark this report as reviewed' : 'dismiss this report'}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: async () => {
                        const { error } = await adminService.updateReportStatus(report.id, newStatus);
                        if (error) {
                            Alert.alert('Error', 'Failed to update report.');
                        } else {
                            loadReports();
                        }
                    },
                },
            ]
        );
    };

    const handleSuspendVendor = (report) => {
        Alert.alert(
            'Suspend Vendor',
            `Are you sure you want to suspend "${report.vendor?.shop_name}"? They will lose access to their account.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Suspend',
                    style: 'destructive',
                    onPress: async () => {
                        const { error } = await adminService.suspendVendor(report.vendor_id, report.vendor_id);
                        if (error) {
                            Alert.alert('Error', 'Failed to suspend vendor.');
                        } else {
                            // Also mark the report as reviewed
                            await adminService.updateReportStatus(report.id, 'reviewed');
                            Alert.alert('Done', `${report.vendor?.shop_name} has been suspended.`);
                            loadReports();
                        }
                    },
                },
            ]
        );
    };

    const pendingCount = reports.filter(r => r.status === 'pending').length;

    if (initialLoading) {
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
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
                    <MaterialIcons name="arrow-back" size={22} color={Colors.textMain} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Vendor Reports</Text>
                <View style={styles.headerBadge}>
                    {pendingCount > 0 && (
                        <View style={styles.badgeDot}>
                            <Text style={styles.badgeText}>{pendingCount}</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Filter Chips */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterWrap}
                contentContainerStyle={styles.filterRow}
            >
                {STATUS_FILTERS.map((f) => {
                    const isActive = f === activeFilter;
                    return (
                        <TouchableOpacity
                            key={f}
                            style={[styles.filterChip, isActive && styles.filterChipActive]}
                            onPress={() => setActiveFilter(f)}
                        >
                            <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                                {f}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
            >
                {reports.length === 0 ? (
                    <View style={styles.emptyWrap}>
                        <MaterialIcons name="verified-user" size={56} color={Colors.gray200} />
                        <Text style={styles.emptyTitle}>No Reports</Text>
                        <Text style={styles.emptyText}>
                            {activeFilter === 'All'
                                ? 'No vendor reports have been submitted yet.'
                                : `No ${activeFilter.toLowerCase()} reports.`}
                        </Text>
                    </View>
                ) : (
                    reports.map((report) => {
                        const statusInfo = getStatusStyle(report.status);
                        const customerName = `${report.customer?.first_name || ''} ${report.customer?.last_name || ''}`.trim() || report.customer?.email || 'Unknown';
                        return (
                            <View key={report.id} style={styles.reportCard}>
                                {/* Report Header */}
                                <View style={styles.reportHeader}>
                                    <View style={styles.reportVendorInfo}>
                                        <View style={styles.vendorAvatar}>
                                            {report.vendor?.cover_image_url ? (
                                                <Image source={{ uri: report.vendor.cover_image_url }} style={styles.vendorAvatarImg} />
                                            ) : (
                                                <MaterialIcons name="storefront" size={20} color={Colors.gray400} />
                                            )}
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.vendorName}>{report.vendor?.shop_name || 'Unknown Vendor'}</Text>
                                            <Text style={styles.reportTime}>{getTimeAgo(report.created_at)}</Text>
                                        </View>
                                    </View>
                                    <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                                        <Text style={[styles.statusText, { color: statusInfo.text }]}>
                                            {statusInfo.label}
                                        </Text>
                                    </View>
                                </View>

                                {/* Reason */}
                                <View style={styles.reasonBadge}>
                                    <MaterialIcons name="flag" size={14} color="#ea580c" />
                                    <Text style={styles.reasonLabel}>{report.reason}</Text>
                                </View>

                                {/* Description */}
                                {report.description ? (
                                    <Text style={styles.reportDescription}>{report.description}</Text>
                                ) : null}

                                {/* Reporter Info */}
                                <View style={styles.reporterRow}>
                                    <MaterialIcons name="person" size={14} color={Colors.gray400} />
                                    <Text style={styles.reporterText}>Reported by: {customerName}</Text>
                                </View>

                                {/* Vendor suspended indicator */}
                                {report.vendor?.is_suspended && (
                                    <View style={styles.suspendedBanner}>
                                        <MaterialIcons name="block" size={14} color="#dc2626" />
                                        <Text style={styles.suspendedText}>This vendor is currently suspended</Text>
                                    </View>
                                )}

                                {/* Action Buttons - only for pending reports */}
                                {report.status === 'pending' && (
                                    <View style={styles.actionRow}>
                                        <TouchableOpacity
                                            style={styles.actionBtnReview}
                                            onPress={() => handleUpdateStatus(report, 'reviewed')}
                                        >
                                            <MaterialIcons name="check-circle" size={16} color="#15803d" />
                                            <Text style={styles.actionBtnReviewText}>Reviewed</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.actionBtnDismiss}
                                            onPress={() => handleUpdateStatus(report, 'dismissed')}
                                        >
                                            <MaterialIcons name="cancel" size={16} color={Colors.gray500} />
                                            <Text style={styles.actionBtnDismissText}>Dismiss</Text>
                                        </TouchableOpacity>
                                        {!report.vendor?.is_suspended && (
                                            <TouchableOpacity
                                                style={styles.actionBtnSuspend}
                                                onPress={() => handleSuspendVendor(report)}
                                            >
                                                <MaterialIcons name="block" size={16} color="#dc2626" />
                                                <Text style={styles.actionBtnSuspendText}>Suspend</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                )}
                            </View>
                        );
                    })
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8faf9' },
    loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    /* Header */
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.white,
        borderBottomWidth: 1, borderBottomColor: Colors.gray100,
    },
    headerBtn: {
        width: 36, height: 36, borderRadius: 18,
        alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textMain },
    headerBadge: { width: 36, alignItems: 'flex-end' },
    badgeDot: {
        backgroundColor: '#dc2626', borderRadius: 10,
        paddingHorizontal: 7, paddingVertical: 2, minWidth: 22,
        alignItems: 'center',
    },
    badgeText: { fontSize: 11, fontWeight: '700', color: Colors.white },

    /* Filter Chips */
    filterWrap: {
        flexGrow: 0, flexShrink: 0,
    },
    filterRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12,
    },
    filterChip: {
        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
        backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.gray200,
        marginRight: 8, flexShrink: 0,
    },
    filterChipActive: {
        backgroundColor: '#0a2e0a', borderColor: '#0a2e0a',
    },
    filterChipText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
    filterChipTextActive: { color: Colors.white },

    /* Empty */
    emptyWrap: { alignItems: 'center', paddingTop: 80 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textMain, marginTop: 16 },
    emptyText: { fontSize: 14, color: Colors.gray400, marginTop: 4, textAlign: 'center' },

    /* Report Card */
    reportCard: {
        marginHorizontal: 16, marginTop: 12, padding: 16,
        backgroundColor: Colors.white, borderRadius: 16,
        borderWidth: 1, borderColor: Colors.gray100,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
    },
    reportHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    },
    reportVendorInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    vendorAvatar: {
        width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.gray100,
        alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    },
    vendorAvatarImg: { width: 40, height: 40, borderRadius: 12 },
    vendorName: { fontSize: 15, fontWeight: '700', color: Colors.textMain },
    reportTime: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
    statusBadge: {
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
    },
    statusText: { fontSize: 11, fontWeight: '700' },

    /* Reason */
    reasonBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        marginTop: 12, paddingHorizontal: 10, paddingVertical: 6,
        backgroundColor: '#fff7ed', borderRadius: 8, alignSelf: 'flex-start',
    },
    reasonLabel: { fontSize: 13, fontWeight: '600', color: '#ea580c' },

    /* Description */
    reportDescription: {
        fontSize: 13, lineHeight: 20, color: Colors.textSecondary, marginTop: 10,
    },

    /* Reporter */
    reporterRow: {
        flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12,
        paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.gray100,
    },
    reporterText: { fontSize: 12, color: Colors.gray500 },

    /* Suspended Banner */
    suspendedBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10,
        padding: 8, borderRadius: 8, backgroundColor: '#fef2f2',
    },
    suspendedText: { fontSize: 12, fontWeight: '600', color: '#dc2626' },

    /* Action Buttons */
    actionRow: {
        flexDirection: 'row', gap: 8, marginTop: 14,
    },
    actionBtnReview: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
        paddingVertical: 10, borderRadius: 10, backgroundColor: '#f0fdf4',
        borderWidth: 1, borderColor: '#bbf7d0',
    },
    actionBtnReviewText: { fontSize: 12, fontWeight: '700', color: '#15803d' },
    actionBtnDismiss: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
        paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.gray50,
        borderWidth: 1, borderColor: Colors.gray200,
    },
    actionBtnDismissText: { fontSize: 12, fontWeight: '700', color: Colors.gray500 },
    actionBtnSuspend: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
        paddingVertical: 10, borderRadius: 10, backgroundColor: '#fef2f2',
        borderWidth: 1, borderColor: '#fecaca',
    },
    actionBtnSuspendText: { fontSize: 12, fontWeight: '700', color: '#dc2626' },
});
