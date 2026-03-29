import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, FlatList, ActivityIndicator, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, BorderRadius } from '../../theme';
import { productService } from '../../services/productService';
import { locationService } from '../../services/locationService';
import { notificationService } from '../../services/notificationService';
import { vendorService } from '../../services/vendorService';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 2;

export default function VendorDetailScreen({ navigation, route }) {
    const { user } = useAuth();
    const { vendor, customerLocation } = route.params || {};
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [isFavorite, setIsFavorite] = useState(false);
    const [favoriteLoading, setFavoriteLoading] = useState(false);
    const [liveVendor, setLiveVendor] = useState(null);
    const locationRefreshInterval = useRef(null);

    // Build the images array representing the vendor profile images
    let vendorImages = [];
    if (vendor?.image_urls && Array.isArray(vendor.image_urls) && vendor.image_urls.length > 0) {
        vendorImages = vendor.image_urls;
    } else if (vendor?.cover_image_url) {
        vendorImages = [vendor.cover_image_url];
    }

    const fetchFreshVendor = async () => {
        const { data } = await vendorService.getVendorById(vendor?.id);
        if (data) setLiveVendor(data);
    };

    useFocusEffect(
        useCallback(() => {
            if (vendor?.id) {
                fetchVendorProducts();
                fetchFreshVendor();
                if (user) checkFavoriteStatus();
            }

            // Poll every 60s so vendor location timestamps stay fresh
            locationRefreshInterval.current = setInterval(() => {
                if (vendor?.id) fetchFreshVendor();
            }, 60000);

            return () => {
                if (locationRefreshInterval.current) {
                    clearInterval(locationRefreshInterval.current);
                    locationRefreshInterval.current = null;
                }
            };
        }, [vendor, user])
    );

    const checkFavoriteStatus = async () => {
        try {
            // Check if this specific vendor is favorited (product_id is implicitly null here)
            const status = await notificationService.isFavorited(user.id, vendor.id, null);
            setIsFavorite(status);
        } catch (err) {
            console.error('Error checking favorite status:', err);
        }
    };

    const handleToggleFavorite = async () => {
        if (!user || favoriteLoading) return;
        setFavoriteLoading(true);

        try {
            if (isFavorite) {
                const { error } = await notificationService.removeFavorite(user.id, vendor.id, null);
                if (!error) setIsFavorite(false);
            } else {
                const { error } = await notificationService.addFavorite(user.id, vendor.id, null);
                if (!error) setIsFavorite(true);
            }
        } catch (err) {
            console.error('Error toggling favorite:', err);
        } finally {
            setFavoriteLoading(false);
        }
    };

    const fetchVendorProducts = async () => {
        setLoading(true);
        const { data, error } = await productService.getProductsByVendor(vendor.id);
        if (data) {
            setProducts(data);
        }
        setLoading(false);
    };

    // Use live-fetched vendor data for location if available
    const displayVendor = liveVendor || vendor;

    const getDistanceLabel = () => {
        if (!customerLocation || !displayVendor?.location_lat || !displayVendor?.location_lng) return 'Near you';
        const dist = locationService.calculateDistanceInKm(
            customerLocation.latitude, customerLocation.longitude,
            displayVendor.location_lat, displayVendor.location_lng
        );
        const timeAgo = displayVendor?.last_location_update ? locationService.formatTimeAgo(displayVendor.last_location_update) : '';
        return timeAgo ? `${dist} km • ${timeAgo}` : `${dist} km away`;
    };

    const renderProduct = ({ item }) => (
        <TouchableOpacity
            style={styles.productCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('ProductDetail', { product: item, fromVendor: true })}
        >
            <View style={styles.imageWrap}>
                <Image source={{ uri: item.image_url }} style={styles.productImage} />
                <View style={styles.priceBadge}>
                    <Text style={styles.priceText}>₹{item.price}</Text>
                </View>
            </View>
            <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                <View style={styles.productMeta}>
                    <View style={styles.ratingRow}>
                        <MaterialIcons name="star" size={12} color={Colors.primary} />
                        <Text style={styles.ratingText}>{Number(item.rating || 0).toFixed(1)}</Text>
                    </View>
                    <Text style={styles.stockText}>{item.is_available !== false ? `In stock` : 'Out of stock'}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header / Back Button */}
            <View style={styles.headerBar}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <MaterialIcons name="arrow-back" size={24} color={Colors.textMain} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{vendor?.shop_name}</Text>
                <TouchableOpacity style={styles.favBtn} onPress={handleToggleFavorite} disabled={favoriteLoading}>
                    <MaterialIcons
                        name={isFavorite ? "favorite" : "favorite-border"}
                        size={22}
                        color={isFavorite ? '#e53935' : Colors.textMain}
                    />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Vendor Profile Header */}
                <View style={styles.vendorHeader}>
                    <View style={styles.coverWrap}>
                        {vendorImages.length > 0 ? (
                            <ScrollView
                                horizontal
                                pagingEnabled
                                showsHorizontalScrollIndicator={false}
                                onScroll={(e) => {
                                    const offset = e.nativeEvent.contentOffset.x;
                                    const index = Math.round(offset / width);
                                    if (index !== activeImageIndex) {
                                        setActiveImageIndex(index);
                                    }
                                }}
                                scrollEventThrottle={16}
                            >
                                {vendorImages.map((imgUri, index) => (
                                    <Image key={index} source={{ uri: imgUri }} style={styles.coverImage} />
                                ))}
                            </ScrollView>
                        ) : (
                            <View style={styles.coverPlaceholder}>
                                <MaterialIcons name="storefront" size={48} color={Colors.gray300} />
                            </View>
                        )}

                        {vendorImages.length > 1 && (
                            <View style={styles.photoBadge}>
                                <MaterialIcons name="camera-alt" size={14} color={Colors.white} />
                                <Text style={styles.photoBadgeText}>{activeImageIndex + 1} / {vendorImages.length}</Text>
                            </View>
                        )}

                        <View style={[styles.statusBadge, !vendor?.is_open && styles.statusBadgeClosed]}>
                            <Text style={[styles.statusText, !vendor?.is_open && styles.statusTextClosed]}>
                                {vendor?.is_open ? 'OPEN NOW' : 'CLOSED'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.vendorDetails}>
                        <Text style={styles.vendorName}>{vendor?.shop_name}</Text>
                        {!!vendor?.description && (
                            <Text style={styles.vendorDescription}>{vendor.description}</Text>
                        )}

                        <View style={styles.statsRow}>
                            <View style={styles.stat}>
                                <MaterialIcons name="star" size={16} color={Colors.primary} />
                                <Text style={styles.statText}>{Number(vendor?.rating || 0).toFixed(1)} Rating</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.stat}>
                                <MaterialIcons name="location-on" size={16} color={Colors.primary} />
                                <Text style={styles.statText}>{getDistanceLabel()}</Text>
                            </View>
                        </View>

                        <View style={styles.addressBox}>
                            <MaterialIcons name="map" size={18} color={Colors.textMuted} />
                            <Text style={styles.addressText} numberOfLines={2}>{vendor?.address || 'Location shared via GPS'}</Text>
                        </View>
                    </View>
                </View>

                {/* Products Section */}
                <View style={styles.productsSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Available Products</Text>
                        <Text style={styles.productCount}>{products.length} items</Text>
                    </View>

                    {loading ? (
                        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
                    ) : products.length === 0 ? (
                        <View style={styles.emptyWrap}>
                            <MaterialIcons name="inventory" size={48} color={Colors.gray200} />
                            <Text style={styles.emptyText}>This vendor hasn't added any products yet.</Text>
                        </View>
                    ) : (
                        <View style={styles.grid}>
                            {products.map((item) => (
                                <View key={item.id} style={{ width: COLUMN_WIDTH, marginBottom: 16 }}>
                                    {renderProduct({ item })}
                                </View>
                            ))}
                        </View>
                    )}
                </View>
                <View style={{ height: 100 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.backgroundLight },
    headerBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.white,
    },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.textMain, flex: 1, textAlign: 'center', marginHorizontal: 8 },
    favBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    vendorHeader: { backgroundColor: Colors.white, paddingBottom: 20 },
    coverWrap: { height: 220, width: width, position: 'relative' },
    coverImage: { width: width, height: 220, resizeMode: 'cover' },
    coverPlaceholder: { flex: 1, backgroundColor: Colors.gray100, alignItems: 'center', justifyContent: 'center' },
    photoBadge: {
        position: 'absolute', bottom: 12, right: 16,
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
    },
    photoBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.white },
    statusBadge: {
        position: 'absolute', bottom: 12, left: 16,
        backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
    },
    statusBadgeClosed: { backgroundColor: '#fef2f2' },
    statusText: { fontSize: 10, fontWeight: '800', color: '#15803d', letterSpacing: 0.5 },
    statusTextClosed: { color: '#dc2626' },
    vendorDetails: { paddingHorizontal: 20, paddingTop: 16 },
    vendorName: { fontSize: 24, fontWeight: '800', color: Colors.textMain },
    vendorDescription: { fontSize: 14, color: Colors.textMuted, marginTop: 4, lineHeight: 20 },
    statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 12 },
    stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    statText: { fontSize: 13, fontWeight: '600', color: Colors.textMain },
    statDivider: { width: 1, height: 14, backgroundColor: Colors.gray200 },
    addressBox: {
        flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16,
        padding: 12, borderRadius: 12, backgroundColor: Colors.backgroundLight,
    },
    addressText: { fontSize: 13, color: Colors.textMuted, flex: 1 },
    productsSection: { paddingHorizontal: 20, paddingTop: 24 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.textMain },
    productCount: { fontSize: 13, color: Colors.textMuted, fontWeight: '500' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    productCard: {
        backgroundColor: Colors.white, borderRadius: 16, overflow: 'hidden',
        borderWidth: 1, borderColor: Colors.gray100,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4,
    },
    imageWrap: { height: COLUMN_WIDTH, width: '100%', position: 'relative' },
    productImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    priceBadge: {
        position: 'absolute', top: 8, right: 8,
        backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 8, paddingVertical: 4,
        borderRadius: 8, borderWidth: 1, borderColor: 'rgba(46,125,50,0.1)',
    },
    priceText: { fontSize: 12, fontWeight: '800', color: Colors.primary },
    productInfo: { padding: 10 },
    productName: { fontSize: 14, fontWeight: '700', color: Colors.textMain },
    productMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    ratingText: { fontSize: 11, fontWeight: '700', color: Colors.textMain },
    stockText: { fontSize: 10, color: Colors.textMuted },
    emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
    emptyText: { fontSize: 14, color: Colors.gray400, marginTop: 12, textAlign: 'center' },
});
