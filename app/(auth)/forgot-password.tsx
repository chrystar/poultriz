import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleReset() {
    if (!email) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'poultriz://reset-password',
    });
    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    setSent(true);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#222" />
          </TouchableOpacity>

          <Text style={styles.title}>Reset Password</Text>

          {sent ? (
            <>
              <Text style={styles.subtitle}>
                Check your email. We&apos;ve sent a link to reset your password.
              </Text>
              <TouchableOpacity style={styles.button} onPress={() => router.replace('/(auth)/login')}>
                <Text style={styles.buttonText}>Back to Login</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.subtitle}>
                Enter the email you signed up with. We&apos;ll send you a link to set a new password.
              </Text>

              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={18} color="#999" />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <TouchableOpacity style={styles.button} onPress={handleReset} disabled={loading}>
                <Text style={styles.buttonText}>{loading ? 'Sending...' : 'Send Reset Link'}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F9EF' },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  backButton: { position: 'absolute', top: 16, left: 16 },
  title: { fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 12, color: '#222' },
  subtitle: { fontSize: 14, textAlign: 'center', color: '#666', marginBottom: 28, lineHeight: 20 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 14, paddingHorizontal: 14,
    marginBottom: 20, backgroundColor: '#fff',
  },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: '#222' },
  button: { backgroundColor: '#B9E37D', paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  buttonText: { fontWeight: '700', fontSize: 16, color: '#1B3A0F' },
});