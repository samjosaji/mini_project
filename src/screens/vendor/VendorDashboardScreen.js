import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Switch, ActivityIndicator, Alert, Animated, Easing
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, BorderRadius } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { vendorService } from '../../services/vendorService';
import { locationService } from '../../services/locationService';
import { VENDOR_ID_STORAGE_KEY } from '../../services/backgroundLocationTask';
import { productService } from '../../services/productService';
import { useFocusEffect } from '@react-navigation/native';

export default function VendorDashboardScreen({ navigation }) {
    const { user } = useAuth();
    const [vendor, setVendor] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    const [location, setLocation] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [productCount, setProductCount] = useState('-');
    const [loading, setLoading] = useState(true);
    const [locationLoading, setLocationLoading] = useState(false);
    const [isLiveTracking, setIsLiveTracking] = useState(false);
    const [liveToggleLoading, setLiveToggleLoading] = useState(false);
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const liveRefreshInterval = useRef(null);

    useFocusEffect(
        useCallback(() => {
            if (user) {
                fetchVendorData();
                fetchProductCount();
                checkLiveTrackingStatus();
            }
            return () => {
                // Clean up the refresh interval when leaving the screen
                if (liveRefreshInterval.current) {
                    clearInterval(liveRefreshInterval.current);
                    liveRefreshInterval.current = null;
                }
            };
        }, [user])
    );

    // Pulse animation for LIVE badge
    useEffect(() => {
        if (isLiveTracking) {
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                ])
            );
            pulse.start();
            return () => pulse.stop();
        } else {
            pulseAnim.setValue(1);
        }
    }, [isLiveTracking]);

    // When live tracking is active, periodically refresh vendor data to show updated location
    useEffect(() => {
        if (isLiveTracking) {
            liveRefreshInterval.current = setInterval(() => {
                fetchVendorData();
            }, 30000); // refresh every 30s
        } else {
            if (liveRefreshInterval.current) {
                clearInterval(liveRefreshInterval.current);
                liveRefreshInterval.current = null;
            }
        }
        return () => {
            if (liveRefreshInterval.current) {
                clearInterval(liveRefreshInterval.current);
                liveRefreshInterval.current = null;
            }
        };
    }, [isLiveTracking]);

    const checkLiveTrackingStatus = async () => {
        const running = await locationService.isBackgroundLocationRunning();
        setIsLiveTracking(running);
    };

    const fetchProductCount = async () => {
        const { data } = await productService.getProductsByVendor(user.id);
        if (data) {
            setProductCount(data.length.toString());
        }
    };

    const fetchVendorData = async () => {
        setLoading(true);
        const { data } = await vendorService.getVendorById(user.id);
        if (data) {
            setVendor(data);
            setIsOpen(data.is_open);
            if (data.location_lat && data.location_lng) {
                setLocation({ latitude: data.location_lat, longitude: data.location_lng });
                if (data.last_location_update) {
                    setLastUpdated(new Date(data.last_location_update));
                }
            }
        }
        setLoading(false);
    };

    const toggleOpenStatus = async (newValue) => {
        setIsOpen(newValue);
        await vendorService.updateVendorStatus(user.id, { is_open: newValue });
    };

    const handleUpdateLocation = async () => {
        setLocationLoading(true);
        const { location: newLocation, error } = await locationService.getCurrentLocation();

        if (error) {
            Alert.alert('Location Error', error);
            setLocationLoading(false);
            return;
        }

        setLocation(newLocation);

        // Update Supabase
        const now = new Date();
        await vendorService.updateVendorStatus(user.id, {
            location_lat: newLocation.latitude,
            location_lng: newLocation.longitude
        });

        setLastUpdated(now);
        setLocationLoading(false);
        Alert.alert('Success', 'Location updated successfully! Customers can now find you.');
    };

    const toggleLiveTracking = async (enabled) => {
        setLiveToggleLoading(true);
        try {
            if (enabled) {
                // Request background permission
                const { granted, error } = await locationService.requestBackgroundPermission();
                if (!granted) {
                    setLiveToggleLoading(false);
                    return;
                }

                // Store the vendor ID so the background task can access it
                await AsyncStorage.setItem(VENDOR_ID_STORAGE_KEY, user.id);

                // Start background location updates
                const result = await locationService.startBackgroundLocationUpdates();
                if (!result.success) {
                    Alert.alert('Error', result.error || 'Could not start live location.');
                    setLiveToggleLoading(false);
                    return;
                }

                setIsLiveTracking(true);
                Alert.alert(
                    'Live Location Active',
                    'Your location will now update automatically, even when the app is in the background.'
                );
            } else {
                await locationService.stopBackgroundLocationUpdates();
                setIsLiveTracking(false);
            }
        } catch (e) {
            console.error('Error toggling live tracking:', e);
            Alert.alert('Error', 'Something went wrong. Please try again.');
        }
        setLiveToggleLoading(false);
    };

    const formatTime = (date) => {
        if (!date) return '';
        return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        {vendor?.cover_image_url ? (
                            <Image source={{ uri: vendor.cover_image_url }} style={styles.storeIconImg} />
                        ) : (
                            <View style={styles.storeIcon}>
                                <MaterialIcons name="storefront" size={24} color={Colors.primary} />
                            </View>
                        )}
                        <View>
                            <Text style={styles.shopName}>{vendor?.shop_name || 'My Shop'}</Text>
                            <Text style={styles.shopLocation}>{vendor?.address || 'Set your location below'}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.content}>
                    {/* Shop Status */}
                    <View style={styles.statusCard}>
                        <View>
                            <Text style={styles.statusTitle}>Shop Status</Text>
                            <Text style={styles.statusDesc}>
                                You are currently{' '}
                                <Text style={{ color: Colors.primary, fontWeight: '700' }}>
                                    {isOpen ? 'Open' : 'Closed'}
                                </Text>{' '}
                                for business
                            </Text>
                        </View>
                        <Switch
                            value={isOpen}
                            onValueChange={toggleOpenStatus}
                            trackColor={{ false: Colors.gray200, true: Colors.primary }}
                            thumbColor={Colors.white}
                        />
                    </View>

                    {/* Stats Grid */}
                    <View style={styles.statsGrid}>
                        <View style={[styles.statCard, styles.statCardPrimary]}>
                            <View style={styles.statHeader}>
                                <MaterialIcons name="star" size={18} color={Colors.primary} />
                                <Text style={styles.statLabel}>RATING</Text>
                            </View>
                            <Text style={styles.statValue}>{Number(vendor?.rating || 0).toFixed(1)}</Text>
                            <Text style={styles.statSub}>Total reviews</Text>
                        </View>
                        <View style={styles.statCard}>
                            <View style={styles.statHeader}>
                                <MaterialIcons name="inventory-2" size={18} color={Colors.gray600} />
                                <Text style={[styles.statLabel, { color: Colors.gray600 }]}>PRODUCTS</Text>
                            </View>
                            <Text style={styles.statValue}>{productCount}</Text>
                            <Text style={styles.statSub}>Manage in inventory</Text>
                        </View>
                    </View>

                    {/* Quick Actions */}
                    <TouchableOpacity
                        style={styles.offerBtn}
                        activeOpacity={0.8}
                        onPress={() => navigation.getParent()?.navigate('SendOffer')}
                    >
                        <MaterialIcons name="campaign" size={22} color={Colors.white} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.offerBtnTitle}>Send Offer Notification</Text>
                            <Text style={styles.offerBtnSub}>Notify customers who favorited your shop</Text>
                        </View>
                        <MaterialIcons name="chevron-right" size={24} color="rgba(255,255,255,0.7)" />
                    </TouchableOpacity>

                    {/* Current Location */}
                    <View style={styles.locationSection}>
                        <View style={styles.locationHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Text style={styles.locationTitle}>Current Location</Text>
                                {isLiveTracking && (
                                    <Animated.View style={[styles.liveBadge, { opacity: pulseAnim }]}>
                                        <View style={styles.liveDot} />
                                        <Text style={styles.liveText}>LIVE</Text>
                                    </Animated.View>
                                )}
                            </View>
                        </View>

                        <View style={styles.mapCard}>
                            <View style={styles.mapPlaceholder}>
                                {location ? (
                                    <View style={styles.mapImage}>
                                        <WebView
                                            key={`${location.latitude}-${location.longitude}`}
                                            originWhitelist={['*']}
                                            source={{
                                                html: `
                                                <!DOCTYPE html>
                                                <html>
                                                <head>
                                                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                                                    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                                                    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                                                    <style>*{margin:0;padding:0}html,body,#map{width:100%;height:100%}</style>
                                                </head>
                                                <body>
                                                    <div id="map"></div>
                                                    <script>
                                                        var map = L.map('map', { zoomControl: false, attributionControl: false })
                                                            .setView([${location.latitude}, ${location.longitude}], 16);
                                                        L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', { maxZoom: 19, subdomains: 'abc' }).addTo(map);
                                                        var icon = L.divIcon({
                                                            className: 'pin',
                                                            html: '<div style="width:16px;height:16px;border-radius:50%;background:#16a34a;border:3px solid white;box-shadow:0 0 0 5px rgba(22,163,74,0.25),0 2px 6px rgba(0,0,0,0.3);"></div>',
                                                            iconSize: [16,16], iconAnchor: [8,8]
                                                        });
                                                        L.marker([${location.latitude}, ${location.longitude}], { icon: icon }).addTo(map);
                                                    </script>
                                                </body>
                                                </html>
                                            ` }}
                                            style={StyleSheet.absoluteFillObject}
                                            javaScriptEnabled={true}
                                            scrollEnabled={true}
                                        />
                                    </View>
                                ) : (
                                    <View style={[styles.mapImage, { backgroundColor: Colors.gray200, justifyContent: 'center', alignItems: 'center' }]}>
                                        <MaterialIcons name="map" size={48} color={Colors.gray400} />
                                        <Text style={{ color: Colors.gray500, marginTop: 8 }}>Location not set</Text>
                                    </View>
                                )}
                                {/* Location pin */}
                                {location && (
                                    <View style={styles.pinContainer}>
                                        <View style={styles.pinPulse} />
                                        <View style={styles.pinDot} />
                                        <View style={styles.pinStick} />
                                    </View>
                                )}
                                {/* Coordinate Badge */}
                                <View style={styles.coordBadge}>
                                    <View style={styles.coordRow}>
                                        <MaterialIcons name="my-location" size={14} color={Colors.primary} />
                                        <Text style={styles.coordText}>
                                            {location
                                                ? `Lat: ${location.latitude.toFixed(4)}, Long: ${location.longitude.toFixed(4)}`
                                                : 'Location not set'
                                            }
                                        </Text>
                                    </View>
                                    <Text style={styles.lastUpdated}>
                                        {lastUpdated ? `Last updated: ${formatTime(lastUpdated)}` : 'Status: Missing'}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.mapActions}>
                                <TouchableOpacity
                                    style={[styles.updateLocationBtn, locationLoading && { opacity: 0.7 }]}
                                    onPress={handleUpdateLocation}
                                    disabled={locationLoading}
                                >
                                    {locationLoading ? (
                                        <ActivityIndicator color={Colors.white} size="small" />
                                    ) : (
                                        <MaterialIcons name="near-me" size={20} color={Colors.white} />
                                    )}
                                    <Text style={styles.updateLocationText}>
                                        {locationLoading ? 'Updating...' : 'Update Live Location'}
                                    </Text>
                                </TouchableOpacity>
                                <Text style={styles.updateNote}>This will update your location for nearby customers.</Text>
                            </View>
                        </View>

                        {/* Live Location Toggle Card */}
                        <View style={styles.liveTrackingCard}>
                            <View style={styles.liveTrackingLeft}>
                                <View style={[styles.liveTrackingIcon, isLiveTracking && styles.liveTrackingIconActive]}>
                                    <MaterialIcons
                                        name={isLiveTracking ? 'location-on' : 'location-off'}
                                        size={22}
                                        color={isLiveTracking ? Colors.white : Colors.gray500}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.liveTrackingTitle}>Live Location Tracking</Text>
                                    <Text style={styles.liveTrackingSub}>
                                        {isLiveTracking
                                            ? 'Location is updating in the background'
                                            : 'Keep updating location even when app is closed'
                                        }
                                    </Text>
                                </View>
                            </View>
                            {liveToggleLoading ? (
                                <ActivityIndicator color={Colors.primary} size="small" />
                            ) : (
                                <Switch
                                    value={isLiveTracking}
                                    onValueChange={toggleLiveTracking}
                                    trackColor={{ false: Colors.gray200, true: Colors.primary }}
                                    thumbColor={Colors.white}
                                />
                            )}
                        </View>
                    </View>
                </View>
                <View style={{ height: 100 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.white },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    storeIcon: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(22,163,74,0.1)',
        alignItems: 'center', justifyContent: 'center',
    },
    storeIconImg: {
        width: 40, height: 40, borderRadius: 20,
    },
    shopName: { fontSize: 18, fontWeight: '700', color: Colors.textMain },
    shopLocation: { fontSize: 12, color: Colors.gray500, fontWeight: '500' },
    content: { paddingHorizontal: 20 },
    statusCard: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 20, borderRadius: 16, borderWidth: 1, borderColor: Colors.gray200,
        backgroundColor: Colors.white, marginBottom: 24,
    },
    statusTitle: { fontSize: 16, fontWeight: '700', color: Colors.textMain },
    statusDesc: { fontSize: 14, color: Colors.gray500, marginTop: 4, fontWeight: '500' },
    statsGrid: { flexDirection: 'row', gap: 16, marginBottom: 32 },
    statCard: {
        flex: 1, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: Colors.gray200,
        backgroundColor: '#f8fafc',
    },
    statCardPrimary: {
        backgroundColor: 'rgba(22,163,74,0.08)', borderColor: 'rgba(22,163,74,0.2)',
    },
    statHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    statLabel: { fontSize: 10, fontWeight: '700', color: Colors.primary, letterSpacing: 1 },
    statValue: { fontSize: 28, fontWeight: '700', color: Colors.textMain },
    statSub: { fontSize: 12, color: Colors.gray500, marginTop: 4 },
    locationSection: { marginBottom: 16 },
    locationHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
    },
    locationTitle: { fontSize: 16, fontWeight: '700', color: Colors.textMain },
    editDetails: { fontSize: 12, fontWeight: '700', color: Colors.primary },
    mapCard: {
        borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: Colors.gray200,
        backgroundColor: Colors.white,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8,
    },
    mapPlaceholder: {
        height: 192, backgroundColor: Colors.gray200, position: 'relative',
    },
    mapImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    pinContainer: { position: 'absolute', top: '50%', left: '50%', marginLeft: -8, marginTop: -24, alignItems: 'center' },
    pinPulse: {
        position: 'absolute', width: 48, height: 48, borderRadius: 24,
        backgroundColor: 'rgba(22,163,74,0.15)', top: -12, left: -16,
    },
    pinDot: {
        width: 16, height: 16, borderRadius: 8, backgroundColor: Colors.primary,
        borderWidth: 2, borderColor: Colors.white, zIndex: 2,
    },
    pinStick: {
        width: 4, height: 24, backgroundColor: Colors.primary, borderRadius: 2, marginTop: -2,
    },
    coordBadge: {
        position: 'absolute', bottom: 12, left: 12, backgroundColor: 'rgba(255,255,255,0.9)',
        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    },
    coordRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    coordText: { fontSize: 11, fontWeight: '700', color: Colors.textMain },
    lastUpdated: { fontSize: 9, color: Colors.gray500, marginLeft: 22, marginTop: 2 },
    mapActions: { padding: 20 },
    updateLocationBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: 12,
        shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
    },
    updateLocationText: { fontSize: 15, fontWeight: '700', color: Colors.white },
    updateNote: { fontSize: 12, color: Colors.gray500, textAlign: 'center', marginTop: 8 },
    offerBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: Colors.primary, padding: 16, borderRadius: 14,
        marginBottom: 20,
        shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8,
        elevation: 4,
    },
    offerBtnTitle: { fontSize: 14, fontWeight: '700', color: Colors.white },
    offerBtnSub: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

    // Live Location Toggle
    liveTrackingCard: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 16, borderRadius: 16, borderWidth: 1, borderColor: Colors.gray200,
        backgroundColor: Colors.white, marginTop: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,
    },
    liveTrackingLeft: {
        flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1,
    },
    liveTrackingIcon: {
        width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.gray100,
        alignItems: 'center', justifyContent: 'center',
    },
    liveTrackingIconActive: {
        backgroundColor: Colors.primary,
    },
    liveTrackingTitle: { fontSize: 14, fontWeight: '700', color: Colors.textMain },
    liveTrackingSub: { fontSize: 11, color: Colors.gray500, marginTop: 2 },

    // LIVE Badge
    liveBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
    },
    liveDot: {
        width: 6, height: 6, borderRadius: 3, backgroundColor: '#16a34a',
    },
    liveText: {
        fontSize: 9, fontWeight: '800', color: '#16a34a', letterSpacing: 1,
    },
});
