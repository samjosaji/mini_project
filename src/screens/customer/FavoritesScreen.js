import React, { useState, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../theme';
import { notificationService } from '../../services/notificationService';
import { locationService } from '../../services/locationService';
import { useAuth } from '../../contexts/AuthContext';

export default function FavoritesScreen({ navigation }) {
    const { user } = useAuth();
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [removingId, setRemovingId] = useState(null);
    const [activeTab, setActiveTab] = useState('Vendors'); // 'Vendors' or 'Products'
    const [customerLocation, setCustomerLocation] = useState(null);

    const locationRefreshInterval = useRef(null);

    useFocusEffect(
        useCallback(() => {
            if (user) {
                fetchFavorites();
                fetchUserLocation();
            }

            // Poll every 60s so vendor location timestamps stay fresh
            locationRefreshInterval.current = setInterval(() => {
                if (user) fetchFavorites();
            }, 60000);

            return () => {
                if (locationRefreshInterval.current) {
                    clearInterval(locationRefreshInterval.current);
                    locationRefreshInterval.current = null;
                }
            };
        }, [user, activeTab])
    );

    const fetchUserLocation = async () => {
        const { location } = await locationService.getCurrentLocation();
        if (location) {
            setCustomerLocation(location);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        if (activeTab === 'Vendors') {
            const { data } = await notificationService.getFavoriteVendors(user.id);
            if (data) setFavorites(data);
        } else {
            const { data } = await notificationService.getFavoriteProducts(user.id);
            if (data) setFavorites(data);
        }
        setLoading(false);
    };

    const fetchFavorites = fetchData; // Alias for consistency with other screens

    const handleRemoveFavorite = async (item) => {
        const id = item.id;
        setRemovingId(id);

        let error;
        if (activeTab === 'Vendors') {
            const res = await notificationService.removeFavorite(user.id, id);
            error = res.error;
        } else {
            const res = await notificationService.removeFavorite(user.id, item.vendor_id, id);
            error = res.error;
        }

        if (!error) {
            setFavorites(prev => prev.filter(v => v.id !== id));
        }
        setRemovingId(null);
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

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Favorites</Text>
            </View>

            {/* Tab Switcher */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'Vendors' && styles.activeTab]}
                    onPress={() => setActiveTab('Vendors')}
                >
                    <Text style={[styles.tabText, activeTab === 'Vendors' && styles.activeTabText]}>Vendors</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'Products' && styles.activeTab]}
                    onPress={() => setActiveTab('Products')}
                >
                    <Text style={[styles.tabText, activeTab === 'Products' && styles.activeTabText]}>Products</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={[styles.list, { flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : favorites.length === 0 ? (
                <View style={[styles.list, { flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
                    <MaterialIcons name="favorite-border" size={48} color={Colors.gray300} />
                    <Text style={{ marginTop: 16, fontSize: 16, color: Colors.gray500, fontWeight: '500' }}>
                        No favorite {activeTab.toLowerCase()} yet
                    </Text>
                    <Text style={{ marginTop: 8, fontSize: 13, color: Colors.textMuted, textAlign: 'center' }}>
                        {activeTab === 'Vendors'
                            ? "Save your favorite shops to find them easily later."
                            : "Tap the heart icon on any product to save it here."}
                    </Text>
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={styles.list}>
                        {activeTab === 'Vendors' ? (
                            favorites.map((v) => (
                                <TouchableOpacity
                                    key={v.id}
                                    style={styles.card}
                                    activeOpacity={0.8}
                                    onPress={() => navigation.navigate('VendorDetail', { vendor: v, customerLocation })}
                                >
                                    <View style={styles.imageWrap}>
                                        {v.cover_image_url ? (
                                            <Image source={{ uri: v.cover_image_url }} style={[styles.image, !v.is_open && { opacity: 0.5 }]} />
                                        ) : (
                                            <View style={[styles.image, { backgroundColor: Colors.gray200, alignItems: 'center', justifyContent: 'center' }]}>
                                                <MaterialIcons name="storefront" size={24} color={Colors.gray400} />
                                            </View>
                                        )}
                                        <TouchableOpacity
                                            style={styles.favBtn}
                                            onPress={() => handleRemoveFavorite(v)}
                                            disabled={removingId === v.id}
                                        >
                                            {removingId === v.id ? (
                                                <ActivityIndicator size="small" color={Colors.primary} style={{ transform: [{ scale: 0.7 }] }} />
                                            ) : (
                                                <MaterialIcons name="favorite" size={16} color="#e53935" />
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                    <View style={styles.info}>
                                        <View style={styles.topRow}>
                                            <Text style={[styles.name, !v.is_open && { color: Colors.textMuted }]} numberOfLines={1}>
                                                {v.shop_name || 'Vendor'}
                                            </Text>
                                            <View style={styles.ratingRow}>
                                                <MaterialIcons name="star" size={14} color={!v.is_open ? Colors.textMuted : Colors.primary} />
                                                <Text style={styles.ratingText}>{Number(v.rating || 0).toFixed(1)}</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.type} numberOfLines={1}>
                                            {v.description || 'Authentic local vendor'} • {getDistanceLabel(v)}
                                        </Text>
                                        <View style={styles.statusRow}>
                                            <View style={[styles.statusBadge, !v.is_open && styles.closedBadge]}>
                                                <Text style={[styles.statusText, !v.is_open && styles.closedText]}>
                                                    {v.is_open ? 'OPEN' : 'CLOSED'}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))
                        ) : (
                            favorites.map((p) => {
                                const mainImage = p.image_urls?.[0] || p.image_url;
                                return (
                                    <TouchableOpacity
                                        key={p.id}
                                        style={styles.card}
                                        activeOpacity={0.8}
                                        onPress={() => navigation.navigate('ProductDetail', { product: p, customerLocation })}
                                    >
                                        <View style={styles.imageWrap}>
                                            {mainImage ? (
                                                <Image source={{ uri: mainImage }} style={styles.image} />
                                            ) : (
                                                <View style={[styles.image, { backgroundColor: Colors.gray200, alignItems: 'center', justifyContent: 'center' }]}>
                                                    <MaterialIcons name="image" size={24} color={Colors.gray400} />
                                                </View>
                                            )}
                                            <TouchableOpacity
                                                style={styles.favBtn}
                                                onPress={() => handleRemoveFavorite(p)}
                                                disabled={removingId === p.id}
                                            >
                                                {removingId === p.id ? (
                                                    <ActivityIndicator size="small" color={Colors.primary} style={{ transform: [{ scale: 0.7 }] }} />
                                                ) : (
                                                    <MaterialIcons name="favorite" size={16} color="#e53935" />
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                        <View style={styles.info}>
                                            <View style={styles.topRow}>
                                                <Text style={styles.name} numberOfLines={1}>
                                                    {p.name}
                                                </Text>
                                                <View style={styles.ratingRow}>
                                                    <MaterialIcons name="star" size={14} color={Colors.primary} />
                                                    <Text style={styles.ratingText}>{Number(p.rating || 0).toFixed(1)}</Text>
                                                </View>
                                            </View>
                                            <Text style={styles.type} numberOfLines={1}>{p.vendors?.shop_name || 'Vendor'}</Text>
                                            <Text style={styles.price}>₹{Number(p.price).toFixed(2)}</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </View>
                    <View style={{ height: 100 }} />
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.backgroundLight },
    header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.06)', backgroundColor: Colors.white },
    headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.textMain },
    list: { padding: 20 },
    card: {
        flexDirection: 'row', padding: 12, borderRadius: 12, backgroundColor: Colors.white,
        borderWidth: 1, borderColor: Colors.gray100, marginBottom: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3,
    },
    imageWrap: {
        width: 88, height: 88, borderRadius: 10, overflow: 'hidden', backgroundColor: Colors.gray200, position: 'relative',
    },
    image: { width: '100%', height: '100%', resizeMode: 'cover' },
    favBtn: {
        position: 'absolute', top: 4, right: 4, width: 26, height: 26, borderRadius: 13,
        backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center',
    },
    info: { flex: 1, marginLeft: 12, justifyContent: 'center' },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    name: { fontSize: 16, fontWeight: '700', color: Colors.textMain, flex: 1, marginRight: 8 },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    ratingText: { fontSize: 12, fontWeight: '700' },
    type: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, backgroundColor: '#dcfce7' },
    closedBadge: { backgroundColor: '#fef2f2' },
    statusText: { fontSize: 9, fontWeight: '700', color: '#15803d', textTransform: 'uppercase' },
    closedText: { color: '#dc2626' },
    price: { fontSize: 13, fontWeight: '700', color: Colors.primary, marginTop: 4 },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: Colors.white,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray100,
    },
    tab: {
        marginRight: 24,
        paddingVertical: 4,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: Colors.primary,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textMuted,
    },
    activeTabText: {
        color: Colors.primary,
    },
});
