import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';

export default function FeedLogScreen() {
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
      .from('feed_logs')
      .select('*')
      .eq('batch_id', batchId)
      .order('log_date', { ascending: false })
      .order('created_at', { ascending: false });
    setLogs(data ?? []);
    setLoading(false);
  }

  const totalKg = useMemo(() => logs.reduce((sum, f) => sum + Number(f.total_kg), 0), [logs]);
  const totalBags = useMemo(() => logs.reduce((sum, f) => sum + Number(f.bag_count), 0), [logs]);
  const totalCost = useMemo(() => logs.reduce((sum, f) => sum + Number(f.cost ?? 0), 0), [logs]);

  function handleDelete(log: any) {
    Alert.alert('Delete Feed Entry', 'This will also remove its matching expense entry, if any.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (log.expense_id) {
            await supabase.from('expenses').delete().eq('id', log.expense_id);
          }
          await supabase.from('feed_logs').delete().eq('id', log.id);
          load();
        },
      },
    ]);
  }

  if (loading) {
    return <LoadingState label="Loading feed log..." />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Feed Log</Text>
          {batchName ? <Text style={[styles.headerSub, { color: theme.textMuted }]}>{batchName}</Text> : null}
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.summaryCard, { backgroundColor: theme.cardBackgroundAlt }]}>
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Total Fed</Text>
            <Text style={[styles.statValue, { color: theme.text }]}>{Number(totalKg.toFixed(2))}kg</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Bags</Text>
            <Text style={[styles.statValue, { color: theme.text }]}>{totalBags}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Spent</Text>
            <Text style={[styles.statValue, { color: theme.text }]}>₦{totalCost.toLocaleString()}</Text>
          </View>
        </View>

        {logs.length === 0 ? (
          <EmptyState icon="nutrition-outline" title="No feed logged yet" subtitle="Add feed from the batch screen." />
        ) : (
          logs.map((f) => (
            <View key={f.id} style={[styles.row, { backgroundColor: theme.cardBackground }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.text }]}>
                  {[f.brand, f.feed_type].filter(Boolean).join(' — ') || 'Feed'}
                </Text>
                <Text style={[styles.rowLine, { color: theme.textMuted }]}>
                  {f.bag_count} × {f.bag_size_kg}kg = {f.total_kg}kg{f.cost ? ` • ₦${Number(f.cost).toLocaleString()}` : ''}
                </Text>
                <Text style={[styles.rowNote, { color: theme.textFaint }]}>{f.log_date}</Text>
                {f.notes ? <Text style={[styles.rowNote, { color: theme.textFaint }]}>{f.notes}</Text> : null}
              </View>
              <TouchableOpacity onPress={() => handleDelete(f)} hitSlop={10}>
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