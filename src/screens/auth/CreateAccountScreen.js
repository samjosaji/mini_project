import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, BorderRadius } from '../../theme';
import InputField from '../../components/InputField';
import PrimaryButton from '../../components/PrimaryButton';

import { Alert } from 'react-native';
import { supabase } from '../../services/supabase';

export default function CreateAccountScreen({ navigation }) {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [shopName, setShopName] = useState('');
    const [accountType, setAccountType] = useState('Customer');
    const [loading, setLoading] = useState(false);

    const handleSignup = async () => {
        if (!email || !password || !firstName || !lastName || (accountType === 'Vendor' && !shopName)) {
            Alert.alert('Error', 'Please fill in all required fields.');
            return;
        }

        setLoading(true);
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    first_name: firstName,
                    last_name: lastName,
                    role: accountType.toLowerCase(),
                    shop_name: accountType === 'Vendor' ? shopName : null,
                }
            }
        });

        setLoading(false);

        if (error) {
            Alert.alert('Signup Failed', error.message);
        } else {
            // Note: In Supabase, if email confirmations are ON, the user doesn't get logged in immediately.
            if (data?.session) {
                // Let AuthContext route them (Email confirmation is OFF)
            } else {
                // Email confirmation is ON, go to OTP screen
                navigation.navigate('RegistrationOTP', { email });
            }
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                            <MaterialIcons name="arrow-back" size={24} color={Colors.textMain} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Create Account</Text>
                        <View style={{ width: 48 }} />
                    </View>

                    <Text style={styles.bigTitle}>Let's get started</Text>

                    {/* Role Toggle */}
                    <View style={styles.roleToggleOuter}>
                        <View style={styles.roleToggleInner}>
                            {['Customer', 'Vendor'].map((type) => (
                                <TouchableOpacity
                                    key={type}
                                    style={[styles.roleBtn, accountType === type && styles.roleBtnActive]}
                                    onPress={() => setAccountType(type)}
                                >
                                    <Text style={[styles.roleText, accountType === type && styles.roleTextActive]}>{type}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        <View style={styles.nameRow}>
                            <View style={{ flex: 1 }}>
                                <InputField label="First Name" placeholder="Enter first name" value={firstName} onChangeText={setFirstName} />
                            </View>
                            <View style={{ width: 16 }} />
                            <View style={{ flex: 1 }}>
                                <InputField label="Last Name" placeholder="Enter last name" value={lastName} onChangeText={setLastName} />
                            </View>
                        </View>

                        <InputField
                            label="Email"
                            placeholder="Enter your email"
                            value={email}
                            onChangeText={setEmail}
                            icon="email"
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />

                        <InputField
                            label="Password"
                            placeholder="Minimum 6 characters"
                            value={password}
                            onChangeText={setPassword}
                            icon="lock"
                            secureTextEntry={true}
                        />

                        {accountType === 'Vendor' && (
                            <InputField
                                label="Shop Name *"
                                placeholder="Enter your shop name"
                                value={shopName}
                                onChangeText={setShopName}
                                icon="storefront"
                            />
                        )}
                    </View>

                    <View style={styles.bottomSection}>
                        <PrimaryButton
                            title={loading ? "Creating Account..." : "Create Account"}
                            onPress={handleSignup}
                            disabled={loading}
                        />
                        <View style={styles.loginRow}>
                            <Text style={styles.loginText}>Already have an account? </Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                                <Text style={styles.loginLink}>Log in</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.white },
    scrollContent: { flexGrow: 1, paddingHorizontal: 24 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 16,
        paddingBottom: 8,
    },
    backBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textMain },
    bigTitle: {
        fontSize: 32,
        fontWeight: '700',
        color: Colors.textMain,
        paddingVertical: 16,
        letterSpacing: -0.5,
    },
    roleToggleOuter: { paddingVertical: 16 },
    roleToggleInner: {
        flexDirection: 'row',
        backgroundColor: Colors.gray100,
        borderRadius: BorderRadius.lg,
        padding: 4,
        borderWidth: 1,
        borderColor: Colors.gray200,
        height: 48,
    },
    roleBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
    },
    roleBtnActive: {
        backgroundColor: Colors.white,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
    },
    roleText: { fontSize: 14, fontWeight: '700', color: Colors.gray500 },
    roleTextActive: { color: Colors.primary },
    form: { gap: 4 },
    nameRow: { flexDirection: 'row' },
    bottomSection: { marginTop: 'auto', paddingTop: 32, paddingBottom: 32 },
    loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
    loginText: { fontSize: 14, color: Colors.gray500, fontWeight: '500' },
    loginLink: { fontSize: 14, fontWeight: '700', color: Colors.primary },
});
