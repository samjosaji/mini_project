import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    Image, KeyboardAvoidingView, Platform, ScrollView, Switch, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../theme';
import { reviewService } from '../../services/reviewService';
import { useAuth } from '../../contexts/AuthContext';

export default function WriteReviewScreen({ navigation, route }) {
    const product = route.params?.product || {
        name: "Mama Chen's Noodles",
        description: "Spicy Beef Ramen",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuD-VZDP85Oe_P4UNCATcdmvkCOdzBmF7_Oy9Rt-EyjA85eMAcsz2lthke3IS-t85Xw78ozRTXTtH1FLneCa0KOf4WELRQIRGMkO16GVBFRy9OBjNYq1MH0kFtzejDsuV0tjahahZz-aWpmfNQ2S7_F1KVu_kRwqv1njXAVZw9nNjCEV6l15ldFtjArvhztAQP-nswXrb-7asn8fWnNkcDs64sXNnlqZxW8QDZFpJfESYvKDwKcQr4qUT5dXrhHIX6VJqsohe0G23lH_"
    };

    const existingReview = route.params?.existingReview;
    const isEditing = !!existingReview;

    const { user } = useAuth();
    const [rating, setRating] = useState(existingReview?.rating || 4);
    const [reviewText, setReviewText] = useState(existingReview?.comment || '');
    const [loading, setLoading] = useState(false);

    const getRatingText = () => {
        switch (rating) {
            case 1: return 'Terrible';
            case 2: return 'Bad';
            case 3: return 'Okay';
            case 4: return 'Good';
            case 5: return 'Excellent';
            default: return '';
        }
    };

    const handleSubmit = async () => {
        if (!user) {
            alert('Please login to submit a review');
            return;
        }

        if (!reviewText.trim()) {
            alert('Please write a comment for your review');
            return;
        }

        setLoading(true);
        try {
            if (isEditing) {
                const { error } = await reviewService.updateReview(existingReview.id, {
                    rating,
                    comment: reviewText.trim()
                });
                if (error) throw error;
                alert('Your review has been updated!');
            } else {
                const { error } = await reviewService.addReview({
                    product_id: product.id,
                    customer_id: user.id,
                    rating,
                    comment: reviewText.trim()
                });
                if (error) throw error;
                alert('Thank you! Your review has been submitted.');
            }
            navigation.goBack();
        } catch (error) {
            alert('Error ' + (isEditing ? 'updating' : 'submitting') + ' review: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <MaterialIcons name="arrow-back" size={24} color={Colors.textMain} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isEditing ? 'Edit Review' : 'Write a Review'}</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* Product Info Snippet */}
                    <View style={styles.productSnippet}>
                        <View style={styles.productImageContainer}>
                            <Image source={{ uri: product.image }} style={styles.productImage} />
                        </View>
                        <View style={styles.productDetails}>
                            <Text style={styles.productName}>{product.name}</Text>
                            <Text style={styles.productDesc}>{product.description || product.vendor || ''}</Text>
                        </View>
                    </View>

                    {/* Rating Section */}
                    <View style={styles.ratingSection}>
                        <Text style={styles.ratingTitle}>How was your meal?</Text>
                        <Text style={styles.ratingSubtitle}>Tap the stars to rate your experience</Text>

                        <View style={styles.starsContainer}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <TouchableOpacity
                                    key={star}
                                    onPress={() => setRating(star)}
                                    activeOpacity={0.7}
                                    style={styles.starButton}
                                >
                                    <MaterialIcons
                                        name="star"
                                        size={44}
                                        color={star <= rating ? Colors.primary : Colors.gray300}
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>
                        <Text style={styles.ratingLabel}>{getRatingText()}</Text>
                    </View>

                    {/* Review Text Area */}
                    <View style={styles.inputSection}>
                        <Text style={styles.sectionLabel}>Your Review</Text>
                        <View style={styles.textAreaContainer}>
                            <TextInput
                                style={styles.textArea}
                                placeholder="Tell us about the taste, portion size, or service..."
                                placeholderTextColor={Colors.gray400}
                                multiline
                                maxLength={500}
                                value={reviewText}
                                onChangeText={setReviewText}
                                textAlignVertical="top"
                            />
                            <Text style={styles.charCount}>{reviewText.length}/500</Text>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Bottom Submit Button */}
            <View style={styles.bottomBar}>
                <TouchableOpacity
                    style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    <Text style={styles.submitBtnText}>{loading ? (isEditing ? 'Updating...' : 'Submitting...') : (isEditing ? 'Update Review' : 'Submit Review')}</Text>
                    {loading ? (
                        <ActivityIndicator size="small" color={Colors.white} />
                    ) : (
                        <MaterialIcons name="send" size={18} color={Colors.white} />
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray100,
        backgroundColor: Colors.white,
    },
    backButton: {
        padding: 4,
        marginLeft: -4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.textMain,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    productSnippet: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray100,
        gap: 16,
    },
    productImageContainer: {
        width: 64,
        height: 64,
        borderRadius: 12,
        backgroundColor: Colors.gray200,
        overflow: 'hidden',
    },
    productImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    productDetails: {
        flex: 1,
    },
    productName: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.textMain,
        marginBottom: 4,
    },
    productDesc: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    ratingSection: {
        alignItems: 'center',
        paddingVertical: 32,
        paddingHorizontal: 20,
    },
    ratingTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.textMain,
        marginBottom: 8,
    },
    ratingSubtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginBottom: 24,
    },
    starsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    starButton: {
        padding: 4,
    },
    ratingLabel: {
        marginTop: 16,
        fontSize: 18,
        fontWeight: '600',
        color: Colors.primary,
    },
    inputSection: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textMain,
        marginBottom: 12,
    },
    textAreaContainer: {
        position: 'relative',
    },
    textArea: {
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        padding: 16,
        minHeight: 140,
        fontSize: 16,
        color: Colors.textMain,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    charCount: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        fontSize: 12,
        color: Colors.gray400,
        fontWeight: '500',
    },
    photosScroll: {
        flexDirection: 'row',
    },
    addPhotoBtn: {
        width: 96,
        height: 96,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: Colors.gray300,
        borderStyle: 'dashed',
        backgroundColor: '#f8fafc',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        gap: 4,
    },
    addPhotoText: {
        fontSize: 12,
        fontWeight: '500',
        color: Colors.primary,
    },
    photoPreview: {
        width: 96,
        height: 96,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
        marginRight: 12,
    },
    previewImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    removePhotoBtn: {
        position: 'absolute',
        top: 6,
        right: 6,
        backgroundColor: 'rgba(0,0,0,0.5)',
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    recommendSection: {
        paddingHorizontal: 20,
        marginBottom: 32,
    },
    recommendCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#f8fafc',
        borderRadius: 16,
    },
    recommendLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    thumbIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(20, 184, 75, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    recommendTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textMain,
    },
    recommendSubtitle: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    bottomBar: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: Platform.OS === 'ios' ? 0 : 16,
        backgroundColor: Colors.white,
        borderTopWidth: 1,
        borderTopColor: Colors.gray100,
    },
    submitBtn: {
        flexDirection: 'row',
        backgroundColor: Colors.primary,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    submitBtnText: {
        color: Colors.white,
        fontSize: 16,
        fontWeight: '700',
    },
});
