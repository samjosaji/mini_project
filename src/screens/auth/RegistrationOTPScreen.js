import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, BorderRadius } from '../../theme';
import { supabase } from '../../services/supabase';

export default function RegistrationOTPScreen({ navigation, route }) {
    const { email } = route.params || {};
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const inputs = useRef([]);

    const handleOtpChange = (text, index) => {
        const newOtp = [...otp];
        newOtp[index] = text;
        setOtp(newOtp);
        if (text && index < 5) inputs.current[index + 1]?.focus();
    };

    const handleKeyPress = (e, index) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputs.current[index - 1]?.focus();
        }
    };

    const handleVerify = async () => {
        const code = otp.join('');
        if (code.length < 6) {
            Alert.alert('Error', 'Please enter the full 6-digit code.');
            return;
        }

        setLoading(true);
        const { data, error } = await supabase.auth.verifyOtp({
            email,
            token: code,
            type: 'signup',
        });
        setLoading(false);

        if (error) {
            Alert.alert('Verification Failed', error.message);
        } else {
            // Success! The AuthContext will automatically see the new session and route the user to the correct dashboard.
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <MaterialIcons name="arrow-back" size={24} color={Colors.textMain} />
                </TouchableOpacity>

                <View style={styles.center}>
                    <View style={styles.iconCircle}>
                        <MaterialIcons name="mark-email-read" size={32} color={Colors.primary} />
                    </View>
                    <Text style={styles.title}>Verify Email</Text>
                    <Text style={styles.subtitle}>
                        We sent a 6-digit code to{'\n'}
                        <Text style={{ fontWeight: 'bold' }}>{email || 'your email'}</Text>
                    </Text>

                    <View style={styles.otpRow}>
                        {otp.map((digit, i) => (
                            <TextInput
                                key={i}
                                ref={(ref) => (inputs.current[i] = ref)}
                                style={[styles.otpInput, digit && styles.otpInputFilled]}
                                value={digit}
                                onChangeText={(t) => handleOtpChange(t, i)}
                                onKeyPress={(e) => handleKeyPress(e, i)}
                                keyboardType="number-pad"
                                maxLength={1}
                                autoFocus={i === 0}
                            />
                        ))}
                    </View>

                    <TouchableOpacity
                        style={[styles.verifyBtn, loading && { opacity: 0.6 }]}
                        onPress={handleVerify}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        {loading ? (
                            <ActivityIndicator color={Colors.white} />
                        ) : (
                            <Text style={styles.verifyBtnText}>Verify Code</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.resendRow}>
                        <Text style={styles.resendText}>Didn't get the code? </Text>
                        <Text style={styles.resendLink}>Resend</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.white },
    content: { flex: 1, paddingHorizontal: 24 },
    backBtn: {
        width: 48, height: 48, borderRadius: 24,
        alignItems: 'center', justifyContent: 'center', marginTop: 12, marginLeft: -8,
    },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: -80 },
    iconCircle: {
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', marginBottom: 24,
    },
    title: { fontSize: 28, fontWeight: '700', color: Colors.textMain, marginBottom: 12 },
    subtitle: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', marginBottom: 32 },
    otpRow: { flexDirection: 'row', gap: 10, marginBottom: 40, justifyContent: 'center', width: '100%' },
    otpInput: {
        width: 48, height: 56, borderRadius: BorderRadius.lg,
        borderWidth: 2, borderColor: Colors.borderLight,
        textAlign: 'center', fontSize: 24, fontWeight: '700',
        color: Colors.primary, backgroundColor: Colors.white,
    },
    otpInputFilled: { borderColor: Colors.primary },
    verifyBtn: {
        width: '100%', height: 56, borderRadius: BorderRadius.lg,
        backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
        shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
    },
    verifyBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
    resendRow: { flexDirection: 'row', marginTop: 20, alignItems: 'center' },
    resendText: { fontSize: 14, color: Colors.textSecondary },
    resendLink: { fontSize: 14, fontWeight: '700', color: Colors.primary },
});
