import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';

export default function DailyRecordsScreen() {
  const { batchId } = useLocalSearchParams<{ batchId: string }>();
  const { theme } = useTheme();
  const [batchName, setBatchName] = useState('');
  const [birdCount, setBirdCount] = useState(0);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [batchId])
  );

  async function load() {
    const { data: batch } = await supabase.from('batches').select('name, bird_count').eq('id', batchId).single();
    setBatchName(batch?.name ?? '');
    setBirdCount(batch?.bird_count ?? 0);

    const { data } = await supabase
      .from('daily_records')
      .select('*')
      .eq('batch_id', batchId)
      .order('record_date', { ascending: false })
      .order('created_at', { ascending: false });
    setRecords(data ?? []);
    setLoading(false);
  }

  const totalDeaths = useMemo(() => records.reduce((sum, r) => sum + Number(r.mortality_count ?? 0), 0), [records]);

  function handleDelete(recordId: string) {
    Alert.alert('Delete Record', 'Delete this daily record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('daily_records').delete().eq('id', recordId);
          load();
        },
      },
    ]);
  }

  if (loading) {
    return <LoadingState label="Loading daily records..." />;
  }

  const mortalityRate = birdCount > 0 ? (totalDeaths / birdCount) * 100 : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Daily Records</Text>
          {batchName ? <Text style={[styles.headerSub, { color: theme.textMuted }]}>{batchName}</Text> : null}
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.summaryCard, { backgroundColor: theme.cardBackgroundAlt }]}>
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Records</Text>
            <Text style={[styles.statValue, { color: theme.text }]}>{records.length}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Deaths</Text>
            <Text style={[styles.statValue, { color: theme.text }]}>{totalDeaths}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Mortality</Text>
            <Text style={[styles.statValue, { color: theme.text }]}>{mortalityRate.toFixed(1)}%</Text>
          </View>
        </View>

        {records.length === 0 ? (
          <EmptyState icon="clipboard-outline" title="No daily records yet" subtitle="Add a record from the batch screen." />
        ) : (
          records.map((rec) => (
            <View key={rec.id} style={[styles.row, { backgroundColor: theme.cardBackground }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.text }]}>{rec.record_date}</Text>
                <Text style={[styles.rowLine, { color: theme.textMuted }]}>Mortality: {rec.mortality_count}</Text>
                {rec.avg_weight_kg ? (
                  <Text style={[styles.rowLine, { color: theme.textMuted }]}>Avg weight: {rec.avg_weight_kg}kg</Text>
                ) : null}
                {rec.notes ? <Text style={[styles.rowNote, { color: theme.textFaint }]}>{rec.notes}</Text> : null}
              </View>
              <TouchableOpacity onPress={() => handleDelete(rec.id)} hitSlop={10}>
                <Ionicons name="trash-outline" size={18} color={theme.danger} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSub: { fontSize: 12.5, marginTop: 2 },
  content: { padding: 16, paddingBottom: 40 },
  summaryCard: { flexDirection: 'row', justifyContent: 'space-between', borderRadius: 16, padding: 16, marginBottom: 16 },
  stat: { flex: 1 },
  statLabel: { fontSize: 13, marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 12, padding: 14, marginBottom: 10 },
  rowTitle: { fontWeight: '600' },
  rowLine: { marginTop: 2 },
  rowNote: { marginTop: 2, fontSize: 12 },
});