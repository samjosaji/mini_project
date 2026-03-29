import { supabase } from './supabase';

export const productService = {
    /**
     * Fetch all available products across all vendors (e.g., for Explore Page)
     */
    async getAllProducts() {
        try {
            const { data, error } = await supabase
                .from('products')
                .select(`
                    *,
                    vendors(id, shop_name, location_lat, location_lng, address, is_open, phone, cover_image_url, rating, reviews_count, image_urls, last_location_update)
                `)
                .eq('is_available', true)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error fetching all products:', error);
            return { data: null, error };
        }
    },

    /**
     * Fetch products for a specific vendor (e.g., for Vendor Inventory Page)
     */
    async getProductsByVendor(vendorId) {
        try {
            const { data, error } = await supabase
                .from('products')
                .select(`
                    *,
                    vendors(id, shop_name, location_lat, location_lng, address, is_open, phone, cover_image_url, rating, reviews_count, image_urls)
                `)
                .eq('vendor_id', vendorId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error fetching vendor products:', error);
            return { data: null, error };
        }
    },

    /**
     * Update an existing product (Vendor only)
     */
    async updateProduct(productId, productData) {
        try {
            const { data, error } = await supabase
                .from('products')
                .update(productData)
                .eq('id', productId)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error updating product:', error);
            return { data: null, error };
        }
    },

    /**
     * Add a new product (Vendor only)
     */
    async addProduct(productData) {
        try {
            const { data, error } = await supabase
                .from('products')
                .insert([productData])
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error adding product:', error);
            return { data: null, error };
        }
    },

    /**
     * Update an existing product (e.g., change price, stock, availability)
     */
    async updateProduct(productId, updates) {
        try {
            const { data, error } = await supabase
                .from('products')
                .update(updates)
                .eq('id', productId)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error updating product:', error);
            return { data: null, error };
        }
    },

    /**
     * Delete a product
     */
    async deleteProduct(productId) {
        try {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', productId);

            if (error) throw error;
            return { success: true, error: null };
        } catch (error) {
            console.error('Error deleting product:', error);
            return { success: false, error };
        }
    },

    /**
     * Increment the view count for a product
     */
    async incrementProductViews(productId) {
        try {
            // We use an RPC call for atomic increment without fetching first
            const { error } = await supabase.rpc('increment_view_count', {
                row_id: productId
            });
            return { success: !error };
        } catch (error) {
            console.error('Error incrementing views:', error);
            return { success: false };
        }
    }
};
