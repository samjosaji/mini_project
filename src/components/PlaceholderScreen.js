import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../theme';

export default function PlaceholderScreen({ name, icon }) {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <MaterialIcons name={icon || 'construction'} size={48} color={Colors.primary} />
                <Text style={styles.title}>{name}</Text>
                <Text style={styles.subtitle}>Coming soon...</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.backgroundLight,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.textMain,
        marginTop: 16,
    },
    subtitle: {
        fontSize: 14,
        color: Colors.textMuted,
        marginTop: 8,
    },
});
