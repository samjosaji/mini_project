import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { createClient } from '@supabase/supabase-js';
import { Colors } from '../../theme';
import InputField from '../../components/InputField';
import PrimaryButton from '../../components/PrimaryButton';
import { supabase, supabaseUrl, supabaseAnonKey } from '../../services/supabase';

export default function ChangePasswordScreen({ navigation }) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const isMounted = useRef(true);

    useEffect(() => {
        return () => { isMounted.current = false; };
    }, []);

    const handleUpdatePassword = async () => {
        // Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            Alert.alert('Missing Fields', 'Please fill out all fields.');
            return;
        }

        if (newPassword.length < 6) {
            Alert.alert('Too Short', 'New password must be at least 6 characters.');
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert('Mismatch', 'New password and confirmation do not match.');
            return;
        }

        if (currentPassword === newPassword) {
            Alert.alert('Same Password', 'New password must be different from the current one.');
            return;
        }

        setLoading(true);

        try {
            // Get the current user's email
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.email) {
                setLoading(false);
                Alert.alert('Error', 'Could not retrieve your account info.');
                return;
            }

            // Verify current password using a separate supabase client
            // so it does NOT trigger the global onAuthStateChange listener
            const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
                auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
            });

            const { error: signInError } = await tempClient.auth.signInWithPassword({
                email: user.email,
                password: currentPassword,
            });

            if (signInError) {
                setLoading(false);
                Alert.alert('Incorrect', 'Your current password is incorrect.');
                return;
            }

            // Update to new password using the temporary client
            // This prevents the main client from firing onAuthStateChange 
            // and unmounting our screen before the update finishes!
            const { data, error: updateError } = await tempClient.auth.updateUser({
                password: newPassword,
            });

            setLoading(false);

            if (updateError) {
                Alert.alert('Error', updateError.message || 'Failed to update password.');
            } else {
                Alert.alert(
                    'Success',
                    'Your password has been updated successfully!',
                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
            }
        } catch (err) {
            setLoading(false);
            Alert.alert('Catch Error', err?.message || 'Something went wrong.');
            console.error('Password update error:', err);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.headerBar}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <MaterialIcons name="arrow-back" size={24} color={Colors.textMain} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Change Password</Text>
                <View style={{ width: 48 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <View style={styles.iconCircle}>
                    <MaterialIcons name="lock" size={32} color={Colors.primary} />
                </View>
                <Text style={styles.subtitle}>
                    Enter your current password and choose a new one.
                </Text>

                <View style={styles.form}>
                    <InputField
                        label="Current Password"
                        placeholder="••••••••"
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        icon="lock-outline"
                        secureTextEntry
                    />
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
                        title={loading ? "Updating..." : "Update Password"}
                        onPress={handleUpdatePassword}
                        style={{ marginTop: 24, opacity: loading ? 0.6 : 1 }}
                        disabled={loading}
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.white },
    headerBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 16,
        borderBottomWidth: 1, borderBottomColor: Colors.borderDefault,
    },
    backBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textMain },
    scrollContent: { padding: 24, alignItems: 'center' },
    iconCircle: {
        width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(46,125,50,0.1)',
        alignItems: 'center', justifyContent: 'center', marginBottom: 16, marginTop: 16,
    },
    subtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginBottom: 32 },
    form: { width: '100%' },
});
