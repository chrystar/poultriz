import { Session } from '@supabase/supabase-js';
import * as Application from 'expo-application';
import { Stack, router, useSegments } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';

// Compares semver-style versions (e.g., "1.0.2" vs "2.0.0")
function isVersionOlder(current: string, minimum: string): boolean {
  const currentParts = current.split('.').map(Number);
  const minParts = minimum.split('.').map(Number);

  for (let i = 0; i < Math.max(currentParts.length, minParts.length); i++) {
    const cur = currentParts[i] || 0;
    const min = minParts[i] || 0;
    if (cur < min) return true;
    if (cur > min) return false;
  }
  return false;
}

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const segments = useSegments();
  const updateAlertShown = useRef(false);

  // Native APK update check — runs on launch, and whenever the app returns to the foreground
  useEffect(() => {
    async function checkNativeUpdate() {
      if (__DEV__) return;
      if (updateAlertShown.current) return; // don't stack duplicate alerts

      try {
        const { data, error } = await supabase
          .from('app_config')
          .select('min_version, apk_url')
          .single();

        if (error) throw error;

        const currentVersion = Application.nativeApplicationVersion || '1.0.0';

        if (isVersionOlder(currentVersion, data.min_version)) {
          updateAlertShown.current = true;
          Alert.alert(
            'Update Required',
            'A newer version of Poultriz is available. Please download it to keep using the app.',
            [
              {
                text: 'Download Now',
                onPress: () => {
                  Linking.openURL(data.apk_url);
                  updateAlertShown.current = false; // allow a re-prompt on next launch/foreground if they don't actually update
                },
              },
            ],
            { cancelable: false }
          );
        }
      } catch (err) {
        console.warn('Native update check failed:', err);
      }
    }

    checkNativeUpdate();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        checkNativeUpdate();
      }
    });

    return () => subscription.remove();
  }, []);

  // Supabase session
  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session);
      })
      .catch((err) => {
        console.warn('Supabase auth unavailable:', err?.message ?? err);
      })
      .finally(() => {
        setLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // Routing guard
  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/');
    }
  }, [session, loading, segments]);

  if (loading) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}