import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../theme';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import CreateAccountScreen from '../screens/auth/CreateAccountScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import OTPVerificationScreen from '../screens/auth/OTPVerificationScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import RegistrationOTPScreen from '../screens/auth/RegistrationOTPScreen';
import RegistrationSuccessScreen from '../screens/auth/RegistrationSuccessScreen';

// Customer Screens
import ExploreScreen from '../screens/customer/ExploreScreen';
import VendorsScreen from '../screens/customer/VendorsScreen';
import FavoritesScreen from '../screens/customer/FavoritesScreen';
import CustomerProfileScreen from '../screens/customer/CustomerProfileScreen';
import ProductDetailScreen from '../screens/customer/ProductDetailScreen';
import WriteReviewScreen from '../screens/customer/WriteReviewScreen';
import AllReviewsScreen from '../screens/customer/AllReviewsScreen';
import FeaturedAllScreen from '../screens/customer/FeaturedAllScreen';
import NotificationsScreen from '../screens/customer/NotificationsScreen';
import VendorDetailScreen from '../screens/customer/VendorDetailScreen';

// Vendor Screens
import VendorDashboardScreen from '../screens/vendor/VendorDashboardScreen';
import HeatMapScreen from '../screens/vendor/HeatMapScreen';
import ManageProductsScreen from '../screens/vendor/ManageProductsScreen';
import VendorProfileScreen from '../screens/vendor/VendorProfileScreen';
import AddProductScreen from '../screens/vendor/AddProductScreen';
import SendOfferScreen from '../screens/vendor/SendOfferScreen';

// Admin Screens
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminVendorsScreen from '../screens/admin/AdminVendorsScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import AdminSettingsScreen from '../screens/admin/AdminSettingsScreen';
import CategoryManagementScreen from '../screens/admin/CategoryManagementScreen';

// Shared Screens
import ChangePasswordScreen from '../screens/shared/ChangePasswordScreen';

const Stack = createNativeStackNavigator();
const CustomerTab = createBottomTabNavigator();
const VendorTab = createBottomTabNavigator();
const AdminTab = createBottomTabNavigator();

// ─── Customer Tabs ─────────────
function CustomerTabs() {
    const insets = useSafeAreaInsets();
    return (
        <CustomerTab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: Colors.primary,
                tabBarInactiveTintColor: Colors.textMuted,
                tabBarStyle: {
                    backgroundColor: Colors.white,
                    borderTopColor: Colors.gray100,
                    paddingBottom: Math.max(insets.bottom, 8),
                    paddingTop: 4,
                    height: 56 + Math.max(insets.bottom, 8),
                },
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: '600',
                },
            }}
        >
            <CustomerTab.Screen
                name="Explore"
                component={ExploreScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <MaterialIcons name="explore" size={size} color={color} />,
                }}
            />
            <CustomerTab.Screen
                name="Vendors"
                component={VendorsScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <MaterialIcons name="storefront" size={size} color={color} />,
                }}
            />
            <CustomerTab.Screen
                name="Favorites"
                component={FavoritesScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <MaterialIcons name="favorite" size={size} color={color} />,
                }}
            />
            <CustomerTab.Screen
                name="Profile"
                component={CustomerProfileScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <MaterialIcons name="person" size={size} color={color} />,
                }}
            />
        </CustomerTab.Navigator>
    );
}

// ─── Vendor Tabs ─────────────
function VendorTabs() {
    const insets = useSafeAreaInsets();
    return (
        <VendorTab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: Colors.primary,
                tabBarInactiveTintColor: Colors.gray400,
                tabBarStyle: {
                    backgroundColor: Colors.white,
                    borderTopColor: Colors.gray100,
                    paddingBottom: Math.max(insets.bottom, 8),
                    paddingTop: 4,
                    height: 56 + Math.max(insets.bottom, 8),
                },
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: '600',
                },
            }}
        >
            <VendorTab.Screen
                name="Home"
                component={VendorDashboardScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <MaterialIcons name="home" size={size} color={color} />,
                }}
            />
            <VendorTab.Screen
                name="Heat Map"
                component={HeatMapScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <MaterialIcons name="map" size={size} color={color} />,
                }}
            />
            <VendorTab.Screen
                name="Inventory"
                component={ManageProductsScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <MaterialIcons name="inventory-2" size={size} color={color} />,
                }}
            />
            <VendorTab.Screen
                name="VendorProfile"
                component={VendorProfileScreen}
                options={{
                    tabBarLabel: 'Profile',
                    tabBarIcon: ({ color, size }) => <MaterialIcons name="person" size={size} color={color} />,
                }}
            />
        </VendorTab.Navigator>
    );
}

