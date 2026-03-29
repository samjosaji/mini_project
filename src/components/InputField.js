import React, { useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, BorderRadius } from '../theme';

export default function InputField({
    label,
    placeholder,
    value,
    onChangeText,
    icon,
    secureTextEntry,
    keyboardType = 'default',
    autoCapitalize,
    style,
}) {
    const [isSecure, setIsSecure] = useState(secureTextEntry);
    const [isFocused, setIsFocused] = useState(false);

    return (
        <View style={[styles.container, style]}>
            {label && <Text style={styles.label}>{label}</Text>}
            <View style={[styles.inputWrapper, isFocused && styles.inputWrapperFocused]}>
                {icon && (
                    <MaterialIcons name={icon} size={22} color={Colors.primary} style={styles.icon} />
                )}
                <TextInput
                    style={styles.input}
                    placeholder={placeholder}
                    placeholderTextColor={Colors.gray400}
                    value={value}
                    onChangeText={onChangeText}
                    secureTextEntry={isSecure}
                    keyboardType={keyboardType}
                    autoCapitalize={autoCapitalize}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                />
                {secureTextEntry && (
                    <TouchableOpacity onPress={() => setIsSecure(!isSecure)} style={styles.eyeBtn}>
                        <MaterialIcons
                            name={isSecure ? 'visibility-off' : 'visibility'}
                            size={22}
                            color={Colors.gray400}
                        />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 12,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textMain,
        marginBottom: 6,
        marginLeft: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: Colors.borderLight,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.white,
        height: 56,
    },
    inputWrapperFocused: {
        borderColor: Colors.primary,
        backgroundColor: '#fafbff',
    },
    icon: {
        marginLeft: 16,
        marginRight: 4,
    },
    input: {
        flex: 1,
        height: '100%',
        fontSize: 16,
        color: Colors.textMain,
        paddingRight: 16,
        paddingLeft: 8,
    },
    eyeBtn: {
        paddingHorizontal: 16,
        height: '100%',
        justifyContent: 'center',
    },
});
