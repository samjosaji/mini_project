import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, BorderRadius } from '../../theme';
import InputField from '../../components/InputField';
import PrimaryButton from '../../components/PrimaryButton';

import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [selectedRole, setSelectedRole] = useState('Customer');
    const [isAdminLogin, setIsAdminLogin] = useState(false);
    const [loading, setLoading] = useState(false);
    const { setLoginValidating } = useAuth();

    const roles = ['Customer', 'Vendor'];

    const handleLogin = async () => {
        const trimmedEmail = email.trim();
        const trimmedPassword = password.trim();

        if (!trimmedEmail || !trimmedPassword) {
            Alert.alert('Error', 'Please enter both email and password.');
            return;
        }

        setLoading(true);
        // Block AuthContext from navigating while we validate the role
        setLoginValidating(true);

        const { data: authData, error } = await supabase.auth.signInWithPassword({
            email: trimmedEmail,
            password: trimmedPassword,
        });

        if (error) {
            let msg = error.message;
            if (msg === 'Invalid login credentials') {
                msg = 'Invalid email or password. If you just created your account, please check your email and confirm it first.';
            }
            Alert.alert('Login Failed', msg);
            setLoading(false);
            setLoginValidating(false);
            return;
        }

        // Validate role and check suspension status
        if (authData?.user) {
            try {
                const { data: profile, error: profileError } = await supabase
                    .from('users')
                    .select('role, is_suspended')
                    .eq('id', authData.user.id)
                    .single();

                if (profile) {
                    const dbRole = (profile.role || '').toLowerCase();

                    // 1. Evaluate Suspension First
                    if (profile.is_suspended === true) {
                        await supabase.auth.signOut();
                        Alert.alert(
                            'Account Suspended',
                            'Your account has been suspended by an administrator. Please contact support.'
                        );
                        setLoading(false);
                        setLoginValidating(false);
                        return;
                    }

                    if (dbRole === 'vendor') {
                        const { data: vendorData } = await supabase
                            .from('vendors')
                            .select('is_suspended')
                            .eq('id', authData.user.id)
                            .single();

                        if (vendorData?.is_suspended === true) {
                            await supabase.auth.signOut();
                            Alert.alert(
                                'Account Suspended',
                                'Your vendor account has been suspended by an administrator.'
                            );
                            setLoading(false);
                            setLoginValidating(false);
                            return;
                        }
                    }

                    // 2. Evaluate Roles
                    if (isAdminLogin) {
                        // Admin login path: check if user has admin role
                        if (dbRole !== 'admin') {
                            await supabase.auth.signOut();
                            Alert.alert(
                                'Access Denied',
                                'This email does not have admin access. Please use the regular login.'
                            );
                            setLoading(false);
                            setLoginValidating(false);
                            return;
                        }
                    } else {
                        // Regular login path: validate selected role matches DB
                        const selected = selectedRole.toLowerCase();
                        if (dbRole !== selected) {
                            await supabase.auth.signOut();
                            const correctRole = profile.role.charAt(0).toUpperCase() + profile.role.slice(1);
                            Alert.alert(
                                'Wrong Role Selected',
                                `This account is registered as a "${correctRole}". Please select "${correctRole}" from the role toggle and try again.`
                            );
                            setLoading(false);
                            setLoginValidating(false);
                            return;
                        }
                    }
                }
            } catch (err) {
                console.log('Role validation error:', err);
                // Allow login to proceed if we can't verify the role
            }
        }

        // Role validated — allow AuthContext to navigate
        setLoginValidating(false);
        setLoading(false);
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.flex}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    bounces={false}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Logo */}
                    <View style={styles.logoContainer}>
                        <MaterialIcons name="storefront" size={48} color={Colors.primary} />
                        <Text style={styles.logoText}>Vendora</Text>
                    </View>

                    {/* Role Toggle - only Customer/Vendor */}
                    {!isAdminLogin && (
                        <View style={styles.roleToggleOuter}>
                            <View style={styles.roleToggleInner}>
                                {roles.map((role) => (
                                    <TouchableOpacity
                                        key={role}
                                        style={[
                                            styles.roleButton,
                                            selectedRole === role && styles.roleButtonActive,
                                        ]}
                                        onPress={() => setSelectedRole(role)}
                                    >
                                        <Text
                                            style={[
                                                styles.roleText,
                                                selectedRole === role && styles.roleTextActive,
                                            ]}
                                        >
                                            {role}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Admin login indicator */}
                    {isAdminLogin && (
                        <View style={styles.adminBadge}>
                            <MaterialIcons name="admin-panel-settings" size={20} color={Colors.primary} />
                            <Text style={styles.adminBadgeText}>Admin Login</Text>
                            <TouchableOpacity onPress={() => setIsAdminLogin(false)}>
                                <MaterialIcons name="close" size={18} color={Colors.gray400} />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Form */}
                    <View style={styles.formContainer}>
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
                            placeholder="••••••••"
                            value={password}
                            onChangeText={setPassword}
                            icon="lock"
                            secureTextEntry
                        />

                        <TouchableOpacity
                            style={styles.forgotPassword}
                            onPress={() => navigation.navigate('ForgotPassword')}
                        >
                            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                        </TouchableOpacity>

                        <View style={styles.loginBtnContainer}>
                            <PrimaryButton title={loading ? "Logging in..." : "Log In"} onPress={handleLogin} disabled={loading} />
                        </View>

                        {!isAdminLogin && (
                            <View style={styles.signupContainer}>
                                <Text style={styles.signupText}>Don't have an account?</Text>
                                <TouchableOpacity onPress={() => navigation.navigate('CreateAccount')}>
                                    <Text style={styles.signupLink}>Create Account</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Admin Access Link */}
                        {!isAdminLogin && (
                            <TouchableOpacity
                                style={styles.adminLinkContainer}
                                onPress={() => setIsAdminLogin(true)}
                            >
                                <Text style={styles.adminLinkText}>Login as Admin</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white,
    },
    flex: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
    },
    logoContainer: {
        alignItems: 'center',
        paddingTop: 60,
        paddingBottom: 32,
        gap: 8,
    },
    logoText: {
        fontSize: 32,
        fontWeight: '700',
        color: Colors.primary,
        letterSpacing: -0.5,
    },
    roleToggleOuter: {
        paddingVertical: 16,
    },
    roleToggleInner: {
        flexDirection: 'row',
        backgroundColor: '#f0fdf4',
        borderRadius: BorderRadius.lg,
        padding: 6,
        borderWidth: 1,
        borderColor: '#dcfce7',
        height: 48,
    },
    roleButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
    },
    roleButtonActive: {
        backgroundColor: Colors.white,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
    },
    roleText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    roleTextActive: {
        color: Colors.primary,
    },
    adminBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#f0fdf4',
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: '#dcfce7',
        marginVertical: 16,
    },
    adminBadgeText: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.primary,
        flex: 1,
    },
    formContainer: {
        paddingTop: 8,
    },
    forgotPassword: {
        alignSelf: 'flex-end',
        marginTop: 4,
        marginRight: 4,
    },
    forgotPasswordText: {
        fontSize: 12,
        fontWeight: '500',
        color: Colors.textSecondary,
    },
    loginBtnContainer: {
        marginTop: 32,
    },
    signupContainer: {
        marginTop: 32,
        alignItems: 'center',
        gap: 4,
    },
    signupText: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    signupLink: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.primary,
    },
    adminLinkContainer: {
        marginTop: 20,
        alignItems: 'center',
    },
    adminLinkText: {
        fontSize: 13,
        fontWeight: '500',
        color: Colors.gray400,
        textDecorationLine: 'underline',
    },
});
