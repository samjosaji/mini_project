import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, BorderRadius } from '../../theme';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import InputField from '../../components/InputField';

export default function CustomerProfileScreen({ navigation }) {
    const { user, profile, refreshProfile } = useAuth();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        if (profile) {
            setFirstName(profile.first_name || '');
            setLastName(profile.last_name || '');
            setEmail(profile.email || '');
        }
    }, [profile]);

    const handleSave = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('users')
                .update({ first_name: firstName, last_name: lastName })
                .eq('id', user.id);

            if (error) throw error;
            await refreshProfile();
            alert('Profile updated successfully!');
        } catch (error) {
            alert('Error updating profile: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.headerBar}>
                <View style={{ width: 48 }} />
                <Text style={styles.headerTitle}>Profile</Text>
                <TouchableOpacity onPress={handleSave} disabled={loading}>
                    <Text style={[styles.saveBtn, loading && { opacity: 0.5 }]}>
                        {loading ? '...' : 'Save'}
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Profile Photo */}
                <View style={styles.profileSection}>
                    <View style={styles.avatarWrap}>
                        <Image
                            source={{ uri: `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=random&size=200` }}
                            style={styles.avatar}
                        />
                        <View style={styles.cameraBtn}>
                            <MaterialIcons name="photo-camera" size={16} color={Colors.white} />
                        </View>
                    </View>
                    <Text style={styles.profileName}>{profile?.first_name} {profile?.last_name}</Text>
                    <Text style={styles.profileSub}>Customer since {profile?.created_at ? new Date(profile.created_at).getFullYear() : '2024'}</Text>
                </View>

                {/* Personal Information */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>PERSONAL INFORMATION</Text>
                    <InputField label="First Name" value={firstName} onChangeText={setFirstName} icon="person" placeholder="First name" />
                    <InputField label="Last Name" value={lastName} onChangeText={setLastName} icon="person" placeholder="Last name" />
                    <InputField label="Email Address" value={email} editable={false} icon="email" placeholder="Email address" keyboardType="email-address" />
                </View>

                {/* Security */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>SECURITY</Text>
                    <View style={styles.securityRow}>
                        <View>
                            <Text style={styles.securityTitle}>Password</Text>
                            <Text style={styles.securitySub}>Last changed 2 months ago</Text>
                        </View>
                        <TouchableOpacity style={styles.updateBtn} onPress={() => navigation.getParent()?.navigate('ChangePassword')}>
                            <Text style={styles.updateBtnText}>Update</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Logout */}
                <View style={styles.logoutSection}>
                    <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                        <MaterialIcons name="logout" size={22} color="#dc2626" />
                        <Text style={styles.logoutText}>Log Out</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fcf9' },
    headerBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 16, backgroundColor: Colors.white,
        borderBottomWidth: 1, borderBottomColor: Colors.borderDefault,
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textMain },
    saveBtn: { fontSize: 16, fontWeight: '700', color: Colors.primary },
    profileSection: {
        alignItems: 'center', paddingTop: 32, paddingBottom: 24,
        backgroundColor: Colors.white, marginBottom: 16,
    },
    avatarWrap: { position: 'relative' },
    avatar: {
        width: 112, height: 112, borderRadius: 56,
        borderWidth: 4, borderColor: '#f8fcf9',
    },
    cameraBtn: {
        position: 'absolute', bottom: 0, right: 0,
        width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primary,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: Colors.white,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4,
    },
    profileName: { fontSize: 20, fontWeight: '700', color: Colors.textMain, marginTop: 12 },
    profileSub: { fontSize: 14, color: Colors.gray500, marginTop: 4 },
    section: { backgroundColor: Colors.white, paddingHorizontal: 16, paddingVertical: 24, marginBottom: 16 },
    sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.primary, letterSpacing: 1.5, marginBottom: 16 },
    securityRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8,
    },
    securityTitle: { fontSize: 16, fontWeight: '500', color: Colors.textMain },
    securitySub: { fontSize: 12, color: Colors.gray500, marginTop: 2 },
    updateBtn: {
        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8,
        backgroundColor: 'rgba(22,163,74,0.1)',
    },
    updateBtnText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
    logoutSection: { paddingHorizontal: 16, paddingVertical: 24 },
    logoutBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#fecaca',
        backgroundColor: Colors.white,
    },
    logoutText: { fontSize: 16, fontWeight: '700', color: '#dc2626' },
});
