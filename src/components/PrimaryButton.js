import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors, BorderRadius } from '../theme';

export default function PrimaryButton({ title, onPress, style }) {
    return (
        <TouchableOpacity style={[styles.button, style]} onPress={onPress} activeOpacity={0.85}>
            <Text style={styles.text}>{title}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.lg,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    text: {
        color: Colors.white,
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});
