import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
    Image, Switch, Modal, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { productService } from '../../services/productService';
import { vendorService } from '../../services/vendorService';
import { storageService } from '../../services/storageService';
import { adminService } from '../../services/adminService';

const DEFAULT_CATEGORIES = ['Food', 'Craft', 'Vegetables', 'Fruits'];

export default function AddProductScreen({ route, navigation }) {
    const { user } = useAuth();

    const product = route.params?.product;
    const isEditing = !!product;

    const [images, setImages] = useState([]); // Array of URIs or URLs
    const [name, setName] = useState(product?.name || '');
    const [description, setDescription] = useState(product?.description || '');
    const [category, setCategory] = useState(product?.category || '');
    const [price, setPrice] = useState(product?.price ? product.price.toString() : '');
    const [stock, setStock] = useState(product?.stock ? product.stock.toString() : '');
    const [inStock, setInStock] = useState(product?.is_available ?? true);

    const [loading, setLoading] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [dynamicCategories, setDynamicCategories] = useState(DEFAULT_CATEGORIES);

    // Fetch the admin-controlled categories from DB so vendors see updated lists
    React.useEffect(() => {
        const fetchCategories = async () => {
            try {
                const { data } = await adminService.getCategories();
                if (data && data.length > 0) {
                    const activeNames = data.map(c => c.name);
                    setDynamicCategories([...new Set(activeNames)]);
                }
            } catch (e) {
                console.error('Error loading dynamic categories for vendor:', e);
            }
        };
        fetchCategories();
    }, []);

    // Initialize images on mount if editing
    React.useEffect(() => {
        if (isEditing && product) {
            let existingImages = [];
            if (product.image_urls && Array.isArray(product.image_urls) && product.image_urls.length > 0) {
                existingImages = [...product.image_urls];
            } else if (product.image_url) {
                existingImages = [product.image_url];
            }
            setImages(existingImages);
        }
    }, [isEditing, product]);

    const pickImages = async () => {
        if (images.length >= 3) {
            Alert.alert('Limit Reached', 'You can only upload up to 3 images.');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            selectionLimit: 3 - images.length,
            quality: 0.8,
        });

        if (!result.canceled) {
            const newUris = result.assets.map(a => a.uri);
            setImages(prev => [...prev, ...newUris].slice(0, 3));
        }
    };

    const removeImage = (indexToRemove) => {
        setImages(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleSave = async () => {
        if (!name || !price || !category) {
            Alert.alert('Missing Fields', 'Please fill out all required fields.');
            return;
        }

        setLoading(true);

        // Upload any new images
        let uploadedUrls = [];
        try {
            uploadedUrls = await Promise.all(
                images.map(async (imgUri, index) => {
                    if (imgUri.startsWith('file://')) {
                        const { url, error: uploadError } = await storageService.uploadImage(
                            imgUri,
                            'vendor-assets',
                            `products/${user?.id}_${Date.now()}_${index}`
                        );
                        if (uploadError) throw new Error('Failed to upload an image.');
                        return url;
                    }
                    return imgUri; // Already a cloud URL
                })
            );
        } catch (error) {
            setLoading(false);
            Alert.alert('Upload Error', 'Failed to upload product images. Please try again.');
            return;
        }

        const productData = {
            vendor_id: user?.id,
            name,
            description,
            category,
            price: parseFloat(price),
            stock: stock ? parseInt(stock) : null,
            is_available: inStock,
            image_url: uploadedUrls.length > 0 ? uploadedUrls[0] : null,
            image_urls: uploadedUrls,
        };

        if (isEditing) {
            const { error } = await productService.updateProduct(product.id, productData);
            setLoading(false);
            if (error) {
                Alert.alert('Error', error.message || 'Failed to update product');
            } else {
                navigation.goBack();
            }
        } else {
            const { data: newProduct, error } = await productService.addProduct(productData);
            setLoading(false);
            if (error) {
                Alert.alert('Error', error.message || 'Failed to add product');
            } else {
                // Send notifications to favorited customers
                const { data: vendorData } = await vendorService.getVendorById(user.id);
                notificationService.sendNewProductNotifications(
                    user.id,
                    name,
                    vendorData?.shop_name
                );
                navigation.goBack();
            }
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <MaterialIcons name="arrow-back" size={24} color={Colors.textMain} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isEditing ? 'Edit Product' : 'Add New Product'}</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Product Images section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Product Images (Max 3)</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imagesRow}>

                        {images.map((imgUri, index) => (
                            <View key={index} style={styles.imagePreviewWrap}>
                                <Image source={{ uri: imgUri }} style={styles.imagePreview} />
                                <TouchableOpacity style={styles.removePhotoBtn} onPress={() => removeImage(index)}>
                                    <MaterialIcons name="close" size={14} color={Colors.white} />
                                </TouchableOpacity>
                            </View>
                        ))}

                        {images.length < 3 && (
                            <TouchableOpacity style={styles.addPhotoBox} onPress={pickImages} activeOpacity={0.7}>
                                <View style={styles.iconCircle}>
                                    <MaterialIcons name="camera-alt" size={20} color={Colors.primary} />
                                </View>
                                <Text style={styles.addPhotoText}>Add Photo</Text>
                            </TouchableOpacity>
                        )}
                    </ScrollView>
                </View>

                {/* Product Name */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Product Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g., Spicy Tacos"
                        placeholderTextColor={Colors.gray400}
                        value={name}
                        onChangeText={setName}
                    />
                </View>

                {/* Product Description */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Product Description (Optional)</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Describe your product (ingredients, size, etc.)"
                        placeholderTextColor={Colors.gray400}
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />
                </View>

                {/* Category */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Category</Text>
                    <TouchableOpacity
                        style={styles.categoryInput}
                        activeOpacity={0.8}
                        onPress={() => setShowCategoryModal(true)}
                    >
                        <Text style={[styles.categoryText, !category && { color: Colors.gray400 }]}>
                            {category || 'Select Category'}
                        </Text>
                        <MaterialIcons name="keyboard-arrow-down" size={24} color={Colors.textMuted} />
                    </TouchableOpacity>
                </View>

                {/* Price */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Price</Text>
                    <View style={styles.priceInputWrap}>
                        <Text style={styles.rupeeSign}>₹</Text>
                        <TextInput
                            style={styles.priceInput}
                            placeholder="0.00"
                            placeholderTextColor={Colors.gray400}
                            keyboardType="numeric"
                            value={price}
                            onChangeText={setPrice}
                        />
                    </View>
                </View>
                {/* Stock Quantity */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Stock Quantity (Optional)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g., 50 (leave blank for unlimited)"
                        placeholderTextColor={Colors.gray400}
                        keyboardType="numeric"
                        value={stock}
                        onChangeText={setStock}
                    />
                </View>

                {/* In Stock Toggle */}
                <View style={styles.stockRow}>
                    <View>
                        <Text style={styles.sectionTitle}>In Stock</Text>
                        <Text style={styles.stockSub}>Available for customers to order</Text>
                    </View>
                    <Switch
                        value={inStock}
                        onValueChange={setInStock}
                        trackColor={{ false: Colors.gray200, true: Colors.primary }}
                        thumbColor={Colors.white}
                        ios_backgroundColor={Colors.gray200}
                    />
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Sticky Save Button */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.saveBtn, loading && styles.saveBtnLoading]}
                    activeOpacity={0.8}
                    onPress={handleSave}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color={Colors.white} />
                    ) : (
                        <>
                            <MaterialIcons name="check-circle" size={20} color={Colors.white} />
                            <Text style={styles.saveBtnText}>{isEditing ? 'Update Product' : 'Save Product'}</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {/* Category Select Modal */}
            <Modal
                visible={showCategoryModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowCategoryModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Category</Text>
                            <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                                <MaterialIcons name="close" size={24} color={Colors.textMain} />
                            </TouchableOpacity>
                        </View>
                        {dynamicCategories.map((cat) => (
                            <TouchableOpacity
                                key={cat}
                                style={styles.catOption}
                                onPress={() => {
                                    setCategory(cat);
                                    setShowCategoryModal(false);
                                }}
                            >
                                <Text style={[styles.catOptionText, category === cat && { color: Colors.primary, fontWeight: '700' }]}>
                                    {cat}
                                </Text>
                                {category === cat && <MaterialIcons name="check" size={20} color={Colors.primary} />}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </Modal>
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB', // Matches light background in design
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: Colors.white,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.textMain,
    },
    cancelText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.primary,
    },
    scrollContent: {
        padding: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '500',
        color: Colors.textMain,
        marginBottom: 10,
    },
    imagesRow: {
        flexDirection: 'row',
        gap: 12,
    },
    addPhotoBox: {
        width: 140,
        height: 140,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#D1D5DB', // light gray border
        borderStyle: 'dashed',
        backgroundColor: Colors.white,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#ECFDF5', // extremely light green
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    addPhotoText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.primary,
    },
    imagePreviewWrap: {
        width: 140,
        height: 140,
        borderRadius: 12,
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    imagePreview: {
        width: '100%',
        height: '100%',
        borderRadius: 12,
        resizeMode: 'cover',
    },
    removePhotoBtn: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    input: {
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 52,
        fontSize: 16,
        color: Colors.textMain,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 2,
        elevation: 1,
    },
    textArea: {
        height: 120,
        paddingTop: 12,
        paddingBottom: 12,
    },
    categoryInput: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 52,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 2,
        elevation: 1,
    },
    categoryText: {
        fontSize: 16,
        color: Colors.textMain,
    },
    priceInputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 52,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 2,
        elevation: 1,
    },
    rupeeSign: {
        fontSize: 16,
        color: Colors.textMuted,
        marginRight: 8,
        fontWeight: '500',
    },
    priceInput: {
        flex: 1,
        fontSize: 16,
        color: Colors.textMain,
        height: '100%',
    },
    stockRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.white,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 2,
        elevation: 1,
    },
    stockSub: {
        fontSize: 13,
        color: Colors.textMuted,
        marginTop: 2,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#F9FAFB',
        paddingHorizontal: 20,
        paddingBottom: 30, // SafeArea padding
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    saveBtn: {
        backgroundColor: Colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
        borderRadius: 28,
        gap: 8,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    saveBtnLoading: {
        opacity: 0.8,
    },
    saveBtnText: {
        color: Colors.white,
        fontSize: 16,
        fontWeight: '700',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.textMain,
    },
    catOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    catOptionText: {
        fontSize: 16,
        color: Colors.textMain,
    },
});
