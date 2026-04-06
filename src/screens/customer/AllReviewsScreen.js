import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Image, StatusBar, FlatList, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../theme';
import { reviewService } from '../../services/reviewService';
import { useAuth } from '../../contexts/AuthContext';

// Reviews will be fetched from the database
const filters = ['All Reviews', 'Latest', 'Highest Rated', 'Lowest Rated'];

// ── Helpers ──────────────────────────────────
function StarRow({ rating, size = 14, color = '#FFB300' }) {
    return (
        <View style={{ flexDirection: 'row', gap: 1 }}>
            {[1, 2, 3, 4, 5].map((i) => (
                <MaterialIcons
                    key={i}
                    name={
                        i <= Math.floor(rating)
                            ? 'star'
                            : i - 0.5 <= rating
                                ? 'star-half'
                                : 'star-border'
                    }
                    size={size}
                    color={i <= rating ? color : Colors.gray300}
                />
            ))}
        </View>
    );
}

// ── ReviewCard ──────────────────────────────
function ReviewCard({ review, showProductName, currentUserId, onEdit, onDelete }) {
    const customerName = `${review.customer?.first_name || 'User'} ${review.customer?.last_name || ''}`;
    const dateLabel = new Date(review.created_at).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric'
    });
    const isOwnReview = currentUserId && review.customer_id === currentUserId;

    return (
        <View style={styles.reviewCard}>
            <View style={styles.reviewTop}>
                <View style={styles.reviewerRow}>
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarInitial}>{(review.customer?.first_name || 'U')[0]}</Text>
                    </View>
                    <View>
                        <Text style={styles.reviewerName}>{customerName}</Text>
                        <Text style={styles.reviewTime}>{dateLabel}</Text>
                    </View>
                </View>
                {isOwnReview && (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                            style={styles.editBtn}
                            onPress={() => onEdit && onEdit(review)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <MaterialIcons name="edit" size={16} color={Colors.primary} />
                            <Text style={styles.editBtnText}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.deleteBtn}
                            onPress={() => onDelete && onDelete(review)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <MaterialIcons name="delete" size={16} color="#dc2626" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {showProductName && review.product?.name && (
                <View style={styles.productBadge}>
                    <Text style={styles.productBadgeText}>Product: {review.product.name}</Text>
                </View>
            )}

            <View style={{ marginVertical: 8 }}>
                <StarRow rating={review.rating} size={16} />
            </View>

            {review.comment ? (
                <Text style={styles.reviewText}>{review.comment}</Text>
            ) : null}
        </View>
    );
}

// ── Main Screen ──────────────────────────────
export default function AllReviewsScreen({ navigation, route }) {
    const { user } = useAuth();
    const [activeFilter, setActiveFilter] = useState('All Reviews');
    const [reviews, setReviews] = useState([]);
    const [summary, setSummary] = useState({ average: 0, count: 0, distribution: [0, 0, 0, 0, 0] });
    const [loading, setLoading] = useState(true);

    const product = route?.params?.product;
    const vendorId = route?.params?.vendorId;

    React.useEffect(() => {
        if (product?.id || vendorId) {
            fetchData();
        }
    }, [product, vendorId]);

    const fetchData = async () => {
        setLoading(true);
        let reviewsRes, summaryRes;

        if (vendorId) {
            [reviewsRes, summaryRes] = await Promise.all([
                reviewService.getReviewsByVendor(vendorId),
                reviewService.getVendorRatingSummary(vendorId)
            ]);
        } else if (product?.id) {
            [reviewsRes, summaryRes] = await Promise.all([
                reviewService.getReviewsByProduct(product.id),
                reviewService.getRatingSummary(product.id)
            ]);
        }

        if (reviewsRes?.data) setReviews(reviewsRes.data);
        if (summaryRes) setSummary(summaryRes);
        setLoading(false);
    };

    // Client-side filter
    const filteredReviews = (() => {
        let result = [...reviews];
        switch (activeFilter) {
            case 'Latest':
                return result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            case 'Highest Rated':
                return result.sort((a, b) => b.rating - a.rating);
            case 'Lowest Rated':
                return result.sort((a, b) => a.rating - b.rating);
            default:
                return result;
        }
    })();

    const ratingDistribution = [
        { stars: 5, percent: summary.distribution[0] },
        { stars: 4, percent: summary.distribution[1] },
        { stars: 3, percent: summary.distribution[2] },
        { stars: 2, percent: summary.distribution[3] },
        { stars: 1, percent: summary.distribution[4] },
    ];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <SafeAreaView style={{ flex: 1 }}>
                {/* ── Header ── */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.headerBtn}
                        onPress={() => navigation.goBack()}
                    >
                        <MaterialIcons name="arrow-back" size={22} color={Colors.textMain} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Reviews & Feedback</Text>
                    <TouchableOpacity style={styles.headerBtn}>
                        <MaterialIcons name="more-horiz" size={22} color={Colors.textMain} />
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
                ) : (
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 32 }}
                    >
                        {/* ── Rating Summary ── */}
                        <View style={styles.summarySection}>
                            <View style={styles.summaryRow}>
                                {/* Left: Big rating */}
                                <View style={styles.ratingBig}>
                                    <Text style={styles.ratingBigNum}>{summary.average}</Text>
                                    <StarRow rating={summary.average} size={16} color="#FFB300" />
                                    <Text style={styles.ratingBigSub}>{summary.count} reviews</Text>
                                </View>

                                {/* Right: Distribution bars */}
                                <View style={styles.ratingBars}>
                                    {ratingDistribution.map((item) => (
                                        <View key={item.stars} style={styles.barRow}>
                                            <Text style={styles.barLabel}>{item.stars}</Text>
                                            <View style={styles.barTrack}>
                                                <View
                                                    style={[
                                                        styles.barFill,
                                                        { width: `${item.percent}%` },
                                                    ]}
                                                />
                                            </View>
                                            <Text style={styles.barPercent}>{item.percent}%</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </View>

                        {/* ── Filter Chips ── */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.filterRow}
                        >
                            {filters.map((f) => {
                                const isActive = f === activeFilter;
                                return (
                                    <TouchableOpacity
                                        key={f}
                                        style={[
                                            styles.filterChip,
                                            isActive && styles.filterChipActive,
                                        ]}
                                        onPress={() => setActiveFilter(f)}
                                    >
                                        <Text
                                            style={[
                                                styles.filterChipText,
                                                isActive && styles.filterChipTextActive,
                                            ]}
                                        >
                                            {f}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        {/* ── Section Label ── */}
                        <Text style={styles.recentLabel}>Recent Reviews</Text>

                        {/* ── Review Cards ── */}
                        {filteredReviews.length === 0 ? (
                            <View style={{ padding: 40, alignItems: 'center' }}>
                                <MaterialIcons name="rate-review" size={48} color={Colors.gray200} />
                                <Text style={{ color: Colors.textMuted, marginTop: 12 }}>No reviews for this filter yet.</Text>
                            </View>
                        ) : filteredReviews.map((review) => (
                            <ReviewCard
                                key={review.id}
                                review={review}
                                showProductName={!!vendorId}
                                currentUserId={user?.id}
                                onEdit={(rev) => {
                                    navigation.navigate('WriteReview', {
                                        product: product || rev.product,
                                        existingReview: rev
                                    });
                                }}
                                onDelete={(rev) => {
                                    Alert.alert(
                                        'Delete Review',
                                        'Are you sure you want to delete this review?',
                                        [
                                            { text: 'Cancel', style: 'cancel' },
                                            {
                                                text: 'Delete',
                                                style: 'destructive',
                                                onPress: async () => {
                                                    const { error } = await reviewService.deleteReview(rev.id);
                                                    if (!error) {
                                                        setReviews(prev => prev.filter(r => r.id !== rev.id));
                                                        // Also re-fetch the summary so ratings update
                                                        fetchData();
                                                    } else {
                                                        Alert.alert('Error', 'Failed to delete review.');
                                                    }
                                                }
                                            }
                                        ]
                                    );
                                }}
                            />
                        ))}
                    </ScrollView>
                )}
            </SafeAreaView>
        </View>
    );
}

// ── Styles ──────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.backgroundLight },

    /* Header */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray100,
    },
    headerBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.textMain,
    },

    /* Rating Summary */
    summarySection: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 8,
    },
    summaryRow: {
        flexDirection: 'row',
        gap: 20,
    },
    ratingBig: {
        alignItems: 'center',
        minWidth: 80,
    },
    ratingBigNum: {
        fontSize: 38,
        fontWeight: '700',
        color: Colors.textMain,
    },
    ratingBigSub: {
        fontSize: 12,
        color: Colors.textMuted,
        marginTop: 4,
    },
    ratingBars: {
        flex: 1,
        justifyContent: 'center',
        gap: 6,
    },
    barRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    barLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.textMuted,
        width: 10,
        textAlign: 'right',
    },
    barTrack: {
        flex: 1,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.gray100,
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        borderRadius: 4,
        backgroundColor: Colors.primary,
    },
    barPercent: {
        fontSize: 11,
        color: Colors.textMuted,
        width: 30,
        textAlign: 'right',
    },

    /* Filter Chips */
    filterRow: {
        paddingHorizontal: 20,
        paddingVertical: 14,
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    filterChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    filterChipTextActive: {
        color: Colors.white,
    },

    /* Section Label */
    recentLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.textMain,
        paddingHorizontal: 20,
        marginTop: 4,
        marginBottom: 4,
    },

    /* Review Card */
    reviewCard: {
        marginHorizontal: 20,
        marginTop: 12,
        padding: 16,
        backgroundColor: Colors.white,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.gray100,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    reviewTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    reviewerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.primary + '20', // Light primary background
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitial: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.primary,
    },
    reviewerName: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.textMain,
    },
    reviewTime: {
        fontSize: 12,
        color: Colors.textMuted,
        marginTop: 1,
    },
    reviewText: {
        fontSize: 13,
        lineHeight: 20,
        color: Colors.textSecondary,
        marginTop: 8,
    },
    reviewActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginTop: 12,
    },
    productBadge: {
        backgroundColor: Colors.gray100,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    productBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    actionCount: {
        fontSize: 13,
        color: Colors.gray500,
        fontWeight: '600',
    },
    editBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: 'rgba(46,125,50,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(46,125,50,0.15)',
    },
    editBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.primary,
    },
    deleteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: '#fef2f2',
        borderWidth: 1,
        borderColor: '#fecaca',
    },
});
