import { supabase } from './supabase';

const getAutoIconForCategory = (name) => {
    const n = name.toLowerCase();
    
    // Food & Dining
    if (n.includes('food') || n.includes('meal') || n.includes('restaurant')) return 'restaurant';
    if (n.includes('fruit') || n.includes('apple') || n.includes('berry')) return 'apple';
    if (n.includes('veg')) return 'grass';
    if (n.includes('baker') || n.includes('bread') || n.includes('cake') || n.includes('sweet') || n.includes('dessert')) return 'bakery-dining';
    if (n.includes('snack') || n.includes('fast')) return 'fastfood';
    if (n.includes('meat') || n.includes('chicken') || n.includes('beef') || n.includes('fish')) return 'set-meal';
    if (n.includes('cafe') || n.includes('coffee') || n.includes('tea')) return 'local-cafe';
    if (n.includes('bev') || n.includes('drink') || n.includes('juice')) return 'local-bar';
    if (n.includes('pizza')) return 'local-pizza';
    if (n.includes('ice cream') || n.includes('gelato')) return 'icecream';

    // Shopping & Items
    if (n.includes('craft') || n.includes('art') || n.includes('handmade')) return 'palette';
    if (n.includes('cloth') || n.includes('apparel') || n.includes('wear') || n.includes('fashion') || n.includes('garment')) return 'checkroom';
    if (n.includes('electronics') || n.includes('tech') || n.includes('phone') || n.includes('computer') || n.includes('mobile')) return 'devices';
    if (n.includes('book') || n.includes('read') || n.includes('stationery') || n.includes('paper')) return 'menu-book';
    if (n.includes('beauty') || n.includes('cosmetic') || n.includes('makeup') || n.includes('hair')) return 'face';
    if (n.includes('home') || n.includes('decor') || n.includes('furniture')) return 'home';
    if (n.includes('toy') || n.includes('game') || n.includes('kid')) return 'toys';
    if (n.includes('sport') || n.includes('fitness') || n.includes('gym')) return 'sports-soccer';
    if (n.includes('gift') || n.includes('present')) return 'card-giftcard';
    if (n.includes('pet') || n.includes('animal') || n.includes('dog') || n.includes('cat')) return 'pets';
    if (n.includes('grocery') || n.includes('market') || n.includes('supermarket')) return 'local-grocery-store';
    if (n.includes('medicine') || n.includes('health') || n.includes('pharmacy') || n.includes('drug')) return 'medical-services';
    if (n.includes('flower') || n.includes('plant') || n.includes('nursery')) return 'local-florist';
    if (n.includes('shoe') || n.includes('footwear')) return 'do-not-step';
    if (n.includes('bag') || n.includes('luggage')) return 'luggage';
    if (n.includes('jewel') || n.includes('ring') || n.includes('watch')) return 'diamond';
    
    // General / Miscellaneous
    if (n.includes('service') || n.includes('repair')) return 'build';
    if (n.includes('auto') || n.includes('car') || n.includes('vehicle')) return 'directions-car';
    if (n.includes('hardware') || n.includes('tool')) return 'hardware';
    
    return 'category'; // Default fallback
};

