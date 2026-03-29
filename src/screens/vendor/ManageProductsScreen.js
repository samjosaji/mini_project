import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../theme';
import { productService } from '../../services/productService';
import { useAuth } from '../../contexts/AuthContext';

export default function ManageProductsScreen({ navigation }) {
    const { user } = useAuth();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            fetchProducts();
        }, [user])
    );

    const fetchProducts = async () => {
        setLoading(true);
        if (user) {
            const { data, error } = await productService.getProductsByVendor(user.id);
            if (!error && data) {
                setProducts(data);
            }
        }
        setLoading(false);
    };

    const handleDelete = (productId) => {
        Alert.alert(
            "Delete Product",
            "Are you sure you want to delete this product?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        const { success } = await productService.deleteProduct(productId);
                        if (success) {
                            fetchProducts(); // Refresh list after deletion
                        } else {
                            Alert.alert('Error', 'Could not delete product.');
                        }
                    }
                }
            ]
        );
    };

    const handleAddProduct = () => {
        navigation.navigate('AddProduct');
    };

    const handleEditProduct = (product) => {
        navigation.navigate('AddProduct', { product });
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Products</Text>
                <TouchableOpacity style={styles.addBtn} onPress={handleAddProduct}>
                    <MaterialIcons name="add" size={20} color={Colors.white} />
                    <Text style={styles.addBtnText}>Add</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : products.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <MaterialIcons name="inventory-2" size={48} color={Colors.gray200} />
                    <Text style={styles.emptyText}>You haven't added any products yet.</Text>
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
                    {products.map((p) => (
                        <TouchableOpacity key={p.id} style={styles.card} activeOpacity={0.8}>
                            {p.image_url ? (
                                <Image source={{ uri: p.image_url }} style={styles.productImage} />
                            ) : (
                                <View style={styles.productImagePlaceholder}>
                                    <MaterialIcons name="fastfood" size={24} color={Colors.gray400} />
                                </View>
                            )}

                            <View style={styles.productInfo}>
                                <Text style={styles.productName}>{p.name}</Text>
                                <Text style={styles.productPrice}>₹{Number(p.price).toFixed(2)}</Text>
                                <View style={[styles.stockBadge, !p.is_available && styles.lowStockBadge]}>
                                    <Text style={[styles.stockText, !p.is_available && styles.lowStockText]}>
                                        {p.is_available ? (p.stock ? `${p.stock} in stock` : 'In Stock') : 'Out of Stock'}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.actions}>
                                <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('AllReviews', { product: p })}>
                                    <MaterialIcons name="rate-review" size={18} color={Colors.primary} />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.actionBtn} onPress={() => handleEditProduct(p)}>
                                    <MaterialIcons name="edit" size={18} color={Colors.gray500} />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(p.id)}>
                                    <MaterialIcons name="delete-outline" size={18} color="#ef4444" />
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    ))}
                    <View style={{ height: 100 }} />
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fcf9' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
        borderBottomWidth: 1, borderBottomColor: Colors.gray100, backgroundColor: Colors.white,
    },
    title: { fontSize: 20, fontWeight: '700', color: Colors.textMain },
    addBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    },
    addBtnText: { fontSize: 13, fontWeight: '700', color: Colors.white },
    list: { padding: 20 },
    card: {
        flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12,
        backgroundColor: Colors.white, marginBottom: 12, borderWidth: 1, borderColor: Colors.gray100,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3,
    },
    productImage: { width: 64, height: 64, borderRadius: 10, backgroundColor: Colors.gray200 },
    productImagePlaceholder: { width: 64, height: 64, borderRadius: 10, backgroundColor: Colors.gray100, alignItems: 'center', justifyContent: 'center' },
    productInfo: { flex: 1, marginLeft: 12 },
    productName: { fontSize: 15, fontWeight: '700', color: Colors.textMain },
    productPrice: { fontSize: 13, fontWeight: '600', color: Colors.primary, marginTop: 2 },
    stockBadge: {
        alignSelf: 'flex-start', marginTop: 4,
        paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
        backgroundColor: '#dcfce7',
    },
    lowStockBadge: { backgroundColor: '#fef3c7' },
    stockText: { fontSize: 10, fontWeight: '700', color: '#15803d' },
    lowStockText: { color: '#d97706' },
    actions: { gap: 8 },
    actionBtn: {
        width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.gray50,
        alignItems: 'center', justifyContent: 'center',
    },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    emptyText: { marginTop: 16, fontSize: 16, color: Colors.gray500, textAlign: 'center' },
});

