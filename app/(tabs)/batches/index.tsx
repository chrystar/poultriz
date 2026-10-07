import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Keyboard, Modal, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EmptyState from '../../../components/EmptyState';
import { useTheme } from '../../../context/ThemeContext';
import { supabase } from '../../../lib/supabase';

type TabKey = 'active' | 'planned' | 'completed';

export default function BatchesScreen() {
  const [batches, setBatches] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('Broiler');
  const [source, setSource] = useState('');
  const [birdCount, setBirdCount] = useState('');
  const [cost, setCost] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'active' | 'planned'>('active');
  const [birdType, setBirdType] = useState<'broiler' | 'layer'>('broiler');
  const [activeTab, setActiveTab] = useState<TabKey>('active');
  const [userLimits, setUserLimits] = useState<any>(null);
  const { theme } = useTheme();

  // Activation modal (planned -> active, editable bird count/cost)
  const [activateModalVisible, setActivateModalVisible] = useState(false);
  const [activatingBatch, setActivatingBatch] = useState<any>(null);
  const [activateBirdCount, setActivateBirdCount] = useState('');
  const [activateCost, setActivateCost] = useState('');
  const [activating, setActivating] = useState(false);

  // Edit Batch modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingBatch, setEditingBatch] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editBreed, setEditBreed] = useState('');
  const [editSource, setEditSource] = useState('');
  const [editBirdType, setEditBirdType] = useState<'broiler' | 'layer'>('broiler');
  const [editBirdCount, setEditBirdCount] = useState('');
  const [editCost, setEditCost] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadBatches();
      loadUserLimits();
    }, [])
  );

  async function loadBatches() {
    const { data } = await supabase.from('batches').select('*').order('created_at', { ascending: false });
    setBatches(data ?? []);
  }

  async function loadUserLimits() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from('user_limits')
      .select('*')
      .eq('user_id', user?.id)
      .single();
    setUserLimits(data);
  }

  function canCreateBatch() {
    if (!userLimits) return true;
    const withinQuota = userLimits.batches_created_count < userLimits.batch_quota;
    const withinWindow = !userLimits.plan || new Date(userLimits.access_until) > new Date();
    return withinQuota && withinWindow;
  }

  function daysSince(startDate: string) {
    const start = new Date(startDate);
    const today = new Date();
    return Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  async function handleAddBatch() {
    if (!name || !birdCount) {
      Alert.alert('Error', 'Please fill in batch name and bird count');
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('batches').insert({
      user_id: user?.id,
      name,
      breed,
      source,
      start_date: new Date().toISOString().split('T')[0],
      bird_count: parseInt(birdCount, 10),
      cost: cost ? parseFloat(cost) : 0,
      status: status,
      bird_type: birdType,
    });

    if (error) {
      setSaving(false);
      if (error.message.includes('row-level security') || error.message.includes('policy')) {
        setModalVisible(false);
        router.push('/paywall');
        return;
      }
      Alert.alert('Error', error.message);
      return;
    }

    setSaving(false);
    setName(''); setBreed('Broiler'); setSource(''); setBirdCount(''); setCost(''); setStatus('active'); setBirdType('broiler');
    setModalVisible(false);
    setActiveTab(status);
    loadBatches();
    loadUserLimits();
  }

  function handleLongPress(item: any) {
    const options: { label: string; action: () => void }[] = [];

    options.push({ label: 'Edit Batch', action: () => openEditModal(item) });

    if (item.status === 'planned') {
      options.push({ label: 'Mark as Active', action: () => openActivateModal(item) });
    } else if (item.status === 'active') {
      options.push({ label: 'Mark as Completed', action: () => updateStatus(item.id, 'completed') });
    } else if (item.status === 'completed') {
      options.push({ label: 'Reopen as Active', action: () => updateStatus(item.id, 'active') });
    }

    Alert.alert(
      item.name,
      'Edit, change status, or delete this batch?',
      [
        ...options.map((opt) => ({ text: opt.label, onPress: opt.action })),
        {
          text: 'Delete Batch',
          style: 'destructive' as const,
          onPress: () => confirmDelete(item),
        },
        { text: 'Cancel', style: 'cancel' as const },
      ]
    );
  }

  function openEditModal(item: any) {
    setEditingBatch(item);
    setEditName(item.name ?? '');
    setEditBreed(item.breed ?? '');
    setEditSource(item.source ?? '');
    setEditBirdType(item.bird_type === 'layer' ? 'layer' : 'broiler');
    setEditBirdCount(String(item.bird_count ?? ''));
    setEditCost(String(item.cost ?? '0'));
    setEditModalVisible(true);
  }

  async function handleSaveEdit() {
    if (!editName || !editBirdCount) {
      Alert.alert('Error', 'Please fill in batch name and bird count');
      return;
    }

    setEditSaving(true);
    const { error } = await supabase
      .from('batches')
      .update({
        name: editName,
        breed: editBreed,
        source: editSource,
        bird_type: editBirdType,
        bird_count: parseInt(editBirdCount, 10),
        cost: editCost ? parseFloat(editCost) : 0,
      })
      .eq('id', editingBatch.id);

    setEditSaving(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    setEditModalVisible(false);
    setEditingBatch(null);
    loadBatches();
  }

  function openActivateModal(item: any) {
    setActivatingBatch(item);
    setActivateBirdCount(String(item.bird_count ?? ''));
    setActivateCost(String(item.cost ?? '0'));
    setActivateModalVisible(true);
  }

  async function handleConfirmActivate() {
    if (!activateBirdCount) {
      Alert.alert('Error', 'Please enter the bird count');
      return;
    }

    setActivating(true);
    const { error } = await supabase
      .from('batches')
      .update({
        status: 'active',
        bird_count: parseInt(activateBirdCount, 10),
        cost: activateCost ? parseFloat(activateCost) : 0,
        start_date: new Date().toISOString().split('T')[0],
      })
      .eq('id', activatingBatch.id);

    setActivating(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    setActivateModalVisible(false);
    setActivatingBatch(null);
    setActiveTab('active');
    loadBatches();
  }

  function confirmDelete(item: any) {
    Alert.alert(
      'Delete Batch',
      `Delete "${item.name}"? This will also delete its related records, expenses, and sales.`,
      [
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('batches').delete().eq('id', item.id);
            loadBatches();
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }

  async function updateStatus(batchId: string, newStatus: string) {
    await supabase.from('batches').update({ status: newStatus }).eq('id', batchId);
    loadBatches();
  }

  const activeBatches = batches.filter((b) => b.status === 'active');
  const plannedBatches = batches.filter((b) => b.status === 'planned');
  const completedBatches = batches.filter((b) => b.status === 'completed');

  const visibleBatches =
    activeTab === 'active' ? activeBatches : activeTab === 'planned' ? plannedBatches : completedBatches;

  const tabColor = (tab: TabKey) => {
    if (tab === 'active') return theme.accentDark;
    if (tab === 'planned') return '#FF9800';
    return '#9E9E9E';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.screenBackground }]} edges={['top']}>
      <Text style={[styles.headerTitle, { color: theme.text }]}>Batches</Text>

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
              {tab === 'active' ? activeBatches.length : tab === 'planned' ? plannedBatches.length : completedBatches.length})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={visibleBatches}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          activeTab === 'active' ? (
            <EmptyState icon="paw-outline" title="No active batches yet" subtitle="Tap 'New Batch' to get started." />
          ) : activeTab === 'planned' ? (
            <EmptyState icon="time-outline" title="No planned batches yet" />
          ) : (
            <EmptyState icon="checkmark-done-outline" title="No completed batches yet" />
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.batchCard, { backgroundColor: theme.cardBackgroundAlt }]}
            onPress={() => router.push(`/(tabs)/batches/${item.id}`)}
            onLongPress={() => handleLongPress(item)}
          >
            <View style={styles.batchTopRow}>
              <Text style={[styles.batchName, { color: theme.text }]}>{item.name}</Text>
              <View style={styles.breedTag}>
                <Text style={styles.breedTagText}>{item.breed}</Text>
              </View>
            </View>
            <Text style={[styles.batchSource, { color: theme.textMuted }]}>{item.source}</Text>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.statsRow}>
              <View>
                <View style={styles.statLabelRow}>
                  <Ionicons name="paw-outline" size={14} color={theme.textMuted} />
                  <Text style={[styles.statLabel, { color: theme.textMuted }]}>Birds</Text>
                </View>
                <Text style={[styles.statValue, { color: theme.text }]}>{item.bird_count}</Text>
              </View>
              <View>
                <View style={styles.statLabelRow}>
                  <Ionicons name="calendar-outline" size={14} color={theme.textMuted} />
                  <Text style={[styles.statLabel, { color: theme.textMuted }]}>Days</Text>
                </View>
                <Text style={[styles.statValue, { color: theme.text }]}>{daysSince(item.start_date)}</Text>
              </View>
              <View>
                <View style={styles.statLabelRow}>
                  <Ionicons name="cash-outline" size={14} color={theme.textMuted} />
                  <Text style={[styles.statLabel, { color: theme.textMuted }]}>Cost</Text>
                </View>
                <Text style={[styles.statValue, { color: theme.text }]}>₦{item.cost?.toLocaleString()}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity
        style={styles.newBatchButton}
        onPress={() => {
          if (canCreateBatch()) {
            setModalVisible(true);
          } else {
            router.push('/paywall');
          }
        }}
      >
        <Ionicons name="add" size={20} color="#222" />
        <Text style={styles.newBatchText}>New Batch</Text>
      </TouchableOpacity>

      {/* New Batch modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>New Batch</Text>
                <TextInput style={[styles.input, { borderColor: theme.border, color: theme.text }]} placeholder="Batch name (e.g. Batch A)" placeholderTextColor={theme.textFaint} value={name} onChangeText={setName} />
                <TextInput style={[styles.input, { borderColor: theme.border, color: theme.text }]} placeholder="Breed (e.g. Broiler)" placeholderTextColor={theme.textFaint} value={breed} onChangeText={setBreed} />
                <TextInput style={[styles.input, { borderColor: theme.border, color: theme.text }]} placeholder="Source (e.g. Agrited)" placeholderTextColor={theme.textFaint} value={source} onChangeText={setSource} />
                <TextInput style={[styles.input, { borderColor: theme.border, color: theme.text }]} placeholder="Number of birds" placeholderTextColor={theme.textFaint} keyboardType="numeric" value={birdCount} onChangeText={setBirdCount} />
                <TextInput style={[styles.input, { borderColor: theme.border, color: theme.text }]} placeholder="Initial cost (₦)" placeholderTextColor={theme.textFaint} keyboardType="numeric" value={cost} onChangeText={setCost} />

                <Text style={{ color: theme.textMuted, marginBottom: 8, fontSize: 13 }}>Bird Type</Text>
                <View style={styles.statusToggleRow}>
                  <TouchableOpacity
                    style={[styles.statusChip, birdType === 'broiler' && styles.statusChipActive]}
                    onPress={() => setBirdType('broiler')}
                  >
                    <Text style={[styles.statusChipText, birdType === 'broiler' && styles.statusChipTextActive]}>Broiler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.statusChip, birdType === 'layer' && styles.statusChipActive]}
                    onPress={() => setBirdType('layer')}
                  >
                    <Text style={[styles.statusChipText, birdType === 'layer' && styles.statusChipTextActive]}>Layer</Text>
                  </TouchableOpacity>
                </View>

                <Text style={{ color: theme.textMuted, marginBottom: 8, fontSize: 13 }}>Status</Text>
                <View style={styles.statusToggleRow}>
                  <TouchableOpacity
                    style={[styles.statusChip, status === 'active' && styles.statusChipActive]}
                    onPress={() => setStatus('active')}
                  >
                    <Text style={[styles.statusChipText, status === 'active' && styles.statusChipTextActive]}>Active</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.statusChip, status === 'planned' && styles.statusChipActive]}
                    onPress={() => setStatus('planned')}
                  >
                    <Text style={[styles.statusChipText, status === 'planned' && styles.statusChipTextActive]}>Planned</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.saveButton} onPress={handleAddBatch} disabled={saving}>
                  <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Batch'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Text style={[styles.cancelText, { color: theme.textFaint }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Activate modal */}
      <Modal visible={activateModalVisible} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Activate "{activatingBatch?.name}"</Text>
                <Text style={[styles.modalSubtitle, { color: theme.textMuted }]}>
                  Confirm or update the actual delivery details before marking this batch active.
                </Text>
                <TextInput
                  style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                  placeholder="Number of birds received"
                  placeholderTextColor={theme.textFaint}
                  keyboardType="numeric"
                  value={activateBirdCount}
                  onChangeText={setActivateBirdCount}
                />
                <TextInput
                  style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                  placeholder="Actual cost (₦)"
                  placeholderTextColor={theme.textFaint}
                  keyboardType="numeric"
                  value={activateCost}
                  onChangeText={setActivateCost}
                />
                <TouchableOpacity style={styles.saveButton} onPress={handleConfirmActivate} disabled={activating}>
                  <Text style={styles.saveButtonText}>{activating ? 'Activating...' : 'Confirm & Activate'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActivateModalVisible(false)}>
                  <Text style={[styles.cancelText, { color: theme.textFaint }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Edit Batch modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Batch</Text>
                <TextInput style={[styles.input, { borderColor: theme.border, color: theme.text }]} placeholder="Batch name" placeholderTextColor={theme.textFaint} value={editName} onChangeText={setEditName} />
                <TextInput style={[styles.input, { borderColor: theme.border, color: theme.text }]} placeholder="Breed" placeholderTextColor={theme.textFaint} value={editBreed} onChangeText={setEditBreed} />
                <TextInput style={[styles.input, { borderColor: theme.border, color: theme.text }]} placeholder="Source" placeholderTextColor={theme.textFaint} value={editSource} onChangeText={setEditSource} />
                <TextInput style={[styles.input, { borderColor: theme.border, color: theme.text }]} placeholder="Number of birds" placeholderTextColor={theme.textFaint} keyboardType="numeric" value={editBirdCount} onChangeText={setEditBirdCount} />
                <TextInput style={[styles.input, { borderColor: theme.border, color: theme.text }]} placeholder="Cost (₦)" placeholderTextColor={theme.textFaint} keyboardType="numeric" value={editCost} onChangeText={setEditCost} />

                <Text style={{ color: theme.textMuted, marginBottom: 8, fontSize: 13 }}>Bird Type</Text>
                <View style={styles.statusToggleRow}>
                  <TouchableOpacity
                    style={[styles.statusChip, editBirdType === 'broiler' && styles.statusChipActive]}
                    onPress={() => setEditBirdType('broiler')}
                  >
                    <Text style={[styles.statusChipText, editBirdType === 'broiler' && styles.statusChipTextActive]}>Broiler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.statusChip, editBirdType === 'layer' && styles.statusChipActive]}
                    onPress={() => setEditBirdType('layer')}
                  >
                    <Text style={[styles.statusChipText, editBirdType === 'layer' && styles.statusChipTextActive]}>Layer</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.saveButton} onPress={handleSaveEdit} disabled={editSaving}>
                  <Text style={styles.saveButtonText}>{editSaving ? 'Saving...' : 'Save Changes'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <Text style={[styles.cancelText, { color: theme.textFaint }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tabButton: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  tabText: { fontWeight: '600', fontSize: 12 },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 40 },
  batchCard: { backgroundColor: '#E8E8E8', borderRadius: 16, padding: 16, marginBottom: 12 },
  batchTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  batchName: { fontSize: 18, fontWeight: '700' },
  breedTag: { backgroundColor: '#FFE0B2', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  breedTagText: { color: '#E65100', fontWeight: '600', fontSize: 12 },
  batchSource: { color: '#777', marginTop: 4 },
  divider: { height: 1, backgroundColor: '#D5D5D5', marginVertical: 12 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  statLabel: { color: '#666', fontSize: 13 },
  statValue: { fontSize: 16, fontWeight: '700' },
  newBatchButton: {
    flexDirection: 'row', alignSelf: 'flex-end', alignItems: 'center', gap: 6,
    backgroundColor: '#B9E37D', borderRadius: 24, paddingHorizontal: 18, paddingVertical: 12,
    position: 'absolute', bottom: 20, right: 16,
  },
  newBatchText: { fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  modalSubtitle: { fontSize: 13, marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 14, marginBottom: 12 },
  saveButton: { backgroundColor: '#B9E37D', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  saveButtonText: { fontWeight: '600' },
  cancelText: { textAlign: 'center', marginTop: 16, color: '#999' },
  statusToggleRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statusChip: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 12, alignItems: 'center' },
  statusChipActive: { backgroundColor: '#B9E37D', borderColor: '#B9E37D' },
  statusChipText: { color: '#666' },
  statusChipTextActive: { color: '#222', fontWeight: '600' },
});