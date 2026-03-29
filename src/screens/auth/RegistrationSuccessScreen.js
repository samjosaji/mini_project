import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../theme';
import PrimaryButton from '../../components/PrimaryButton';

export default function RegistrationSuccessScreen({ navigation }) {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.successCircle}>
                    <MaterialIcons name="check-circle" size={80} color={Colors.primary} />
                </View>
                <Text style={styles.title}>Account Created!</Text>
                <Text style={styles.subtitle}>
                    Your account has been successfully created. You can now log in to start exploring.
                </Text>
                <PrimaryButton
                    title="Go to Login"
                    onPress={() => navigation.navigate('Login')}
                    style={{ width: '100%', marginTop: 40 }}
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.white },
    content: {
        flex: 1, justifyContent: 'center', alignItems: 'center',
        paddingHorizontal: 32,
    },
    successCircle: { marginBottom: 24 },
    title: { fontSize: 28, fontWeight: '700', color: Colors.textMain, marginBottom: 12 },
    subtitle: {
        fontSize: 16, color: Colors.textSecondary, textAlign: 'center',
        lineHeight: 24, maxWidth: 300,
    },
});
