import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

type Stat = { label: string; value: string };

type Props = {
  stats: Stat[];
  count: number;
  latest?: string | null;
  emptyText: string;
  onPress: () => void;
};

export default function LogSummaryCard({ stats, count, latest, emptyText, onPress }: Props) {
  const { theme } = useTheme();
  const hasEntries = count > 0;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={!hasEntries}
      onPress={onPress}
      style={[styles.card, { backgroundColor: theme.cardBackgroundAlt }]}
    >
      <View style={styles.statsRow}>
        {stats.map((s) => (
          <View key={s.label} style={styles.stat}>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>{s.label}</Text>
            <Text style={[styles.statValue, { color: theme.text }]}>{s.value}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      {hasEntries ? (
        <View style={styles.footerRow}>
          <Text style={[styles.latest, { color: theme.textMuted }]} numberOfLines={1}>
            {latest ? `Latest: ${latest}` : ''}
          </Text>
          <View style={styles.viewAll}>
            <Text style={[styles.viewAllText, { color: theme.accentDark }]}>View all ({count})</Text>
            <Ionicons name="chevron-forward" size={14} color={theme.accentDark} />
          </View>
        </View>
      ) : (
        <Text style={[styles.empty, { color: theme.textFaint }]}>{emptyText}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, marginBottom: 12 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { flex: 1 },
  statLabel: { fontSize: 13, marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: '700' },
  divider: { height: 1, marginVertical: 12 },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  latest: { flex: 1, fontSize: 12 },
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewAllText: { fontSize: 13, fontWeight: '600' },
  empty: { fontSize: 12.5 },
});