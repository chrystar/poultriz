import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
};

export default function EmptyState({ icon, title, subtitle }: Props) {
  const { theme } = useTheme();
  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, { backgroundColor: theme.cardBackground }]}>
        <Ionicons name={icon} size={28} color={theme.textFaint} />
      </View>
      <Text style={[styles.title, { color: theme.textMuted }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: theme.textFaint }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 15, fontWeight: '600' },
  subtitle: { fontSize: 13, textAlign: 'center', paddingHorizontal: 30 },
});