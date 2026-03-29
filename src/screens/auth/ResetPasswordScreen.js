import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, BorderRadius } from '../../theme';
import InputField from '../../components/InputField';
import PrimaryButton from '../../components/PrimaryButton';
import { TouchableOpacity } from 'react-native';
import { supabase, supabaseUrl, supabaseAnonKey } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function ResetPasswordScreen({ route, navigation }) {
    const email = route?.params?.email || '';
    const { clearRecoveryMode } = useAuth();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const isMounted = useRef(true);

    useEffect(() => {
        return () => { isMounted.current = false; };
    }, []);

    const handleResetPassword = async () => {
        if (!newPassword || !confirmPassword) {
            Alert.alert('Missing Fields', 'Please fill out both fields.');
            return;
        }

        if (newPassword.length < 6) {
            Alert.alert('Too Short', 'Password must be at least 6 characters.');
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert('Mismatch', 'Passwords do not match.');
            return;
        }

        setLoading(true);

        try {
            console.log("Fetching current Supabase auth session...");
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError || !session?.access_token) {
                console.log("Session error or missing access token:", sessionError);
                setLoading(false);
                Alert.alert('Session Error', 'Your password reset session has expired. Please request a new code.');
                return;
            }

            console.log("Sending REST API request to update password...");
            // Use standard fetch to bypass the React Native AsyncStorage hang in the Supabase SDK
            const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                    'apikey': supabaseAnonKey
                },
                body: JSON.stringify({ password: newPassword })
            });

            const data = await response.json();
            console.log("REST API Response status:", response.status);

            if (!response.ok) {
                setLoading(false);
                Alert.alert('Update Error', data.msg || data.message || 'Failed to update password.');
                return;
            }

            console.log("Password updated successfully via REST. Clearing recovery mode...");
            setLoading(false);
            clearRecoveryMode(); // Reset context to switch stacks

            console.log("Scheduling success Alert...");
            setTimeout(() => {
                console.log("Displaying success Alert...");
                Alert.alert(
                    'Password Reset!',
                    'Your password has been reset successfully. Please log in with your new password.',
                    [
                        {
                            text: 'Go to Login',
                            onPress: async () => {
                                console.log("User clicked 'Go to Login'. Signing out...");
                                await supabase.auth.signOut();
                                console.log("Navigating to Login...");
                                navigation.navigate('Login');
                            },
                        },
                    ]
                );
            }, 100);

        } catch (err) {
            console.log("Catch block hit in handleResetPassword:", err);
            setLoading(false);
            setTimeout(() => {
                Alert.alert('Catch Error', err?.message || 'Something went wrong.');
            }, 100);
            console.error('Reset password error:', err);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <View style={styles.centerSection}>
                    <View style={styles.iconRow}>
                        <MaterialIcons name="lock-reset" size={40} color={Colors.primary} />
                    </View>
                    <Text style={styles.title}>Create New Password</Text>
                    <Text style={styles.subtitle}>
                        Your new password must be different from previously used passwords.
                    </Text>

                    <View style={styles.form}>
                        <InputField
                            label="New Password"
                            placeholder="••••••••"
                            value={newPassword}
                            onChangeText={setNewPassword}
                            icon="lock"
                            secureTextEntry
                        />
                        <InputField
                            label="Confirm New Password"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            icon="lock-reset"
                            secureTextEntry
                        />

                        <PrimaryButton
                            title={loading ? "Resetting..." : "Reset Password"}
                            onPress={handleResetPassword}
                            style={{ marginTop: 32, opacity: loading ? 0.6 : 1 }}
                            disabled={loading}
                        />

                        <TouchableOpacity style={styles.backLogin} onPress={() => navigation.navigate('Login')}>
                            <MaterialIcons name="arrow-back" size={18} color={Colors.textSecondary} />
                            <Text style={styles.backLoginText}>Back to Login</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.white },
    scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48 },
    centerSection: { alignItems: 'center' },
    iconRow: { alignItems: 'center', marginBottom: 24 },
    title: { fontSize: 24, fontWeight: '700', color: Colors.textMain, marginBottom: 8, textAlign: 'center' },
    subtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', maxWidth: 280, marginBottom: 32 },
    form: { width: '100%' },
    backLogin: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, marginTop: 24, paddingVertical: 12,
    },
    backLoginText: { fontSize: 14, fontWeight: '500', color: Colors.textSecondary },
});
