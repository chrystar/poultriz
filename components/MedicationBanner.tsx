import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export type BatchMedication = {
  id: string;
  name: string;
  day: number;
  dayRangeLabel: string;
  medication: string;
};

export default function MedicationBanner({ items, onPress }: { items: BatchMedication[]; onPress?: () => void }) {
  const { theme } = useTheme();

  if (items.length === 0) return null;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.card, { backgroundColor: theme.cardBackgroundAlt }]}
    >
      <View style={styles.headerRow}>
        <Ionicons name="medkit-outline" size={18} color={theme.accentDark} />
        <Text style={[styles.title, { color: theme.text }]}>Today's Medication</Text>
        <Ionicons name="chevron-forward" size={16} color={theme.textMuted} style={{ marginLeft: 'auto' }} />
      </View>

      {items.map((item) => (
        <View key={item.id} style={[styles.row, { borderTopColor: theme.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.batchName, { color: theme.text }]}>{item.name}</Text>
            <Text style={[styles.dayLabel, { color: theme.textMuted }]}>
              Day {item.day} • {item.dayRangeLabel}
            </Text>
          </View>
          <View style={[styles.medTag, { backgroundColor: theme.accentDark + '22' }]}>
            <Text style={[styles.medText, { color: theme.accentDark }]}>{item.medication}</Text>
          </View>
        </View>
      ))}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 14, marginBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  title: { fontSize: 14, fontWeight: '700' },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, paddingTop: 10, marginTop: 10,
  },
  batchName: { fontSize: 14, fontWeight: '600' },
  dayLabel: { fontSize: 12, marginTop: 2 },
  medTag: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  medText: { fontSize: 12, fontWeight: '700' },
});