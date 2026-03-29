import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Image, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, BorderRadius } from '../../theme';
import { notificationService } from '../../services/notificationService';
import { useAuth } from '../../contexts/AuthContext';

export default function FeaturedAllScreen({ navigation, route }) {
    const { user } = useAuth();
    const { items: initialItems = [], category = '' } = route.params || {};
    const [favoriteProductIds, setFavoriteProductIds] = React.useState(new Set());

    React.useEffect(() => {
        if (user) {
            fetchFavorites();
        }
    }, [user]);

    const fetchFavorites = async () => {
        const { data } = await notificationService.getFavoriteProducts(user.id);
        if (data) {
            setFavoriteProductIds(new Set(data.map(p => p.id)));
        }
    };

    const handleToggleFavorite = async (product) => {
        if (!user) return;

        try {
            const isFav = favoriteProductIds.has(product.id);
            const newFavs = new Set(favoriteProductIds);

            if (isFav) {
                newFavs.delete(product.id);
                setFavoriteProductIds(newFavs);
                await notificationService.removeFavorite(user.id, product.vendor_id, product.id);
            } else {
                newFavs.add(product.id);
                setFavoriteProductIds(newFavs);
                await notificationService.addFavorite(user.id, product.vendor_id, product.id);
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
        }
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('ProductDetail', { product: item })}
        >
            <View style={styles.imageWrap}>
                <Image source={{ uri: item.image_url || item.image }} style={styles.image} />
                <View style={styles.priceTag}>
                    <Text style={styles.priceTagText}>₹{Number(item.price).toFixed(2)}</Text>
                </View>
                <TouchableOpacity
                    style={[styles.heartBtn, favoriteProductIds.has(item.id) && styles.heartBtnActive]}
                    onPress={() => handleToggleFavorite(item)}
                    activeOpacity={0.7}
                >
                    <MaterialIcons
                        name={favoriteProductIds.has(item.id) ? "favorite" : "favorite-border"}
                        size={18}
                        color={favoriteProductIds.has(item.id) ? '#e53935' : Colors.white}
                    />
                </TouchableOpacity>
            </View>
            <View style={styles.info}>
                <View style={styles.topRow}>
                    <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                    <View style={styles.ratingBadge}>
                        <MaterialIcons name="star" size={12} color={Colors.primary} />
                        <Text style={styles.ratingText}>{item.rating}</Text>
                    </View>
                </View>
                <View style={styles.vendorRow}>
                    <MaterialIcons name="store" size={14} color={Colors.textMuted} />
                    <Text style={styles.vendorText}>{item.vendors?.shop_name || item.vendor}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <MaterialIcons name="arrow-back" size={24} color={Colors.textMain} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Featured Today</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Category badge */}
            {category ? (
                <View style={styles.categoryBadgeRow}>
                    <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                        </Text>
                    </View>
                    <Text style={styles.resultCount}>{initialItems.length} items</Text>
                </View>
            ) : null}

            <FlatList
                data={initialItems}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                numColumns={2}
                columnWrapperStyle={styles.gridRow}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyWrap}>
                        <MaterialIcons name="inbox" size={48} color={Colors.gray300} />
                        <Text style={styles.emptyText}>No featured items found</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.backgroundLight },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
        borderWidth: 1, borderColor: Colors.gray100,
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textMain },
    categoryBadgeRow: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingHorizontal: 20, paddingBottom: 12,
    },
    categoryBadge: {
        backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 14,
    },
    categoryBadgeText: { fontSize: 12, fontWeight: '700', color: Colors.white },
    resultCount: { fontSize: 13, color: Colors.textMuted, fontWeight: '500' },
    listContent: { paddingHorizontal: 12, paddingBottom: 100 },
    gridRow: { justifyContent: 'space-between', marginBottom: 12 },
    card: {
        width: '48%', borderRadius: 16, overflow: 'hidden',
        backgroundColor: Colors.white,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6,
        borderWidth: 1, borderColor: Colors.gray100,
    },
    imageWrap: { height: 130, backgroundColor: Colors.gray200, position: 'relative' },
    image: { width: '100%', height: '100%', resizeMode: 'cover' },
    priceTag: {
        position: 'absolute', top: 8, right: 8,
        backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 8, paddingVertical: 4,
        borderRadius: 8, borderWidth: 1, borderColor: 'rgba(46,125,50,0.2)',
    },
    priceTagText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
    heartBtn: {
        position: 'absolute', top: 8, left: 8,
        padding: 5, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.25)',
        alignItems: 'center', justifyContent: 'center',
    },
    heartBtnActive: {
        backgroundColor: 'rgba(255,255,255,0.9)',
    },
    info: { padding: 10 },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    name: { fontSize: 14, fontWeight: '700', color: Colors.textMain, flex: 1, marginRight: 6 },
    ratingBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 2,
        backgroundColor: 'rgba(46,125,50,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
    },
    ratingText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
    vendorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    vendorText: { fontSize: 12, color: Colors.textMuted },
    emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
    emptyText: { fontSize: 15, color: Colors.textMuted, marginTop: 12 },
});
