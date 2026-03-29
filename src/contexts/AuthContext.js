import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState(null); // 'customer', 'vendor', 'admin'
    const [profile, setProfile] = useState(null);
    const [isRecoveryMode, setIsRecoveryMode] = useState(false);
    const [loginValidating, setLoginValidating] = useState(false);

    useEffect(() => {
        const initSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    // If refresh token is invalid/not found, sign out to clear stale local state
                    if (error.message.includes('Refresh Token Not Found') || error.message.includes('Invalid Refresh Token')) {
                        await supabase.auth.signOut();
                    } else {
                        console.log('Session fetch error:', error.message);
                    }
                }

                setSession(session);
                setUser(session?.user ?? null);

                if (session?.user) {
                    await fetchUserProfile(session.user.id);
                } else {
                    setLoading(false);
                }
            } catch (err) {
                console.log('Unexpected error fetching session:', err);
                setLoading(false);
            }
        };

        initSession();

        // Listen for auth state changes
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            // If this is a password recovery event, flag recovery mode
            // so the navigator stays on the auth stack for password reset
            if (event === 'PASSWORD_RECOVERY') {
                setIsRecoveryMode(true);
                return;
            }

            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                await fetchUserProfile(session.user.id);
            } else {
                setUserRole(null);
                setProfile(null);
                setIsRecoveryMode(false);
                setLoading(false);
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    // Helper to fetch custom profile data
    const fetchUserProfile = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            if (data) {
                // If the user's account is suspended globally, force sign out immediately
                if (data.is_suspended) {
                    await supabase.auth.signOut();
                    setProfile(null);
                    setUserRole(null);
                    setUser(null);
                    setSession(null);
                    const { Alert } = require('react-native');
                    Alert.alert(
                        'Account Suspended',
                        'Your account has been suspended by an administrator.'
                    );
                    return;
                }

                // If vendor, check vendor-specific suspension too
                if (data.role === 'vendor') {
                    const { data: vendorData } = await supabase
                        .from('vendors')
                        .select('is_suspended')
                        .eq('id', userId)
                        .single();

                    if (vendorData?.is_suspended) {
                        await supabase.auth.signOut();
                        setProfile(null);
                        setUserRole(null);
                        setUser(null);
                        setSession(null);
                        const { Alert } = require('react-native');
                        Alert.alert(
                            'Account Suspended',
                            'Your vendor account has been suspended by an administrator.'
                        );
                        return;
                    }
                }

                setProfile(data);
                setUserRole(data.role);
            }
        } catch (error) {
            console.log('Error fetching user profile:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            session: (isRecoveryMode || loginValidating) ? null : session,
            loading,
            userRole,
            setUserRole,
            profile,
            setProfile,
            isRecoveryMode,
            clearRecoveryMode: () => setIsRecoveryMode(false),
            refreshProfile: () => user && fetchUserProfile(user.id),
            loginValidating,
            setLoginValidating,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
