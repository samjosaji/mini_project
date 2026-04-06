import { supabase } from './supabase';

export const reviewService = {
    /**
     * Fetch all reviews for a specific product
     */
    async getReviewsByProduct(productId) {
        try {
            const { data, error } = await supabase
                .from('reviews')
                .select(`
                    *,
                    customer:users(first_name, last_name)
                `)
                .eq('product_id', productId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error fetching reviews:', error);
            return { data: null, error };
        }
    },

    /**
     * Fetch all reviews for a specific vendor (across all their products)
     */
    async getReviewsByVendor(vendorId) {
        try {
            const { data, error } = await supabase
                .from('reviews')
                .select(`
                    *,
                    product:products!inner(id, name, vendor_id),
                    customer:users(first_name, last_name)
                `)
                .eq('product.vendor_id', vendorId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error fetching vendor reviews:', error);
            return { data: null, error };
        }
    },

    /**
     * Add a new review for a product
     */
    async addReview(reviewData) {
        try {
            const { data, error } = await supabase
                .from('reviews')
                .insert([reviewData])
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error adding review:', error);
            return { data: null, error };
        }
    },

    /**
     * Update an existing review
     */
    async updateReview(reviewId, updates) {
        try {
            const { data, error } = await supabase
                .from('reviews')
                .update(updates)
                .eq('id', reviewId)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error updating review:', error);
            return { data: null, error };
        }
    },

    /**
     * Get rating summary for a product
     */
    async deleteReview(reviewId) {
        try {
            const { error } = await supabase
                .from('reviews')
                .delete()
                .eq('id', reviewId);

            if (error) throw error;
            return { error: null };
        } catch (error) {
            console.error('Error deleting review:', error);
            return { error };
        }
    },

    /**
     * Get rating summary for a product
     */
    async getRatingSummary(productId) {
        try {
            const { data, error } = await supabase
                .from('reviews')
                .select('rating')
                .eq('product_id', productId);

            if (error) throw error;

            const total = data.length;
            if (total === 0) return { average: 0, count: 0, distribution: [0, 0, 0, 0, 0] };

            const sum = data.reduce((acc, r) => acc + r.rating, 0);
            const dist = [0, 0, 0, 0, 0];
            data.forEach(r => dist[5 - r.rating]++);

            const distribution = dist.map(count => Math.round((count / total) * 100));

            return {
                average: (sum / total).toFixed(1),
                count: total,
                distribution
            };
        } catch (error) {
            console.error('Error getting rating summary:', error);
            return null;
        }
    },

    /**
     * Get rating summary for all reviews of a single vendor
     */
    async getVendorRatingSummary(vendorId) {
        try {
            const { data, error } = await supabase
                .from('reviews')
                .select(`
                    rating,
                    product:products!inner(vendor_id)
                `)
                .eq('product.vendor_id', vendorId);

            if (error) throw error;

            const total = data.length;
            if (total === 0) return { average: 0, count: 0, distribution: [0, 0, 0, 0, 0] };

            const sum = data.reduce((acc, r) => acc + r.rating, 0);
            const dist = [0, 0, 0, 0, 0];
            data.forEach(r => {
                if (r.rating >= 1 && r.rating <= 5) {
                    dist[5 - r.rating]++;
                }
            });

            const distribution = dist.map(count => total > 0 ? Math.round((count / total) * 100) : 0);

            return {
                average: (sum / total).toFixed(1),
                count: total,
                distribution
            };
        } catch (error) {
            console.error('Error getting vendor rating summary:', error);
            return null;
        }
    }
};
