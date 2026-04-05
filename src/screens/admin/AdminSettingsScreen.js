import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../theme';
import { supabase } from '../../services/supabase';

export default function AdminSettingsScreen({ navigation }) {
    const handleLogout = async () => {
        Alert.alert(
            'Log Out',
            'Are you sure you want to log out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Log Out',
                    style: 'destructive',
                    onPress: async () => {
                        await supabase.auth.signOut();
                        // Navigation is handled automatically by AuthContext (session goes null)
                    },
                },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <MaterialIcons name="arrow-back" size={24} color={Colors.textMain} />
                </TouchableOpacity>
                <Text style={styles.title}>System Settings</Text>
                <View style={{ width: 48 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

                {/* GENERAL */}
                <View style={styles.sectionWrap}>
                    <Text style={styles.sectionTitle}>GENERAL</Text>

                    <View style={styles.card}>
                        <View style={styles.menuRow}>
                            <View style={styles.menuLeft}>
                                <View style={[styles.iconWrap, { backgroundColor: '#dcfce7' }]}>
                                    <MaterialIcons name="info" size={22} color={Colors.primary} />
                                </View>
                                <Text style={styles.menuText}>App Version</Text>
                            </View>
                            <View style={styles.versionBadge}>
                                <Text style={styles.versionText}>v1.0.0</Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <TouchableOpacity
                            style={styles.menuRow}
                            onPress={() => navigation.navigate('CategoryManagement')}
                        >
                            <View style={styles.menuLeft}>
                                <View style={[styles.iconWrap, { backgroundColor: '#dcfce7' }]}>
                                    <MaterialIcons name="category" size={22} color={Colors.primary} />
                                </View>
                                <Text style={styles.menuText}>Category Management</Text>
                            </View>
                            <MaterialIcons name="chevron-right" size={24} color={Colors.gray400} />
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity
                            style={styles.menuRow}
                            onPress={() => navigation.navigate('ChangePassword')}
                        >
                            <View style={styles.menuLeft}>
                                <View style={[styles.iconWrap, { backgroundColor: '#dcfce7' }]}>
                                    <MaterialIcons name="lock-reset" size={22} color={Colors.primary} />
                                </View>
                                <Text style={styles.menuText}>Change Password</Text>
                            </View>
                            <MaterialIcons name="chevron-right" size={24} color={Colors.gray400} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Logout Button */}
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <MaterialIcons name="logout" size={22} color="#dc2626" />
                    <Text style={styles.logoutBtnText}>Log Out</Text>
                </TouchableOpacity>

                {/* Footer Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>VENDORA ADMIN ENGINE © {new Date().getFullYear()}</Text>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8faf9' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12,
        backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.gray100,
    },
    backBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
    scroll: { paddingHorizontal: 20, paddingTop: 24 },
    sectionWrap: { marginBottom: 24 },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.primary, letterSpacing: 1, marginBottom: 12, marginLeft: 8 },
    card: {
        backgroundColor: Colors.white, borderRadius: 16, borderWidth: 1, borderColor: Colors.gray100,
        overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
    },
    menuRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16,
    },
    menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    menuText: { fontSize: 15, fontWeight: '500', color: Colors.textMain },
    versionBadge: { backgroundColor: '#e2e8f0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    versionText: { fontSize: 12, fontWeight: '600', color: Colors.gray600 },
    divider: { height: 1, backgroundColor: Colors.gray50, marginHorizontal: 16 },
    logoutBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        backgroundColor: Colors.white, paddingVertical: 18, borderRadius: 16,
        borderWidth: 1, borderColor: '#fca5a5', marginTop: 16,
        shadowColor: '#dc2626', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    logoutBtnText: { fontSize: 16, fontWeight: '700', color: '#dc2626' },
    footer: { marginTop: 40, alignItems: 'center' },
    footerText: { fontSize: 11, fontWeight: '700', color: Colors.gray400, letterSpacing: 1 },
});
