import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export const BACKGROUND_LOCATION_TASK = 'VENDOR_BACKGROUND_LOCATION_TASK';
export const VENDOR_ID_STORAGE_KEY = '@vendora_live_location_vendor_id';

/**
 * This task MUST be defined at the top-level scope (outside of any React component).
 * It is invoked by the OS whenever a new background location update is available,
 * even when the app is in the background or terminated (on iOS).
 */
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
        console.error('[BackgroundLocation] Task error:', error.message);
        return;
    }

    if (data) {
        const { locations } = data;
        if (locations && locations.length > 0) {
            const latestLocation = locations[locations.length - 1];
            const { latitude, longitude } = latestLocation.coords;

            try {
                // Read vendor ID from AsyncStorage (since we're outside React context)
                const vendorId = await AsyncStorage.getItem(VENDOR_ID_STORAGE_KEY);
                if (!vendorId) {
                    console.warn('[BackgroundLocation] No vendor ID found in storage, skipping update.');
                    return;
                }

                const timestamp = new Date().toISOString();

                // Push updated coordinates to Supabase
                const { error: updateError } = await supabase
                    .from('vendors')
                    .update({
                        location_lat: latitude,
                        location_lng: longitude,
                        last_location_update: timestamp,
                    })
                    .eq('id', vendorId);

                if (updateError) {
                    console.error('[BackgroundLocation] Supabase update error:', updateError.message);

                    // If the error might be auth-related, try refreshing the session and retrying
                    if (updateError.message?.includes('JWT') || updateError.message?.includes('auth') || updateError.code === 'PGRST301') {
                        console.log('[BackgroundLocation] Attempting session refresh...');
                        const { error: refreshError } = await supabase.auth.refreshSession();
                        if (!refreshError) {
                            // Retry the update after refresh
                            const { error: retryError } = await supabase
                                .from('vendors')
                                .update({
                                    location_lat: latitude,
                                    location_lng: longitude,
                                    last_location_update: timestamp,
                                })
                                .eq('id', vendorId);

                            if (retryError) {
                                console.error('[BackgroundLocation] Retry failed:', retryError.message);
                            } else {
                                console.log(`[BackgroundLocation] Location updated after session refresh: ${latitude.toFixed(4)}, ${longitude.toFixed(4)} at ${timestamp}`);
                            }
                        } else {
                            console.error('[BackgroundLocation] Session refresh failed:', refreshError.message);
                        }
                    }
                } else {
                    console.log(`[BackgroundLocation] Location updated: ${latitude.toFixed(4)}, ${longitude.toFixed(4)} at ${timestamp}`);
                }
            } catch (e) {
                console.error('[BackgroundLocation] Exception pushing location:', e);
            }
        }
    }
});
