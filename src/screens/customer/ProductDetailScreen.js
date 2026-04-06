import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Image, Dimensions, StatusBar, Share, Linking, Platform, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, BorderRadius } from '../../theme';
import { reviewService } from '../../services/reviewService';
import { productService } from '../../services/productService';
import { notificationService } from '../../services/notificationService';
import { locationService } from '../../services/locationService';
import { vendorService } from '../../services/vendorService';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');

// Reviews will be fetched from the database

// Rating distribution helper
function StarRow({ rating, size = 14, color = '#FFCC00' }) {
    return (
        <View style={{ flexDirection: 'row', gap: 2 }}>
            {[1, 2, 3, 4, 5].map((i) => (
                <MaterialIcons
                    key={i}
                    name={i <= Math.floor(rating) ? 'star' : i - 0.5 <= rating ? 'star-half' : 'star-border'}
                    size={size}
                    color={i <= rating || i - 0.5 <= rating ? color : Colors.gray300}
                />
            ))}
        </View>
    );
}

// Default Rating distribution (5-star to 1-star) if no reviews exist
const defaultDistribution = [0, 0, 0, 0, 0];

export default function ProductDetailScreen({ navigation, route }) {
    const { user } = useAuth();
    const { product, fromVendor } = route.params;
    const [isFavorite, setIsFavorite] = useState(false);
    const [reviews, setReviews] = useState([]);
    const [reviewStats, setReviewStats] = useState(null);
    const [loadingReviews, setLoadingReviews] = useState(true);
    const [favoriteLoading, setFavoriteLoading] = useState(false);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [liveVendor, setLiveVendor] = useState(null);
    const [customerLocation, setCustomerLocation] = useState(null);

    // Build the image array. Prioritize the new image_urls array if it exists.
    let productImages = [];
    if (product?.image_urls && Array.isArray(product.image_urls) && product.image_urls.length > 0) {
        productImages = product.image_urls;
    } else if (product?.image_url) {
        productImages = [product.image_url];
    }

    const locationRefreshInterval = useRef(null);

    useEffect(() => {
        if (product?.id) {
            loadReviewData();
            checkFavoriteStatus();
            incrementViewCount();
        }
        // Fetch fresh vendor data so is_open status is always current
        if (product?.vendor_id) {
            fetchFreshVendor();
        }
        // Fetch customer location for distance display
        fetchCustomerLocation();

        // Poll every 60s so vendor location timestamps stay fresh
        locationRefreshInterval.current = setInterval(() => {
            if (product?.vendor_id) fetchFreshVendor();
        }, 60000);

        return () => {
            if (locationRefreshInterval.current) {
                clearInterval(locationRefreshInterval.current);
                locationRefreshInterval.current = null;
            }
        };
    }, [product]);

    const fetchFreshVendor = async () => {
        const { data } = await vendorService.getVendorById(product.vendor_id);
        if (data) {
            setLiveVendor(data);
        }
    };

    const fetchCustomerLocation = async () => {
        const { location } = await locationService.getCurrentLocation();
        if (location) {
            setCustomerLocation(location);
        }
    };

    const incrementViewCount = async () => {
        try {
            await productService.incrementProductViews(product.id);
        } catch (err) {
            // Ignore errors for view counting
        }
    };

    const checkFavoriteStatus = async () => {
        if (user && product?.id) {
            const status = await notificationService.isFavorited(user.id, product.vendor_id, product.id);
            setIsFavorite(status);
        }
    };

    const handleToggleFavorite = async () => {
        if (!user || favoriteLoading || !product?.id) return;
        setFavoriteLoading(true);
        try {
            if (isFavorite) {
                const { error } = await notificationService.removeFavorite(user.id, product.vendor_id, product.id);
                if (!error) setIsFavorite(false);
            } else {
                const { error } = await notificationService.addFavorite(user.id, product.vendor_id, product.id);
                if (!error) setIsFavorite(true);
            }
        } finally {
            setFavoriteLoading(false);
        }
    };

    const loadReviewData = async () => {
        setLoadingReviews(true);
        const [reviewsRes, statsRes] = await Promise.all([
            reviewService.getReviewsByProduct(product.id),
            reviewService.getRatingSummary(product.id)
        ]);

        if (reviewsRes.data) {
            setReviews(reviewsRes.data.slice(0, 3)); // show first 3 for preview
        }
        if (statsRes) {
            setReviewStats(statsRes);
        }
        setLoadingReviews(false);
    };

    // Extract numeric rating and reviews - prioritizing live stats
    const rating = reviewStats ? parseFloat(reviewStats.average) : (parseFloat(product.rating) || 0);
    const reviewCount = reviewStats ? reviewStats.count : (product.reviews_count || 0);

    // Vendor info - prefer live-fetched data over stale join data
    const vendor = liveVendor || product.vendors || {};
    const vendorName = vendor.shop_name || 'Local Vendor';
    const vendorLat = vendor.location_lat;
    const vendorLng = vendor.location_lng;
    const vendorAddress = vendor.address || 'Location available';
    const vendorIsOpen = vendor.is_open;
    const lastLocationUpdate = vendor.last_location_update;

    // Derived category and description
    const category = product.category || 'Product';
    const description = product.description || 'No description available for this product.';

    const handleNavigate = () => {
        if (!vendorLat || !vendorLng) {
            Linking.openURL(`https://www.google.com/maps/search/${encodeURIComponent(vendorName)}`);
            return;
        }
        const latLng = `${vendorLat},${vendorLng}`;
        const scheme = Platform.select({ ios: 'maps://?q=', android: 'geo:0,0?q=' });
        const url = Platform.select({
            ios: `${scheme}${vendorName}@${latLng}`,
            android: `${scheme}${latLng}(${vendorName})`
        });
        const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${latLng}`;
        Linking.canOpenURL(url).then(supported => {
            Linking.openURL(supported ? url : fallbackUrl);
        });
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Check out ${product.name} at Vendora! Price: ₹${product.price}`,
                title: `Vendora - ${product.name}`
            });
        } catch (error) {
            console.error('Error sharing product', error);
        }
    };

    const handleContact = () => {
        const phoneNumber = product?.vendors?.phone;
        if (!phoneNumber) {
            Alert.alert('Phone Number Not Available', 'This vendor hasn\'t provided a contact number yet.');
            return;
        }

        const url = `tel:${phoneNumber}`;
        Linking.canOpenURL(url)
            .then((supported) => {
                if (supported) {
                    Linking.openURL(url);
                } else {
                    Alert.alert('Error', 'Direct calling is not supported on this device.');
                }
            })
            .catch((err) => console.error('Error opening dialer', err));
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <SafeAreaView style={{ flex: 1 }}>
                {/* ── Header ── */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
                        <MaterialIcons name="arrow-back" size={22} color={Colors.textMain} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Product Details</Text>
                    <View style={styles.headerRight}>
                        <TouchableOpacity style={styles.headerBtn} onPress={handleShare}>
                            <MaterialIcons name="share" size={20} color={Colors.textMain} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.headerBtn}
                            onPress={handleToggleFavorite}
                            disabled={favoriteLoading}
                        >
                            <MaterialIcons
                                name={isFavorite ? 'favorite' : 'favorite-border'}
                                size={22}
                                color={isFavorite ? '#e53935' : Colors.textMain}
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                    {/* ── Hero Image Carousel ── */}
                    <View style={styles.imageContainer}>
                        {productImages.length > 0 ? (
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
                                {productImages.map((imgUri, index) => (
                                    <Image key={index} source={{ uri: imgUri }} style={styles.heroImage} />
                                ))}
                            </ScrollView>
                        ) : (
                            <View style={[styles.heroImage, { backgroundColor: Colors.gray200, alignItems: 'center', justifyContent: 'center' }]}>
                                <MaterialIcons name="image" size={48} color={Colors.gray400} />
                            </View>
                        )}
                        {productImages.length > 1 && (
                            <View style={styles.photoBadge}>
                                <MaterialIcons name="camera-alt" size={14} color={Colors.white} />
                                <Text style={styles.photoBadgeText}>{activeImageIndex + 1} / {productImages.length}</Text>
                            </View>
                        )}
                    </View>

                    {/* ── Product Info ── */}
                    <View style={styles.infoSection}>
                        <View style={styles.nameRow}>
                            <Text style={styles.productName}>{product.name}</Text>
                            <Text style={styles.productPrice}>₹{product.price}</Text>
                        </View>
                        <View style={styles.ratingRow}>
                            <MaterialIcons name="star" size={16} color="#FFB300" />
                            <Text style={styles.ratingValue}>{rating}</Text>
                            <Text style={styles.reviewCountInline}>({reviewCount} reviews)</Text>
                            <Text style={styles.dotSeparator}>•</Text>
                            <Text style={styles.categoryLabel}>{category}</Text>
                        </View>
                        <Text style={styles.description}>{description}</Text>
                    </View>

                    {/* ── Vendor Card ── */}
                    <View style={styles.vendorCard}>
                        {/* Vendor name & details - hidden when coming from vendor page */}
                        {!fromVendor && (
                            <>
                                <TouchableOpacity
                                    style={styles.vendorHeader}
                                    onPress={() => navigation.navigate('VendorDetail', { vendor: { ...vendor, id: vendor.id || product.vendor_id }, customerLocation })}
                                >
                                    <View style={styles.vendorAvatar}>
                                        <MaterialIcons name="store" size={22} color={Colors.white} />
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={styles.vendorName}>{vendorName}</Text>
                                        <View style={styles.vendorStatusRow}>
                                            <View style={[styles.openDot, !vendorIsOpen && { backgroundColor: '#9ca3af' }]} />
                                            <Text style={[styles.openText, !vendorIsOpen && { color: '#9ca3af' }]}>
                                                {vendorIsOpen ? 'Open Now' : 'Closed'}
                                            </Text>
                                        </View>
                                    </View>
                                    <MaterialIcons name="chevron-right" size={24} color={Colors.gray300} />
                                </TouchableOpacity>
                                <View style={styles.vendorLocationRow}>
                                    <MaterialIcons name="location-on" size={16} color={Colors.textMuted} />
                                    <View style={{ marginLeft: 4, flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={styles.vendorAddress}>{vendorAddress}</Text>
                                        {lastLocationUpdate && (
                                            <Text style={styles.lastUpdateText}>Updated {locationService.formatTimeAgo(lastLocationUpdate)}</Text>
                                        )}
                                    </View>
                                </View>
                            </>
                        )}
                        {/* Navigate button - always visible */}
                        <TouchableOpacity style={styles.navigateBtn} onPress={handleNavigate}>
                            <MaterialIcons name="navigation" size={16} color={Colors.primary} />
                            <Text style={styles.navigateBtnText}>Navigate</Text>
                        </TouchableOpacity>
                    </View>

                    {/* ── Rating & Reviews ── */}
                    <View style={styles.reviewsSection}>
                        <Text style={styles.sectionTitle}>Rating & Reviews</Text>

                        <View style={styles.ratingSummary}>
                            {/* Left: big number */}
                            <View style={styles.ratingBig}>
                                <Text style={styles.ratingBigNum}>{rating}</Text>
                                <StarRow rating={rating} size={14} color="#FFB300" />
                                <Text style={styles.ratingBigSub}>{reviewCount} reviews</Text>
                            </View>

                            {/* Right: bar chart */}
                            <View style={styles.ratingBars}>
                                {[5, 4, 3, 2, 1].map((star, idx) => {
                                    const percent = reviewStats?.distribution
                                        ? reviewStats.distribution[idx]
                                        : (reviewCount > 0 ? [70, 20, 7, 2, 1][idx] : 0);

                                    return (
                                        <View key={star} style={styles.barRow}>
                                            <Text style={styles.barLabel}>{star}</Text>
                                            <View style={styles.barTrack}>
                                                <View
                                                    style={[
                                                        styles.barFill,
                                                        { width: `${percent}%` },
                                                    ]}
                                                />
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Add Your Review */}
                        <TouchableOpacity
                            style={styles.addReviewBtn}
                            onPress={() => navigation.navigate('WriteReview', { product })}
                        >
                            <MaterialIcons name="rate-review" size={18} color={Colors.primary} />
                            <Text style={styles.addReviewText}>Add Your Review</Text>
                        </TouchableOpacity>

                        {/* Review Cards */}
                        {loadingReviews ? (
                            <ActivityIndicator style={{ marginTop: 20 }} color={Colors.primary} />
                        ) : reviews.length === 0 ? (
                            <Text style={{ textAlign: 'center', color: Colors.textMuted, marginVertical: 20 }}>No reviews yet. Be the first to review!</Text>
                        ) : reviews.map((review) => (
                            <View key={review.id} style={styles.reviewCard}>
                                <View style={styles.reviewHeader}>
                                    <View style={styles.reviewerRow}>
                                        <View style={styles.reviewerAvatar}>
                                            <Text style={styles.reviewerInitial}>
                                                {(review.customer?.first_name || 'U')[0]}
                                            </Text>
                                        </View>
                                        <Text style={styles.reviewerName}>
                                            {review.customer?.first_name} {review.customer?.last_name}
                                        </Text>
                                    </View>
                                    <Text style={styles.reviewTime}>
                                        {new Date(review.created_at).toLocaleDateString()}
                                    </Text>
                                </View>
                                <StarRow rating={review.rating} size={13} />
                                {review.comment ? (
                                    <Text style={styles.reviewText}>{review.comment}</Text>
                                ) : null}
                            </View>
                        ))}
                        {reviews.length > 0 && (
                            <TouchableOpacity
                                style={styles.viewAllBtn}
                                onPress={() => navigation.navigate('AllReviews', { product })}
                            >
                                <Text style={styles.viewAllText}>View all {reviewCount} reviews</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </ScrollView>

                {/* ── Bottom Bar ── */}
                <View style={styles.bottomBar}>
                    <View>
                        <Text style={styles.bottomLabel}>EXPECTED PRICE</Text>
                        <Text style={styles.bottomPrice}>₹{product.price}</Text>
                    </View>
                    <TouchableOpacity style={styles.contactBtn} onPress={handleContact}>
                        <MaterialIcons name="phone" size={18} color={Colors.white} />
                        <Text style={styles.contactBtnText}>Contact Vendor</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.backgroundLight },

    /* Header */
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 10,
        backgroundColor: Colors.white,
        borderBottomWidth: 1, borderBottomColor: Colors.gray100,
    },
    headerBtn: {
        width: 36, height: 36, borderRadius: 18,
        alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.textMain },
    headerRight: { flexDirection: 'row', gap: 4 },

    /* Hero Image */
    imageContainer: {
        width: width, height: width * 0.8,
        backgroundColor: Colors.gray200,
        position: 'relative'
    },
    heroImage: { width: width, height: width * 0.8, resizeMode: 'cover' },
    photoBadge: {
        position: 'absolute', bottom: 12, right: 12,
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: 14,
    },
    photoBadgeText: { fontSize: 12, fontWeight: '600', color: Colors.white },

    /* Product Info */
    infoSection: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12 },
    nameRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    },
    productName: { fontSize: 20, fontWeight: '700', color: Colors.textMain, flex: 1, marginRight: 12 },
    productPrice: { fontSize: 20, fontWeight: '700', color: Colors.primary },
    ratingRow: {
        flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4,
    },
    ratingValue: { fontSize: 14, fontWeight: '700', color: Colors.textMain },
    reviewCountInline: { fontSize: 13, color: Colors.textMuted },
    dotSeparator: { fontSize: 13, color: Colors.textMuted, marginHorizontal: 2 },
    categoryLabel: { fontSize: 13, color: Colors.textMuted },
    description: {
        fontSize: 14, lineHeight: 21, color: Colors.textSecondary, marginTop: 12,
    },

    /* Vendor Card */
    vendorCard: {
        marginHorizontal: 20, marginTop: 8, padding: 16,
        backgroundColor: Colors.white, borderRadius: 16,
        borderWidth: 1, borderColor: Colors.gray100,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4,
        elevation: 2,
    },
    vendorHeader: { flexDirection: 'row', alignItems: 'center' },
    vendorAvatar: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    },
    vendorName: { fontSize: 15, fontWeight: '700', color: Colors.textMain },
    vendorStatusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 4 },
    openDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.primary },
    openText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
    closesText: { fontSize: 12, color: Colors.textMuted },
    vendorLocationRow: {
        flexDirection: 'row', alignItems: 'flex-start', marginTop: 14,
    },
    vendorAddress: { fontSize: 13, fontWeight: '600', color: Colors.textMain, flexShrink: 1 },
    lastUpdateText: { fontSize: 11, color: Colors.primary, fontStyle: 'italic', marginLeft: 8 },
    vendorDist: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },

    /* Map */
    mapContainer: {
        height: 100, borderRadius: 12, overflow: 'hidden',
        backgroundColor: Colors.gray100, marginTop: 12,
        alignItems: 'center', justifyContent: 'center',
    },
    mapImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    mapOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(232,245,233,0.6)',
    },
    navigateBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        marginTop: 12, paddingVertical: 10,
        borderRadius: 20, borderWidth: 1.5, borderColor: Colors.gray200,
        gap: 6,
    },
    navigateBtnText: { fontSize: 13, fontWeight: '700', color: Colors.primary },

    /* Rating & Reviews */
    reviewsSection: { paddingHorizontal: 20, marginTop: 20 },
    sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.textMain, marginBottom: 14 },
    ratingSummary: { flexDirection: 'row', gap: 20 },
    ratingBig: { alignItems: 'center', minWidth: 80 },
    ratingBigNum: { fontSize: 36, fontWeight: '700', color: Colors.textMain },
    ratingBigSub: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
    ratingBars: { flex: 1, justifyContent: 'center', gap: 5 },
    barRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    barLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted, width: 10, textAlign: 'right' },
    barTrack: {
        flex: 1, height: 7, borderRadius: 4, backgroundColor: Colors.gray100, overflow: 'hidden',
    },
    barFill: { height: '100%', borderRadius: 4, backgroundColor: Colors.primary },

    /* Add Review */
    addReviewBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        marginTop: 18, paddingVertical: 12,
        borderRadius: 12, borderWidth: 1.5, borderColor: Colors.primary,
        gap: 8,
    },
    addReviewText: { fontSize: 14, fontWeight: '700', color: Colors.primary },

    /* Review Card */
    reviewCard: {
        marginTop: 16, paddingBottom: 16,
        borderBottomWidth: 1, borderBottomColor: Colors.gray100,
    },
    reviewHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6,
    },
    reviewerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    reviewerAvatar: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: Colors.gray200, alignItems: 'center', justifyContent: 'center',
    },
    reviewerInitial: { fontSize: 14, fontWeight: '700', color: Colors.textMain },
    reviewerName: { fontSize: 14, fontWeight: '700', color: Colors.textMain },
    reviewTime: { fontSize: 12, color: Colors.textMuted },
    reviewText: { fontSize: 13, lineHeight: 19, color: Colors.textSecondary, marginTop: 6 },

    /* View All */
    viewAllBtn: { alignItems: 'center', paddingVertical: 16 },
    viewAllText: { fontSize: 14, fontWeight: '600', color: Colors.primary },

    /* Bottom Bar */
    bottomBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 14,
        backgroundColor: Colors.white,
        borderTopWidth: 1, borderTopColor: Colors.gray100,
        shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 6,
        elevation: 8,
    },
    bottomLabel: { fontSize: 9, fontWeight: '600', color: Colors.textMuted, letterSpacing: 1, textTransform: 'uppercase' },
    bottomPrice: { fontSize: 20, fontWeight: '700', color: Colors.textMain, marginTop: 2 },
    contactBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 14,
        borderRadius: 14,
        shadowColor: Colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6,
        elevation: 4,
    },
    contactBtnText: { fontSize: 15, fontWeight: '700', color: Colors.white },
});
