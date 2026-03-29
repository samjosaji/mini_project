import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput,
    ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../theme';
import { adminService } from '../../services/adminService';

export default function AdminVendorsScreen() {
    const [filterChips, setFilterChips] = useState(['All', 'Food', 'Fruits', 'Craft', 'Vegetables', 'Bakery', 'Beverages']);
    const [vendors, setVendors] = useState([]);
    const [filteredVendors, setFilteredVendors] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedFilter, setSelectedFilter] = useState('All');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [actionLoading, setActionLoading] = useState(null); // vendorId being actioned

    const loadVendors = useCallback(async () => {
        try {
            const { data } = await adminService.getAllVendorsForAdmin();
            setVendors(data || []);

            // Dynamically load real categories from database to replace defaults
            const { data: catData } = await adminService.getCategories();
            if (catData && catData.length > 0) {
                const names = catData.map(c => c.name);
                setFilterChips(['All', ...names]);
            }
        } catch (err) {
            console.error('Error loading vendors:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadVendors();
    }, [loadVendors]);

    // Filter + search
    useEffect(() => {
        let result = vendors;
        if (selectedFilter !== 'All') {
            result = result.filter((v) => {
                const cats = (v.categories || []).map(c => c.toLowerCase());
                return cats.includes(selectedFilter.toLowerCase());
            });
        }
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            result = result.filter((v) =>
                (v.shop_name || '').toLowerCase().includes(q)
            );
        }
        setFilteredVendors(result);
    }, [vendors, selectedFilter, search]);

    const handleSuspendToggle = async (vendor) => {
        const isSuspended = vendor.status === 'Suspended';
        const action = isSuspended ? 'unsuspend' : 'suspend';

        Alert.alert(
            `${isSuspended ? 'Unsuspend' : 'Suspend'} Vendor`,
            `Are you sure you want to ${action} "${vendor.shop_name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: isSuspended ? 'Unsuspend' : 'Suspend',
                    style: isSuspended ? 'default' : 'destructive',
                    onPress: async () => {
                        setActionLoading(vendor.id);
                        const result = isSuspended
                            ? await adminService.unsuspendVendor(vendor.id, vendor.id)
                            : await adminService.suspendVendor(vendor.id, vendor.id);

                        if (result.error) {
                            Alert.alert('Error', `Failed to ${action} vendor.`);
                        } else {
                            // Update local state
                            setVendors((prev) =>
                                prev.map((v) =>
                                    v.id === vendor.id
                                        ? { ...v, is_suspended: !isSuspended, status: isSuspended ? 'Active' : 'Suspended' }
                                        : v
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
        loadVendors();
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
                <Text style={styles.title}>Vendors</Text>
                <View style={styles.avatarWrap}>
                    <MaterialIcons name="admin-panel-settings" size={26} color={Colors.primary} />
                </View>
            </View>

            {/* Search */}
            <View style={styles.searchWrap}>
                <View style={styles.searchBar}>
                    <MaterialIcons name="search" size={20} color={Colors.gray400} style={{ marginLeft: 14 }} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search vendors by name..."
                        placeholderTextColor={Colors.gray400}
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
            </View>

            {/* Filter Chips */}
            <View>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipRow}
                >
                    {filterChips.map((chip, index) => (
                        <TouchableOpacity
                            key={chip}
                            style={[
                                styles.chip, 
                                selectedFilter === chip && styles.chipActive,
                                { marginRight: index === filterChips.length - 1 ? 0 : 8 }
                            ]}
                            onPress={() => setSelectedFilter(chip)}
                        >
                            <Text style={[styles.chipText, selectedFilter === chip && styles.chipTextActive]}>
                                {chip}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Vendor List */}
            <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
            >
                {filteredVendors.length === 0 ? (
                    <View style={styles.emptyWrap}>
                        <MaterialIcons name="storefront" size={48} color={Colors.gray300} />
                        <Text style={styles.emptyText}>No vendors found</Text>
                    </View>
                ) : (
                    filteredVendors.map((v) => (
                        <View key={v.id} style={styles.card}>
                            <View style={styles.cardContent}>
                                <View style={styles.cardLeft}>
                                    {v.cover_image_url ? (
                                        <Image source={{ uri: v.cover_image_url }} style={styles.vendorImg} />
                                    ) : (
                                        <View style={[styles.vendorImg, styles.vendorImgPlaceholder]}>
                                            <MaterialIcons name="storefront" size={24} color={Colors.gray400} />
                                        </View>
                                    )}
                                </View>
                                <View style={styles.cardRight}>
                                    <View style={styles.nameRow}>
                                        <Text style={styles.vendorName} numberOfLines={1}>{v.shop_name}</Text>
                                        <TouchableOpacity
                                            style={styles.removeIcon}
                                            onPress={() => handleSuspendToggle(v)}
                                        >
                                            <MaterialIcons
                                                name={v.status === 'Suspended' ? 'add-circle' : 'remove-circle'}
                                                size={22}
                                                color={v.status === 'Suspended' ? '#16a34a' : '#ef4444'}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <View style={[
                                            styles.statusPill,
                                            v.status === 'Suspended' && styles.statusPillSuspended,
                                        ]}>
                                            <Text style={[
                                                styles.statusPillText,
                                                v.status === 'Suspended' && styles.statusPillTextSuspended,
                                            ]}>
                                                {v.status === 'Suspended' ? 'SUSPENDED' : 'ACTIVE'}
                                            </Text>
                                        </View>
                                        <Text style={styles.categoryText} numberOfLines={1}>
                                            {v.description || v.primaryCategory}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                            <TouchableOpacity
                                style={[
                                    styles.suspendBtn,
                                    v.status === 'Suspended' && styles.unsuspendBtn,
                                ]}
                                onPress={() => handleSuspendToggle(v)}
                                disabled={actionLoading === v.id}
                            >
                                {actionLoading === v.id ? (
                                    <ActivityIndicator size="small" color={Colors.white} />
                                ) : (
                                    <Text style={[
                                        styles.suspendBtnText,
                                        v.status === 'Suspended' && styles.unsuspendBtnText,
                                    ]}>
                                        {v.status === 'Suspended' ? 'Unsuspend' : 'Suspend'}
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
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
    },
    title: { fontSize: 26, fontWeight: '800', color: Colors.textMain },
    avatarWrap: {
        width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: Colors.primary,
        alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0fdf4',
    },
    searchWrap: { paddingHorizontal: 20, paddingBottom: 12 },
    searchBar: {
        flexDirection: 'row', alignItems: 'center', height: 48, borderRadius: 24,
        backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.gray200,
    },
    searchInput: { flex: 1, fontSize: 14, marginLeft: 8, marginRight: 14, color: Colors.textMain },
    chipRow: { paddingHorizontal: 20, paddingBottom: 16 },
    chip: {
        paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20,
        backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.gray200,
        height: 36, justifyContent: 'center', alignItems: 'center'
    },
    chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    chipText: { fontSize: 13, fontWeight: '600', color: Colors.textMain },
    chipTextActive: { color: Colors.white },
    list: { paddingHorizontal: 20 },
    card: {
        borderRadius: 16, backgroundColor: Colors.white,
        borderWidth: 1, borderColor: Colors.gray100, marginBottom: 14,
        overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
    },
    cardContent: { flexDirection: 'row', padding: 14 },
    cardLeft: { marginRight: 14 },
    vendorImg: {
        width: 80, height: 80, borderRadius: 12, backgroundColor: Colors.gray200,
    },
    vendorImgPlaceholder: { alignItems: 'center', justifyContent: 'center' },
    cardRight: { flex: 1, justifyContent: 'center' },
    nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    vendorName: { fontSize: 16, fontWeight: '700', color: Colors.textMain, flex: 1 },
    removeIcon: { marginLeft: 8 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
    statusPill: {
        paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, backgroundColor: '#dcfce7',
    },
    statusPillSuspended: { backgroundColor: '#fef2f2' },
    statusPillText: { fontSize: 10, fontWeight: '800', color: '#15803d' },
    statusPillTextSuspended: { color: '#dc2626' },
    categoryText: { fontSize: 12, color: Colors.gray500, flex: 1 },
    suspendBtn: {
        paddingVertical: 12, backgroundColor: '#1a1a2e', alignItems: 'center',
        marginHorizontal: 14, marginBottom: 14, borderRadius: 10,
    },
    unsuspendBtn: { backgroundColor: '#16a34a' },
    suspendBtnText: { fontSize: 14, fontWeight: '700', color: Colors.white },
    unsuspendBtnText: { color: Colors.white },
    emptyWrap: { alignItems: 'center', paddingVertical: 60 },
    emptyText: { fontSize: 14, color: Colors.gray400, marginTop: 8 },
});
