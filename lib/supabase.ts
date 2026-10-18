import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

type AuthStorageAdapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

const serverSideStorage = new Map<string, string>();

const webStorageAdapter: AuthStorageAdapter = {
  getItem: async (key) => {
    if (typeof window === 'undefined') {
      return serverSideStorage.get(key) ?? null;
    }
    return window.localStorage.getItem(key);
  },
  setItem: async (key, value) => {
    if (typeof window === 'undefined') {
      serverSideStorage.set(key, value);
      return;
    }
    window.localStorage.setItem(key, value);
  },
  removeItem: async (key) => {
    if (typeof window === 'undefined') {
      serverSideStorage.delete(key);
      return;
    }
    window.localStorage.removeItem(key);
  },
};

const nativeStorageAdapter: AuthStorageAdapter = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

const authStorage = Platform.OS === 'web' ? webStorageAdapter : nativeStorageAdapter;

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env, then restart Expo.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});