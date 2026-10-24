import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export default function WebInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || window.localStorage.getItem('poultriz-install-dismissed') === 'true') {
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  if (Platform.OS !== 'web' || !installEvent || dismissed) return null;

  async function install() {
    await installEvent?.prompt();
    setInstallEvent(null);
  }

  function dismiss() {
    window.localStorage.setItem('poultriz-install-dismissed', 'true');
    setDismissed(true);
  }

  return (
    <View style={styles.container}>
      <View style={styles.copy}>
        <Text style={styles.title}>Install Poultriz</Text>
        <Text style={styles.subtitle}>Use Poultriz like an app from your home screen.</Text>
      </View>
      <TouchableOpacity style={styles.installButton} onPress={install}>
        <Text style={styles.installText}>Install</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={dismiss} accessibilityLabel="Dismiss install prompt">
        <Text style={styles.dismiss}>Not now</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'fixed',
    left: 16,
    right: 16,
    bottom: 84,
    zIndex: 2000,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#263238',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  copy: { flex: 1 },
  title: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  subtitle: { color: '#CFD8DC', fontSize: 12, marginTop: 3 },
  installButton: { backgroundColor: '#8BC34A', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  installText: { color: '#17210D', fontWeight: '700' },
  dismiss: { color: '#CFD8DC', fontSize: 12 },
});
