import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
    Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../theme';
import InputField from '../../components/InputField';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { vendorService } from '../../services/vendorService';
import { storageService } from '../../services/storageService';

export default function VendorProfileScreen({ navigation }) {
    const { user } = useAuth();

    const [fullName, setFullName] = useState('');

    // Strip numbers from name input
    const handleFullNameChange = (text) => setFullName(text.replace(/[0-9]/g, ''));
    const [shopName, setShopName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [description, setDescription] = useState('');
    const [address, setAddress] = useState('');
    const [images, setImages] = useState([]); // Array of strings (URIs or URLs)
    const [joinedYear, setJoinedYear] = useState('');
    const [rating, setRating] = useState(0);
    const [reviewsCount, setReviewsCount] = useState(0);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (user) fetchProfileData();
    }, [user]);

    const fetchProfileData = async () => {
        setLoading(true);
        try {
            // Fetch user data
            const { data: userData } = await supabase
                .from('users')
                .select('first_name, last_name, email, created_at')
                .eq('id', user.id)
                .single();

            // Fetch vendor data
            const { data: vendorData } = await vendorService.getVendorById(user.id);

            if (userData) {
                setFullName(`${userData.first_name || ''} ${userData.last_name || ''}`.trim());
                setEmail(userData.email || '');
                if (userData.created_at) {
                    setJoinedYear(new Date(userData.created_at).getFullYear().toString());
                }
            }

            if (vendorData) {
                setShopName(vendorData.shop_name || '');
                setDescription(vendorData.description || '');
                setPhone(vendorData.phone || '');
                setAddress(vendorData.address || '');
                // Load existing images if available
                let existingImages = [];
                if (vendorData.image_urls && Array.isArray(vendorData.image_urls) && vendorData.image_urls.length > 0) {
                    existingImages = [...vendorData.image_urls];
                } else if (vendorData.cover_image_url) {
                    existingImages = [vendorData.cover_image_url];
                }
                setImages(existingImages);
                setRating(vendorData.rating || 0);
                setReviewsCount(vendorData.reviews_count || 0);
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
        }
        setLoading(false);
    };

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
        if (!fullName.trim() || !shopName.trim()) {
            Alert.alert('Missing Fields', 'Please fill out your name and shop name.');
            return;
        }

        if (/[0-9]/.test(fullName)) {
            Alert.alert('Invalid Name', 'Name should not contain numbers.');
            return;
        }

        setSaving(true);
        try {
            const nameParts = fullName.trim().split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';

            // Upload any new images
            const uploadedUrls = await Promise.all(
                images.map(async (imgUri, index) => {
                    if (imgUri.startsWith('file://')) {
                        const { url, error: uploadError } = await storageService.uploadImage(
                            imgUri,
                            'vendor-assets',
                            `covers/${user.id}_${Date.now()}_${index}`
                        );
                        if (uploadError) throw new Error('Failed to upload an image.');
                        return url;
                    }
                    return imgUri; // Already a cloud URL
                })
            );

            setImages(uploadedUrls);

            // Update users table
            await supabase
                .from('users')
                .update({ first_name: firstName, last_name: lastName })
                .eq('id', user.id);

            // Update vendors table
            await vendorService.updateVendorStatus(user.id, {
                shop_name: shopName,
                description: description || null,
                address: address || null,
                phone: phone || null,
                cover_image_url: uploadedUrls.length > 0 ? uploadedUrls[0] : null,
                image_urls: uploadedUrls,
            });

            Alert.alert('Success', 'Profile updated successfully!');
        } catch (err) {
            Alert.alert('Error', 'Failed to update profile.');
            console.error('Error saving profile:', err);
        }
        setSaving(false);
    };

    const handleLogout = async () => {
        Alert.alert('Log Out', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Log Out',
                style: 'destructive',
                onPress: async () => {
                    await supabase.auth.signOut();
                    // AuthContext will automatically handle the navigation reset
                },
            },
        ]);
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.headerBar}>
                <View style={{ width: 40 }} />
                <Text style={styles.headerTitle}>Profile</Text>
                <TouchableOpacity onPress={handleSave} disabled={saving}>
                    <Text style={[styles.saveBtn, saving && { opacity: 0.5 }]}>
                        {saving ? 'Saving...' : 'Save'}
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Profile Section */}
                <View style={styles.profileSection}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageScroll}>
                        {images.map((imgUri, index) => (
                            <View key={index} style={styles.avatarWrap}>
                                <Image source={{ uri: imgUri }} style={[styles.avatar, { borderRadius: 12 }]} />
                                <TouchableOpacity
                                    style={styles.removeImgBtn}
                                    onPress={() => removeImage(index)}
                                >
                                    <MaterialIcons name="close" size={16} color={Colors.white} />
                                </TouchableOpacity>
                            </View>
                        ))}

                        {images.length < 3 && (
                            <TouchableOpacity style={[styles.avatarWrap, styles.addAvatarWrap]} onPress={pickImages} activeOpacity={0.8}>
                                <View style={[styles.avatar, styles.avatarPlaceholder, { borderRadius: 12 }]}>
                                    <MaterialIcons name="add-photo-alternate" size={32} color={Colors.primary} />
                                </View>
                                {images.length === 0 && (
                                    <Text style={styles.addFirstPhotoText}>Add Photo</Text>
                                )}
                            </TouchableOpacity>
                        )}
                    </ScrollView>
                    <Text style={styles.profileName}>{shopName || 'My Shop'}</Text>
                    <Text style={styles.profileSub}>
                        {joinedYear ? `Vendor since ${joinedYear}` : 'Vendor'}
                    </Text>
                </View>

                {/* Personal Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>PERSONAL INFORMATION</Text>
                    <InputField label="Full Name" value={fullName} onChangeText={handleFullNameChange} icon="person" />
                    <InputField label="Shop Name" value={shopName} onChangeText={setShopName} icon="storefront" />
                    <InputField
                        label="Email Address"
                        value={email}
                        onChangeText={setEmail}
                        icon="email"
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                    <InputField label="Address" value={address} onChangeText={setAddress} icon="location-on" />
                    <InputField
                        label="Phone Number"
                        value={phone}
                        onChangeText={setPhone}
                        icon="phone"
                        keyboardType="phone-pad"
                    />
                    <InputField label="Description" value={description} onChangeText={setDescription} icon="description" />
                </View>

                {/* Security */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>SECURITY</Text>
                    <View style={styles.securityRow}>
                        <View>
                            <Text style={styles.securityTitle}>Password</Text>
                            <Text style={styles.securitySub}>Change your account password</Text>
                        </View>
                        <TouchableOpacity style={styles.updateBtn} onPress={() => navigation.getParent()?.navigate('ChangePassword')}>
                            <Text style={styles.updateBtnText}>Update</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Customer Reviews */}
                <TouchableOpacity
                    style={styles.section}
                    onPress={() => navigation.navigate('AllReviews', { vendorId: user.id })}
                >
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionLabel}>CUSTOMER REVIEWS</Text>
                        <MaterialIcons name="chevron-right" size={20} color={Colors.gray400} />
                    </View>

                    {/* Rating Summary */}
                    <View style={styles.ratingSummary}>
                        <View style={styles.ratingBig}>
                            <Text style={styles.ratingNum}>{Number(rating).toFixed(1)}</Text>
                            <View style={styles.starsRow}>
                                {[1, 2, 3, 4, 5].map(i => (
                                    <MaterialIcons
                                        key={i}
                                        name={i <= Math.round(rating) ? 'star' : 'star-border'}
                                        size={16}
                                        color={i <= Math.round(rating) ? '#f59e0b' : Colors.gray300}
                                    />
                                ))}
                            </View>
                            <Text style={styles.reviewCount}>{reviewsCount} review{reviewsCount !== 1 ? 's' : ''}</Text>
                        </View>
                    </View>

                    {reviewsCount === 0 ? (
                        <View style={styles.emptyReviews}>
                            <MaterialIcons name="rate-review" size={40} color={Colors.gray300} />
                            <Text style={styles.emptyReviewsTitle}>No reviews yet</Text>
                            <Text style={styles.emptyReviewsText}>
                                When customers leave reviews, they will appear here.
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.emptyReviews}>
                            <MaterialIcons name="reviews" size={40} color={Colors.primary} />
                            <Text style={styles.emptyReviewsTitle}>{reviewsCount} review{reviewsCount !== 1 ? 's' : ''} received</Text>
                            <Text style={styles.emptyReviewsText}>
                                Click to view what your customers are saying!
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* Logout */}
                <View style={styles.logoutSection}>
                    <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                        <MaterialIcons name="logout" size={22} color="#dc2626" />
                        <Text style={styles.logoutText}>Log Out</Text>
                    </TouchableOpacity>
                </View>
                <View style={{ height: 100 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fcf9' },
    headerBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 16, backgroundColor: Colors.white,
        borderBottomWidth: 1, borderBottomColor: Colors.borderDefault,
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textMain },
    saveBtn: { fontSize: 16, fontWeight: '700', color: Colors.primary },
    profileSection: {
        alignItems: 'center', paddingTop: 24, paddingBottom: 24,
        backgroundColor: Colors.white, marginBottom: 16,
    },
    imageScroll: { paddingHorizontal: 16, gap: 12 },
    avatarWrap: { position: 'relative', width: 100, height: 100 },
    addAvatarWrap: { alignItems: 'center', justifyContent: 'center' },
    avatar: { width: 100, height: 100, borderWidth: 1, borderColor: Colors.gray200 },
    avatarPlaceholder: {
        backgroundColor: 'rgba(22,163,74,0.1)',
        alignItems: 'center', justifyContent: 'center',
        borderStyle: 'dashed', borderWidth: 2, borderColor: Colors.primary,
    },
    removeImgBtn: {
        position: 'absolute', top: -6, right: -6,
        width: 24, height: 24, borderRadius: 12, backgroundColor: '#ef4444',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: Colors.white,
    },
    addFirstPhotoText: { position: 'absolute', bottom: 12, fontSize: 12, fontWeight: '600', color: Colors.primary },
    profileName: { fontSize: 20, fontWeight: '700', color: Colors.textMain, marginTop: 12 },
    profileSub: { fontSize: 14, color: Colors.gray500, marginTop: 4 },
    section: { backgroundColor: Colors.white, paddingHorizontal: 16, paddingVertical: 24, marginBottom: 16 },
    sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.primary, letterSpacing: 1.5, marginBottom: 16 },
    securityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
    securityTitle: { fontSize: 16, fontWeight: '500', color: Colors.textMain },
    securitySub: { fontSize: 12, color: Colors.gray500, marginTop: 2 },
    updateBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(22,163,74,0.1)' },
    updateBtnText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    ratingSummary: {
        alignItems: 'center', paddingVertical: 16, marginBottom: 16,
        borderRadius: 12, backgroundColor: '#f8fcf9', borderWidth: 1, borderColor: Colors.borderDefault,
    },
    ratingBig: { alignItems: 'center' },
    ratingNum: { fontSize: 36, fontWeight: '700', color: Colors.textMain },
    starsRow: { flexDirection: 'row', gap: 2, marginTop: 4 },
    reviewCount: { fontSize: 13, color: Colors.gray500, marginTop: 4, fontWeight: '500' },
    emptyReviews: {
        alignItems: 'center', paddingVertical: 24,
        borderRadius: 12, backgroundColor: '#f8fcf9', borderWidth: 1, borderColor: Colors.borderDefault,
    },
    emptyReviewsTitle: { fontSize: 15, fontWeight: '700', color: Colors.textMain, marginTop: 12 },
    emptyReviewsText: { fontSize: 13, color: Colors.gray500, marginTop: 4, textAlign: 'center', paddingHorizontal: 24 },
    logoutSection: { paddingHorizontal: 16, paddingVertical: 24 },
    logoutBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#fecaca', backgroundColor: Colors.white,
    },
    logoutText: { fontSize: 16, fontWeight: '700', color: '#dc2626' },
});
