import { supabase } from './supabase';

export const vendorService = {
    /**
     * Fetch all vendors regardless of open status
     */
    async getAllVendors() {
        try {
            const { data, error } = await supabase
                .from('vendors')
                .select(`
                    id, 
                    shop_name, 
                    description, 
                    location_lat, 
                    location_lng, 
                    address, 
                    rating, 
                    reviews_count,
                    is_open,
                    cover_image_url,
                    last_location_update,
                    image_urls,
                    phone,
                    products(category)
                `)
                .limit(50);

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error fetching all vendors:', error);
            return { data: null, error };
        }
    },

    /**
     * Fetch all open vendors (e.g., for the main Vendors Feed/Map)
     */
    async getActiveVendors() {
        try {
            const { data, error } = await supabase
                .from('vendors')
                .select(`
                    id, 
                    shop_name, 
                    description, 
                    location_lat, 
                    location_lng, 
                    address, 
                    rating, 
                    reviews_count,
                    is_open,
                    cover_image_url,
                    last_location_update,
                    image_urls,
                    phone
                `)
                .eq('is_open', true)
                .limit(50);

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error fetching vendors:', error);
            return { data: null, error };
        }
    },

    /**
     * Fetch a vendor by their ID
     */
    async getVendorById(vendorId) {
        try {
            const { data, error } = await supabase
                .from('vendors')
                .select('*')
                .eq('id', vendorId)
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error fetching vendor profile:', error);
            return { data: null, error };
        }
    },

    /**
     * Update vendor location and open status (Crucial real-time feature)
     */
    async updateVendorStatus(vendorId, updates) {
        try {
            // Automatically log the timestamp if we are updating the coordinates
            if (updates.location_lat !== undefined && updates.location_lng !== undefined) {
                updates.last_location_update = new Date().toISOString();
            }

            const { data, error } = await supabase
                .from('vendors')
                .update(updates)
                .eq('id', vendorId)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error updating vendor status:', error);
            return { data: null, error };
        }
    }
};