export const adminService = {
    // ─── Dashboard Stats ─────────────
    async getDashboardStats() {
        try {
            // Get all vendors (RLS policy allows this for admins)
            const { data: allVendors, error: vErr } = await supabase
                .from('vendors')
                .select('is_suspended');

            let totalVendors = 0;
            let activeVendors = 0;
            let suspendedVendors = 0;

            if (allVendors && !vErr) {
                totalVendors = allVendors.length;
                activeVendors = allVendors.filter(v => v.is_suspended === false || v.is_suspended === null).length;
                suspendedVendors = allVendors.filter(v => v.is_suspended === true).length;
            }

            // Get all customers (users where role='customer')
            const { data: allCustomers, error: cErr } = await supabase
                .from('users')
                .select('id')
                .eq('role', 'customer');

            let totalCustomers = 0;
            if (allCustomers && !cErr) {
                totalCustomers = allCustomers.length;
            }

            return {
                data: {
                    totalVendors,
                    totalCustomers,
                    activeVendors,
                    suspendedVendors,
                },
                error: null,
            };
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            return { data: null, error };
        }
    },

    // ─── Recent Activities ─────────────
    async getRecentActivities(limit = 10) {
        try {
            // Fetch the most recently created/updated vendors as activity
            const { data: recentVendors, error } = await supabase
                .from('vendors')
                .select('id, shop_name, cover_image_url, is_suspended, created_at, description')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            const activities = (recentVendors || []).map((v) => ({
                id: v.id,
                name: v.shop_name || 'Unknown Vendor',
                image: v.cover_image_url,
                description: v.is_suspended ? 'Account suspended' : 'New vendor signup',
                status: v.is_suspended ? 'Suspended' : 'Active',
                time: v.created_at,
            }));

            return { data: activities, error: null };
        } catch (error) {
            console.error('Error fetching recent activities:', error);
            return { data: [], error };
        }
    },

    // ─── Vendor Management ─────────────
    async getAllVendorsForAdmin() {
        try {
            const { data, error } = await supabase
                .from('vendors')
                .select(`
                    id,
                    shop_name,
                    description,
                    cover_image_url,
                    is_open,
                    is_suspended,
                    created_at,
                    products(category)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Determine all categories from products
            const vendors = (data || []).map((v) => {
                const productCategories = (v.products || []).map((p) => p.category).filter(Boolean);
                const uniqueCategories = [...new Set(productCategories)];
                const primaryCategory = uniqueCategories.length > 0 ? uniqueCategories[0] : 'General';
                return {
                    ...v,
                    categories: uniqueCategories,
                    primaryCategory,
                    status: v.is_suspended ? 'Suspended' : 'Active',
                };
            });

            return { data: vendors, error: null };
        } catch (error) {
            console.error('Error fetching vendors for admin:', error);
            return { data: [], error };
        }
    },

    async suspendVendor(vendorId, userId) {
        try {
            // Update vendor record
            const { data: vData, error: vErr } = await supabase
                .from('vendors')
                .update({ is_suspended: true })
                .eq('id', vendorId)
                .select();

            if (vErr) throw vErr;
            if (!vData || vData.length === 0) throw new Error('Update failed: Vendor not found or permission denied');

            // Also update global user record so login is blocked
            if (userId) {
                await supabase
                    .from('users')
                    .update({ is_suspended: true })
                    .eq('id', userId);
            }

            return { data: true, error: null };
        } catch (error) {
            console.error('Error suspending vendor:', error);
            return { data: null, error };
        }
    },

    async unsuspendVendor(vendorId, userId) {
        try {
            // Update vendor record
            const { data: vData, error: vErr } = await supabase
                .from('vendors')
                .update({ is_suspended: false })
                .eq('id', vendorId)
                .select();

            if (vErr) throw vErr;
            if (!vData || vData.length === 0) throw new Error('Update failed: Vendor not found or permission denied');

            // Also update global user record
            if (userId) {
                await supabase
                    .from('users')
                    .update({ is_suspended: false })
                    .eq('id', userId);
            }

            return { data: true, error: null };
        } catch (error) {
            console.error('Error unsuspending vendor:', error);
            return { data: null, error };
        }
    },

    // ─── Customer Management ─────────────
    async getAllCustomers() {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, first_name, last_name, email, role, is_suspended, created_at')
                .eq('role', 'customer')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const customers = (data || []).map((c) => ({
                ...c,
                name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email,
                status: c.is_suspended ? 'Suspended' : 'Active',
            }));

            return { data: customers, error: null };
        } catch (error) {
            console.error('Error fetching customers:', error);
            return { data: [], error };
        }
    },

    async suspendCustomer(userId) {
        try {
            const { data, error } = await supabase
                .from('users')
                .update({ is_suspended: true })
                .eq('id', userId)
                .select();

            if (error) throw error;
            if (!data || data.length === 0) throw new Error('Update failed: User not found or permission denied');
            return { data: true, error: null };
        } catch (error) {
            console.error('Error suspending customer:', error);
            return { data: null, error };
        }
    },

    async unsuspendCustomer(userId) {
        try {
            const { data, error } = await supabase
                .from('users')
                .update({ is_suspended: false })
                .eq('id', userId)
                .select();

            if (error) throw error;
            if (!data || data.length === 0) throw new Error('Update failed: User not found or permission denied');
            return { data: true, error: null };
        } catch (error) {
            console.error('Error unsuspending customer:', error);
            return { data: null, error };
        }
    },

    // ─── Category Management (Supabase) ─────────────
    async getCategories() {
        try {
            // First get actual categories
            const { data: catData, error: catErr } = await supabase
                .from('categories')
                .select('*')
                .order('name');

            if (catErr) throw catErr;

            // Then get products to count
            const { data: productsData, error: pErr } = await supabase
                .from('products')
                .select('category');

            if (pErr) throw pErr;

            // Count items per category
            const categoryMap = {};
            (productsData || []).forEach((p) => {
                const cat = p.category || 'Uncategorized';
                categoryMap[cat] = (categoryMap[cat] || 0) + 1;
            });

            const categories = (catData || []).map(c => ({
                id: c.id,
                name: c.name,
                icon: c.icon || 'category',
                itemCount: categoryMap[c.name] || 0
            }));

            return { data: categories, error: null };
        } catch (error) {
            console.error('Error fetching categories:', error);
            return { data: [], error };
        }
    },

    async addCategory(name, icon = null) {
        try {
            const resolvedIcon = icon || getAutoIconForCategory(name);
            const { data, error } = await supabase
                .from('categories')
                .insert([{ name, icon: resolvedIcon }])
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error adding category:', error);
            return { data: null, error };
        }
    },

    // Not strictly needed if admin doesn't reorder them manually anymore, but keep for compatibility if needed
    async saveCategories(categoriesList) {
        return { error: null };
    },

    async updateProductCategory(oldName, newName) {
        try {
            // Update the category name in categories table
            const { error: catErr } = await supabase
                .from('categories')
                .update({ name: newName })
                .eq('name', oldName);

            if (catErr) throw catErr;

            // Update all products to the new name
            const { data, error } = await supabase
                .from('products')
                .update({ category: newName })
                .eq('category', oldName)
                .select();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error updating category:', error);
            return { data: null, error };
        }
    },

    async deleteCategory(categoryName) {
        try {
            // Delete from categories table
            const { error: delErr } = await supabase
                .from('categories')
                .delete()
                .eq('name', categoryName);

            if (delErr) throw delErr;

            // Set category to 'Uncategorized' for all products in this category
            const { data, error } = await supabase
                .from('products')
                .update({ category: 'Uncategorized' })
                .eq('category', categoryName)
                .select();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error deleting category:', error);
            return { data: null, error };
        }
    },

    // ─── Check if user is suspended ─────────────
    async checkUserSuspended(userId) {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('is_suspended')
                .eq('id', userId)
                .single();

            if (error) throw error;
            return { isSuspended: data?.is_suspended === true, error: null };
        } catch (error) {
            console.error('Error checking suspension:', error);
            return { isSuspended: false, error };
        }
    },

    async checkVendorSuspended(userId) {
        try {
            const { data, error } = await supabase
                .from('vendors')
                .select('is_suspended')
                .eq('id', userId)
                .single();

            if (error) throw error;
            return { isSuspended: data?.is_suspended === true, error: null };
        } catch (error) {
            console.error('Error checking vendor suspension:', error);
            return { isSuspended: false, error };
        }
    },

    // ─── Category Requests (Vendor Suggestions) ─────────────
    async submitCategoryRequest(name, vendorId, vendorName) {
        try {
            // Check if the category already exists in approved categories
            const { data: existing } = await supabase
                .from('categories')
                .select('name')
                .ilike('name', name);

            if (existing && existing.length > 0) {
                return { data: null, error: { message: 'This category already exists.' } };
            }

            // Check if a pending request with same name already exists
            const { data: pendingExisting } = await supabase
                .from('category_requests')
                .select('name')
                .ilike('name', name)
                .eq('status', 'pending');

            if (pendingExisting && pendingExisting.length > 0) {
                return { data: null, error: { message: 'A request for this category is already pending.' } };
            }

            const { data, error } = await supabase
                .from('category_requests')
                .insert([{ name: name.trim(), requested_by: vendorId, vendor_name: vendorName || 'Unknown Vendor', status: 'pending' }])
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error submitting category request:', error);
            return { data: null, error };
        }
    },

    async getPendingCategoryRequests() {
        try {
            const { data, error } = await supabase
                .from('category_requests')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { data: data || [], error: null };
        } catch (error) {
            console.error('Error fetching pending category requests:', error);
            return { data: [], error };
        }
    },

    async approveCategoryRequest(requestId, categoryName) {
        try {
            // 1. Add to the real categories table
            const { error: addErr } = await supabase
                .from('categories')
                .insert([{ name: categoryName, icon: getAutoIconForCategory(categoryName) }]);

            if (addErr) throw addErr;

            // 2. Mark the request as approved
            const { error: updateErr } = await supabase
                .from('category_requests')
                .update({ status: 'approved' })
                .eq('id', requestId);

            if (updateErr) throw updateErr;

            return { data: true, error: null };
        } catch (error) {
            console.error('Error approving category request:', error);
            return { data: null, error };
        }
    },

    async rejectCategoryRequest(requestId, categoryName) {
        try {
            // 1. Mark the request as rejected
            const { error: updateErr } = await supabase
                .from('category_requests')
                .update({ status: 'rejected' })
                .eq('id', requestId);

            if (updateErr) throw updateErr;

            // 2. Move any products using this pending category to 'Uncategorized'
            if (categoryName) {
                await supabase
                    .from('products')
                    .update({ category: 'Uncategorized' })
                    .eq('category', categoryName);
            }

            return { data: true, error: null };
        } catch (error) {
            console.error('Error rejecting category request:', error);
            return { data: null, error };
        }
    },

    async getMyPendingRequests(vendorId) {
        try {
            const { data, error } = await supabase
                .from('category_requests')
                .select('*')
                .eq('requested_by', vendorId)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { data: data || [], error: null };
        } catch (error) {
            console.error('Error fetching my pending requests:', error);
            return { data: [], error };
        }
    },
};

