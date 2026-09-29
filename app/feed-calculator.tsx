import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Rect } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';

type Mode = 'simple' | 'age-based';

// Standard broiler feed intake, grams/bird/day, by week of age (starter -> grower -> finisher)
const WEEKLY_RATE_G: number[] = [15, 32, 55, 75, 95, 110, 120, 130];

const CHART_WIDTH = 320;
const CHART_HEIGHT = 120;
const BAR_GAP = 6;

export default function FeedCalculatorScreen() {
  const { theme } = useTheme();
  const [mode, setMode] = useState<Mode>('simple');
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  const [birdCount, setBirdCount] = useState('');
  const [days, setDays] = useState('');
  const [ratePerDay, setRatePerDay] = useState('110');
  const [pricePerBag, setPricePerBag] = useState('');
  const [bagSizeKg, setBagSizeKg] = useState('25');

  useEffect(() => {
    loadBatches();
  }, []);

  async function loadBatches() {
    const { data } = await supabase.from('batches').select('id, name, bird_count').eq('status', 'active');
    setBatches(data ?? []);
  }

  function selectBatch(batch: any) {
    setSelectedBatchId(batch.id);
    setBirdCount(String(batch.bird_count));
  }

  const birds = parseInt(birdCount, 10) || 0;
  const numDays = parseInt(days, 10) || 0;
  const bagSize = parseFloat(bagSizeKg) || 25;
  const price = parseFloat(pricePerBag) || 0;

  const weeksSpanned = Math.max(1, Math.ceil(numDays / 7));

  const weeklyBreakdownKg = useMemo(() => {
    const weeks: number[] = [];
    let remainingDays = numDays;
    for (let w = 0; w < weeksSpanned; w++) {
      const daysThisWeek = Math.min(7, remainingDays);
      remainingDays -= daysThisWeek;
      const rateGrams = mode === 'age-based'
        ? WEEKLY_RATE_G[Math.min(w, WEEKLY_RATE_G.length - 1)]
        : (parseFloat(ratePerDay) || 0);
      weeks.push((birds * daysThisWeek * rateGrams) / 1000);
    }
    return weeks;
  }, [birds, numDays, mode, ratePerDay, weeksSpanned]);

  const totalKg = weeklyBreakdownKg.reduce((sum, kg) => sum + kg, 0);
  const totalBags = bagSize > 0 ? totalKg / bagSize : 0;
  const estimatedCost = price > 0 ? totalBags * price : 0;

  const maxWeekKg = Math.max(1, ...weeklyBreakdownKg);
  const barWidth = weeklyBreakdownKg.length > 0
    ? (CHART_WIDTH - BAR_GAP * (weeklyBreakdownKg.length - 1)) / weeklyBreakdownKg.length
    : CHART_WIDTH;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Feed Calculator</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={[styles.heroCard, { backgroundColor: theme.accentDark }]}>
          <View style={styles.heroIconBadge}>
            <Ionicons name="nutrition" size={22} color="#fff" />
          </View>
          <Text style={styles.heroLabel}>Estimated Feed Needed</Text>
          <Text style={styles.heroValue}>{totalKg.toFixed(1)} kg</Text>
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStat}>
              <Ionicons name="bag-handle-outline" size={16} color="rgba(255,255,255,0.85)" />
              <Text style={styles.heroStatText}>{totalBags.toFixed(1)} bags ({bagSize}kg)</Text>
            </View>
            {price > 0 && (
              <View style={styles.heroStat}>
                <Ionicons name="cash-outline" size={16} color="rgba(255,255,255,0.85)" />
                <Text style={styles.heroStatText}>₦{estimatedCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabButton, { backgroundColor: theme.cardBackground }, mode === 'simple' && { backgroundColor: theme.accentDark }]}
            onPress={() => setMode('simple')}
          >
            <Ionicons name="options-outline" size={16} color={mode === 'simple' ? '#fff' : theme.textMuted} />
            <Text style={[styles.tabText, { color: mode === 'simple' ? '#fff' : theme.textMuted }]}>Simple</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, { backgroundColor: theme.cardBackground }, mode === 'age-based' && { backgroundColor: theme.accentDark }]}
            onPress={() => setMode('age-based')}
          >
            <Ionicons name="trending-up-outline" size={16} color={mode === 'age-based' ? '#fff' : theme.textMuted} />
            <Text style={[styles.tabText, { color: mode === 'age-based' ? '#fff' : theme.textMuted }]}>Age-Based</Text>
          </TouchableOpacity>
        </View>

        {numDays > 0 && birds > 0 && (
          <View style={[styles.chartCard, { backgroundColor: theme.cardBackgroundAlt }]}>
            <Text style={[styles.chartTitle, { color: theme.text }]}>Feed by Week</Text>
            <Svg width={CHART_WIDTH} height={CHART_HEIGHT + 24} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT + 24}`}>
              {weeklyBreakdownKg.map((kg, i) => {
                const barHeight = (kg / maxWeekKg) * CHART_HEIGHT;
                const x = i * (barWidth + BAR_GAP);
                const y = CHART_HEIGHT - barHeight;
                return (
                  <Rect
                    key={i}
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    rx={4}
                    fill={theme.accentDark}
                  />
                );
              })}
            </Svg>
            <View style={styles.chartLabelsRow}>
              {weeklyBreakdownKg.map((kg, i) => (
                <View key={i} style={{ width: barWidth, alignItems: 'center' }}>
                  <Text style={[styles.chartLabel, { color: theme.textFaint }]}>W{i + 1}</Text>
                  <Text style={[styles.chartBagsLabel, { color: theme.text }]}>
                    {(kg / bagSize).toFixed(1)} bags
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {batches.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={[styles.label, { color: theme.textMuted }]}>Quick-fill from a batch</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {batches.map((b) => (
                <TouchableOpacity
                  key={b.id}
                  style={[
                    styles.chip,
                    { backgroundColor: theme.cardBackground },
                    selectedBatchId === b.id && { backgroundColor: theme.accentDark },
                  ]}
                  onPress={() => selectBatch(b)}
                >
                  <Text style={[styles.chipText, { color: selectedBatchId === b.id ? '#fff' : theme.textMuted }]}>
                    {b.name} ({b.bird_count})
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.inputRow}>
          <Ionicons name="paw-outline" size={18} color={theme.textMuted} style={styles.inputIcon} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: theme.textMuted }]}>Number of birds</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text }]}
              placeholder="e.g. 200"
              placeholderTextColor={theme.textFaint}
              keyboardType="numeric"
              value={birdCount}
              onChangeText={(v) => { setBirdCount(v); setSelectedBatchId(null); }}
            />
          </View>
        </View>

        <View style={styles.inputRow}>
          <Ionicons name="calendar-outline" size={18} color={theme.textMuted} style={styles.inputIcon} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: theme.textMuted }]}>Number of days</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text }]}
              placeholder="e.g. 42"
              placeholderTextColor={theme.textFaint}
              keyboardType="numeric"
              value={days}
              onChangeText={setDays}
            />
          </View>
        </View>

        {mode === 'simple' && (
          <View style={styles.inputRow}>
            <Ionicons name="speedometer-outline" size={18} color={theme.textMuted} style={styles.inputIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: theme.textMuted }]}>Feed rate (grams/bird/day)</Text>
              <TextInput
                style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                placeholder="e.g. 110"
                placeholderTextColor={theme.textFaint}
                keyboardType="numeric"
                value={ratePerDay}
                onChangeText={setRatePerDay}
              />
            </View>
          </View>
        )}

        {mode === 'age-based' && (
          <Text style={[styles.helperText, { color: theme.textFaint }]}>
            Uses a standard broiler feeding chart that ramps up week by week (starter, grower, finisher stages) — no need to enter a rate manually.
          </Text>
        )}

        <View style={[styles.costSection, { borderColor: theme.border }]}>
          <Text style={[styles.costSectionTitle, { color: theme.text }]}>Estimate Cost (optional)</Text>
          <View style={styles.costRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: theme.textMuted }]}>Bag size (kg)</Text>
              <TextInput
                style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                placeholder="25"
                placeholderTextColor={theme.textFaint}
                keyboardType="numeric"
                value={bagSizeKg}
                onChangeText={setBagSizeKg}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: theme.textMuted }]}>Price per bag (₦)</Text>
              <TextInput
                style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                placeholder="e.g. 18000"
                placeholderTextColor={theme.textFaint}
                keyboardType="numeric"
                value={pricePerBag}
                onChangeText={setPricePerBag}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 18, fontWeight: '700' },

  heroCard: { borderRadius: 20, padding: 20, marginBottom: 20, alignItems: 'center' },
  heroIconBadge: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600', marginBottom: 4 },
  heroValue: { color: '#fff', fontSize: 40, fontWeight: '800' },
  heroStatsRow: { flexDirection: 'row', gap: 20, marginTop: 14 },
  heroStat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroStatText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  tabButton: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 10, borderRadius: 12 },
  tabText: { fontWeight: '600', fontSize: 13 },

  chartCard: { borderRadius: 16, padding: 16, marginBottom: 20, alignItems: 'center' },
  chartTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12, alignSelf: 'flex-start' },
  chartLabelsRow: { flexDirection: 'row', marginTop: 4 },
  chartLabel: { fontSize: 10, textAlign: 'center' },
  chartBagsLabel: { fontSize: 10, fontWeight: '700', marginTop: 2 },

  label: { fontSize: 13, marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginBottom: 4 },
  inputIcon: { marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 14, fontSize: 15 },
  helperText: { fontSize: 12, marginBottom: 14, lineHeight: 17 },
  chip: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontSize: 12, fontWeight: '600' },

  costSection: { borderTopWidth: 1, paddingTop: 16, marginTop: 8 },
  costSectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
  costRow: { flexDirection: 'row', gap: 12 },
});