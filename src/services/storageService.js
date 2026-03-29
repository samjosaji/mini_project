import { supabase } from './supabase';

const SUPABASE_URL = 'https://zbawrdurffblxwzqlcdx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiYXdyZHVyZmZibHh3enFsY2R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MjgwMDIsImV4cCI6MjA4ODIwNDAwMn0.oPzjDib3Qu_c29Zo9FU-phbb4oHg9E9_42CzzpX0ZO4';

export const storageService = {
    /**
     * Upload an image to Supabase Storage using REST API + FormData
     * (Most reliable method for React Native)
     */
    async uploadImage(uri, bucket = 'vendor-assets', folder = 'products') {
        try {
            const ext = uri.split('.').pop()?.split('?')[0] || 'jpg';
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
            const filePath = `${folder}/${fileName}`;

            console.log('[StorageService] Uploading via REST API...');
            console.log('[StorageService] File path:', filePath);

            // Get the current session token for auth
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            if (!token) {
                throw new Error('Not authenticated. Please log in again.');
            }

            // Build FormData with the file URI (React Native handles file:// natively)
            const formData = new FormData();
            formData.append('', {
                uri: uri,
                name: fileName,
                type: `image/${ext === 'png' ? 'png' : 'jpeg'}`,
            });

            // Upload directly via Supabase Storage REST API
            const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${bucket}/${filePath}`;
            const response = await fetch(uploadUrl, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    apikey: SUPABASE_ANON_KEY,
                    'x-upsert': 'true',
                },
                body: formData,
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error('[StorageService] Upload failed:', response.status, errorBody);
                throw new Error(`Upload failed (${response.status}): ${errorBody}`);
            }

            console.log('[StorageService] Upload successful!');

            // Build the public URL
            const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${filePath}`;
            console.log('[StorageService] Public URL:', publicUrl);

            return { url: publicUrl, error: null };
        } catch (error) {
            console.error('[StorageService] Error:', error.message || error);
            return { url: null, error };
        }
    }
};
