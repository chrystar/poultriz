import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) {
      Alert.alert('Sign Up Error', error.message);
      return;
    }

    if (data.session) {
      router.replace('/');
    } else {
      Alert.alert('Check your email', 'Please confirm your email before signing in.');
      router.replace('/(auth)/login');
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <View style={styles.logoCircle}>
            <Ionicons name="leaf" size={32} color="#fff" />
          </View>
          <Text style={styles.title}>Poultriz</Text>
          <Text style={styles.subtitle}>Create an account</Text>

          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={18} color="#999" style={styles.inputIcon} />
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

          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={18} color="#999" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#999"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#999" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.button} onPress={handleSignUp} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Creating account...' : 'Sign Up'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.switchText}>Already have an account? <Text style={styles.switchTextBold}>Sign In</Text></Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F9EF' },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  logoCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#8BC34A',
    justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 16,
  },
  title: { fontSize: 30, fontWeight: 'bold', textAlign: 'center', marginBottom: 4, color: '#222' },
  subtitle: { fontSize: 15, textAlign: 'center', color: '#777', marginBottom: 36 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 4,
    marginBottom: 14, backgroundColor: '#fff',
  },
  inputIcon: {},
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: '#222' },
  button: {
    backgroundColor: '#B9E37D', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 10,
  },
  buttonText: { fontWeight: '700', fontSize: 16, color: '#1B3A0F' },
  switchText: { textAlign: 'center', marginTop: 24, color: '#666', fontSize: 14 },
  switchTextBold: { fontWeight: '700', color: '#3E7B27' },
});