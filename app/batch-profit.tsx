import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EmptyState from '../components/EmptyState';
import InsightCarousel, { Insight } from '../components/InsightCarousel';
import LoadingState from '../components/LoadingState';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';

type StatusFilter = 'all' | 'active' | 'planned' | 'completed';

type BatchRow = {
  id: string;
  name: string;
  breed: string;
  bird_count: number;
  cost: number;
  status: string;
  revenue: number;
  expenses: number;
  profit: number;
};

function naira(value: number) {
  return `₦${Math.round(value).toLocaleString()}`;
}

function statusLabel(status: string) {
  if (status === 'active') return 'Active';
  if (status === 'planned') return 'Planned';
  if (status === 'completed') return 'Completed';
  return status;
}

export default function BatchProfitScreen() {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [generalRevenue, setGeneralRevenue] = useState(0);
  const [generalExpenses, setGeneralExpenses] = useState(0);
  const [filter, setFilter] = useState<StatusFilter>('all');

  useFocusEffect(
    useCallback(() => {
      loadInsights();
    }, [])
  );

  async function loadInsights() {
    setLoadError(null);

    try {
      const { data: batches, error: batchesError } = await supabase
        .from('batches')
        .select('id, name, breed, bird_count, cost, status, created_at')
        .order('created_at', { ascending: false });
      if (batchesError) throw batchesError;

      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('batch_id, quantity, unit_price');
      if (salesError) throw salesError;

      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('batch_id, amount');
      if (expensesError) throw expensesError;

      const nextRows: BatchRow[] = (batches ?? []).map((batch) => {
        const revenue = (sales ?? [])
          .filter((s) => s.batch_id === batch.id)
          .reduce((sum, s) => sum + s.quantity * Number(s.unit_price), 0);
        const batchExpenses = (expenses ?? [])
          .filter((e) => e.batch_id === batch.id)
          .reduce((sum, e) => sum + Number(e.amount), 0);
        const cost = Number(batch.cost ?? 0);
        return {
          id: batch.id,
          name: batch.name,
          breed: batch.breed,
          bird_count: batch.bird_count ?? 0,
          cost,
          status: batch.status,
          revenue,
          expenses: batchExpenses,
          profit: revenue - batchExpenses - cost,
        };
      });

      setRows(nextRows);
      setGeneralRevenue(
        (sales ?? [])
          .filter((s) => !s.batch_id)
          .reduce((sum, s) => sum + s.quantity * Number(s.unit_price), 0)
      );
      setGeneralExpenses(
        (expenses ?? [])
          .filter((e) => !e.batch_id)
          .reduce((sum, e) => sum + Number(e.amount), 0)
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load profit insights';
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }

  const visibleRows = useMemo(
    () => (filter === 'all' ? rows : rows.filter((row) => row.status === filter)),
    [rows, filter]
  );

  const ranked = useMemo(
    () => [...visibleRows].sort((a, b) => b.profit - a.profit),
    [visibleRows]
  );

  const totals = useMemo(() => {
    const revenue = visibleRows.reduce((sum, row) => sum + row.revenue, 0);
    const expenses = visibleRows.reduce((sum, row) => sum + row.expenses, 0);
    const chickCost = visibleRows.reduce((sum, row) => sum + row.cost, 0);
    const profit = visibleRows.reduce((sum, row) => sum + row.profit, 0);
    const birds = visibleRows.reduce((sum, row) => sum + row.bird_count, 0);
    const profitable = visibleRows.filter((row) => row.profit > 0).length;
    const losing = visibleRows.filter((row) => row.profit < 0).length;
    return { revenue, expenses, chickCost, profit, birds, profitable, losing };
  }, [visibleRows]);

  const maxAbsProfit = Math.max(1, ...ranked.map((row) => Math.abs(row.profit)));

  const insights: Insight[] = useMemo(() => {
    const list: Insight[] = [];
    const best = ranked[0];
    const worst = ranked[ranked.length - 1];

    if (visibleRows.length === 0) {
      list.push({
        icon: 'information-circle-outline',
        text: 'Add batches, expenses, and sales to see profit insights for every cycle.',
        color: theme.textMuted,
      });
      return list;
    }

    list.push({
      icon: totals.profit >= 0 ? 'trending-up' : 'trending-down',
      text:
        totals.profit >= 0
          ? `These batches are up ${naira(totals.profit)} after chick cost and expenses.`
          : `These batches are down ${naira(Math.abs(totals.profit))} after chick cost and expenses.`,
      color: totals.profit >= 0 ? theme.accentDark : theme.danger,
    });

    if (best && best.profit > 0) {
      list.push({
        icon: 'trophy-outline',
        text: `${best.name} is your strongest cycle at ${naira(best.profit)} profit.`,
        color: theme.accentDark,
      });
    }

    if (worst && worst.profit < 0) {
      list.push({
        icon: 'alert-circle-outline',
        text: `${worst.name} is losing ${naira(Math.abs(worst.profit))} — check feed, mortality, and selling price.`,
        color: theme.danger,
      });
    }

    if (totals.birds > 0) {
      list.push({
        icon: 'paw-outline',
        text: `Average profit per starting bird is ${naira(totals.profit / totals.birds)}.`,
        color: totals.profit >= 0 ? theme.accentDark : '#FF9800',
      });
    }

    if (totals.losing > 0) {
      list.push({
        icon: 'remove-circle-outline',
        text: `${totals.losing} of ${visibleRows.length} batches are currently at a loss.`,
        color: '#FF9800',
      });
    }

    return list;
  }, [ranked, visibleRows, totals, theme]);

  if (loading) {
    return <LoadingState label="Loading profit insights..." />;
  }

  if (loadError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <EmptyState
          icon="cloud-offline-outline"
          title="Could not load insights"
          subtitle={loadError}
        />
      </SafeAreaView>
    );
  }

  const filters: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'planned', label: 'Planned' },
    { key: 'completed', label: 'Completed' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Batch Profit</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={[styles.heroCard, { backgroundColor: totals.profit >= 0 ? theme.accentDark : theme.danger }]}>
          <Text style={styles.heroLabel}>Net profit across batches</Text>
          <Text style={styles.heroValue}>{naira(totals.profit)}</Text>
          <Text style={styles.heroSub}>
            {totals.profitable} profitable · {totals.losing} at a loss
          </Text>
        </View>

        <View style={styles.tabRow}>
          {filters.map((item) => {
            const active = filter === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.tabButton,
                  { backgroundColor: theme.cardBackground },
                  active && { backgroundColor: theme.accentDark },
                ]}
                onPress={() => setFilter(item.key)}
              >
                <Text style={[styles.tabText, { color: active ? '#fff' : theme.textMuted }]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Revenue</Text>
            <Text style={[styles.summaryValue, { color: theme.accentDark }]}>{naira(totals.revenue)}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Expenses</Text>
            <Text style={[styles.summaryValue, { color: theme.danger }]}>{naira(totals.expenses)}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Chick cost</Text>
            <Text style={[styles.summaryValue, { color: theme.text }]}>{naira(totals.chickCost)}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Per bird</Text>
            <Text style={[styles.summaryValue, { color: theme.text }]}>
              {totals.birds > 0 ? naira(totals.profit / totals.birds) : '₦0'}
            </Text>
          </View>
        </View>

        <InsightCarousel insights={insights} />

        {(generalRevenue > 0 || generalExpenses > 0) && (
          <View style={[styles.generalCard, { backgroundColor: theme.cardBackgroundAlt }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>General (not tied to a batch)</Text>
            <View style={styles.financeRow}>
              <View>
                <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Sales</Text>
                <Text style={[styles.financeValue, { color: theme.accentDark }]}>{naira(generalRevenue)}</Text>
              </View>
              <View>
                <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Expenses</Text>
                <Text style={[styles.financeValue, { color: theme.danger }]}>{naira(generalExpenses)}</Text>
              </View>
              <View>
                <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Net</Text>
                <Text
                  style={[
                    styles.financeValue,
                    { color: generalRevenue - generalExpenses >= 0 ? theme.accentDark : theme.danger },
                  ]}
                >
                  {naira(generalRevenue - generalExpenses)}
                </Text>
              </View>
            </View>
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Every batch</Text>

        {ranked.length === 0 ? (
          <EmptyState
            icon="stats-chart-outline"
            title="No batches in this view"
            subtitle="Create a batch or switch the filter to see profit by cycle."
          />
        ) : (
          ranked.map((row, index) => {
            const barWidth = `${Math.max(6, (Math.abs(row.profit) / maxAbsProfit) * 100)}%`;
            return (
              <TouchableOpacity
                key={row.id}
                style={[styles.batchCard, { backgroundColor: theme.cardBackgroundAlt }]}
                onPress={() => router.push(`/(tabs)/batches/${row.id}`)}
              >
                <View style={styles.batchTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.batchName, { color: theme.text }]}>
                      {index + 1}. {row.name}
                    </Text>
                    <Text style={[styles.batchMeta, { color: theme.textMuted }]}>
                      {row.breed || 'Unknown breed'} · {statusLabel(row.status)} · {row.bird_count} birds
                    </Text>
                  </View>
                  <Text style={[styles.batchProfit, { color: row.profit >= 0 ? theme.accentDark : theme.danger }]}>
                    {naira(row.profit)}
                  </Text>
                </View>

                <View style={[styles.barTrack, { backgroundColor: theme.border }]}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: barWidth as `${number}%`,
                        backgroundColor: row.profit >= 0 ? theme.accentDark : theme.danger,
                      },
                    ]}
                  />
                </View>

                <View style={styles.financeRow}>
                  <Text style={[styles.tinyStat, { color: theme.textMuted }]}>Rev {naira(row.revenue)}</Text>
                  <Text style={[styles.tinyStat, { color: theme.textMuted }]}>Exp {naira(row.expenses)}</Text>
                  <Text style={[styles.tinyStat, { color: theme.textMuted }]}>Chicks {naira(row.cost)}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  heroCard: { borderRadius: 16, padding: 20, marginBottom: 16 },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
  heroValue: { color: '#fff', fontSize: 32, fontWeight: '800', marginTop: 6 },
  heroSub: { color: 'rgba(255,255,255,0.85)', marginTop: 6, fontSize: 13 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tabButton: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  tabText: { fontWeight: '600', fontSize: 12 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  summaryCard: { width: '47%', borderRadius: 16, padding: 14 },
  summaryLabel: { fontSize: 12, marginBottom: 6 },
  summaryValue: { fontSize: 16, fontWeight: '700' },
  generalCard: { borderRadius: 16, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  financeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  financeValue: { fontSize: 15, fontWeight: '700', marginTop: 4 },
  batchCard: { borderRadius: 16, padding: 16, marginBottom: 10 },
  batchTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  batchName: { fontSize: 16, fontWeight: '700' },
  batchMeta: { fontSize: 12, marginTop: 4 },
  batchProfit: { fontSize: 16, fontWeight: '800' },
  barTrack: { height: 8, borderRadius: 4, marginVertical: 12, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  tinyStat: { fontSize: 12, fontWeight: '500' },
});
