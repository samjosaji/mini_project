import * as Location from 'expo-location';
import { Alert, Linking, Platform } from 'react-native';
import { BACKGROUND_LOCATION_TASK } from './backgroundLocationTask';

export const locationService = {
    /**
     * Request permissions and get current position
     */
    async getCurrentLocation() {
        try {
            // Then check if device location services (GPS) are actually enabled
            let servicesEnabled = await Location.hasServicesEnabledAsync();
            if (!servicesEnabled) {
                console.warn("Location services are disabled on the device.");
                Alert.alert(
                    "Location Services Disabled",
                    "Please enable Location Services in your device settings to discover nearby vendors.",
                    [
                        { text: "Cancel", style: "cancel" },
                        {
                            text: "Open Settings", onPress: () => {
                                if (Platform.OS === 'ios') {
                                    Linking.openURL('App-Prefs:Privacy&path=LOCATION');
                                } else {
                                    Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS');
                                }
                            }
                        }
                    ]
                );
                return { location: null, error: 'Please enable Location Services in your device settings.' };
            }

            // First, ask for the app's location permission
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                return { location: null, error: 'Permission to access location was denied' };
            }

            // Attempt to get High accuracy location
            try {
                let location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.High,
                });

                return {
                    location: {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                    },
                    error: null,
                };
            } catch (e) {
                // If it fails completely, return an error rather than falling back to low accuracy
                return { location: null, error: 'Could not get high-accuracy location. Please ensure you are outside or near a window for a strong GPS signal.' };
            }
        } catch (error) {
            console.error("Error getting location:", error);
            return { location: null, error: 'Could not determine your location. Please check your GPS connection.' };
        }
    },

    /**
     * Calculate straight-line distance between two coordinates in kilometers
     * using the Haversine formula
     */
    calculateDistanceInKm(lat1, lon1, lat2, lon2) {
        if (!lat1 || !lon1 || !lat2 || !lon2) return null;

        const R = 6371; // Radius of the earth in kilometers
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c; // Distance in kilometers
        return Math.round(distance * 10) / 10; // Return number with 1 decimal place
    },

    deg2rad(deg) {
        return deg * (Math.PI / 180);
    },

    /**
     * Calculate straight-line distance between two coordinates in miles
     */
    calculateDistanceInMiles(lat1, lon1, lat2, lon2) {
        const km = this.calculateDistanceInKm(lat1, lon1, lat2, lon2);
        if (km === null) return null;
        return Math.round((km * 0.621371) * 10) / 10;
    },

    /**
     * Format a timestamp into a relative "time ago" string
     */
    formatTimeAgo(dateString) {
        if (!dateString) return 'Unknown';

        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';

        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h ago`;

        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays}d ago`;

        return date.toLocaleDateString();
    },

    // ─── Background Location Methods ───────────────────────────

    /**
     * Request both foreground AND background location permissions.
     * Background permission must be requested after foreground is granted.
     */
    async requestBackgroundPermission() {
        try {
            // Step 1: Request foreground permission first
            const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
            if (fgStatus !== 'granted') {
                return { granted: false, error: 'Foreground location permission was denied.' };
            }

            // Step 2: Request background permission
            const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
            if (bgStatus !== 'granted') {
                Alert.alert(
                    'Background Location Required',
                    'To keep updating your location when the app is closed, please allow "Always" location access in your device settings.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Open Settings',
                            onPress: () => {
                                if (Platform.OS === 'ios') {
                                    Linking.openURL('app-settings:');
                                } else {
                                    Linking.openSettings();
                                }
                            },
                        },
                    ]
                );
                return { granted: false, error: 'Background location permission was denied.' };
            }

            return { granted: true, error: null };
        } catch (error) {
            console.error('Error requesting background permission:', error);
            return { granted: false, error: 'Could not request background location permission.' };
        }
    },

    /**
     * Start continuous background location updates.
     * Updates are pushed to the registered TaskManager task.
     */
    async startBackgroundLocationUpdates() {
        try {
            // Check if device GPS/location services are enabled
            const servicesEnabled = await Location.hasServicesEnabledAsync();
            if (!servicesEnabled) {
                Alert.alert(
                    'Location Services Disabled',
                    'Please enable GPS/Location Services in your device settings to use live location tracking.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Open Settings',
                            onPress: () => {
                                if (Platform.OS === 'ios') {
                                    Linking.openURL('App-Prefs:Privacy&path=LOCATION');
                                } else {
                                    Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS');
                                }
                            },
                        },
                    ]
                );
                return { success: false, error: 'Location services are disabled on this device.' };
            }

            const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
            if (isRunning) {
                console.log('[LocationService] Background location already running.');
                return { success: true, error: null };
            }

            await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
                accuracy: Location.Accuracy.Balanced,
                timeInterval: 30000,        // every 30 seconds
                distanceInterval: 10,        // or every 10 meters
                deferredUpdatesInterval: 30000,
                showsBackgroundLocationIndicator: true, // iOS: show blue bar
                foregroundService: {
                    notificationTitle: 'VendoraApp',
                    notificationBody: 'Live location is active — customers can find you.',
                    notificationColor: '#2e7d32',
                },
            });

            console.log('[LocationService] Background location started.');
            return { success: true, error: null };
        } catch (error) {
            console.error('Error starting background location:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Stop background location updates.
     */
    async stopBackgroundLocationUpdates() {
        try {
            const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
            if (isRunning) {
                await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
                console.log('[LocationService] Background location stopped.');
            }
            return { success: true, error: null };
        } catch (error) {
            console.error('Error stopping background location:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Check if background location updates are currently running.
     */
    async isBackgroundLocationRunning() {
        try {
            return await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        } catch {
            return false;
        }
    },
};
