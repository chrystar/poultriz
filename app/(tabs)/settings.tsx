import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
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
  const [userLimits, setUserLimits] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
      loadUserLimits();
    }, [])
  );

  async function loadProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    setEmail(user?.email ?? '');
    setFullName(user?.user_metadata?.full_name ?? '');
  }

  async function loadUserLimits() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data } = await supabase
      .from('user_limits')
      .select('*')
      .eq('user_id', user?.id)
      .single();

    setUserLimits(data);
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

    const { error } = await supabase.auth.updateUser({
      data: { full_name: nameInput.trim() },
    });

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
    ? fullName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : email.slice(0, 2).toUpperCase();

  // Determine plan state
  const hasActiveWindow =
    userLimits?.plan &&
    new Date(userLimits.access_until) > new Date();

  const batchesLeft = userLimits
    ? Math.max(
        0,
        userLimits.batch_quota - userLimits.batches_created_count
      )
    : 0;

  let planLabel = 'Free Plan';
  let planDetail = '1 free batch • already used';
  let planColor = theme.textMuted;
  let planIcon: any = 'person-outline';

  if (!userLimits || userLimits.batches_created_count < 1) {
    planLabel = 'Free Plan';
    planDetail = '1 free batch available';
    planColor = theme.textMuted;
    planIcon = 'person-outline';
  } else if (hasActiveWindow) {
    planLabel =
      userLimits.plan === 'yearly'
        ? 'Yearly Plan'
        : '3-Month Plan';

    const expiryDate = new Date(
      userLimits.access_until
    ).toLocaleDateString();

    planDetail = `${batchesLeft} batch${
      batchesLeft === 1 ? '' : 'es'
    } left • expires ${expiryDate}`;

    planColor = theme.accentDark;
    planIcon = 'checkmark-circle';
  } else if (userLimits.plan) {
    planLabel = 'Plan Expired';
    planDetail = 'Subscribe again to create more batches';
    planColor = theme.danger;
    planIcon = 'alert-circle';
  } else {
    planLabel = 'Free Plan';
    planDetail = 'Free batch used • subscribe to continue';
    planColor = theme.textMuted;
    planIcon = 'person-outline';
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: theme.screenBackground,
        },
      ]}
      edges={['top']}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Text
            style={[
              styles.headerTitle,
              {
                color: theme.text,
              },
            ]}
          >
            Settings
          </Text>
        </View>

        {/* PROFILE */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.profileCard,
            {
              backgroundColor: theme.cardBackgroundAlt,
            },
          ]}
          onPress={openEditModal}
        >
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: theme.accentDark,
              },
            ]}
          >
            <Text style={styles.avatarText}>
              {initials || '?'}
            </Text>
          </View>

          <View style={styles.profileInfo}>
            <Text
              style={[
                styles.profileName,
                {
                  color: theme.text,
                },
              ]}
              numberOfLines={1}
            >
              {fullName || 'Add your name'}
            </Text>

            <Text
              style={[
                styles.profileEmail,
                {
                  color: theme.textMuted,
                },
              ]}
              numberOfLines={1}
            >
              {email}
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={18}
            color={theme.textMuted}
          />
        </TouchableOpacity>

        {/* PLAN */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.section,
            {
              backgroundColor: theme.cardBackground,
            },
          ]}
          onPress={() => router.push('/paywall')}
        >
          <View style={styles.settingRow}>
            <View
              style={[
                styles.planIcon,
                {
                  backgroundColor: planColor + '22',
                },
              ]}
            >
              <Ionicons
                name={planIcon}
                size={19}
                color={planColor}
              />
            </View>

            <View style={styles.rowContent}>
              <Text
                style={[
                  styles.rowTitle,
                  {
                    color: theme.text,
                  },
                ]}
              >
                {planLabel}
              </Text>

              <Text
                style={[
                  styles.rowSubtitle,
                  {
                    color: theme.textMuted,
                  },
                ]}
                numberOfLines={2}
              >
                {planDetail}
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={18}
              color={theme.textMuted}
            />
          </View>
        </TouchableOpacity>

        {/* APPEARANCE */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: theme.cardBackground,
            },
          ]}
        >
          <View style={styles.settingRow}>
            <View style={styles.iconContainer}>
              <Ionicons
                name={isDark ? 'moon-outline' : 'sunny-outline'}
                size={20}
                color={theme.text}
              />
            </View>

            <View style={styles.rowContent}>
              <Text
                style={[
                  styles.rowTitle,
                  {
                    color: theme.text,
                  },
                ]}
              >
                Dark Mode
              </Text>
            </View>

            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{
                true: theme.accentDark,
                false: theme.textFaint,
              }}
              thumbColor={theme.cardBackgroundAlt}
              ios_backgroundColor={theme.textFaint}
            />
          </View>
        </View>

        {/* LOGOUT */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.logoutButton,
            {
              backgroundColor: theme.cardBackground,
            },
          ]}
          onPress={handleLogout}
        >
          <View style={styles.logoutContent}>
            <Ionicons
              name="log-out-outline"
              size={20}
              color={theme.danger}
            />

            <Text
              style={[
                styles.logoutText,
                {
                  color: theme.danger,
                },
              ]}
            >
              Log Out
            </Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* EDIT PROFILE MODAL */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.background,
              },
            ]}
          >
            <Text
              style={[
                styles.modalTitle,
                {
                  color: theme.text,
                },
              ]}
            >
              Edit Profile
            </Text>

            <Text
              style={[
                styles.modalLabel,
                {
                  color: theme.textMuted,
                },
              ]}
            >
              Email
            </Text>

            <Text
              style={[
                styles.modalEmail,
                {
                  color: theme.text,
                },
              ]}
            >
              {email}
            </Text>

            <TextInput
              style={[
                styles.input,
                {
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              placeholder="Full name"
              placeholderTextColor={theme.textFaint}
              value={nameInput}
              onChangeText={setNameInput}
            />

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveName}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setModalVisible(false)}
            >
              <Text
                style={[
                  styles.cancelText,
                  {
                    color: theme.textFaint,
                  },
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 40,
  },

  /* HEADER */

  header: {
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.1,
  },

  /* PROFILE */

  profileCard: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13,
  },

  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },

  profileInfo: {
    flex: 1,
    paddingRight: 10,
  },

  profileName: {
    fontSize: 15,
    fontWeight: '700',
  },

  profileEmail: {
    fontSize: 12.5,
    marginTop: 3,
  },

  /* SECTIONS */

  section: {
    borderRadius: 17,
    overflow: 'hidden',
    marginBottom: 12,
  },

  settingRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
  },

  iconContainer: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5,
  },

  planIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  rowContent: {
    flex: 1,
    paddingHorizontal: 8,
  },

  rowTitle: {
    fontSize: 15,
    fontWeight: '500',
  },

  rowSubtitle: {
    fontSize: 11.5,
    marginTop: 3,
    lineHeight: 16,
  },

  /* LOGOUT */

  logoutButton: {
    minHeight: 54,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },

  logoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  logoutText: {
    fontSize: 14.5,
    fontWeight: '600',
  },

  /* MODAL */

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },

  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },

  modalLabel: {
    fontSize: 13,
    marginBottom: 2,
  },

  modalEmail: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 16,
  },

  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },

  saveButton: {
    backgroundColor: '#B9E37D',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },

  saveButtonText: {
    fontWeight: '600',
  },

  cancelText: {
    textAlign: 'center',
    marginTop: 16,
  },
});