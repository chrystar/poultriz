import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';

type BirdType = 'broiler' | 'layer';

type Batch = {
  id: string;
  name: string;
  bird_type: BirdType | null;
  start_date: string;
};

type TemperatureStatus = 'cold' | 'suitable' | 'hot';

function getTemperatureRange(birdType: BirdType, ageDays: number) {
  const week = Math.floor(Math.max(0, ageDays - 1) / 7);
  const base = birdType === 'layer' ? 33 : 34;
  const reduction = Math.min(week, 5) * 2;
  const minimum = Math.max(21, base - reduction - 1);
  const maximum = Math.max(23, base - reduction + 1);

  return { minimum, maximum };
}

export default function TemperatureGuideScreen() {
  const { theme } = useTheme();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [temperature, setTemperature] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentTime] = useState(() => new Date().getTime());

  useEffect(() => {
    async function loadBatches() {
      const { data, error } = await supabase
        .from('batches')
        .select('id, name, bird_type, start_date')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        Alert.alert('Could not load batches', error.message);
      } else {
        setBatches((data ?? []) as Batch[]);
      }
      setLoading(false);
    }

    loadBatches();
  }, []);

  const selectedBatch = batches.find((batch) => batch.id === selectedBatchId);
  const ageDays = selectedBatch
    ? Math.max(1, Math.floor((currentTime - new Date(selectedBatch.start_date).getTime()) / 86400000) + 1)
    : 0;
  const birdType = selectedBatch?.bird_type === 'layer' ? 'layer' : 'broiler';
  const range = useMemo(
    () => getTemperatureRange(birdType, ageDays),
    [birdType, ageDays]
  );
  const reading = Number.parseFloat(temperature);

  let status: TemperatureStatus | null = null;
  if (Number.isFinite(reading) && selectedBatch) {
    status = reading < range.minimum ? 'cold' : reading > range.maximum ? 'hot' : 'suitable';
  }

  const statusContent = {
    cold: {
      title: 'Temperature is low',
      message: 'Increase heating and check that birds are evenly distributed around the heat source.',
      icon: 'snow-outline' as const,
      color: '#1976D2',
    },
    suitable: {
      title: 'Temperature is suitable',
      message: 'Keep monitoring the birds and maintain good ventilation.',
      icon: 'checkmark-circle-outline' as const,
      color: theme.accentDark,
    },
    hot: {
      title: 'Temperature is high',
      message: 'Reduce heating and improve ventilation. Check for panting or birds moving away from the heat source.',
      icon: 'sunny-outline' as const,
      color: '#E07800',
    },
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity accessibilityLabel="Go back" onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Temperature Guide</Text>
          <View style={styles.headerSpacer} />
        </View>

        <Text style={[styles.intro, { color: theme.textMuted }]}>
          Select an active batch to see the recommended temperature for its age.
        </Text>

        <Text style={[styles.label, { color: theme.textMuted }]}>Active batch</Text>
        {loading ? (
          <ActivityIndicator color={theme.accentDark} style={styles.loader} />
        ) : batches.length === 0 ? (
          <View style={[styles.notice, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.noticeText, { color: theme.textMuted }]}>No active batches available.</Text>
          </View>
        ) : (
          <View style={styles.batchList}>
            {batches.map((batch) => (
              <TouchableOpacity
                key={batch.id}
                onPress={() => setSelectedBatchId(batch.id)}
                style={[
                  styles.batchOption,
                  { backgroundColor: theme.cardBackground, borderColor: theme.border },
                  selectedBatchId === batch.id && { borderColor: theme.accentDark, backgroundColor: theme.screenBackground },
                ]}
              >
                <View style={styles.batchOptionText}>
                  <Text style={[styles.batchName, { color: theme.text }]}>{batch.name}</Text>
                  <Text style={[styles.batchMeta, { color: theme.textMuted }]}>
                    {batch.bird_type === 'layer' ? 'Layer' : 'Broiler'}
                  </Text>
                </View>
                {selectedBatchId === batch.id && (
                  <Ionicons name="checkmark-circle" size={22} color={theme.accentDark} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {selectedBatch && (
          <>
            <View style={[styles.summaryCard, { backgroundColor: theme.cardBackground }]}>
              <View>
                <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Bird age</Text>
                <Text style={[styles.summaryValue, { color: theme.text }]}>
                  {ageDays} {ageDays === 1 ? 'day' : 'days'}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View>
                <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Recommended range</Text>
                <Text style={[styles.summaryValue, { color: theme.text }]}>
                  {range.minimum}–{range.maximum} °C
                </Text>
              </View>
            </View>

            <Text style={[styles.label, { color: theme.textMuted }]}>Current temperature</Text>
            <View style={[styles.inputContainer, { borderColor: theme.border, backgroundColor: theme.cardBackground }]}>
              <TextInput
                accessibilityLabel="Current temperature in degrees Celsius"
                keyboardType="decimal-pad"
                onChangeText={setTemperature}
                placeholder="e.g. 32"
                placeholderTextColor={theme.textFaint}
                style={[styles.input, { color: theme.text }]}
                value={temperature}
              />
              <Text style={[styles.unit, { color: theme.textMuted }]}>°C</Text>
            </View>

            {status && (
              <View style={[styles.resultCard, { backgroundColor: `${statusContent[status].color}18`, borderColor: statusContent[status].color }]}>
                <Ionicons name={statusContent[status].icon} size={28} color={statusContent[status].color} />
                <View style={styles.resultText}>
                  <Text style={[styles.resultTitle, { color: statusContent[status].color }]}>
                    {statusContent[status].title}
                  </Text>
                  <Text style={[styles.resultMessage, { color: theme.text }]}>
                    {statusContent[status].message}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}

        <View style={[styles.bluetoothCard, { borderColor: theme.border, backgroundColor: theme.cardBackground }]}>
          <View style={styles.bluetoothHeader}>
            <Ionicons name="bluetooth-outline" size={24} color={theme.textMuted} />
            <View style={styles.bluetoothText}>
              <Text style={[styles.bluetoothTitle, { color: theme.text }]}>Bluetooth thermometer</Text>
              <Text style={[styles.bluetoothDescription, { color: theme.textMuted }]}>
                Connect a compatible thermometer to use live readings.
              </Text>
            </View>
          </View>
          <TouchableOpacity disabled style={[styles.connectButton, { borderColor: theme.border }]}>
            <Text style={[styles.connectButtonText, { color: theme.textFaint }]}>Coming soon</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.disclaimer, { color: theme.textFaint }]}>
          Use this range as a starting point. Always observe bird behavior and adjust for housing, humidity, and ventilation.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  headerSpacer: { width: 24 },
  intro: { fontSize: 15, lineHeight: 21, marginBottom: 22 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  loader: { marginVertical: 24 },
  notice: { borderRadius: 10, padding: 16, marginBottom: 20 },
  noticeText: { fontSize: 14 },
  batchList: { gap: 8, marginBottom: 20 },
  batchOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 10, padding: 14 },
  batchOptionText: { gap: 4 },
  batchName: { fontSize: 15, fontWeight: '600' },
  batchMeta: { fontSize: 13 },
  summaryCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 16, marginBottom: 20 },
  summaryLabel: { fontSize: 12, marginBottom: 5 },
  summaryValue: { fontSize: 18, fontWeight: '700' },
  summaryDivider: { width: 1, height: 38, backgroundColor: '#BDBDBD', marginHorizontal: 20 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, marginBottom: 16 },
  input: { flex: 1, fontSize: 18, paddingHorizontal: 14, paddingVertical: 12 },
  unit: { fontSize: 16, paddingRight: 14 },
  resultCard: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 20 },
  resultText: { flex: 1, marginLeft: 12 },
  resultTitle: { fontSize: 16, fontWeight: '700', marginBottom: 5 },
  resultMessage: { fontSize: 14, lineHeight: 20 },
  bluetoothCard: { borderWidth: 1, borderRadius: 10, padding: 16, marginTop: 4 },
  bluetoothHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  bluetoothText: { flex: 1, marginLeft: 12 },
  bluetoothTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  bluetoothDescription: { fontSize: 13, lineHeight: 18 },
  connectButton: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9, marginTop: 14 },
  connectButtonText: { fontSize: 13, fontWeight: '600' },
  disclaimer: { fontSize: 12, lineHeight: 17, marginTop: 18 },
});
