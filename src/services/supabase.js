import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://zbawrdurffblxwzqlcdx.supabase.co';
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiYXdyZHVyZmZibHh3enFsY2R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MjgwMDIsImV4cCI6MjA4ODIwNDAwMn0.oPzjDib3Qu_c29Zo9FU-phbb4oHg9E9_42CzzpX0ZO4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
