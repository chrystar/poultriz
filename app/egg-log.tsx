import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';

const DEFAULT_CRATE_SIZE = 30;

export default function EggLogScreen() {
  const { batchId } = useLocalSearchParams<{ batchId: string }>();
  const { theme } = useTheme();
  const [batchName, setBatchName] = useState('');
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [batchId])
  );

  async function load() {
    const { data: batch } = await supabase.from('batches').select('name').eq('id', batchId).single();
    setBatchName(batch?.name ?? '');

    const { data } = await supabase
      .from('egg_logs')
      .select('*')
      .eq('batch_id', batchId)
      .order('log_date', { ascending: false })
      .order('created_at', { ascending: false });
    setLogs(data ?? []);
    setLoading(false);
  }

  const totalEggs = useMemo(() => logs.reduce((sum, e) => sum + Number(e.total_eggs), 0), [logs]);
  const totalCracked = useMemo(() => logs.reduce((sum, e) => sum + Number(e.cracked_count ?? 0), 0), [logs]);

  function handleDelete(logId: string) {
    Alert.alert('Delete Egg Entry', 'Delete this egg collection entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('egg_logs').delete().eq('id', logId);
          load();
        },
      },
    ]);
  }

  if (loading) {
    return <LoadingState label="Loading egg log..." />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Egg Log</Text>
          {batchName ? <Text style={[styles.headerSub, { color: theme.textMuted }]}>{batchName}</Text> : null}
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.summaryCard, { backgroundColor: theme.cardBackgroundAlt }]}>
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Total Eggs</Text>
            <Text style={[styles.statValue, { color: theme.text }]}>{totalEggs}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Crates (≈{DEFAULT_CRATE_SIZE})</Text>
            <Text style={[styles.statValue, { color: theme.text }]}>{(totalEggs / DEFAULT_CRATE_SIZE).toFixed(1)}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Cracked</Text>
            <Text style={[styles.statValue, { color: theme.text }]}>{totalCracked}</Text>
          </View>
        </View>

        {logs.length === 0 ? (
          <EmptyState icon="egg-outline" title="No eggs logged yet" subtitle="Add eggs from the batch screen." />
        ) : (
          logs.map((e) => (
            <View key={e.id} style={[styles.row, { backgroundColor: theme.cardBackground }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.text }]}>{e.log_date}</Text>
                <Text style={[styles.rowLine, { color: theme.textMuted }]}>
                  {e.crates} crates + {e.loose_eggs} loose = {e.total_eggs} eggs
                </Text>
                {(e.small_count || e.medium_count || e.large_count || e.cracked_count) ? (
                  <Text style={[styles.rowNote, { color: theme.textFaint }]}>
                    S:{e.small_count || 0} M:{e.medium_count || 0} L:{e.large_count || 0} Cracked:{e.cracked_count || 0}
                  </Text>
                ) : null}
                {e.notes ? <Text style={[styles.rowNote, { color: theme.textFaint }]}>{e.notes}</Text> : null}
              </View>
              <TouchableOpacity onPress={() => handleDelete(e.id)} hitSlop={10}>
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