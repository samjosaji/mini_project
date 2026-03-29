import { supabase } from './supabase';

export const notificationService = {
    /**
     * Send notifications to all customers who favorited a vendor (new product added)
     */
    async sendNewProductNotifications(vendorId, productName, shopName) {
        try {
            // Get all customers who favorited this vendor
            const { data: favorites, error: favError } = await supabase
                .from('favorites')
                .select('customer_id')
                .eq('vendor_id', vendorId)
                .is('product_id', null);

            if (favError || !favorites || favorites.length === 0) return;

            // Create a notification for each customer
            const notifications = favorites.map(fav => ({
                customer_id: fav.customer_id,
                vendor_id: vendorId,
                title: `New from ${shopName || 'a vendor'}!`,
                message: `"${productName}" has been added. Check it out!`,
                type: 'new_product',
                is_read: false,
            }));

            const { error } = await supabase
                .from('notifications')
                .insert(notifications);

            if (error) console.error('Error sending notifications:', error);
        } catch (err) {
            console.error('Error in sendNewProductNotifications:', err);
        }
    },

    /**
     * Send a custom offer/announcement notification from vendor to all favorited customers
     */
    async sendOfferNotification(vendorId, shopName, title, message) {
        try {
            const { data: favorites, error: favError } = await supabase
                .from('favorites')
                .select('customer_id')
                .eq('vendor_id', vendorId)
                .is('product_id', null);

            if (favError || !favorites || favorites.length === 0) {
                return { sent: 0, error: favorites?.length === 0 ? 'No customers have favorited your shop yet.' : favError?.message };
            }

            const notifications = favorites.map(fav => ({
                customer_id: fav.customer_id,
                vendor_id: vendorId,
                title: title || `Offer from ${shopName}!`,
                message: message,
                type: 'offer',
                is_read: false,
            }));

            const { error } = await supabase
                .from('notifications')
                .insert(notifications);

            if (error) {
                return { sent: 0, error: error.message };
            }
            return { sent: favorites.length, error: null };
        } catch (err) {
            return { sent: 0, error: err.message };
        }
    },

    /**
     * Get all notifications for a customer
     */
    async getNotifications(customerId) {
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*, vendors(shop_name, cover_image_url)')
                .eq('customer_id', customerId)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error fetching notifications:', error);
            return { data: [], error };
        }
    },

    /**
     * Get unread notification count
     */
    async getUnreadCount(customerId) {
        try {
            const { count, error } = await supabase
                .from('notifications')
                .select('id', { count: 'exact', head: true })
                .eq('customer_id', customerId)
                .eq('is_read', false);

            if (error) throw error;
            return count || 0;
        } catch (error) {
            return 0;
        }
    },

    /**
     * Mark a single notification as read
     */
    async markAsRead(notificationId) {
        try {
            await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notificationId);
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    },

    /**
     * Mark all notifications as read for a customer
     */
    async markAllAsRead(customerId) {
        try {
            await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('customer_id', customerId)
                .eq('is_read', false);
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    },

    /**
     * Delete all notifications for a customer
     */
    async deleteAllNotifications(customerId) {
        try {
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('customer_id', customerId);
            if (error) throw error;
            return { error: null };
        } catch (error) {
            console.error('Error deleting notifications:', error);
            return { error };
        }
    },

    // ─── Favorites helpers ───────────────
    async addFavorite(customerId, vendorId, productId = null) {
        try {
            const { data, error } = await supabase
                .from('favorites')
                .insert({
                    customer_id: customerId,
                    vendor_id: vendorId,
                    product_id: productId
                })
                .select()
                .single();
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    },

    async removeFavorite(customerId, vendorId, productId = null) {
        try {
            let query = supabase
                .from('favorites')
                .delete()
                .eq('customer_id', customerId);

            if (productId) {
                query = query.eq('product_id', productId);
            } else {
                query = query.eq('vendor_id', vendorId).is('product_id', null);
            }

            const { error } = await query;
            if (error) throw error;
            return { error: null };
        } catch (error) {
            return { error };
        }
    },

    async isFavorited(customerId, vendorId, productId = null) {
        try {
            let query = supabase
                .from('favorites')
                .select('id')
                .eq('customer_id', customerId);

            if (productId) {
                query = query.eq('product_id', productId);
            } else {
                query = query.eq('vendor_id', vendorId).is('product_id', null);
            }

            const { data, error } = await query.maybeSingle();
            return !!data;
        } catch {
            return false;
        }
    },

    async getFavoriteVendors(customerId) {
        try {
            const { data, error } = await supabase
                .from('favorites')
                .select('vendor_id, vendors(id, shop_name, cover_image_url, rating, is_open, location_lat, location_lng, description)')
                .eq('customer_id', customerId)
                .is('product_id', null);
            if (error) throw error;
            return { data: data?.map(f => f.vendors).filter(v => !!v) || [], error: null };
        } catch (error) {
            return { data: [], error };
        }
    },

    async getFavoriteProducts(customerId) {
        try {
            const { data, error } = await supabase
                .from('favorites')
                .select(`
                    product_id, 
                    products(
                        *,
                        vendors(shop_name)
                    )
                `)
                .eq('customer_id', customerId)
                .not('product_id', 'is', null);

            if (error) throw error;
            return { data: data?.map(f => f.products).filter(p => !!p) || [], error: null };
        } catch (error) {
            console.error('Error fetching favorite products:', error);
            return { data: [], error };
        }
    },
};