// ─── Admin Tabs ─────────────
function AdminTabs() {
    const insets = useSafeAreaInsets();
    return (
        <AdminTab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#0a2e0a',
                tabBarInactiveTintColor: Colors.gray400,
                tabBarStyle: {
                    backgroundColor: Colors.white,
                    borderTopColor: Colors.gray200,
                    paddingBottom: Math.max(insets.bottom, 8),
                    paddingTop: 4,
                    height: 56 + Math.max(insets.bottom, 8),
                },
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: '600',
                },
            }}
        >
            <AdminTab.Screen
                name="Dashboard"
                component={AdminDashboardScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <MaterialIcons name="dashboard" size={size} color={color} />,
                }}
            />
            <AdminTab.Screen
                name="AdminVendors"
                component={AdminVendorsScreen}
                options={{
                    tabBarLabel: 'Vendors',
                    tabBarIcon: ({ color, size }) => <MaterialIcons name="storefront" size={size} color={color} />,
                }}
            />
            <AdminTab.Screen
                name="Users"
                component={AdminUsersScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <MaterialIcons name="group" size={size} color={color} />,
                }}
            />
            <AdminTab.Screen
                name="Settings"
                component={AdminSettingsScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <MaterialIcons name="settings" size={size} color={color} />,
                }}
            />
        </AdminTab.Navigator>
    );
}

import { useAuth } from '../contexts/AuthContext';
import { View, ActivityIndicator } from 'react-native';

// ─── Root Navigator ─────────────
export default function AppNavigator() {
    const { session, loading, userRole } = useAuth();

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.white }}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {!session ? (
                    // Auth Flow
                    <>
                        <Stack.Screen name="Login" component={LoginScreen} />
                        <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
                        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
                        <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
                        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
                        <Stack.Screen name="RegistrationOTP" component={RegistrationOTPScreen} />
                        <Stack.Screen name="RegistrationSuccess" component={RegistrationSuccessScreen} />
                    </>
                ) : (
                    // Main App - Role-based Stacks
                    <>
                        {userRole === 'admin' ? (
                            <>
                                <Stack.Screen name="AdminTabs" component={AdminTabs} />
                                <Stack.Screen name="CategoryManagement" component={CategoryManagementScreen} />
                            </>
                        ) : userRole === 'vendor' ? (
                            <>
                                <Stack.Screen name="VendorTabs" component={VendorTabs} />
                                <Stack.Screen
                                    name="AddProduct"
                                    component={AddProductScreen}
                                    options={{ presentation: 'modal' }}
                                />
                                <Stack.Screen
                                    name="SendOffer"
                                    component={SendOfferScreen}
                                    options={{ presentation: 'modal' }}
                                />
                                <Stack.Screen name="AllReviews" component={AllReviewsScreen} />
                            </>
                        ) : (
                            // Default to customer view while role is resolving or if customer
                            <>
                                <Stack.Screen name="CustomerTabs" component={CustomerTabs} />
                                <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
                                <Stack.Screen name="WriteReview" component={WriteReviewScreen} />
                                <Stack.Screen name="AllReviews" component={AllReviewsScreen} />
                                <Stack.Screen name="FeaturedAll" component={FeaturedAllScreen} />
                                <Stack.Screen name="Notifications" component={NotificationsScreen} />
                                <Stack.Screen name="VendorDetail" component={VendorDetailScreen} />
                            </>
                        )}
                        {/* Shared Screens */}
                        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
