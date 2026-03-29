import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, BorderRadius } from '../../theme';
import { productService } from '../../services/productService';
import { locationService } from '../../services/locationService';
import { notificationService } from '../../services/notificationService';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { adminService } from '../../services/adminService';

const defaultCategories = [
    { id: 'food', label: 'Food', icon: 'restaurant' },
    { id: 'fruits', label: 'Fruits', icon: 'eco' },
    { id: 'craft', label: 'Craft', icon: 'palette' },
    { id: 'vegetables', label: 'Vegetables', icon: 'grass' },
];

export default function ExploreScreen({ navigation }) {
    const { user, profile } = useAuth();
    const [selectedCategory, setSelectedCategory] = useState('food');
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [customerLocation, setCustomerLocation] = useState(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [favoriteProductIds, setFavoriteProductIds] = useState(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [dynamicCategories, setDynamicCategories] = useState(defaultCategories);

    useEffect(() => {
        fetchData();
        fetchUserLocation();
    }, []);

    const locationRefreshInterval = useRef(null);

    useFocusEffect(
        useCallback(() => {
            fetchData();
            if (user) {
                notificationService.getUnreadCount(user.id).then(setUnreadCount);
                fetchFavorites();
            }
            fetchCategories();
            fetchUserLocation();

            // Poll every 60s so vendor location timestamps stay fresh
            locationRefreshInterval.current = setInterval(() => {
                fetchData();
            }, 60000);

            return () => {
                if (locationRefreshInterval.current) {
                    clearInterval(locationRefreshInterval.current);
                    locationRefreshInterval.current = null;
                }
            };
        }, [user, selectedCategory])
    );

    const fetchFavorites = async () => {
        const { data } = await notificationService.getFavoriteProducts(user.id);
        if (data) {
            setFavoriteProductIds(new Set(data.map(p => p.id)));
        }
    };

    const fetchCategories = async () => {
        try {
            const { data } = await adminService.getCategories();
            if (data && data.length > 0) {
                // Convert admin DB categories to ExploreUI format and ensure uniqueness
                const uniqueIds = new Set();
                const mapped = [];
                for (const c of data) {
                    const lowerId = c.name.toLowerCase();
                    if (!uniqueIds.has(lowerId)) {
                        uniqueIds.add(lowerId);
                        mapped.push({
                            id: lowerId,
                            key: c.id,
                            label: c.name,
                            icon: c.icon || getIconForCategory(c.name)
                        });
                    }
                }
                setDynamicCategories(mapped);

                // If current selected category was deleted, fallback to the first one available
                if (!mapped.find(c => c.id === selectedCategory)) {
                    setSelectedCategory('all');
                }
            }
        } catch (e) {
            console.error('Error loading dynamic categories:', e);
        }
    };

    const getIconForCategory = (name) => {
        const n = name.toLowerCase();
        if (n.includes('food')) return 'restaurant';
        if (n.includes('fruit')) return 'eco';
        if (n.includes('veg')) return 'grass';
        if (n.includes('craft')) return 'palette';
        if (n.includes('bakery')) return 'breakfast-dining';
        if (n.includes('bev')) return 'local-bar';
        return 'category';
    };

    const fetchUserLocation = async () => {
        const { location } = await locationService.getCurrentLocation();
        if (location) {
            setCustomerLocation(location);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        const { data, error } = await productService.getAllProducts();
        if (data) {
            setProducts(data);
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

    // Helper function to calculate a "trend score" for an item
    const getTrendScore = (item) => {
        const ratingWeight = parseFloat(item.rating || 0) * 10; // 0-50 points
        const favWeight = (item.favorite_count || 0) * 2;       // 2 points per favorite
        const viewWeight = (item.view_count || 0) * 0.5;        // 0.5 points per view

        return ratingWeight + favWeight + viewWeight;
    };

    // Filter items by selected category (case-insensitive) AND search query
    // Also ensuring no products from deleted categories appear (by confirming their category is in dynamicCategories)
    const categoryProducts = useMemo(() => products.filter(item => {
        const validCategories = dynamicCategories.map(c => c.id);
        const itemCatId = (item.category || '').toLowerCase();

        // Exclude products whose category was deleted by admin
        if (!validCategories.includes(itemCatId) && itemCatId !== 'uncategorized') return false;

        const matchesCategory = selectedCategory === 'all' || itemCatId === selectedCategory.toLowerCase();
        if (!searchQuery.trim()) return matchesCategory;
        const query = searchQuery.toLowerCase().trim();
        const matchesSearch =
            item.name?.toLowerCase().includes(query) ||
            item.description?.toLowerCase().includes(query) ||
            item.vendors?.shop_name?.toLowerCase().includes(query);
        return matchesCategory && matchesSearch;
    }), [products, selectedCategory, searchQuery, dynamicCategories]);

    // Distance sorting (Used for Featured)
    const sortedProductsDesc = useMemo(() => [...categoryProducts].sort(
        (a, b) => getDistanceValue(a.vendors) - getDistanceValue(b.vendors)
    ), [categoryProducts, customerLocation]);

    // Trending sorting (Used for Trending)
    const sortedByTrending = useMemo(() => [...categoryProducts].sort(
        (a, b) => getTrendScore(b) - getTrendScore(a)
    ), [categoryProducts]);

    const filteredFeatured = useMemo(() => sortedProductsDesc.filter((item) => item.is_featured || true).slice(0, 5), [sortedProductsDesc]);
    const filteredTrending = useMemo(() => sortedByTrending.slice(0, 10), [sortedByTrending]);

    const getDistance = (vendor) => {
        if (!customerLocation || !vendor?.location_lat || !vendor?.location_lng) return 'Near you';
        const dist = locationService.calculateDistanceInKm(
            customerLocation.latitude, customerLocation.longitude,
            vendor.location_lat, vendor.location_lng
        );
        const timeAgo = vendor?.last_location_update ? locationService.formatTimeAgo(vendor.last_location_update) : '';
        return timeAgo ? `${dist} km • ${timeAgo}` : `${dist} km away`;
    };

    const handleToggleFavorite = async (product) => {
        if (!user) return;

        try {
            const isFav = favoriteProductIds.has(product.id);

            // Optimistic UI
            const newFavs = new Set(favoriteProductIds);
            if (isFav) {
                newFavs.delete(product.id);
            } else {
                newFavs.add(product.id);
            }
            setFavoriteProductIds(newFavs);

            // Call API
            const { error } = isFav
                ? await notificationService.removeFavorite(user.id, product.vendor_id, product.id)
                : await notificationService.addFavorite(user.id, product.vendor_id, product.id);

            if (error) {
                console.error(`Error ${isFav ? 'removing' : 'adding'} favorite:`, error);
                // Revert on error
                setFavoriteProductIds(prev => {
                    const reverted = new Set(prev);
                    if (isFav) reverted.add(product.id);
                    else reverted.delete(product.id);
                    return reverted;
                });
            } else {
                // If success, update the favorite count to keep Trending sort accurate without reloading
                // Decrement or increment favorite_count via our RPC in background
                if (isFav) {
                    supabase.rpc('decrement_favorite_count', { row_id: product.id }).then();
                } else {
                    supabase.rpc('increment_favorite_count', { row_id: product.id }).then();
                }
            }
        } catch (err) {
            console.error('Heart Toggle Error:', err);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.welcomeText}>WELCOME BACK, {profile?.first_name?.toUpperCase() || 'USER'}</Text>
                        <Text style={styles.headerTitle}>Discover & Explore 🌿</Text>
                    </View>
                    <TouchableOpacity style={styles.notifBtn} onPress={() => navigation.navigate('Notifications')}>
                        <MaterialIcons name="notifications-none" size={24} color={Colors.textMain} />
                        {unreadCount > 0 && (
                            <View style={styles.notifBadge}>
                                <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Search */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchBar}>
                        <MaterialIcons name="search" size={22} color={Colors.textMuted} style={{ marginLeft: 16 }} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search products..."
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
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
                    <TouchableOpacity
                        style={[styles.categoryChip, selectedCategory === 'all' && styles.categoryChipActive]}
                        onPress={() => setSelectedCategory('all')}
                    >
                        <MaterialIcons name="apps" size={18} color={selectedCategory === 'all' ? Colors.white : Colors.primary} />
                        <Text style={[styles.categoryText, selectedCategory === 'all' && styles.categoryTextActive]}>All</Text>
                    </TouchableOpacity>
                    {dynamicCategories.map((cat) => (
                        <TouchableOpacity
                            key={cat.key || cat.id}
                            style={[styles.categoryChip, selectedCategory === cat.id && styles.categoryChipActive]}
                            onPress={() => setSelectedCategory(cat.id)}
                        >
                            <MaterialIcons
                                name={cat.icon}
                                size={18}
                                color={selectedCategory === cat.id ? Colors.white : Colors.primary}
                            />
                            <Text style={[styles.categoryText, selectedCategory === cat.id && styles.categoryTextActive]}>
                                {cat.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Featured Today */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Featured Today</Text>
                        <TouchableOpacity
                            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                            onPress={() => {
                                navigation.navigate('FeaturedAll', { items: filteredFeatured, category: selectedCategory });
                            }}
                        >
                            <Text style={styles.seeAll}>See all →</Text>
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <ActivityIndicator style={{ marginVertical: 30 }} size="small" color={Colors.primary} />
                    ) : filteredFeatured.length === 0 ? (
                        <Text style={{ textAlign: 'center', color: Colors.textMuted, marginVertical: 20 }}>No items in this category yet.</Text>
                    ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
                            {filteredFeatured.map((item) => (
                                <TouchableOpacity key={item.id} style={styles.featuredCard} activeOpacity={0.8} onPress={() => navigation.navigate('ProductDetail', { product: item })}>
                                    <View style={styles.featuredImageWrap}>
                                        {item.image_url ? (
                                            <Image source={{ uri: item.image_url }} style={styles.featuredImage} />
                                        ) : (
                                            <View style={{ flex: 1, backgroundColor: Colors.gray200, alignItems: 'center', justifyContent: 'center' }}>
                                                <MaterialIcons name="fastfood" size={32} color={Colors.gray400} />
                                            </View>
                                        )}
                                        <View style={styles.priceTag}>
                                            <Text style={styles.priceTagText}>₹{Number(item.price).toFixed(2)}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.featuredInfo}>
                                        <View style={styles.featuredInfoRow}>
                                            <Text style={styles.featuredName} numberOfLines={1}>{item.name}</Text>
                                            <View style={styles.ratingBadge}>
                                                <MaterialIcons name="star" size={12} color={Colors.primary} />
                                                <Text style={styles.ratingText}>{Number(item.rating || 0).toFixed(1)}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.vendorRow}>
                                            <TouchableOpacity
                                                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                                                onPress={() => navigation.navigate('VendorDetail', { vendor: { ...item.vendors, id: item.vendors?.id || item.vendor_id }, customerLocation })}
                                            >
                                                <MaterialIcons name="store" size={14} color={Colors.textMuted} />
                                                <Text style={styles.vendorText}>{item.vendors?.shop_name || 'Vendor'}</Text>
                                            </TouchableOpacity>
                                            <Text style={styles.vendorText}> • {getDistance(item.vendors)}</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}
                </View>

                {/* Trending Items */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { marginHorizontal: 20 }]}>Trending Items</Text>
                    {loading ? (
                        <ActivityIndicator style={{ marginVertical: 30 }} size="small" color={Colors.primary} />
                    ) : filteredTrending.length === 0 ? (
                        <Text style={{ textAlign: 'center', color: Colors.textMuted, marginVertical: 20 }}>No trending items yet.</Text>
                    ) : (
                        filteredTrending.map((item) => (
                            <TouchableOpacity key={item.id} style={styles.trendingCard} activeOpacity={0.8} onPress={() => navigation.navigate('ProductDetail', { product: item })}>
                                <View style={styles.trendingImageWrap}>
                                    {item.image_url ? (
                                        <Image source={{ uri: item.image_url }} style={styles.trendingImage} />
                                    ) : (
                                        <View style={{ flex: 1, backgroundColor: Colors.gray200, alignItems: 'center', justifyContent: 'center' }}>
                                            <MaterialIcons name="fastfood" size={24} color={Colors.gray400} />
                                        </View>
                                    )}
                                    <TouchableOpacity
                                        style={[styles.heartBtn, favoriteProductIds.has(item.id) && styles.heartBtnActive]}
                                        onPress={() => handleToggleFavorite(item)}
                                    >
                                        <MaterialIcons
                                            name={favoriteProductIds.has(item.id) ? "favorite" : "favorite-border"}
                                            size={18}
                                            color={favoriteProductIds.has(item.id) ? '#e53935' : Colors.white}
                                        />
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.trendingInfo}>
                                    <View style={styles.trendingTopRow}>
                                        <Text style={styles.trendingName}>{item.name}</Text>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={styles.trendingPrice}>₹{Number(item.price).toFixed(2)}</Text>
                                            <View style={styles.ratingSmall}>
                                                <MaterialIcons name="star" size={12} color={Colors.primary} />
                                                <Text style={styles.ratingTextSmall}>{Number(item.rating || 0).toFixed(1)}</Text>
                                            </View>
                                        </View>
                                    </View>
                                    <View style={styles.vendorRow}>
                                        <MaterialIcons name="store" size={12} color={Colors.textMuted} />
                                        <TouchableOpacity onPress={() => navigation.navigate('VendorDetail', { vendor: { ...item.vendors, id: item.vendors?.id || item.vendor_id }, customerLocation })}>
                                            <Text style={styles.vendorTextSmall}>{item.vendors?.shop_name || 'Vendor'}</Text>
                                        </TouchableOpacity>
                                        <Text style={styles.vendorTextSmall}> • {getDistance(item.vendors)}</Text>
                                    </View>
                                    <View style={styles.statusRow}>
                                        <View style={styles.statusBadge}>
                                            <Text style={styles.statusText}>{item.is_available !== false ? 'In Stock' : 'Sold Out'}</Text>
                                        </View>
                                        <Text style={styles.closesText}>• {item.vendors?.is_open ? 'Open Now' : 'Closed'}</Text>
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
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
    },
    welcomeText: { fontSize: 11, color: Colors.textMuted, fontWeight: '500', letterSpacing: 1.5 },
    headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.primary, marginTop: 2 },
    notifBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
        borderWidth: 1, borderColor: Colors.gray100,
    },
    searchContainer: { paddingHorizontal: 20, paddingVertical: 8 },
    searchBar: {
        flexDirection: 'row', alignItems: 'center', height: 48,
        borderRadius: 16, backgroundColor: Colors.white,
        borderWidth: 1, borderColor: Colors.gray100,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3,
    },
    searchInput: { flex: 1, fontSize: 15, color: Colors.textMain, marginLeft: 8, marginRight: 16 },
    categoryRow: { paddingHorizontal: 20, paddingVertical: 12, gap: 10 },
    categoryChip: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20,
        backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.gray200,
    },
    categoryChipActive: {
        backgroundColor: Colors.primary, borderColor: Colors.primary,
        shadowColor: Colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6,
    },
    categoryText: { fontSize: 13, fontWeight: '600', color: Colors.textMain },
    categoryTextActive: { color: Colors.white, fontWeight: '700' },
    section: { marginTop: 16 },
    sectionHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, marginBottom: 12,
    },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.textMain },
    seeAll: { fontSize: 13, fontWeight: '600', color: Colors.primary },
    featuredCard: {
        width: 240, borderRadius: 16, overflow: 'hidden',
        backgroundColor: Colors.white, marginRight: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6,
        borderWidth: 1, borderColor: Colors.gray100,
    },
    featuredImageWrap: { height: 130, backgroundColor: Colors.gray200, position: 'relative' },
    featuredImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    priceTag: {
        position: 'absolute', top: 8, right: 8,
        backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 8, paddingVertical: 4,
        borderRadius: 8, borderWidth: 1, borderColor: 'rgba(46,125,50,0.2)',
    },
    priceTagText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
    featuredInfo: { padding: 12 },
    featuredInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    featuredName: { fontSize: 16, fontWeight: '700', color: Colors.textMain, flex: 1, marginRight: 8 },
    ratingBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 2,
        backgroundColor: 'rgba(46,125,50,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
    },
    ratingText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
    vendorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    vendorText: { fontSize: 13, color: Colors.textMuted },
    trendingCard: {
        flexDirection: 'row', padding: 12, marginHorizontal: 20, marginTop: 12,
        borderRadius: 16, backgroundColor: Colors.white,
        borderWidth: 1, borderColor: Colors.gray100,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3,
    },
    trendingImageWrap: {
        width: 88, height: 88, borderRadius: 10, overflow: 'hidden',
        backgroundColor: Colors.gray200, position: 'relative',
    },
    trendingImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    heartBtn: {
        position: 'absolute', top: 4, right: 4,
        padding: 4, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.2)',
        alignItems: 'center', justifyContent: 'center',
    },
    heartBtnActive: {
        backgroundColor: 'rgba(255,255,255,0.9)',
    },
    trendingInfo: { flex: 1, marginLeft: 12, justifyContent: 'space-between', paddingVertical: 2 },
    trendingTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    trendingName: { fontSize: 15, fontWeight: '700', color: Colors.textMain, flex: 1, marginRight: 8 },
    trendingPrice: { fontSize: 14, fontWeight: '700', color: Colors.primary },
    ratingSmall: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
    ratingTextSmall: { fontSize: 11, fontWeight: '700', color: Colors.textMain },
    vendorTextSmall: { fontSize: 11, color: Colors.textMuted },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    statusBadge: {
        backgroundColor: 'rgba(46,125,50,0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4,
    },
    statusText: { fontSize: 9, fontWeight: '700', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
    closesText: { fontSize: 10, color: Colors.textMuted },
    notifBadge: {
        position: 'absolute', top: -4, right: -4,
        minWidth: 18, height: 18, borderRadius: 9,
        backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: 4, borderWidth: 2, borderColor: Colors.white,
    },
    notifBadgeText: { fontSize: 9, fontWeight: '700', color: Colors.white },
});
