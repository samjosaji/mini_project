import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/contexts/AuthContext';

// Register background location task at app startup (must be top-level)
import './src/services/backgroundLocationTask';

export default function App() {
  return (
    <AuthProvider>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <AppNavigator />
      </SafeAreaProvider>
    </AuthProvider>
  );
}
