import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zbawrdurffblxwzqlcdx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiYXdyZHVyZmZibHh3enFsY2R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MjgwMDIsImV4cCI6MjA4ODIwNDAwMn0.oPzjDib3Qu_c29Zo9FU-phbb4oHg9E9_42CzzpX0ZO4';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const locationService = {
    calculateDistanceInKm(lat1, lon1, lat2, lon2) {
        if (!lat1 || !lon1 || !lat2 || !lon2) return null;
        const R = 6371;
        const deg2rad = deg => deg * (Math.PI / 180);
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.round((R * c) * 10) / 10;
    },
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
    }
};

async function test() {
    console.log('Fetching vendors...');
    const { data: vendors, error } = await supabase.from('vendors').select('*').limit(3);
    if (error) { console.error(error); return; }

    vendors.forEach(vendor => {
        console.log(`\nVendor: ${vendor.shop_name}`);
        console.log(`last_location_update: ${vendor.last_location_update}`);

        const customerLocation = { latitude: 37.7749, longitude: -122.4194 };
        let dist = locationService.calculateDistanceInKm(
            customerLocation.latitude, customerLocation.longitude,
            vendor.location_lat, vendor.location_lng
        );
        const timeAgo = vendor.last_location_update ? locationService.formatTimeAgo(vendor.last_location_update) : '';
        const label = timeAgo ? `${dist} km • ${timeAgo}` : `${dist} km away`;

        console.log(`Distance Label: ${label}`);
    });
}
test();
