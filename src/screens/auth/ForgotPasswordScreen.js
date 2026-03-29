import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, BorderRadius } from '../../theme';
import InputField from '../../components/InputField';
import PrimaryButton from '../../components/PrimaryButton';
import { supabase } from '../../services/supabase';

export default function ForgotPasswordScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSendCode = async () => {
        const trimmedEmail = email.trim().toLowerCase();
        if (!trimmedEmail) {
            Alert.alert('Missing Email', 'Please enter your email address.');
            return;
        }

        // Basic email format check
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
            Alert.alert('Invalid Email', 'Please enter a valid email address.');
            return;
        }

        setLoading(true);

        try {
            // Check if the user exists first
            const { data: userData, error: userError } = await supabase
                .from('users') // Assuming your table is 'users', update if different
                .select('id')
                .eq('email', trimmedEmail)
                .single();

            if (userError || !userData) {
                setLoading(false);
                // We show a generic message for security, or specific message depending on preference
                Alert.alert('Not Found', 'We could not find an account with that email address.');
                return;
            }

            // Use Supabase resetPasswordForEmail — this sends a 6-digit OTP to the email
            const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail);

            setLoading(false);

            if (error) {
                Alert.alert('Error', error.message || 'Failed to send reset code.');
                return;
            }

            Alert.alert(
                'Code Sent!',
                `We've sent a 6-digit verification code to ${trimmedEmail}. Please check your inbox (and spam folder).`,
                [
                    {
                        text: 'OK',
                        onPress: () => navigation.navigate('OTPVerification', { email: trimmedEmail }),
                    },
                ]
            );
        } catch (err) {
            setLoading(false);
            Alert.alert('Error', 'Something went wrong. Please try again.');
            console.error('Forgot password error:', err);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <View style={styles.content}>
                    <View style={styles.centerSection}>
                        <View style={styles.iconCircle}>
                            <MaterialIcons name="lock-reset" size={32} color={Colors.primary} />
                        </View>
                        <Text style={styles.title}>Forgot your password?</Text>
                        <Text style={styles.subtitle}>
                            Enter your email address below and we'll send you a verification code to reset your password.
                        </Text>

                        <View style={styles.form}>
                            <InputField
                                label="Email"
                                placeholder="Enter your email"
                                value={email}
                                onChangeText={setEmail}
                                icon="email"
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                            <PrimaryButton
                                title={loading ? "Sending..." : "Send Code"}
                                onPress={handleSendCode}
                                style={{ marginTop: 16, opacity: loading ? 0.6 : 1 }}
                                disabled={loading}
                            />
                        </View>
                    </View>

                    <TouchableOpacity style={styles.backLogin} onPress={() => navigation.navigate('Login')}>
                        <MaterialIcons name="arrow-back" size={20} color={Colors.textSecondary} />
                        <Text style={styles.backLoginText}>Back to Login</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.white },
    content: { flex: 1, paddingHorizontal: 32, paddingVertical: 48, justifyContent: 'center' },
    centerSection: { alignItems: 'center' },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(46,125,50,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    title: { fontSize: 24, fontWeight: '700', color: Colors.textMain, marginBottom: 12, textAlign: 'center' },
    subtitle: {
        fontSize: 16,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 16,
        marginBottom: 32,
    },
    form: { width: '100%' },
    backLogin: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 32,
    },
    backLoginText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
});
