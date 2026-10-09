import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

function getHashParams(url: string): Record<string, string> {
  const hash = url.split('#')[1] ?? '';
  return Object.fromEntries(
    hash
      .split('&')
      .filter(Boolean)
      .map((part) => {
        const [key, value = ''] = part.split('=');
        return [decodeURIComponent(key), decodeURIComponent(value.replace(/\+/g, ' '))];
      }),
  );
}

async function handleRecoveryUrl(url: string): Promise<boolean> {
  const parsedUrl = new URL(url);
  const queryParams = Object.fromEntries(parsedUrl.searchParams.entries());
  const hashParams = getHashParams(url);
  const code = queryParams.code;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return true;
  }

  if (hashParams.access_token && hashParams.refresh_token) {
    const { error } = await supabase.auth.setSession({
      access_token: hashParams.access_token,
      refresh_token: hashParams.refresh_token,
    });
    if (error) throw error;
    return true;
  }

  return false;
}

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function processUrl(url: string | null) {
      if (!url) {
        if (mounted) setLoading(false);
        return;
      }

      try {
        await handleRecoveryUrl(url);
      } catch (error) {
        Alert.alert('Reset Link Error', error instanceof Error ? error.message : 'This reset link is invalid or has expired.', [
          { text: 'Back to Login', onPress: () => router.replace('/(auth)/login') },
        ]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    Linking.getInitialURL().then(processUrl).catch((error) => {
      console.warn('Unable to read password reset link:', error);
      if (mounted) setLoading(false);
    });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      processUrl(url).catch((error) => {
        console.warn('Unable to process password reset link:', error);
      });
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  async function handleUpdatePassword() {
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmation) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    setUpdating(true);
    const { error } = await supabase.auth.updateUser({ password });
    setUpdating(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    Alert.alert('Password updated', 'You can now sign in with your new password.', [
      { text: 'Continue', onPress: () => router.replace('/(auth)/login') },
    ]);
  }

  if (loading) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>
          <Text style={styles.title}>Set New Password</Text>
          <Text style={styles.subtitle}>Enter a new password for your Poultriz account.</Text>

          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={18} color="#999" />
            <TextInput
              style={styles.input}
              placeholder="New password"
              placeholderTextColor="#999"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword((visible) => !visible)}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#999" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={18} color="#999" />
            <TextInput
              style={styles.input}
              placeholder="Confirm new password"
              placeholderTextColor="#999"
              secureTextEntry={!showPassword}
              value={confirmation}
              onChangeText={setConfirmation}
            />
          </View>

          <TouchableOpacity style={styles.button} onPress={handleUpdatePassword} disabled={updating}>
            <Text style={styles.buttonText}>{updating ? 'Updating...' : 'Update Password'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F9EF' },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  title: { fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 12, color: '#222' },
  subtitle: { fontSize: 14, textAlign: 'center', color: '#666', marginBottom: 28, lineHeight: 20 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 14, paddingHorizontal: 14,
    marginBottom: 14, backgroundColor: '#fff',
  },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: '#222' },
  button: { backgroundColor: '#B9E37D', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 6 },
  buttonText: { fontWeight: '700', fontSize: 16, color: '#1B3A0F' },
});
