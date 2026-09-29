import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Modal, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';

export default function SettingsScreen() {
  const { theme, isDark, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    setEmail(user?.email ?? '');
    setFullName(user?.user_metadata?.full_name ?? '');
  }

  function openEditModal() {
    setNameInput(fullName);
    setModalVisible(true);
  }

  async function handleSaveName() {
    if (!nameInput.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: nameInput.trim() } });
    setSaving(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    setFullName(nameInput.trim());
    setModalVisible(false);
  }

  async function handleLogout() {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  const initials = fullName
    ? fullName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : email.slice(0, 2).toUpperCase();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.screenBackground }]} edges={['top']}>
      <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>

      <TouchableOpacity style={[styles.profileCard, { backgroundColor: theme.cardBackgroundAlt }]} onPress={openEditModal}>
        <View style={[styles.avatar, { backgroundColor: theme.accentDark }]}>
          <Text style={styles.avatarText}>{initials || '?'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.profileName, { color: theme.text }]}>{fullName || 'Add your name'}</Text>
          <Text style={[styles.profileEmail, { color: theme.textMuted }]}>{email}</Text>
        </View>
        <Ionicons name="create-outline" size={20} color={theme.textMuted} />
      </TouchableOpacity>

      <View style={[styles.row, { backgroundColor: theme.cardBackground }]}>
        <View style={styles.rowLeft}>
          <Ionicons name={isDark ? 'moon' : 'sunny'} size={20} color={theme.text} />
          <Text style={[styles.rowLabel, { color: theme.text }]}>Dark Mode</Text>
        </View>
        <Switch value={isDark} onValueChange={toggleTheme} trackColor={{ true: theme.accentDark }} />
      </View>

      <TouchableOpacity style={[styles.row, { backgroundColor: theme.cardBackground }]} onPress={handleLogout}>
        <View style={styles.rowLeft}>
          <Ionicons name="log-out-outline" size={20} color={theme.danger} />
          <Text style={[styles.rowLabel, { color: theme.danger }]}>Log Out</Text>
        </View>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Profile</Text>
            <Text style={[styles.modalLabel, { color: theme.textMuted }]}>Email</Text>
            <Text style={[styles.modalEmail, { color: theme.text }]}>{email}</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text }]}
              placeholder="Full name"
              placeholderTextColor={theme.textFaint}
              value={nameInput}
              onChangeText={setNameInput}
            />
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveName} disabled={saving}>
              <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={[styles.cancelText, { color: theme.textFaint }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 24 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 16, padding: 16, marginBottom: 20 },
  avatar: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  profileName: { fontSize: 16, fontWeight: '700' },
  profileEmail: { fontSize: 13, marginTop: 2 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderRadius: 14, padding: 16, marginBottom: 12,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowLabel: { fontSize: 16, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  modalLabel: { fontSize: 13, marginBottom: 2 },
  modalEmail: { fontSize: 15, fontWeight: '600', marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 12 },
  saveButton: { backgroundColor: '#B9E37D', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  saveButtonText: { fontWeight: '600' },
  cancelText: { textAlign: 'center', marginTop: 16 },
});