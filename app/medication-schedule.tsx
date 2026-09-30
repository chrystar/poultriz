import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MEDICATION_SCHEDULE } from '../constants/medicationSchedule';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';

type ActiveBatchDay = { id: string; name: string; day: number };

export default function MedicationScheduleScreen() {
  const { theme } = useTheme();
  const [activeBatchDays, setActiveBatchDays] = useState<ActiveBatchDay[]>([]);

  useEffect(() => {
    loadActiveBatches();
  }, []);

  async function loadActiveBatches() {
    const { data } = await supabase
      .from('batches')
      .select('id, name, start_date, bird_type')
      .eq('status', 'active');

    const days: ActiveBatchDay[] = (data ?? [])
      .filter((b) => b.bird_type !== 'layer')
      .map((b) => ({
        id: b.id,
        name: b.name,
        day: Math.floor((new Date().getTime() - new Date(b.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1,
      }));
    setActiveBatchDays(days);
  }

  function batchesOnDay(minDay: number, maxDay: number) {
    return activeBatchDays.filter((b) => b.day >= minDay && b.day <= maxDay);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Medication Schedule</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          Standard broiler medication and vaccination chart, by day of age.
        </Text>

        {MEDICATION_SCHEDULE.map((entry) => {
          const matches = batchesOnDay(entry.minDay, entry.maxDay);
          const isCurrent = matches.length > 0;
          const rangeLabel = entry.minDay === entry.maxDay
            ? `Day ${entry.minDay}`
            : `Day ${entry.minDay}-${entry.maxDay}`;

          return (
            <View
              key={rangeLabel}
              style={[
                styles.row,
                { backgroundColor: isCurrent ? theme.accentDark + '15' : theme.cardBackground, borderColor: isCurrent ? theme.accentDark : 'transparent' },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.dayLabel, { color: theme.text }]}>{rangeLabel}</Text>
                <Text style={[styles.medLabel, { color: theme.textMuted }]}>{entry.label}</Text>
                {isCurrent && (
                  <Text style={[styles.batchNames, { color: theme.accentDark }]}>
                    {matches.map((m) => m.name).join(', ')} — today
                  </Text>
                )}
              </View>
              {isCurrent && <Ionicons name="checkmark-circle" size={20} color={theme.accentDark} />}
            </View>
          );
        })}

        <View style={[styles.row, { backgroundColor: theme.cardBackground }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.dayLabel, { color: theme.text }]}>Day 51+</Text>
            <Text style={[styles.medLabel, { color: theme.textMuted }]}>Symptomatic Treatment</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scrollContent: { padding: 16, paddingTop: 4 },
  subtitle: { fontSize: 13, marginBottom: 16, lineHeight: 18 },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10,
  },
  dayLabel: { fontSize: 14, fontWeight: '700' },
  medLabel: { fontSize: 13, marginTop: 2 },
  batchNames: { fontSize: 12, fontWeight: '600', marginTop: 4 },
});