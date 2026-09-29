import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EmptyState from '../../../components/EmptyState';
import { useTheme } from '../../../context/ThemeContext';
import { supabase } from '../../../lib/supabase';

type TabKey = 'active' | 'planned' | 'completed';

export default function ExpensesHomeScreen() {
  const { theme } = useTheme();
  const [batches, setBatches] = useState<any[]>([]);
  const [generalTotal, setGeneralTotal] = useState(0);
  const [activeTab, setActiveTab] = useState<TabKey>('active');

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    const { data: batchData } = await supabase.from('batches').select('*').order('created_at', { ascending: false });
    const { data: allExpenses } = await supabase.from('expenses').select('batch_id, amount');

    const batchCards = (batchData ?? []).map((b) => ({
      ...b,
      totalExpenses: (allExpenses ?? [])
        .filter((e) => e.batch_id === b.id)
        .reduce((sum, e) => sum + Number(e.amount), 0),
      count: (allExpenses ?? []).filter((e) => e.batch_id === b.id).length,
    }));

    const generalItems = (allExpenses ?? []).filter((e) => !e.batch_id);
    setGeneralTotal(generalItems.reduce((sum, e) => sum + Number(e.amount), 0));
    setBatches(batchCards);
  }

  function handleLongPress(item: any) {
    const options: { label: string; nextStatus: string }[] = [];

    if (item.status === 'planned') {
      options.push({ label: 'Mark as Active', nextStatus: 'active' });
    } else if (item.status === 'active') {
      options.push({ label: 'Mark as Completed', nextStatus: 'completed' });
    } else if (item.status === 'completed') {
      options.push({ label: 'Reopen as Active', nextStatus: 'active' });
    }

    Alert.alert(
      item.name,
      'Change batch status?',
      [
        ...options.map((opt) => ({
          text: opt.label,
          onPress: () => updateStatus(item.id, opt.nextStatus),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ]
    );
  }

  async function updateStatus(batchId: string, newStatus: string) {
    await supabase.from('batches').update({ status: newStatus }).eq('id', batchId);
    loadData();
  }

  const activeCards = batches.filter((b) => b.status === 'active');
  const plannedCards = batches.filter((b) => b.status === 'planned');
  const completedCards = batches.filter((b) => b.status === 'completed');
  const visibleCards = activeTab === 'active' ? activeCards : activeTab === 'planned' ? plannedCards : completedCards;

  const tabColor = (tab: TabKey) => {
    if (tab === 'active') return theme.accentDark;
    if (tab === 'planned') return '#FF9800';
    return '#9E9E9E';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>      
    <Text style={[styles.headerTitle, { color: theme.text }]}>Expenses</Text>

      <View style={styles.tabRow}>
        {(['active', 'planned', 'completed'] as TabKey[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tabButton,
              { backgroundColor: theme.cardBackground },
              activeTab === tab && { backgroundColor: tabColor(tab) },
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, { color: activeTab === tab ? '#fff' : theme.textMuted }]}>
              {tab === 'active' ? 'Active' : tab === 'planned' ? 'Planned' : 'Completed'} (
              {tab === 'active' ? activeCards.length : tab === 'planned' ? plannedCards.length : completedCards.length})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={visibleCards}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          activeTab === 'active' ? (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: theme.cardBackgroundAlt }]}
              onPress={() => router.push('/(tabs)/expenses/general')}
            >
              <View style={styles.topRow}>
                <Text style={[styles.cardName, { color: theme.text }]}>General</Text>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>Unlinked</Text>
                </View>
              </View>
              <Text style={[styles.cardSub, { color: theme.textMuted }]}>Expenses not tied to a batch</Text>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <View style={styles.statsRow}>
                <View>
                  <View style={styles.statLabelRow}>
                    <Ionicons name="cash-outline" size={14} color={theme.textMuted} />
                    <Text style={[styles.statLabel, { color: theme.textMuted }]}>Total</Text>
                  </View>
                  <Text style={[styles.statValue, { color: theme.text }]}>₦{generalTotal.toLocaleString()}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
              </View>
            </TouchableOpacity>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon={activeTab === 'planned' ? 'time-outline' : activeTab === 'completed' ? 'checkmark-done-outline' : 'file-tray-outline'}
            title={`No ${activeTab} batches yet`}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: theme.cardBackgroundAlt }]}
            onPress={() => router.push(`/(tabs)/expenses/${item.id}`)}
            onLongPress={() => handleLongPress(item)}
          >
            <View style={styles.topRow}>
              <Text style={[styles.cardName, { color: theme.text }]}>{item.name}</Text>
              <View style={[
                styles.tag,
                item.status === 'planned' && { backgroundColor: '#FFE0B2' },
                item.status === 'completed' && { backgroundColor: '#E0E0E0' },
              ]}>
                <Text style={[
                  styles.tagText,
                  item.status === 'planned' && { color: '#E65100' },
                  item.status === 'completed' && { color: '#616161' },
                ]}>
                  {item.status === 'active' ? 'Active' : item.status === 'planned' ? 'Planned' : 'Completed'}
                </Text>
              </View>
            </View>
            <Text style={[styles.cardSub, { color: theme.textMuted }]}>{item.breed}</Text>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.statsRow}>
              <View>
                <View style={styles.statLabelRow}>
                  <Ionicons name="cash-outline" size={14} color={theme.textMuted} />
                  <Text style={[styles.statLabel, { color: theme.textMuted }]}>Total</Text>
                </View>
                <Text style={[styles.statValue, { color: theme.text }]}>₦{item.totalExpenses.toLocaleString()}</Text>
              </View>
              <View>
                <View style={styles.statLabelRow}>
                  <Ionicons name="list-outline" size={14} color={theme.textMuted} />
                  <Text style={[styles.statLabel, { color: theme.textMuted }]}>Entries</Text>
                </View>
                <Text style={[styles.statValue, { color: theme.text }]}>{item.count}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tabButton: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  tabText: { fontWeight: '600', fontSize: 12 },
  card: { borderRadius: 16, padding: 16, marginBottom: 12 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { fontSize: 18, fontWeight: '700' },
  tag: { backgroundColor: '#E0F2D9', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { color: '#4CAF50', fontWeight: '600', fontSize: 12 },
  cardSub: { marginTop: 4 },
  divider: { height: 1, marginVertical: 12 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  statLabel: { fontSize: 13 },
  statValue: { fontSize: 16, fontWeight: '700' },
});