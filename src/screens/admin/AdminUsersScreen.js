import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput,
    ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../theme';
import { adminService } from '../../services/adminService';

export default function AdminUsersScreen({ navigation }) {
    const [customers, setCustomers] = useState([]);
    const [filteredCustomers, setFilteredCustomers] = useState([]);
    const [search, setSearch] = useState('');
    const [filterActive, setFilterActive] = useState(false); // Changed to false: show all by default so suspended guests don't "vanish"
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);

    const loadCustomers = useCallback(async () => {
        try {
            const { data } = await adminService.getAllCustomers();
            setCustomers(data || []);
        } catch (err) {
            console.error('Error loading customers:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadCustomers();
    }, [loadCustomers]);

    useEffect(() => {
        let result = customers;
        if (filterActive) {
            result = result.filter((c) => c.status === 'Active');
        }
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            result = result.filter((c) =>
                (c.name || '').toLowerCase().includes(q) ||
                (c.email || '').toLowerCase().includes(q)
            );
        }
        setFilteredCustomers(result);
    }, [customers, filterActive, search]);

    const handleSuspendToggle = async (customer) => {
        const isSuspended = customer.status === 'Suspended';
        const action = isSuspended ? 'unsuspend' : 'suspend';

        Alert.alert(
            `${isSuspended ? 'Unsuspend' : 'Suspend'} Account`,
            `Are you sure you want to ${action} "${customer.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: isSuspended ? 'Unsuspend' : 'Suspend',
                    style: isSuspended ? 'default' : 'destructive',
                    onPress: async () => {
                        setActionLoading(customer.id);
                        const result = isSuspended
                            ? await adminService.unsuspendCustomer(customer.id)
                            : await adminService.suspendCustomer(customer.id);

                        if (result.error) {
                            Alert.alert('Error', `Failed to ${action} account.`);
                        } else {
                            setCustomers((prev) =>
                                prev.map((c) =>
                                    c.id === customer.id
                                        ? { ...c, is_suspended: !isSuspended, status: isSuspended ? 'Active' : 'Suspended' }
                                        : c
                                )
                            );
                        }
                        setActionLoading(null);
                    },
                },
            ]
        );
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadCustomers();
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[d.getMonth()]} ${d.getDate().toString().padStart(2, '0')}, ${d.getFullYear()}`;
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
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <MaterialIcons name="arrow-back" size={24} color={Colors.textMain} />
                </TouchableOpacity>
                <Text style={styles.title}>Customer Management</Text>
                <TouchableOpacity onPress={() => setFilterActive(!filterActive)}>
                    <MaterialIcons name="tune" size={22} color={Colors.textMain} />
                </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchWrap}>
                <View style={styles.searchBar}>
                    <MaterialIcons name="search" size={20} color={Colors.primary} style={{ marginLeft: 14 }} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search customers..."
                        placeholderTextColor={Colors.gray400}
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
            </View>

            {/* Filter Badge */}
            <View style={styles.filterRow}>
                <TouchableOpacity
                    style={[styles.filterBadge, filterActive && styles.filterBadgeActive]}
                    onPress={() => setFilterActive(!filterActive)}
                >
                    <Text style={[styles.filterBadgeText, filterActive && styles.filterBadgeTextActive]}>
                        {filterActive ? 'Active Customers' : 'All Customers'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Customer List */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
            >
                {filteredCustomers.length === 0 ? (
                    <View style={styles.emptyWrap}>
                        <MaterialIcons name="person-off" size={48} color={Colors.gray300} />
                        <Text style={styles.emptyText}>No customers found</Text>
                    </View>
                ) : (
                    filteredCustomers.map((c) => (
                        <View key={c.id} style={styles.card}>
                            <View style={styles.cardTop}>
                                <View style={styles.leftRow}>
                                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                        <Text style={styles.avatarInitial}>
                                            {(c.name || 'U').charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                    <View style={styles.infoCol}>
                                        <View style={styles.nameStatusRow}>
                                            <Text style={styles.customerName} numberOfLines={1}>{c.name}</Text>
                                            <View style={styles.statusDot}>
                                                <View style={[
                                                    styles.dot,
                                                    c.status === 'Suspended' && styles.dotSuspended,
                                                ]} />
                                                <Text style={[
                                                    styles.statusText,
                                                    c.status === 'Suspended' && styles.statusTextSuspended,
                                                ]}>
                                                    {c.status === 'Suspended' ? 'SUSPENDED' : 'ACTIVE'}
                                                </Text>
                                            </View>
                                        </View>
                                        <Text style={styles.emailText}>{c.email}</Text>
                                        <Text style={styles.joinedText}>Joined on {formatDate(c.created_at)}</Text>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    style={styles.removeIcon}
                                    onPress={() => handleSuspendToggle(c)}
                                >
                                    <MaterialIcons
                                        name={c.status === 'Suspended' ? 'add-circle' : 'remove-circle'}
                                        size={24}
                                        color={c.status === 'Suspended' ? '#16a34a' : '#ef4444'}
                                    />
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.suspendBtn,
                                    c.status === 'Suspended' && styles.unsuspendBtn,
                                ]}
                                onPress={() => handleSuspendToggle(c)}
                                disabled={actionLoading === c.id}
                            >
                                {actionLoading === c.id ? (
                                    <ActivityIndicator size="small" color={c.status === 'Suspended' ? '#16a34a' : '#ea580c'} />
                                ) : (
                                    <Text style={[
                                        styles.suspendBtnText,
                                        c.status === 'Suspended' && styles.unsuspendBtnText,
                                    ]}>
                                        {c.status === 'Suspended' ? 'Unsuspend Account' : 'Suspend Account'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    ))
                )}
                <View style={{ height: 100 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8faf9' },
    loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12,
        borderBottomWidth: 1, borderBottomColor: Colors.gray100,
        backgroundColor: Colors.white,
    },
    backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 18, fontWeight: '700', color: Colors.textMain },
    searchWrap: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8 },
    searchBar: {
        flexDirection: 'row', alignItems: 'center', height: 48, borderRadius: 12,
        backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#dcfce7',
    },
    searchInput: { flex: 1, fontSize: 14, marginLeft: 8, marginRight: 14, color: Colors.textMain },
    filterRow: { paddingHorizontal: 20, paddingBottom: 14 },
    filterBadge: {
        alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 8,
        borderRadius: 20, backgroundColor: Colors.gray200,
    },
    filterBadgeActive: { backgroundColor: '#16a34a' },
    filterBadgeText: { fontSize: 13, fontWeight: '700', color: Colors.gray600 },
    filterBadgeTextActive: { color: Colors.white },
    list: { paddingHorizontal: 20 },
    card: {
        padding: 16, borderRadius: 16, backgroundColor: Colors.white,
        borderWidth: 1, borderColor: Colors.gray100, marginBottom: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
    },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    leftRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1 },
    avatar: {
        width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.gray200,
        borderWidth: 2, borderColor: '#fbbf24',
    },
    avatarPlaceholder: {
        alignItems: 'center', justifyContent: 'center', backgroundColor: '#fef3c7',
    },
    avatarInitial: { fontSize: 18, fontWeight: '700', color: '#92400e' },
    infoCol: { flex: 1 },
    nameStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    customerName: { fontSize: 15, fontWeight: '700', color: Colors.textMain },
    statusDot: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16a34a' },
    dotSuspended: { backgroundColor: '#dc2626' },
    statusText: { fontSize: 10, fontWeight: '800', color: '#16a34a' },
    statusTextSuspended: { color: '#dc2626' },
    emailText: { fontSize: 12, color: Colors.gray500, marginTop: 2 },
    joinedText: { fontSize: 11, color: Colors.gray400, marginTop: 1 },
    removeIcon: { marginLeft: 8 },
    suspendBtn: {
        paddingVertical: 10, borderRadius: 10, borderWidth: 1.5,
        borderColor: '#ea580c', alignItems: 'center', marginTop: 14,
    },
    unsuspendBtn: { borderColor: '#16a34a' },
    suspendBtnText: { fontSize: 14, fontWeight: '700', color: '#ea580c' },
    unsuspendBtnText: { color: '#16a34a' },
    emptyWrap: { alignItems: 'center', paddingVertical: 60 },
    emptyText: { fontSize: 14, color: Colors.gray400, marginTop: 8 },
});
