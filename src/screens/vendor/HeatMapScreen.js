import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { locationService } from '../../services/locationService';

export default function HeatMapScreen() {
    const { user } = useAuth();
    const [vendors, setVendors] = useState([]);
    const [myLocation, setMyLocation] = useState(null);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [user])
    );

    const fetchData = async () => {
        setLoading(true);

        // Fetch all vendors with location
        const { data, error } = await supabase
            .from('vendors')
            .select('id, shop_name, is_open, location_lat, location_lng, rating')
            .not('location_lat', 'is', null)
            .not('location_lng', 'is', null);

        if (!error && data) {
            setVendors(data);
        }

        // Fetch my own location
        const { location } = await locationService.getCurrentLocation();
        if (location) {
            setMyLocation(location);
        }

        setLoading(false);
    };

    const activeVendors = vendors.filter(v => v.is_open && v.id !== user?.id).length;
    const nearbyVendors = myLocation
        ? vendors.filter(v => {
            if (v.id === user?.id) return false; // Don't count yourself as a "nearby" vendor
            const dist = locationService.calculateDistanceInMiles(
                myLocation.latitude,
                myLocation.longitude,
                v.location_lat,
                v.location_lng
            );
            return dist !== null && dist <= 2;
        }).length
        : 0;

    const centerLat = myLocation?.latitude || (vendors.length > 0 ? vendors[0].location_lat : 20.5937);
    const centerLng = myLocation?.longitude || (vendors.length > 0 ? vendors[0].location_lng : 78.9629);

    const mapHTML = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script src="https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js"></script>
        <style>
            * { margin: 0; padding: 0; }
            html, body, #map { width: 100%; height: 100%; }
        </style>
    </head>
    <body>
        <div id="map"></div>
        <script>
            var map = L.map('map', {
                zoomControl: true,
                attributionControl: false
            }).setView([${centerLat}, ${centerLng}], 13);

            // OpenStreetMap tiles
            L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19
            }).addTo(map);

            var vendors = ${JSON.stringify(vendors.map(v => ({
        id: v.id,
        name: v.shop_name || 'Vendor',
        lat: v.location_lat,
        lng: v.location_lng,
        isOpen: v.is_open,
        isSelf: v.id === user?.id
    })))};

            // Heatmap layer
            var heatData = vendors.map(function(v) {
                return [v.lat, v.lng, 0.8];
            });

            if (heatData.length > 0) {
                L.heatLayer(heatData, {
                    radius: 35,
                    blur: 25,
                    maxZoom: 15,
                    gradient: {
                        0.2: '#22c55e',
                        0.4: '#84cc16',
                        0.6: '#eab308',
                        0.8: '#f97316',
                        1.0: '#ef4444'
                    }
                }).addTo(map);
            }

            // Markers
            vendors.forEach(function(v) {
                var color = v.isSelf ? '#3b82f6' : (v.isOpen ? '#16a34a' : '#9ca3af');
                var icon = L.divIcon({
                    className: 'custom-marker',
                    html: '<div style="width:14px;height:14px;border-radius:50%;background:' + color + ';border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>',
                    iconSize: [14, 14],
                    iconAnchor: [7, 7]
                });
                var label = v.isSelf ? v.name + ' (You)' : v.name;
                var status = v.isOpen ? '<span style="color:#16a34a">● Open</span>' : '<span style="color:#9ca3af">● Closed</span>';
                L.marker([v.lat, v.lng], { icon: icon })
                    .bindPopup('<b>' + label + '</b><br/>' + status)
                    .addTo(map);
            });

            ${myLocation ? `
            // My location blue pulse
            var myIcon = L.divIcon({
                className: 'my-location',
                html: '<div style="width:18px;height:18px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 6px rgba(59,130,246,0.25), 0 2px 8px rgba(0,0,0,0.3);"></div>',
                iconSize: [18, 18],
                iconAnchor: [9, 9]
            });
            L.marker([${myLocation.latitude}, ${myLocation.longitude}], { icon: myIcon })
                .bindPopup('<b>Your Location</b>')
                .addTo(map);
            ` : ''}
        </script>
    </body>
    </html>`;

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={{ marginTop: 12, color: Colors.gray500 }}>Loading vendor map...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={styles.iconWrap}>
                        <MaterialIcons name="map" size={24} color={Colors.primary} />
                    </View>
                    <Text style={styles.title}>Vendor Heat Map</Text>
                </View>
            </View>

            {/* Map */}
            <View style={styles.mapArea}>
                <WebView
                    originWhitelist={['*']}
                    source={{ html: mapHTML }}
                    style={StyleSheet.absoluteFillObject}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    scrollEnabled={false}
                />

                {/* Legend overlay */}
                <View style={styles.legend}>
                    <Text style={styles.legendTitle}>Vendor Density</Text>
                    <View style={styles.legendRow}>
                        <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                        <Text style={styles.legendLabel}>High</Text>
                    </View>
                    <View style={styles.legendRow}>
                        <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
                        <Text style={styles.legendLabel}>Medium</Text>
                    </View>
                    <View style={styles.legendRow}>
                        <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
                        <Text style={styles.legendLabel}>Low</Text>
                    </View>
                    <View style={[styles.legendRow, { marginTop: 4 }]}>
                        <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
                        <Text style={styles.legendLabel}>You</Text>
                    </View>
                </View>

                {/* Stats bar */}
                <View style={styles.statsOverlay}>
                    <View style={styles.statBox}>
                        <Text style={styles.statNum}>{activeVendors}</Text>
                        <Text style={styles.statLabel}>Active</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <Text style={styles.statNum}>{nearbyVendors}</Text>
                        <Text style={styles.statLabel}>Nearby</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <Text style={styles.statNum}>{vendors.length}</Text>
                        <Text style={styles.statLabel}>Total</Text>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.white },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
        borderBottomWidth: 1, borderBottomColor: Colors.gray100,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconWrap: {
        width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(22,163,74,0.1)',
        alignItems: 'center', justifyContent: 'center',
    },
    title: { fontSize: 18, fontWeight: '700', color: Colors.textMain },
    mapArea: { flex: 1, position: 'relative' },
    legend: {
        position: 'absolute', top: 16, right: 16, backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 12, padding: 12, gap: 6,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6,
        elevation: 4,
    },
    legendTitle: { fontSize: 11, fontWeight: '700', color: Colors.textMain, marginBottom: 4 },
    legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendLabel: { fontSize: 11, color: Colors.gray500 },
    statsOverlay: {
        position: 'absolute', bottom: 24, left: 16, right: 16,
        flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 16, padding: 16, alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8,
        elevation: 4,
    },
    statBox: { flex: 1, alignItems: 'center' },
    statNum: { fontSize: 24, fontWeight: '700', color: Colors.primary },
    statLabel: { fontSize: 11, color: Colors.gray500, marginTop: 2, fontWeight: '500' },
    statDivider: { width: 1, height: 36, backgroundColor: Colors.gray200 },
});
