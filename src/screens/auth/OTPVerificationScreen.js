import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, BorderRadius } from '../../theme';
import { supabase } from '../../services/supabase';

const OTP_LENGTH = 6;

export default function OTPVerificationScreen({ route, navigation }) {
    const email = route?.params?.email || '';
    const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
    const [loading, setLoading] = useState(false);
    const [timer, setTimer] = useState(59);
    const [canResend, setCanResend] = useState(false);
    const inputs = useRef([]);

    // Countdown timer
    useEffect(() => {
        if (timer <= 0) {
            setCanResend(true);
            return;
        }
        const interval = setInterval(() => {
            setTimer((prev) => prev - 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [timer]);

    const formatTimer = (seconds) => {
        const m = String(Math.floor(seconds / 60)).padStart(2, '0');
        const s = String(seconds % 60).padStart(2, '0');
        return `${m}:${s}`;
    };

    const handleOtpChange = (text, index) => {
        const newOtp = [...otp];
        newOtp[index] = text;
        setOtp(newOtp);
        if (text && index < OTP_LENGTH - 1) {
            inputs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (e, index) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputs.current[index - 1]?.focus();
        }
    };

    const handleVerify = async () => {
        const code = otp.join('');
        if (code.length < OTP_LENGTH) {
            Alert.alert('Incomplete Code', `Please enter the full ${OTP_LENGTH}-digit code.`);
            return;
        }

        setLoading(true);

        try {
            const { data, error } = await supabase.auth.verifyOtp({
                email: email,
                token: code,
                type: 'recovery',
            });

            setLoading(false);

            if (error) {
                Alert.alert('Invalid Code', error.message || 'The code you entered is incorrect or has expired.');
                return;
            }

            // OTP verified — navigate to reset password screen
            // The user is now authenticated via recovery, so updateUser will work
            navigation.navigate('ResetPassword', { email: email });
        } catch (err) {
            setLoading(false);
            Alert.alert('Error', 'Something went wrong. Please try again.');
            console.error('OTP verification error:', err);
        }
    };

    const handleResend = async () => {
        if (!canResend) return;

        setCanResend(false);
        setTimer(59);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email);
            if (error) {
                Alert.alert('Error', error.message || 'Failed to resend code.');
            } else {
                Alert.alert('Code Resent', 'A new verification code has been sent to your email.');
            }
        } catch (err) {
            Alert.alert('Error', 'Something went wrong. Please try again.');
            console.error('Resend OTP error:', err);
        }
    };

    const isCodeComplete = otp.every((d) => d !== '');

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                {/* Back button */}
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <MaterialIcons name="arrow-back" size={24} color={Colors.textMain} />
                </TouchableOpacity>

                <View style={styles.centerSection}>
                    <View style={styles.iconCircle}>
                        <MaterialIcons name="mark-email-read" size={32} color={Colors.primary} />
                    </View>
                    <Text style={styles.title}>Verify Your Email</Text>
                    <Text style={styles.subtitle}>
                        We've sent a {OTP_LENGTH}-digit verification code to{'\n'}
                        <Text style={styles.emailBold}>{email}</Text>
                    </Text>

                    {/* OTP Inputs */}
                    <View style={styles.otpRow}>
                        {otp.map((digit, index) => (
                            <TextInput
                                key={index}
                                ref={(ref) => (inputs.current[index] = ref)}
                                style={[styles.otpInput, digit && styles.otpInputFilled]}
                                value={digit}
                                onChangeText={(text) => handleOtpChange(text, index)}
                                onKeyPress={(e) => handleKeyPress(e, index)}
                                keyboardType="number-pad"
                                maxLength={1}
                                autoFocus={index === 0}
                            />
                        ))}
                    </View>

                    <View style={styles.resendSection}>
                        {!canResend ? (
                            <Text style={styles.resendText}>
                                Resend code in <Text style={styles.resendTimer}>{formatTimer(timer)}</Text>
                            </Text>
                        ) : (
                            <TouchableOpacity onPress={handleResend}>
                                <Text style={styles.resendBtnActive}>Resend Code</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Verify Button */}
                    <TouchableOpacity
                        style={[
                            styles.verifyButton,
                            isCodeComplete && !loading && styles.verifyButtonActive,
                        ]}
                        onPress={handleVerify}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <Text style={[styles.verifyButtonText, isCodeComplete && styles.verifyButtonTextActive]}>
                                Verifying...
                            </Text>
                        ) : (
                            <>
                                <MaterialIcons
                                    name="verified"
                                    size={20}
                                    color={isCodeComplete ? '#fff' : Colors.textSecondary}
                                />
                                <Text style={[styles.verifyButtonText, isCodeComplete && styles.verifyButtonTextActive]}>
                                    Verify & Continue
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.changeEmail} onPress={() => navigation.navigate('ForgotPassword')}>
                        <MaterialIcons name="edit" size={18} color={Colors.textSecondary} />
                        <Text style={styles.changeEmailText}>Change email address</Text>
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
        alignItems: 'center', justifyContent: 'center',
        marginTop: 12, marginLeft: -8,
    },
    centerSection: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: -80 },
    iconCircle: {
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: '#f0fdf4',
        alignItems: 'center', justifyContent: 'center', marginBottom: 24,
    },
    title: { fontSize: 28, fontWeight: '700', color: Colors.textMain, marginBottom: 12 },
    subtitle: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24 },
    emailBold: { fontWeight: '600', color: Colors.textMain },
    otpRow: { flexDirection: 'row', gap: 10, marginVertical: 40 },
    otpInput: {
        width: 48, height: 56, borderRadius: BorderRadius.lg,
        borderWidth: 2, borderColor: Colors.borderLight,
        textAlign: 'center', fontSize: 24, fontWeight: '700',
        color: Colors.primary, backgroundColor: Colors.white,
    },
    otpInputFilled: { borderColor: Colors.primary },
    resendSection: { alignItems: 'center', marginBottom: 28 },
    resendText: { fontSize: 14, color: Colors.textSecondary },
    resendTimer: { color: Colors.primary, fontWeight: '700' },
    resendBtnActive: { fontSize: 15, fontWeight: '700', color: Colors.primary },
    verifyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: '100%',
        height: 52,
        borderRadius: BorderRadius.lg,
        backgroundColor: '#e8e8e8',
    },
    verifyButtonActive: {
        backgroundColor: Colors.primary,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    verifyButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.textSecondary,
    },
    verifyButtonTextActive: {
        color: '#fff',
    },
    changeEmail: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        marginTop: 20, paddingVertical: 8,
    },
    changeEmailText: { fontSize: 14, color: Colors.textSecondary },
});
