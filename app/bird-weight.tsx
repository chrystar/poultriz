import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';

const TARGETS = [
  { day: 7, weight: 0.18 },
  { day: 14, weight: 0.45 },
  { day: 21, weight: 0.85 },
  { day: 28, weight: 1.35 },
  { day: 34, weight: 1.75 },
  { day: 42, weight: 2.3 },
];

export default function BirdWeightScreen() {
  const { batchId } = useLocalSearchParams<{ batchId: string }>();
  const { theme } = useTheme();
  const [batch, setBatch] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [requiredSampleSize, setRequiredSampleSize] = useState('');
  const [birdWeight, setBirdWeight] = useState('');
  const [measurements, setMeasurements] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [batchId])
  );

  async function load() {
    setLoading(true);
    const [{ data: batchData }, { data: recordData }] = await Promise.all([
      supabase.from('batches').select('name, start_date, bird_type').eq('id', batchId).single(),
      supabase
        .from('daily_records')
        .select('id, record_date, avg_weight_kg')
        .eq('batch_id', batchId)
        .not('avg_weight_kg', 'is', null)
        .order('record_date', { ascending: false }),
    ]);
    setBatch(batchData);
    setRecords(recordData ?? []);
    setLoading(false);
  }

  const ageInDays = useMemo(() => {
    if (!batch?.start_date) return 0;
    return Math.max(0, Math.floor((Date.now() - new Date(batch.start_date).getTime()) / 86400000));
  }, [batch?.start_date]);

  const requiredCount = Number(requiredSampleSize);
  const totalWeight = useMemo(() => measurements.reduce((sum, weight) => sum + weight, 0), [measurements]);
  const averageWeight = measurements.length > 0 ? totalWeight / measurements.length : 0;
  const hasRequiredCount = Number.isInteger(requiredCount) && requiredCount > 0;

  const currentTarget = TARGETS.reduce((closest, target) =>
    target.day <= ageInDays ? target : closest, TARGETS[0]);

  async function handleSave() {
    if (!hasRequiredCount) {
      Alert.alert('Sample size required', 'Enter how many birds you want to weigh before adding measurements.');
      return;
    }
    if (measurements.length !== requiredCount) {
      Alert.alert(
        'Finish the sample',
        `Add ${requiredCount - measurements.length} more bird${requiredCount - measurements.length === 1 ? '' : 's'} before saving.`
      );
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const existing = await supabase
      .from('daily_records')
      .select('id')
      .eq('batch_id', batchId)
      .eq('record_date', today)
      .maybeSingle();

    const payload = { avg_weight_kg: Number(averageWeight.toFixed(3)) };
    const result = existing.data
      ? await supabase.from('daily_records').update(payload).eq('id', existing.data.id)
      : await supabase.from('daily_records').insert({ ...payload, batch_id: batchId, record_date: today, user_id: user?.id });

    setSaving(false);
    if (result.error) {
      Alert.alert('Could not save weight', result.error.message);
      return;
    }
    Alert.alert('Weight saved', `Average weight: ${payload.avg_weight_kg}kg`);
    setRequiredSampleSize('');
    setBirdWeight('');
    setMeasurements([]);
    load();
  }

  function handleAddMeasurement() {
    const weight = Number(birdWeight);
    if (!hasRequiredCount) {
      Alert.alert('Sample size required', 'Enter the number of birds you want to weigh first.');
      return;
    }
    if (measurements.length >= requiredCount) {
      Alert.alert('Sample complete', 'You have already added the required number of birds.');
      return;
    }
    if (!Number.isFinite(weight) || weight <= 0) {
      Alert.alert('Invalid weight', 'Enter this bird’s weight in kilograms.');
      return;
    }
    setMeasurements((current) => [...current, weight]);
    setBirdWeight('');
  }

  function handleRemoveMeasurement(index: number) {
    setMeasurements((current) => current.filter((_, measurementIndex) => measurementIndex !== index));
  }

  if (loading) return <LoadingState label="Loading weight tracker..." />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Bird Weight</Text>
          <Text style={[styles.headerSub, { color: theme.textMuted }]}>{batch?.name}</Text>
        </View>
        <Ionicons name="scale-outline" size={23} color={theme.accentDark} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.infoCard, { backgroundColor: theme.cardBackgroundAlt }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Track growth with a small sample</Text>
          <Text style={[styles.body, { color: theme.textMuted }]}>
            Weigh a representative sample from different parts of the pen. Add each bird one at a time and compare the average with the guide below. This is optional.
          </Text>
          <View style={[styles.agePill, { backgroundColor: theme.accent }]}>
            <Text style={[styles.agePillText, { color: '#35551F' }]}>Batch age: {ageInDays} days</Text>
          </View>
        </View>

        <Text style={[styles.eyebrow, { color: theme.textMuted }]}>WEIGH BIRDS</Text>
        <View style={[styles.formCard, { backgroundColor: theme.cardBackgroundAlt }]}>
          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.text }]}
            placeholder="Required sample size (e.g. 10)"
            placeholderTextColor={theme.textFaint}
            keyboardType="number-pad"
            value={requiredSampleSize}
            onChangeText={(value) => {
              setRequiredSampleSize(value.replace(/[^0-9]/g, ''));
              setMeasurements([]);
            }}
          />
          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.text }]}
            placeholder="This bird's weight in kg"
            placeholderTextColor={theme.textFaint}
            keyboardType="decimal-pad"
            value={birdWeight}
            onChangeText={setBirdWeight}
          />
          <TouchableOpacity style={[styles.addMeasurementButton, { borderColor: theme.accentDark }]} onPress={handleAddMeasurement}>
            <Ionicons name="add-circle-outline" size={18} color={theme.accentDark} />
            <Text style={[styles.addMeasurementText, { color: theme.accentDark }]}>Add bird measurement</Text>
          </TouchableOpacity>
          <View style={[styles.progressRow, { backgroundColor: theme.background }]}>
            <Text style={[styles.body, { color: theme.textMuted }]}>
              Measurements: {measurements.length}/{hasRequiredCount ? requiredCount : '—'}
            </Text>
            <Text style={[styles.body, { color: theme.textMuted }]}>Total: {totalWeight ? `${totalWeight.toFixed(3)}kg` : '—'}</Text>
          </View>
          {measurements.length > 0 ? (
            <View style={styles.measurementList}>
              {measurements.map((weight, index) => (
                <View key={`${weight}-${index}`} style={[styles.measurementRow, { borderBottomColor: theme.border }]}>
                  <Text style={[styles.body, { color: theme.textMuted }]}>Bird {index + 1}</Text>
                  <View style={styles.measurementValue}>
                    <Text style={[styles.body, { color: theme.text }]}>{weight.toFixed(3)}kg</Text>
                    <TouchableOpacity onPress={() => handleRemoveMeasurement(index)} hitSlop={8}>
                      <Ionicons name="close-circle-outline" size={18} color={theme.textFaint} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
          <View style={[styles.averageRow, { borderTopColor: theme.border }]}>
            <Text style={[styles.body, { color: theme.textMuted }]}>Average bird weight</Text>
            <Text style={[styles.averageValue, { color: theme.text }]}>{averageWeight ? `${averageWeight.toFixed(3)}kg` : '—'}</Text>
          </View>
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: theme.accentDark }, measurements.length !== requiredCount && styles.disabledButton]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save today’s weight'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.eyebrow, { color: theme.textMuted }]}>EXPECTED BROILER WEIGHT</Text>
        <Text style={[styles.helper, { color: theme.textFaint }]}>General guide only. Breed, feed, health, and management can change results.</Text>
        <View style={[styles.targetsCard, { backgroundColor: theme.cardBackgroundAlt }]}>
          {TARGETS.map((target) => {
            const active = target.day === currentTarget.day;
            return (
              <View key={target.day} style={[styles.targetRow, active && { backgroundColor: theme.accent }]}>
                <Text style={[styles.targetDay, { color: theme.text }]}>Day {target.day}</Text>
                <Text style={[styles.targetWeight, { color: theme.textMuted }]}>≈ {target.weight.toFixed(2)} kg</Text>
                {active ? <Text style={[styles.targetBadge, { color: '#35551F' }]}>Current guide</Text> : null}
              </View>
            );
          })}
        </View>

        <Text style={[styles.eyebrow, { color: theme.textMuted }]}>WEIGHT HISTORY</Text>
        {records.length === 0 ? (
          <EmptyState icon="scale-outline" title="No weights recorded yet" subtitle="Your saved sample averages will appear here." />
        ) : (
          <View style={[styles.historyCard, { backgroundColor: theme.cardBackgroundAlt }]}>
            {records.map((record) => (
              <View key={record.id} style={[styles.historyRow, { borderBottomColor: theme.border }]}>
                <Text style={[styles.body, { color: theme.textMuted }]}>{record.record_date}</Text>
                <Text style={[styles.historyWeight, { color: theme.text }]}>{Number(record.avg_weight_kg).toFixed(3)}kg average</Text>
              </View>
            ))}
          </View>
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
  headerSub: { fontSize: 12, marginTop: 2 },
  content: { padding: 16, paddingBottom: 40 },
  infoCard: { borderRadius: 16, padding: 16, marginBottom: 22 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  body: { fontSize: 13, lineHeight: 19 },
  agePill: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginTop: 12 },
  agePillText: { fontSize: 12, fontWeight: '700' },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 8, marginTop: 4 },
  formCard: { borderRadius: 16, padding: 16, marginBottom: 22 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 12 },
  addMeasurementButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 12, padding: 13, marginBottom: 12 },
  addMeasurementText: { fontWeight: '700', fontSize: 13 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', borderRadius: 10, padding: 10, marginBottom: 4 },
  measurementList: { marginTop: 4, marginBottom: 4 },
  measurementRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1 },
  measurementValue: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  averageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 14, marginTop: 2 },
  averageValue: { fontSize: 18, fontWeight: '800' },
  saveButton: { padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  disabledButton: { opacity: 0.45 },
  saveButtonText: { color: '#fff', fontWeight: '700' },
  helper: { fontSize: 12, lineHeight: 17, marginTop: -3, marginBottom: 10 },
  targetsCard: { borderRadius: 16, padding: 8, marginBottom: 22 },
  targetRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 11, padding: 12, marginBottom: 2 },
  targetDay: { width: 65, fontWeight: '700' },
  targetWeight: { flex: 1, fontSize: 13 },
  targetBadge: { fontSize: 11, fontWeight: '700' },
  historyCard: { borderRadius: 16, paddingHorizontal: 14 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1 },
  historyWeight: { fontWeight: '700' },
});
