import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, BorderRadius } from '../../theme';
import { vendorService } from '../../services/vendorService';
import { locationService } from '../../services/locationService';
import { notificationService } from '../../services/notificationService';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../contexts/AuthContext';

const defaultCategories = ['All', 'Food', 'Craft', 'Vegetables', 'Fruits'];

export default function VendorsScreen({ navigation }) {
    const [selectedCat, setSelectedCat] = useState('All');
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [customerLocation, setCustomerLocation] = useState(null);
    const [isNearbyFilter, setIsNearbyFilter] = useState(false);
    const [favoriteVendorIds, setFavoriteVendorIds] = useState(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [dynamicCategories, setDynamicCategories] = useState(defaultCategories);
    const { user } = useAuth();

    useEffect(() => {
        fetchUserLocation();
    }, []);

    const locationRefreshInterval = useRef(null);

    useFocusEffect(
        React.useCallback(() => {
            fetchVendors();
            if (user) {
                fetchFavorites();
            }
            fetchCategories();
            fetchUserLocation();

            // Poll every 60s so vendor location timestamps stay fresh
            locationRefreshInterval.current = setInterval(() => {
                fetchVendors();
            }, 60000);

            return () => {
                if (locationRefreshInterval.current) {
                    clearInterval(locationRefreshInterval.current);
                    locationRefreshInterval.current = null;
                }
            };
        }, [selectedCat, user])
    );

    const fetchFavorites = async () => {
        const { data } = await notificationService.getFavoriteVendors(user.id);
        if (data) {
            setFavoriteVendorIds(new Set(data.map(v => v.id)));
        }
    };

    const fetchCategories = async () => {
        try {
            const { data } = await adminService.getCategories();
            if (data && data.length > 0) {
                // Active category names, ensuring uniqueness and case insensitivity
                const activeNames = data.map(c => c.name);
                const uniqueCategories = [...new Set(['All', ...activeNames])];
                setDynamicCategories(uniqueCategories);

                if (!uniqueCategories.includes(selectedCat)) {
                    setSelectedCat('All');
                }
            }
        } catch (e) {
            console.error('Error loading dynamic categories:', e);
        }
    };

    const fetchUserLocation = async () => {
        const { location } = await locationService.getCurrentLocation();
        if (location) {
            setCustomerLocation(location);
        }
    };

    const fetchVendors = async () => {
        setLoading(true);
        const { data, error } = await vendorService.getAllVendors();
        if (data) {
            setVendors(data);
        }
        setLoading(false);
    };

    const getDistanceValue = (vendor) => {
        if (!customerLocation || !vendor?.location_lat || !vendor?.location_lng) return 999999;
        return parseFloat(locationService.calculateDistanceInKm(
            customerLocation.latitude, customerLocation.longitude,
            vendor.location_lat, vendor.location_lng
        ));
    };

    const getDistanceLabel = (vendor) => {
        if (!customerLocation || !vendor?.location_lat || !vendor?.location_lng) return 'Near you';
        const dist = locationService.calculateDistanceInKm(
            customerLocation.latitude, customerLocation.longitude,
            vendor.location_lat, vendor.location_lng
        );
        const timeAgo = vendor?.last_location_update ? locationService.formatTimeAgo(vendor.last_location_update) : '';
        return timeAgo ? `${dist} km • ${timeAgo}` : `${dist} km away`;
    };

    // Filter and Sort vendors (memoized to avoid recalculating distances on every render)
    const displayVendors = useMemo(() => vendors
        .filter(v => {
            // First check if vendor has any products left in valid categories
            const validCategories = dynamicCategories.map(c => c.toLowerCase());
            // An active product is one whose category is inside the allowed dynamic list
            const hasActiveProducts = (v.products || []).some(
                p => p.category && validCategories.includes(p.category.toLowerCase()) && p.category.toLowerCase() !== 'uncategorized'
            );

            // For testing, if a vendor has 0 products total, we still show them. But if they only have deleted products, hide them? 
            // The prompt says "if a category is suspended... it should not delete the products... but dont show in customer screen".
            // So if a vendor *only* has "Uncategorized" products, they shouldn't show up if selectedCat isn't All.

            // Category filter
            if (selectedCat !== 'All') {
                const vendorCategories = (v.products || []).map(p => p.category?.toLowerCase());
                if (!vendorCategories.includes(selectedCat.toLowerCase())) return false;
            }
            // Search filter
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase().trim();
                return v.shop_name?.toLowerCase().includes(query) ||
                    v.description?.toLowerCase().includes(query) ||
                    v.address?.toLowerCase().includes(query);
            }
            return true;
        })
        .sort((a, b) => {
            if (isNearbyFilter) {
                return getDistanceValue(a) - getDistanceValue(b);
            }
            return (a.shop_name || '').localeCompare(b.shop_name || '');
        }), [vendors, selectedCat, searchQuery, isNearbyFilter, customerLocation]);

    const handleToggleFavorite = async (vendorId) => {
        if (!user) return;

        const isFav = favoriteVendorIds.has(vendorId);

        // Optimistic UI
        const newFavs = new Set(favoriteVendorIds);
        if (isFav) {
            newFavs.delete(vendorId);
            setFavoriteVendorIds(newFavs);
            const { error } = await notificationService.removeFavorite(user.id, vendorId);
            if (error) {
                console.error('Error removing favorite:', error);
                setFavoriteVendorIds(prev => {
                    const rev = new Set(prev);
                    rev.add(vendorId);
                    return rev;
                });
            }
        } else {
            newFavs.add(vendorId);
            setFavoriteVendorIds(newFavs);
            const { error } = await notificationService.addFavorite(user.id, vendorId);
            if (error) {
                console.error('Error adding favorite:', error);
                setFavoriteVendorIds(prev => {
                    const rev = new Set(prev);
                    rev.delete(vendorId);
                    return rev;
                });
            }
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Vendors</Text>
                </View>

                {/* Search */}
                <View style={styles.searchWrap}>
                    <View style={styles.searchBar}>
                        <MaterialIcons name="search" size={22} color={Colors.textMuted} style={{ marginLeft: 16 }} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search vendor name..."
                            placeholderTextColor={Colors.textMuted}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            returnKeyType="search"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ paddingRight: 14 }}>
                                <MaterialIcons name="close" size={20} color={Colors.textMuted} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Categories */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
                    {dynamicCategories.map((cat) => (
                        <TouchableOpacity
                            key={cat}
                            style={[styles.catChip, selectedCat === cat && styles.catChipActive]}
                            onPress={() => setSelectedCat(cat)}
                        >
                            <Text style={[styles.catText, selectedCat === cat && styles.catTextActive]}>{cat}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Nearby badge toggle */}
                <View style={styles.nearbyRow}>
                    <TouchableOpacity
                        style={[styles.nearbyBadge, isNearbyFilter && styles.nearbyBadgeActive]}
                        onPress={() => setIsNearbyFilter(!isNearbyFilter)}
                        activeOpacity={0.7}
                    >
                        <MaterialIcons
                            name="near-me"
                            size={14}
                            color={isNearbyFilter ? Colors.white : Colors.primary}
                        />
                        <Text style={[styles.nearbyText, isNearbyFilter && styles.nearbyTextActive]}>NEARBY</Text>
                    </TouchableOpacity>
                </View>

                {/* Vendor List */}
                <View style={styles.vendorList}>
                    {loading ? (
                        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={Colors.primary} />
                    ) : displayVendors.length === 0 ? (
                        <Text style={{ textAlign: 'center', color: Colors.textMuted, marginTop: 40, fontSize: 16 }}>No vendors found for this category.</Text>
                    ) : (
                        displayVendors.map((v) => (
                            <TouchableOpacity
                                key={v.id}
                                style={styles.vendorCard}
                                activeOpacity={0.8}
                                onPress={() => navigation.navigate('VendorDetail', { vendor: v, customerLocation })}
                            >
                                <View style={styles.vendorImageWrap}>
                                    {v.cover_image_url ? (
                                        <Image source={{ uri: v.cover_image_url }} style={[styles.vendorImage, !v.is_open && { opacity: 0.5 }]} />
                                    ) : (
                                        <View style={{ flex: 1, backgroundColor: Colors.gray200, alignItems: 'center', justifyContent: 'center' }}>
                                            <MaterialIcons name="storefront" size={32} color={Colors.gray400} />
                                        </View>
                                    )}
                                    <TouchableOpacity
                                        style={[styles.heartBtn, favoriteVendorIds.has(v.id) && styles.heartBtnActive]}
                                        onPress={() => handleToggleFavorite(v.id)}
                                    >
                                        <MaterialIcons
                                            name={favoriteVendorIds.has(v.id) ? "favorite" : "favorite-border"}
                                            size={18}
                                            color={favoriteVendorIds.has(v.id) ? '#e53935' : Colors.white}
                                        />
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.vendorInfo}>
                                    <View style={styles.vendorTopRow}>
                                        <Text style={[styles.vendorName, !v.is_open && { color: Colors.textMuted }]}>{v.shop_name}</Text>
                                        <View style={styles.ratingRow}>
                                            <MaterialIcons name="star" size={14} color={!v.is_open ? Colors.textMuted : Colors.primary} />
                                            <Text style={[styles.ratingText, !v.is_open && { color: Colors.textMuted }]}>{Number(v.rating || 0).toFixed(1)}</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.vendorType}>{v.description || 'Street Vendor'} • {getDistanceLabel(v)}</Text>
                                    <View style={styles.statusRow}>
                                        <View style={[styles.statusBadge, !v.is_open && styles.statusBadgeClosed]}>
                                            <Text style={[styles.statusText, !v.is_open && styles.statusTextClosed]}>{v.is_open ? 'OPEN' : 'CLOSED'}</Text>
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </View>
                <View style={{ height: 100 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.backgroundLight },
    header: {
        paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16,
        borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.06)',
    },
    headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.textMain },
    searchWrap: { paddingHorizontal: 20, paddingVertical: 12 },
    searchBar: {
        flexDirection: 'row', alignItems: 'center', height: 48, borderRadius: 12,
        backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.gray100,
    },
    searchInput: { flex: 1, fontSize: 15, color: Colors.textMain, marginLeft: 8, marginRight: 16 },
    catRow: { paddingHorizontal: 20, paddingVertical: 8, gap: 10 },
    catChip: {
        paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20,
        backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.gray100,
    },
    catChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    catText: { fontSize: 13, fontWeight: '600', color: Colors.textMain },
    catTextActive: { color: Colors.white, fontWeight: '700' },
    nearbyRow: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
    nearbyBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
        paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
        backgroundColor: Colors.white, borderWidth: 1, borderColor: '#E5E7EB',
    },
    nearbyBadgeActive: {
        backgroundColor: Colors.primary, borderColor: Colors.primary,
    },
    nearbyText: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1 },
    nearbyTextActive: { color: Colors.white },
    vendorList: { paddingHorizontal: 20, paddingTop: 8 },
    vendorCard: {
        flexDirection: 'row', padding: 12, borderRadius: 12, backgroundColor: Colors.white,
        borderWidth: 1, borderColor: Colors.gray100, marginBottom: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3,
    },
    vendorImageWrap: {
        width: 88, height: 88, borderRadius: 10, overflow: 'hidden',
        backgroundColor: Colors.gray200, position: 'relative',
    },
    vendorImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    heartBtn: {
        position: 'absolute', top: 4, right: 4, padding: 4, borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center',
    },
    heartBtnActive: {
        backgroundColor: 'rgba(255,255,255,0.9)',
    },
    vendorInfo: { flex: 1, marginLeft: 12, justifyContent: 'space-between', paddingVertical: 2 },
    vendorTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    vendorName: { fontSize: 15, fontWeight: '700', color: Colors.textMain, flex: 1, marginRight: 8 },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    ratingText: { fontSize: 12, fontWeight: '700', color: Colors.textMain },
    vendorType: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
    statusBadge: {
        paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20,
        backgroundColor: '#dcfce7',
    },
    statusBadgeClosed: { backgroundColor: '#fef2f2' },
    statusText: { fontSize: 9, fontWeight: '700', color: '#15803d', textTransform: 'uppercase', letterSpacing: 0.5 },
    statusTextClosed: { color: '#dc2626' },
    closesText: { fontSize: 10, color: Colors.textMuted },
});
