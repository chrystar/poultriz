import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EmptyState from '../../../components/EmptyState';
import { useTheme } from '../../../context/ThemeContext';
import { supabase } from '../../../lib/supabase';

type TabKey = 'active' | 'planned' | 'completed';

export default function StoreHomeScreen() {
  const { theme } = useTheme();
  const [batches, setBatches] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('active');
  const [toolsBatch, setToolsBatch] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    const { data: batchData } = await supabase.from('batches').select('*').order('created_at', { ascending: false });
    const { data: allSales } = await supabase.from('sales').select('batch_id, quantity, unit_price');

    const batchCards = (batchData ?? []).map((b) => ({
      ...b,
      totalRevenue: (allSales ?? [])
        .filter((s) => s.batch_id === b.id)
        .reduce((sum, s) => sum + s.quantity * Number(s.unit_price), 0),
      count: (allSales ?? []).filter((s) => s.batch_id === b.id).length,
    }));

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

    if (Platform.OS === 'web') {
      setToolsBatch(item);
      return;
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
    await supabase
      .from('batches')
      .update({
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
      })
      .eq('id', batchId);
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
    <Text style={[styles.headerTitle, { color: theme.text }]}>Store</Text>

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
        // keyExtractor={(item) => item.id}
        // ListHeaderComponent={
        //   activeTab === 'active' ? (
        //     <TouchableOpacity
        //       style={[styles.card, { backgroundColor: theme.cardBackgroundAlt }]}
        //       onPress={() => router.push('/(tabs)/store/general')}
        //     >
        //       <View style={styles.topRow}>
        //         <Text style={[styles.cardName, { color: theme.text }]}>General</Text>
        //         <View style={styles.tag}>
        //           <Text style={styles.tagText}>Unlinked</Text>
        //         </View>
        //       </View>
        //       <Text style={[styles.cardSub, { color: theme.textMuted }]}>Sales not tied to a batch</Text>
        //       <View style={[styles.divider, { backgroundColor: theme.border }]} />
        //       <View style={styles.statsRow}>
        //         <View>
        //           <View style={styles.statLabelRow}>
        //             <Ionicons name="cash-outline" size={14} color={theme.textMuted} />
        //             <Text style={[styles.statLabel, { color: theme.textMuted }]}>Revenue</Text>
        //           </View>
        //           <Text style={[styles.statValue, { color: theme.accentDark }]}>₦{generalTotal.toLocaleString()}</Text>
        //         </View>
        //         <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
        //       </View>
        //     </TouchableOpacity>
        //   ) : null
        // }
        ListEmptyComponent={
          <EmptyState
            icon={activeTab === 'planned' ? 'time-outline' : activeTab === 'completed' ? 'checkmark-done-outline' : 'file-tray-outline'}
            title={`No ${activeTab} batches yet`}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.card,
              { backgroundColor: theme.cardBackgroundAlt },
              item.status === 'completed' && styles.completedCard,
            ]}
            onPress={() => router.push(`/(tabs)/store/${item.id}`)}
            onLongPress={() => handleLongPress(item)}
          >
            <View style={styles.topRow}>
              <Text style={[styles.cardName, { color: theme.text }]}>{item.name}</Text>
              <View style={[
                styles.tag,
                item.status === 'planned' && { backgroundColor: '#FFE0B2' },
                item.status === 'completed' && styles.completedTag,
              ]}>
                <Text style={[
                  styles.tagText,
                  item.status === 'planned' && { color: '#E65100' },
                  item.status === 'completed' && styles.completedTagText,
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
                  <Text style={[styles.statLabel, { color: theme.textMuted }]}>Revenue</Text>
                </View>
                <Text style={[styles.statValue, { color: theme.accentDark }]}>₦{item.totalRevenue.toLocaleString()}</Text>
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
      {toolsBatch ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setToolsBatch(null)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.toolsModal, { backgroundColor: theme.background }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{toolsBatch.name}</Text>
              <Text style={[styles.toolsSubtitle, { color: theme.textMuted }]}>Batch tools</Text>
              <TouchableOpacity style={styles.toolButton} onPress={() => { setToolsBatch(null); updateStatus(toolsBatch.id, toolsBatch.status === 'active' ? 'completed' : 'active'); }}>
                <Text style={[styles.toolButtonText, { color: theme.text }]}>
                  {toolsBatch.status === 'active' ? 'Mark as Completed' : toolsBatch.status === 'planned' ? 'Mark as Active' : 'Reopen as Active'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setToolsBatch(null)}>
                <Text style={[styles.cancelText, { color: theme.textFaint }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  toolsModal: { width: '92%', maxWidth: 420, borderRadius: 20, padding: 24 },
  toolsSubtitle: { fontSize: 13, marginBottom: 12 },
  toolButton: { borderTopWidth: 1, borderTopColor: '#DDDDDD', paddingVertical: 14 },
  toolButtonText: { fontSize: 15, fontWeight: '600' },
  cancelText: { textAlign: 'center', marginTop: 16 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tabButton: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  tabText: { fontWeight: '600', fontSize: 12 },
  card: { borderRadius: 16, padding: 16, marginBottom: 12 },
  completedCard: { backgroundColor: '#EEF4EF', borderWidth: 1, borderColor: '#C6D8C9' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { fontSize: 18, fontWeight: '700' },
  tag: { backgroundColor: '#E0F2D9', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  completedTag: { backgroundColor: '#D7E8DB' },
  tagText: { color: '#4CAF50', fontWeight: '600', fontSize: 12 },
  completedTagText: { color: '#356B43' },
  cardSub: { marginTop: 4 },
  divider: { height: 1, marginVertical: 12 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  statLabel: { fontSize: 13 },
  statValue: { fontSize: 16, fontWeight: '700' },
});