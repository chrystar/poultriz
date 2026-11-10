import MedicationBanner, { BatchMedication } from '@/components/MedicationBanner';
import { getDayRangeLabel, getMedicationForDay } from '@/constants/medicationSchedule';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BatchPieChart from '../../components/BatchPieChart';
import EmptyState from '../../components/EmptyState';
import InsightCarousel, { Insight } from '../../components/InsightCarousel';
import LoadingState from '../../components/LoadingState';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';

type Batch = {
  id: string;
  name: string;
  breed: string;
  bird_count: number;
  status: string;
};

export default function HomeScreen() {
  const [activeBatches, setActiveBatches] = useState(0);
  const [plannedBatches, setPlannedBatches] = useState(0);
  const [liveBirds, setLiveBirds] = useState(0);
  const [avgMortality, setAvgMortality] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const { theme } = useTheme();
  const [completedBatches, setCompletedBatches] = useState(0);
  const [completedBatchList, setCompletedBatchList] = useState<Batch[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [medications, setMedications] = useState<BatchMedication[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false);


  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [])
  );

  async function loadDashboard() {
    setLoadError(null);

    try {
      const { data: batches, error: batchesError } = await supabase.from('batches').select('*');
      if (batchesError) throw batchesError;

      const active = batches?.filter((b) => b.status === 'active') ?? [];
      const planned = batches?.filter((b) => b.status === 'planned') ?? [];
      const completed = batches?.filter((b) => b.status === 'completed') ?? [];
      const activeIds = active.map((b) => b.id);
      const startingBirds = active.reduce((sum, b) => sum + (b.bird_count ?? 0), 0);

      setActiveBatches(active.length);
      setPlannedBatches(planned.length);
      setCompletedBatches(completed.length);
      setCompletedBatchList(completed as Batch[]);

      const meds: BatchMedication[] = active
      .filter((b) => b.bird_type !== 'layer')
      .map((b) => {
        const day = Math.floor((new Date().getTime() - new Date(b.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return {
          id: b.id,
          name: b.name,
          day,
          dayRangeLabel: getDayRangeLabel(day),
          medication: getMedicationForDay(day),
        };
      }).filter((m) => m.day >= 1);
    setMedications(meds);

      let totalMortality = 0;
      let totalSold = 0;

      if (activeIds.length > 0) {
        const { data: records, error: recordsError } = await supabase
          .from('daily_records')
          .select('mortality_count')
          .in('batch_id', activeIds);
        if (recordsError) throw recordsError;
        totalMortality = records?.reduce((sum, r) => sum + (r.mortality_count ?? 0), 0) ?? 0;
      }

      const { data: allSales, error: salesError } = await supabase
        .from('sales')
        .select('quantity, unit_price, batch_id');
      if (salesError) throw salesError;

      const activeIdSet = new Set(activeIds);
      totalSold = (allSales ?? [])
        .filter((s) => s.batch_id && activeIdSet.has(s.batch_id))
        .reduce((sum, s) => sum + s.quantity, 0);
      const revenue = (allSales ?? []).reduce((sum, s) => sum + s.quantity * Number(s.unit_price), 0);

      setLiveBirds(Math.max(0, startingBirds - totalMortality - totalSold));
      setAvgMortality(startingBirds > 0 ? (totalMortality / startingBirds) * 100 : 0);
      setTotalRevenue(revenue);

      const { data: allExpenses, error: expensesError } = await supabase.from('expenses').select('amount');
      if (expensesError) throw expensesError;

      const expensesSum = (allExpenses ?? []).reduce((sum, e) => sum + Number(e.amount), 0);
      setTotalExpenses(expensesSum);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load dashboard data';
      setLoadError(message);
    } finally {
      setInitialLoading(false);
    }
  }

  const totalProfit = totalRevenue - totalExpenses;

  const insights: Insight[] = useMemo(() => {
    const list: Insight[] = [];

    if (totalRevenue > 0 || totalExpenses > 0) {
      list.push({
        icon: totalProfit >= 0 ? 'trending-up' : 'trending-down',
        text: totalProfit >= 0
          ? `Your farm is profitable — ₦${totalProfit.toLocaleString()} in profit so far.`
          : `You're currently running at a loss of ₦${Math.abs(totalProfit).toLocaleString()}.`,
        color: totalProfit >= 0 ? theme.accentDark : theme.danger,
      });
    }

    if (totalExpenses > 0) {
      list.push({
        icon: 'cash-outline',
        text: `Total expenses so far: ₦${totalExpenses.toLocaleString()}.`,
        color: theme.danger,
      });
    }

    if (totalRevenue > 0) {
      list.push({
        icon: 'wallet-outline',
        text: `Total revenue so far: ₦${totalRevenue.toLocaleString()}.`,
        color: theme.accentDark,
      });
    }

    if (avgMortality > 5) {
      list.push({
        icon: 'alert-circle-outline',
        text: `Mortality rate is at ${avgMortality.toFixed(1)}% — worth a closer look.`,
        color: '#FF9800',
      });
    } else if (liveBirds > 0) {
      list.push({
        icon: 'shield-checkmark-outline',
        text: `Mortality rate is healthy at ${avgMortality.toFixed(1)}%.`,
        color: theme.accentDark,
      });
    }

    if (plannedBatches > 0) {
      list.push({
        icon: 'time-outline',
        text: `You have ${plannedBatches} planned batch${plannedBatches > 1 ? 'es' : ''} ready to start.`,
        color: '#FF9800',
      });
    }

    if (list.length === 0) {
      list.push({
        icon: 'information-circle-outline',
        text: 'Add a batch and start logging records to see farm insights here.',
        color: theme.textMuted,
      });
    }

    return list;
  }, [totalRevenue, totalExpenses, totalProfit, avgMortality, liveBirds, plannedBatches, theme]);

  if (initialLoading) {
    return <LoadingState label="Loading your farm..." />;
  }

  if (loadError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <EmptyState
          icon="cloud-offline-outline"
          title="Could not connect"
          subtitle={`${loadError}. Check your internet connection and Supabase settings in .env, then restart Expo.`}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Poultriz</Text>
          <TouchableOpacity
            accessibilityLabel="Open home menu"
            accessibilityRole="button"
            onPress={() => setDrawerOpen(true)}
            style={styles.menuButton}
          >
            <Ionicons name="menu-outline" size={28} color={theme.text} />
          </TouchableOpacity>
        </View>
        <MedicationBanner items={medications} onPress={() => router.push('/medication-schedule')} />

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.statHeader}>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>Active Batches</Text>
              <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
            </View>
            <Text style={[styles.statValue, { color: '#4CAF50' }]}>{activeBatches}</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.statHeader}>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>Live Birds</Text>
              <Ionicons name="paw" size={18} color="#2196F3" />
            </View>
            <Text style={[styles.statValue, { color: '#2196F3' }]}>{liveBirds}</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.statHeader}>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>Planned Batches</Text>
              <Ionicons name="time" size={18} color="#FF9800" />
            </View>
            <Text style={[styles.statValue, { color: '#FF9800' }]}>{plannedBatches}</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.statHeader}>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>Avg Mortality</Text>
              <Ionicons name="trending-down" size={18} color="#999" />
            </View>
            <Text style={[styles.statValue, { color: theme.text }]}>{avgMortality.toFixed(1)}%</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.statHeader}>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>Completed Batches</Text>
              <Ionicons name="checkmark-done" size={18} color="#9E9E9E" />
            </View>
            <Text style={[styles.statValue, { color: '#9E9E9E' }]}>{completedBatches}</Text>
          </View>
        </View>

      

        <View style={{ marginTop: 16 }}>
          <InsightCarousel insights={insights} />
        </View>

        <BatchPieChart active={activeBatches} planned={plannedBatches} completed={completedBatches} />
        {completedBatchList.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Completed Batches</Text>
            {completedBatchList.map((batch) => (
              <TouchableOpacity
                key={batch.id}
                style={[styles.batchCard, { backgroundColor: theme.cardBackgroundAlt }]}
                onPress={() => router.push(`/(tabs)/batches/${batch.id}`)}
              >
                <View style={styles.batchTopRow}>
                  <Text style={[styles.batchName, { color: theme.text }]}>{batch.name}</Text>
                  <View style={styles.breedTag}>
                    <Text style={styles.breedTagText}>{batch.breed}</Text>
                  </View>
                </View>
                <View style={styles.batchMetaRow}>
                  <Ionicons name="paw-outline" size={14} color={theme.textMuted} />
                  <Text style={[styles.batchMetaText, { color: theme.textMuted }]}>
                    {batch.bird_count} birds
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {drawerOpen && (
        <View style={styles.drawerLayer}>
          <TouchableOpacity
            accessibilityLabel="Close home menu"
            accessibilityRole="button"
            onPress={() => setDrawerOpen(false)}
            style={styles.drawerBackdrop}
          />
          <View style={[styles.drawer, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.drawerHeader}>
              <Text style={[styles.drawerTitle, { color: theme.text }]}>Quick actions</Text>
              <TouchableOpacity
                accessibilityLabel="Close home menu"
                accessibilityRole="button"
                onPress={() => setDrawerOpen(false)}
              >
                <Ionicons name="close-outline" size={26} color={theme.text} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              accessibilityLabel="Open Farm Wrapped"
              accessibilityRole="button"
              onPress={() => {
                setDrawerOpen(false);
                router.push('../farm-wrapped');
              }}
              style={styles.drawerItem}
            >
              <Ionicons name="sparkles-outline" size={24} color={theme.accentDark} />
              <Text style={[styles.drawerItemText, { color: theme.text }]}>Farm Wrapped</Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityLabel="Open Batch Profit"
              accessibilityRole="button"
              onPress={() => {
                setDrawerOpen(false);
                router.push('/batch-profit');
              }}
              style={styles.drawerItem}
            >
              <Ionicons name="stats-chart-outline" size={24} color={theme.accentDark} />
              <Text style={[styles.drawerItemText, { color: theme.text }]}>Batch Profit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityLabel="Open Feed Calculator"
              accessibilityRole="button"
              onPress={() => {
                setDrawerOpen(false);
                router.push('/feed-calculator');
              }}
              style={styles.drawerItem}
            >
              <Ionicons name="calculator-outline" size={24} color={theme.accentDark} />
              <Text style={[styles.drawerItemText, { color: theme.text }]}>Feed Calculator</Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityLabel="Open Temperature Guide"
              accessibilityRole="button"
              onPress={() => {
                setDrawerOpen(false);
                router.push('/temperature-guide');
              }}
              style={styles.drawerItem}
            >
              <Ionicons name="thermometer-outline" size={24} color={theme.accentDark} />
              <Text style={[styles.drawerItemText, { color: theme.text }]}>Temperature Guide</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  menuButton: { padding: 4 },
  drawerLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 10,
    flexDirection: 'row',
  },
  drawerBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.35)' },
  drawer: {
    width: 280,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  drawerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  drawerTitle: { fontSize: 20, fontWeight: '700' },
  drawerItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 },
  drawerItemText: { fontSize: 16, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { width: '47%', backgroundColor: '#F2F2F2', borderRadius: 16, padding: 16 },
  statHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  statLabel: { color: '#666', fontSize: 13 },
  statValue: { fontSize: 28, fontWeight: 'bold' },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  batchCard: { borderRadius: 16, padding: 16, marginBottom: 10 },
  batchTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  batchName: { fontSize: 16, fontWeight: '700' },
  breedTag: { backgroundColor: '#E0E0E0', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  breedTagText: { color: '#616161', fontWeight: '600', fontSize: 12 },
  batchMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  batchMetaText: { fontSize: 13 },
});