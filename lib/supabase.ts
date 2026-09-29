import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import 'react-native-url-polyfill/auto';

   const ExpoSecureStoreAdapter = {
     getItem: (key: string) => SecureStore.getItemAsync(key),
     setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
     removeItem: (key: string) => SecureStore.deleteItemAsync(key),
   };

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env, then restart Expo.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
     auth: {
       storage: ExpoSecureStoreAdapter,
       persistSession: true,
       autoRefreshToken: true,
       detectSessionInUrl: false,
     },
   });