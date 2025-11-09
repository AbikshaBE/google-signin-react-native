import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Secure storage adapter compatible with Supabase auth helpers
const isWeb = Platform.OS === 'web';

const SecureStorage = {
  async getItem(key: string) {
    if (isWeb) {
      return window.localStorage.getItem(key);
    }

    const stored = await SecureStore.getItemAsync(key);
    return stored ?? null;
  },
  async setItem(key: string, value: string) {
    if (isWeb) {
      window.localStorage.setItem(key, value);
      return;
    }

    await SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string) {
    if (isWeb) {
      window.localStorage.removeItem(key);
      return;
    }

    await SecureStore.deleteItemAsync(key);
  },
};

// Expo dev client and production builds expose config in different fields.
type ManifestExtra = { extra?: Record<string, any> };
const manifest2Extra = (Constants as typeof Constants & { manifest2?: ManifestExtra }).manifest2?.extra;

const expoExtra: Record<string, any> =
  Constants.expoConfig?.extra ??
  ((Constants.manifest as Record<string, any> | null)?.extra as Record<string, any> | null) ??
  (manifest2Extra as Record<string, any> | null) ??
  {};

const SUPABASE_URL =
  expoExtra.supabaseUrl ??
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  'https://rdsyndtdjhvhgatmsdgt.supabase.co';
const SUPABASE_ANON_KEY =
  expoExtra.supabaseAnonKey ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkc3luZHRkamh2aGdhdG1zZGd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MDc1OTEsImV4cCI6MjA3ODE4MzU5MX0.Y7CJtPM42mvytYMj-lFyGyKEMEJEeWb6TIqkYbEOxpc';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

class SupabaseConfigurationError extends Error {
  constructor() {
    super(
      'Supabase environment variables are missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (or update app.json extra.supabaseUrl / supabaseAnonKey).'
    );
    this.name = 'SupabaseConfigurationError';
  }
}

let cachedClient: ReturnType<typeof createClient> | null = null;
let hasLoggedMissingConfig = false;

export function getSupabaseClient() {
  if (!isSupabaseConfigured) {
    if (!hasLoggedMissingConfig) {
      console.warn(
        'Supabase credentials are not configured. Update app.json extra or EXPO_PUBLIC_SUPABASE_* env vars to enable remote sync.'
      );
      hasLoggedMissingConfig = true;
    }
    throw new SupabaseConfigurationError();
  }

  if (!cachedClient && SUPABASE_URL && SUPABASE_ANON_KEY) {
    cachedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: SecureStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          'x-application-name': 'App Task Manager',
        },
      },
    });
  }

  return cachedClient!;
}

export { SupabaseConfigurationError };

export async function cacheTasks(tasks: unknown) {
  try {
    await AsyncStorage.setItem('@task-cache', JSON.stringify(tasks));
  } catch (error) {
    console.warn('Failed to cache tasks locally', error);
  }
}

export async function readCachedTasks<T>(fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem('@task-cache');
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch (error) {
    console.warn('Failed to read cached tasks', error);
    return fallback;
  }
}

