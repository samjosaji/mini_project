import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { notificationService } from '../../services/notificationService';
import { vendorService } from '../../services/vendorService';

export default function SendOfferScreen({ navigation }) {
    const { user } = useAuth();
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);

    const handleSend = async () => {
        if (!message.trim()) {
            Alert.alert('Missing', 'Please enter a message for your offer notification.');
            return;
        }

        setSending(true);

        // Get the vendor's shop name
        const { data: vendorData } = await vendorService.getVendorById(user.id);
        const shopName = vendorData?.shop_name || 'Your favorite vendor';

        const { sent, error } = await notificationService.sendOfferNotification(
            user.id,
            shopName,
            title.trim() || `Offer from ${shopName}!`,
            message.trim()
        );

        setSending(false);

        if (error) {
            Alert.alert('Notice', error);
        } else {
            Alert.alert(
                'Sent!',
                `Notification sent to ${sent} customer${sent !== 1 ? 's' : ''} who favorited your shop.`,
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <MaterialIcons name="arrow-back" size={24} color={Colors.textMain} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Send Offer</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                {/* Info */}
                <View style={styles.infoCard}>
                    <MaterialIcons name="campaign" size={28} color={Colors.primary} />
                    <Text style={styles.infoText}>
                        Send a notification to all customers who have favorited your shop. Use this for special offers, discounts, or announcements!
                    </Text>
                </View>

                {/* Title */}
                <View style={styles.field}>
                    <Text style={styles.label}>Title (Optional)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g., 🔥 Weekend Special!"
                        placeholderTextColor={Colors.gray400}
                        value={title}
                        onChangeText={setTitle}
                        maxLength={60}
                    />
                    <Text style={styles.charCount}>{title.length}/60</Text>
                </View>

                {/* Message */}
                <View style={styles.field}>
                    <Text style={styles.label}>Message *</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="e.g., Get 20% off all items this weekend only! Visit us today."
                        placeholderTextColor={Colors.gray400}
                        value={message}
                        onChangeText={setMessage}
                        multiline
                        numberOfLines={4}
                        maxLength={200}
                        textAlignVertical="top"
                    />
                    <Text style={styles.charCount}>{message.length}/200</Text>
                </View>

                {/* Preview */}
                {message.trim() ? (
                    <View style={styles.previewSection}>
                        <Text style={styles.previewLabel}>PREVIEW</Text>
                        <View style={styles.previewCard}>
                            <View style={styles.previewIcon}>
                                <MaterialIcons name="local-offer" size={20} color="#f59e0b" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.previewTitle}>{title || 'Offer from your shop!'}</Text>
                                <Text style={styles.previewMessage}>{message}</Text>
                            </View>
                        </View>
                    </View>
                ) : null}

                {/* Send Button */}
                <TouchableOpacity
                    style={[styles.sendBtn, sending && { opacity: 0.6 }]}
                    onPress={handleSend}
                    disabled={sending}
                    activeOpacity={0.8}
                >
                    {sending ? (
                        <ActivityIndicator color={Colors.white} />
                    ) : (
                        <>
                            <MaterialIcons name="send" size={20} color={Colors.white} />
                            <Text style={styles.sendBtnText}>Send Notification</Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fcf9' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 16, backgroundColor: Colors.white,
        borderBottomWidth: 1, borderBottomColor: Colors.gray100,
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textMain },
    content: { padding: 20 },
    infoCard: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        padding: 16, borderRadius: 14, backgroundColor: '#f0fdf4',
        borderWidth: 1, borderColor: '#bbf7d0', marginBottom: 24,
    },
    infoText: { flex: 1, fontSize: 13, color: Colors.textMain, lineHeight: 18 },
    field: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '700', color: Colors.textMain, marginBottom: 8, marginLeft: 4 },
    input: {
        backgroundColor: Colors.white, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.borderLight,
        paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: Colors.textMain,
    },
    textArea: { minHeight: 100, textAlignVertical: 'top' },
    charCount: { fontSize: 11, color: Colors.gray400, textAlign: 'right', marginTop: 4, marginRight: 4 },
    previewSection: { marginBottom: 24 },
    previewLabel: { fontSize: 12, fontWeight: '700', color: Colors.primary, letterSpacing: 1.5, marginBottom: 12 },
    previewCard: {
        flexDirection: 'row', padding: 14, borderRadius: 14, backgroundColor: '#f0fdf4',
        borderWidth: 1, borderColor: '#bbf7d0', gap: 12,
    },
    previewIcon: {
        width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(245,158,11,0.15)',
        alignItems: 'center', justifyContent: 'center',
    },
    previewTitle: { fontSize: 14, fontWeight: '700', color: Colors.textMain },
    previewMessage: { fontSize: 13, color: Colors.gray600, marginTop: 2, lineHeight: 18 },
    sendBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 14,
        shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
        elevation: 4,
    },
    sendBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
});
