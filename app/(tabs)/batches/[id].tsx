import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Print from 'expo-print';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Keyboard, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LoadingState from '../../../components/LoadingState';
import LogSummaryCard from '../../../components/LogSummaryCard';
import { normalizeSaleType } from '../../../constants/saleTypes';
import { useTheme } from '../../../context/ThemeContext';
import { supabase } from '../../../lib/supabase';

const DEFAULT_CRATE_SIZE = 30;
type BatchTab = 'overview' | 'feed';
const EXPECTED_BROILER_WEIGHTS = [
  { day: 7, weight: 0.18 },
  { day: 14, weight: 0.45 },
  { day: 21, weight: 0.85 },
  { day: 28, weight: 1.35 },
  { day: 34, weight: 1.75 },
  { day: 42, weight: 2.3 },
];

export default function BatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();

  const [batch, setBatch] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [feedLogs, setFeedLogs] = useState<any[]>([]);
  const [eggLogs, setEggLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<BatchTab>('overview');

  // Feed Log form state
  const [feedModalVisible, setFeedModalVisible] = useState(false);
  const [feedType, setFeedType] = useState('');
  const [feedBrand, setFeedBrand] = useState('');
  const [feedBagCount, setFeedBagCount] = useState('');
  const [feedBagSize, setFeedBagSize] = useState('25');
  const [feedCost, setFeedCost] = useState('');
  const [feedNotes, setFeedNotes] = useState('');
  const [savingFeed, setSavingFeed] = useState(false);

  // Egg Log form state
  const [eggModalVisible, setEggModalVisible] = useState(false);
  const [eggCrates, setEggCrates] = useState('');
  const [eggCrateSize, setEggCrateSize] = useState(String(DEFAULT_CRATE_SIZE));
  const [eggLoose, setEggLoose] = useState('');
  const [eggSmall, setEggSmall] = useState('');
  const [eggMedium, setEggMedium] = useState('');
  const [eggLarge, setEggLarge] = useState('');
  const [eggCracked, setEggCracked] = useState('');
  const [eggNotes, setEggNotes] = useState('');
  const [savingEgg, setSavingEgg] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadDetail();
    }, [id])
  );

  async function loadDetail() {
    setLoading(true);

    const { data: batchData } = await supabase.from('batches').select('*').eq('id', id).single();
    setBatch(batchData);

    const { data: recordData } = await supabase
      .from('daily_records')
      .select('*')
      .eq('batch_id', id)
      .order('record_date', { ascending: false })
      .order('created_at', { ascending: false });
    setRecords(recordData ?? []);

    const { data: expenseData } = await supabase.from('expenses').select('amount').eq('batch_id', id);
    setExpenses(expenseData ?? []);

    const { data: salesData } = await supabase.from('sales').select('quantity, unit_price, item').eq('batch_id', id);
    setSales(salesData ?? []);

    const { data: feedData } = await supabase
      .from('feed_logs')
      .select('*')
      .eq('batch_id', id)
      .order('log_date', { ascending: false })
      .order('created_at', { ascending: false });
    setFeedLogs(feedData ?? []);

    const { data: eggData } = await supabase
      .from('egg_logs')
      .select('*')
      .eq('batch_id', id)
      .order('log_date', { ascending: false })
      .order('created_at', { ascending: false });
    setEggLogs(eggData ?? []);

    setLoading(false);
  }

  const totalExpenses = useMemo(() => expenses.reduce((sum, e) => sum + Number(e.amount), 0), [expenses]);
  const totalRevenue = useMemo(() => sales.reduce((sum, s) => sum + s.quantity * Number(s.unit_price), 0), [sales]);
  const totalFeedKg = useMemo(() => feedLogs.reduce((sum, f) => sum + Number(f.total_kg), 0), [feedLogs]);
  const totalFeedBags = useMemo(() => feedLogs.reduce((sum, f) => sum + Number(f.bag_count), 0), [feedLogs]);
  const totalFeedCost = useMemo(
    () => feedLogs.reduce((sum, f) => sum + Number(f.cost ?? 0), 0),
    [feedLogs]
  );
  const totalEggs = useMemo(() => eggLogs.reduce((sum, e) => sum + Number(e.total_eggs), 0), [eggLogs]);
  const totalEggCrates = useMemo(() => totalEggs / DEFAULT_CRATE_SIZE, [totalEggs]);
  const totalCracked = useMemo(() => eggLogs.reduce((sum, e) => sum + Number(e.cracked_count ?? 0), 0), [eggLogs]);
  const totalDeaths = useMemo(() => records.reduce((sum, r) => sum + Number(r.mortality_count ?? 0), 0), [records]);
  const totalSoldBirds = useMemo(
    () => sales
      .filter((sale) => normalizeSaleType(sale.item) === 'Live birds')
      .reduce((sum, sale) => sum + Number(sale.quantity ?? 0), 0),
    [sales]
  );

  async function handleChangeStartDate(event: any, selectedDate?: Date) {
    setDatePickerVisible(false);
    if (!selectedDate) return;

    const formatted = selectedDate.toISOString().split('T')[0];
    const { error } = await supabase.from('batches').update({ start_date: formatted }).eq('id', id);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    loadDetail();
  }

  async function handleAddFeedLog() {
    if (!feedBagCount || !feedBagSize) {
      Alert.alert('Error', 'Please enter bag count and bag size');
      return;
    }

    setSavingFeed(true);
    const { data: { user } } = await supabase.auth.getUser();
    const today = new Date().toISOString().split('T')[0];
    const bagCountNum = parseFloat(feedBagCount);
    const bagSizeNum = parseFloat(feedBagSize);
    const totalKg = bagCountNum * bagSizeNum;
    const costNum = feedCost ? parseFloat(feedCost) : null;

    // If a cost was entered, create the matching Expenses entry first
    let expenseId: string | null = null;
    if (costNum && costNum > 0) {
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .insert({
          user_id: user?.id,
          batch_id: id,
          category: 'Feed',
          description: [feedBrand, feedType].filter(Boolean).join(' — ') || 'Feed',
          amount: costNum,
          feed_kg: totalKg,
          expense_date: today,
        })
        .select()
        .single();

      if (expenseError) {
        setSavingFeed(false);
        Alert.alert('Error', expenseError.message);
        return;
      }
      expenseId = expenseData?.id ?? null;
    }

    const { error } = await supabase.from('feed_logs').insert({
      user_id: user?.id,
      batch_id: id,
      expense_id: expenseId,
      log_date: today,
      feed_type: feedType || null,
      brand: feedBrand || null,
      bag_count: bagCountNum,
      bag_size_kg: bagSizeNum,
      total_kg: totalKg,
      cost: costNum,
      notes: feedNotes || null,
    });

    setSavingFeed(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    setFeedType(''); setFeedBrand(''); setFeedBagCount(''); setFeedBagSize('25'); setFeedCost(''); setFeedNotes('');
    setFeedModalVisible(false);
    loadDetail();
  }

  async function handleAddEggLog() {
    const cratesNum = eggCrates ? parseFloat(eggCrates) : 0;
    const crateSizeNum = eggCrateSize ? parseFloat(eggCrateSize) : DEFAULT_CRATE_SIZE;
    const looseNum = eggLoose ? parseFloat(eggLoose) : 0;

    if (cratesNum <= 0 && looseNum <= 0) {
      Alert.alert('Error', 'Enter crates and/or loose eggs collected');
      return;
    }

    setSavingEgg(true);
    const { data: { user } } = await supabase.auth.getUser();
    const today = new Date().toISOString().split('T')[0];
    const totalEggsNum = cratesNum * crateSizeNum + looseNum;

    const { error } = await supabase.from('egg_logs').insert({
      user_id: user?.id,
      batch_id: id,
      log_date: today,
      crates: cratesNum,
      crate_size: crateSizeNum,
      loose_eggs: looseNum,
      total_eggs: totalEggsNum,
      small_count: eggSmall ? parseFloat(eggSmall) : 0,
      medium_count: eggMedium ? parseFloat(eggMedium) : 0,
      large_count: eggLarge ? parseFloat(eggLarge) : 0,
      cracked_count: eggCracked ? parseFloat(eggCracked) : 0,
      notes: eggNotes || null,
    });

    setSavingEgg(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    setEggCrates(''); setEggCrateSize(String(DEFAULT_CRATE_SIZE)); setEggLoose('');
    setEggSmall(''); setEggMedium(''); setEggLarge(''); setEggCracked(''); setEggNotes('');
    setEggModalVisible(false);
    loadDetail();
  }

  async function handleExportPDF() {
    const { data: fullExpenses } = await supabase
      .from('expenses')
      .select('*')
      .eq('batch_id', id)
      .order('expense_date', { ascending: false });

    const { data: fullSales } = await supabase
      .from('sales')
      .select('*')
      .eq('batch_id', id)
      .order('sale_date', { ascending: false });

    const { data: fullRecords } = await supabase
      .from('daily_records')
      .select('*')
      .eq('batch_id', id)
      .order('record_date', { ascending: false });

    const { data: fullFeedLogs } = await supabase
      .from('feed_logs')
      .select('*')
      .eq('batch_id', id)
      .order('log_date', { ascending: false });

    const { data: fullEggLogs } = await supabase
      .from('egg_logs')
      .select('*')
      .eq('batch_id', id)
      .order('log_date', { ascending: false });

    const reportDaysSince = Math.max(
      0,
      Math.floor(
        ((batch.status === 'completed' && batch.completed_at ? new Date(batch.completed_at) : new Date()).getTime()
          - new Date(batch.start_date).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );
    const reportDeaths = (fullRecords ?? []).reduce((sum, record) => sum + Number(record.mortality_count ?? 0), 0);
    const reportMortalityRate = batch.bird_count > 0 ? (reportDeaths / batch.bird_count) * 100 : 0;
    const reportFeedKg = (fullFeedLogs ?? []).reduce((sum, feed) => sum + Number(feed.total_kg ?? 0), 0);
    const reportFeedBags = (fullFeedLogs ?? []).reduce((sum, feed) => sum + Number(feed.bag_count ?? 0), 0);
    const weightRecords = (fullRecords ?? [])
      .filter((record) => Number(record.avg_weight_kg) > 0)
      .sort((a, b) => new Date(b.record_date).getTime() - new Date(a.record_date).getTime());
    const latestWeight = weightRecords[0] ? Number(weightRecords[0].avg_weight_kg) : null;
    const expectedWeight = EXPECTED_BROILER_WEIGHTS.reduce(
      (closest, target) => target.day <= reportDaysSince ? target : closest,
      EXPECTED_BROILER_WEIGHTS[0]
    );
    const weightDifference = latestWeight === null ? null : latestWeight - expectedWeight.weight;
    const reportCurrentBirds = Math.max(0, Number(batch.bird_count ?? 0) - reportDeaths);
    const estimatedLiveWeight = latestWeight === null ? null : latestWeight * reportCurrentBirds;
    const feedConversionEstimate = estimatedLiveWeight && estimatedLiveWeight > 0
      ? reportFeedKg / estimatedLiveWeight
      : null;

    const expenseRows = (fullExpenses ?? [])
      .map((e) => `
        <tr>
          <td>${e.expense_date}</td>
          <td>${e.category}</td>
          <td>${e.description || '-'}</td>
          <td style="text-align:right">₦${Number(e.amount).toLocaleString()}</td>
        </tr>`)
      .join('');

    const salesRows = (fullSales ?? [])
      .map((s) => `
        <tr>
          <td>${s.sale_date}</td>
          <td>${s.item}</td>
          <td>${s.quantity}</td>
          <td>${s.buyer || '-'}</td>
          <td style="text-align:right">₦${(s.quantity * Number(s.unit_price)).toLocaleString()}</td>
        </tr>`)
      .join('');

    const recordRows = (fullRecords ?? [])
      .map((r) => `
        <tr>
          <td>${r.record_date}</td>
          <td>${r.mortality_count}</td>
          <td>${r.avg_weight_kg ? r.avg_weight_kg + ' kg' : '-'}</td>
          <td>${r.notes || '-'}</td>
        </tr>`)
      .join('');

    const feedRows = (fullFeedLogs ?? [])
      .map((f) => `
        <tr>
          <td>${f.log_date}</td>
          <td>${[f.brand, f.feed_type].filter(Boolean).join(' — ') || '-'}</td>
          <td>${f.bag_count} × ${f.bag_size_kg}kg</td>
          <td>${f.total_kg}kg</td>
          <td style="text-align:right">${f.cost ? '₦' + Number(f.cost).toLocaleString() : '-'}</td>
        </tr>`)
      .join('');

    const eggRows = (fullEggLogs ?? [])
      .map((e) => `
        <tr>
          <td>${e.log_date}</td>
          <td>${e.crates} crates + ${e.loose_eggs} loose</td>
          <td>${e.total_eggs}</td>
          <td>${e.cracked_count ? e.cracked_count : '-'}</td>
        </tr>`)
      .join('');

    const eggSection = batch.bird_type === 'layer' ? `
          <h2 style="color:#4CAF50;">Egg Log</h2>
          <table style="width:100%; border-collapse: collapse; margin-bottom: 24px;" border="1" cellpadding="8">
            <thead style="background:#F2F2F2;"><tr><th>Date</th><th>Collected</th><th>Total Eggs</th><th>Cracked</th></tr></thead>
            <tbody>${eggRows || '<tr><td colspan="4">No eggs logged</td></tr>'}</tbody>
          </table>` : '';

    const performanceSummary = `
          <h2 style="color:#4CAF50;">Performance Summary</h2>
          <table style="width:100%; border-collapse: collapse; margin-bottom: 24px;" border="1" cellpadding="8">
            <tr><td><strong>Mortality</strong></td><td>${reportDeaths} birds (${reportMortalityRate.toFixed(1)}%)</td></tr>
            <tr><td><strong>Feed consumed</strong></td><td>${Number(reportFeedKg.toFixed(2))} kg (${reportFeedBags} bags)</td></tr>
            <tr><td><strong>Latest average weight</strong></td><td>${latestWeight === null ? 'No weight recorded' : `${latestWeight.toFixed(3)} kg (${weightRecords[0].record_date})`}</td></tr>
            <tr><td><strong>Expected weight guide</strong></td><td>${expectedWeight.weight.toFixed(2)} kg at day ${expectedWeight.day}</td></tr>
            <tr><td><strong>Weight performance</strong></td><td>${weightDifference === null ? 'Record a sample weight to compare' : `${weightDifference >= 0 ? '+' : ''}${weightDifference.toFixed(3)} kg vs guide`}</td></tr>
            <tr><td><strong>Feed conversion estimate</strong></td><td>${feedConversionEstimate === null ? 'Unavailable — needs a saved average weight' : `${feedConversionEstimate.toFixed(2)} kg feed per kg current live weight`}</td></tr>
            <tr style="background:#F2F2F2;"><td><strong>Profit / loss</strong></td><td><strong>₦${profit.toLocaleString()}</strong></td></tr>
          </table>
          <p style="color:#777; font-size:11px;">Feed conversion is an estimate based on feed consumed divided by estimated current live weight (average sample weight × surviving birds). It is not a laboratory FCR calculation.</p>`;

    const html = `
      <html>
        <body style="font-family: -apple-system, sans-serif; padding: 24px; color: #222;">
          <h1 style="color:#4CAF50; margin-bottom:4px;">Poultriz — ${batch.name}</h1>
          <p style="color:#777; margin-top:0;">Generated: ${new Date().toLocaleDateString()}</p>

          <table style="width:100%; border-collapse: collapse; margin-bottom: 24px;" border="1" cellpadding="8">
            <tr><td><strong>Breed</strong></td><td>${batch.breed}</td></tr>
            <tr><td><strong>Bird Type</strong></td><td>${batch.bird_type === 'layer' ? 'Layer' : 'Broiler'}</td></tr>
            <tr><td><strong>Source</strong></td><td>${batch.source || '-'}</td></tr>
            <tr><td><strong>Status</strong></td><td>${batch.status}</td></tr>
            <tr><td><strong>Bird Count</strong></td><td>${batch.bird_count}</td></tr>
            <tr><td><strong>Start Date</strong></td><td>${batch.start_date}</td></tr>
            <tr><td><strong>Days</strong></td><td>${daysSince}</td></tr>
            <tr><td><strong>Initial Cost</strong></td><td>₦${(batch.cost ?? 0).toLocaleString()}</td></tr>
          </table>
          ${performanceSummary}

          <h2 style="color:#4CAF50;">Financial Summary</h2>
          <table style="width:100%; border-collapse: collapse; margin-bottom: 24px;" border="1" cellpadding="8">
            <tr><td><strong>Total Revenue</strong></td><td style="text-align:right">₦${totalRevenue.toLocaleString()}</td></tr>
            <tr><td><strong>Total Expenses</strong></td><td style="text-align:right">₦${totalExpenses.toLocaleString()}</td></tr>
            <tr><td><strong>Initial Cost</strong></td><td style="text-align:right">₦${(batch.cost ?? 0).toLocaleString()}</td></tr>
            <tr style="background:#F2F2F2;"><td><strong>Profit</strong></td><td style="text-align:right"><strong>₦${profit.toLocaleString()}</strong></td></tr>
          </table>

          <h2 style="color:#4CAF50;">Feed Log</h2>
          <table style="width:100%; border-collapse: collapse; margin-bottom: 24px;" border="1" cellpadding="8">
            <thead style="background:#F2F2F2;"><tr><th>Date</th><th>Feed</th><th>Bags</th><th>Total</th><th>Cost</th></tr></thead>
            <tbody>${feedRows || '<tr><td colspan="5">No feed logged</td></tr>'}</tbody>
          </table>
          ${eggSection}
          <h2 style="color:#4CAF50;">Daily Records</h2>
          <table style="width:100%; border-collapse: collapse; margin-bottom: 24px;" border="1" cellpadding="8">
            <thead style="background:#F2F2F2;"><tr><th>Date</th><th>Mortality</th><th>Avg Weight</th><th>Notes</th></tr></thead>
            <tbody>${recordRows || '<tr><td colspan="4">No records</td></tr>'}</tbody>
          </table>

          <h2 style="color:#4CAF50;">Expenses</h2>
          <table style="width:100%; border-collapse: collapse; margin-bottom: 24px;" border="1" cellpadding="8">
            <thead style="background:#F2F2F2;"><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th></tr></thead>
            <tbody>${expenseRows || '<tr><td colspan="4">No expenses</td></tr>'}</tbody>
          </table>

          <h2 style="color:#4CAF50;">Sales</h2>
          <table style="width:100%; border-collapse: collapse;" border="1" cellpadding="8">
            <thead style="background:#F2F2F2;"><tr><th>Date</th><th>Item</th><th>Qty</th><th>Buyer</th><th>Amount</th></tr></thead>
            <tbody>${salesRows || '<tr><td colspan="5">No sales</td></tr>'}</tbody>
          </table>
        </body>
      </html>
    `;

    if (Platform.OS === 'web') {
      const reportUrl = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
      const printWindow = window.open(reportUrl, '_blank');
      if (!printWindow) {
        URL.revokeObjectURL(reportUrl);
        throw new Error('The report window could not be opened. Allow pop-ups and try again.');
      }

      printWindow.addEventListener('load', () => {
        printWindow.focus();
        printWindow.print();
        URL.revokeObjectURL(reportUrl);
      }, { once: true });
      return;
    }

    const { uri } = await Print.printToFileAsync({ html });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `${batch.name} Full Report` });
    } else {
      Alert.alert('Saved', `PDF saved at ${uri}`);
    }
  }

  if (loading || !batch) {
    return <LoadingState label="Loading batch..." />;
  }

  const daysSince = Math.max(
    0,
    Math.floor(
      ((batch.status === 'completed' && batch.completed_at ? new Date(batch.completed_at) : new Date()).getTime()
        - new Date(batch.start_date).getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );
  const profit = totalRevenue - totalExpenses - (batch.cost ?? 0);
  const isLayer = batch.bird_type === 'layer';
  const currentBirds = Math.max(0, Number(batch.bird_count ?? 0) - totalDeaths - totalSoldBirds);

  const lastFeed = feedLogs[0];
  const lastEgg = eggLogs[0];
  const latestFeed = lastFeed ? `${lastFeed.log_date} • ${lastFeed.bag_count} × ${lastFeed.bag_size_kg}kg` : null;
  const latestEgg = lastEgg ? `${lastEgg.log_date} • ${lastEgg.total_eggs} eggs` : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{batch.name}</Text>
          <TouchableOpacity onPress={handleExportPDF}>
            <Ionicons name="share-outline" size={22} color={theme.text} />
          </TouchableOpacity>
        </View>

        <View style={[styles.infoCard, { backgroundColor: theme.cardBackgroundAlt }]}>
          <View style={styles.infoTopRow}>
            <Text style={[styles.infoSource, { color: theme.textMuted }]}>{batch.source || 'No source listed'}</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <View style={[styles.breedTag, isLayer && { backgroundColor: '#D6E9FF' }]}>
                <Text style={[styles.breedTagText, isLayer && { color: '#1565C0' }]}>{isLayer ? 'Layer' : 'Broiler'}</Text>
              </View>
              <View style={styles.breedTag}>
                <Text style={styles.breedTagText}>{batch.breed}</Text>
              </View>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.statsRow}>
            <View>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>Birds</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>{batch.bird_count}</Text>
            </View>
            <TouchableOpacity onPress={() => setDatePickerVisible(true)}>
              <View style={styles.statLabelRow}>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>Days</Text>
                <Ionicons name="create-outline" size={12} color={theme.textMuted} />
              </View>
              <Text style={[styles.statValue, { color: theme.text }]}>{daysSince}</Text>
            </TouchableOpacity>
            <View>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>Cost</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>₦{batch.cost?.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.tabRow, { backgroundColor: theme.cardBackgroundAlt }]}>
          {([
            { key: 'overview' as const, label: 'Overview', icon: 'grid-outline' as const },
            { key: 'feed' as const, label: 'Feed log', icon: 'nutrition-outline' as const },
          ]).map((tab) => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabButton, active && { backgroundColor: theme.accentDark }]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Ionicons name={tab.icon} size={16} color={active ? '#fff' : theme.textMuted} />
                <Text style={[styles.tabText, { color: active ? '#fff' : theme.textMuted }]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {activeTab === 'feed' ? (
          <>
            <View style={styles.feedTabHeader}>
              <View>
                <Text style={[styles.sectionEyebrow, { color: theme.textMuted, marginBottom: 3 }]}>FEED ACTIVITY</Text>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Keep feed records up to date</Text>
              </View>
              <TouchableOpacity
                style={[styles.addFeedButton, { backgroundColor: theme.accentDark }]}
                onPress={() => setFeedModalVisible(true)}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.addFeedButtonText}>Add feed</Text>
              </TouchableOpacity>
            </View>
            <LogSummaryCard
              stats={[
                { label: 'Total Fed', value: `${Number(totalFeedKg.toFixed(2))}kg` },
                { label: 'Bags', value: String(totalFeedBags) },
                { label: 'Spent', value: `₦${totalFeedCost.toLocaleString()}` },
              ]}
              count={feedLogs.length}
              latest={latestFeed}
              emptyText="No feed logged yet. Add your first feed entry here."
              onPress={() => router.push({ pathname: '/feed-log', params: { batchId: id } })}
            />
            <TouchableOpacity
              style={[styles.viewLogButton, { borderColor: theme.border }]}
              onPress={() => router.push({ pathname: '/feed-log', params: { batchId: id } })}
            >
              <Text style={[styles.viewLogButtonText, { color: theme.accentDark }]}>View full feed history</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.accentDark} />
            </TouchableOpacity>
          </>
        ) : (
          <>
        <Text style={[styles.sectionEyebrow, { color: theme.textMuted }]}>QUICK ACTIONS</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: theme.cardBackgroundAlt }]}
            onPress={() => router.push({ pathname: '/daily-records', params: { batchId: id } })}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#FFF0D6' }]}>
              <Ionicons name="clipboard-outline" size={20} color="#C47B13" />
            </View>
            <Text style={[styles.quickActionLabel, { color: theme.text }]}>Add record</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: theme.cardBackgroundAlt }]}
            onPress={() => router.push({ pathname: '/bird-weight', params: { batchId: id } })}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#E4F0FF' }]}>
              <Ionicons name="scale-outline" size={20} color="#356CB3" />
            </View>
            <Text style={[styles.quickActionLabel, { color: theme.text }]}>Weigh birds</Text>
          </TouchableOpacity>
          {isLayer && (
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: theme.cardBackgroundAlt }]}
              onPress={() => setEggModalVisible(true)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#DDEBFF' }]}>
                <Ionicons name="ellipse-outline" size={20} color="#3C73B8" />
              </View>
              <Text style={[styles.quickActionLabel, { color: theme.text }]}>Add eggs</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: theme.cardBackgroundAlt }]}
            onPress={handleExportPDF}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#F0E6FF' }]}>
              <Ionicons name="share-outline" size={20} color="#7754A8" />
            </View>
            <Text style={[styles.quickActionLabel, { color: theme.text }]}>Share report</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionEyebrow, { color: theme.textMuted, marginTop: 22 }]}>OVERVIEW</Text>

        <View style={[styles.birdFlowCard, { backgroundColor: theme.cardBackgroundAlt }]}>
          <View style={styles.birdFlowHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Bird movement</Text>
              <Text style={[styles.cardHint, { color: theme.textMuted }]}>Current batch inventory</Text>
            </View>
            <Ionicons name="paw-outline" size={22} color={theme.accentDark} />
          </View>
          <View style={[styles.birdFlowDivider, { backgroundColor: theme.border }]} />
          <View style={styles.birdFlowRow}>
            <View style={styles.birdFlowItem}>
              <Text style={[styles.birdFlowLabel, { color: theme.textMuted }]}>Starting</Text>
              <Text style={[styles.birdFlowValue, { color: theme.text }]}>{batch.bird_count}</Text>
            </View>
            <Text style={[styles.birdFlowMinus, { color: theme.textFaint }]}>−</Text>
            <View style={styles.birdFlowItem}>
              <Text style={[styles.birdFlowLabel, { color: theme.textMuted }]}>Deaths</Text>
              <Text style={[styles.birdFlowValue, { color: theme.danger }]}>{totalDeaths}</Text>
            </View>
            <Text style={[styles.birdFlowMinus, { color: theme.textFaint }]}>−</Text>
            <View style={styles.birdFlowItem}>
              <Text style={[styles.birdFlowLabel, { color: theme.textMuted }]}>Sold</Text>
              <Text style={[styles.birdFlowValue, { color: '#F2A93B' }]}>{totalSoldBirds}</Text>
            </View>
            <Text style={[styles.birdFlowEquals, { color: theme.textFaint }]}>=</Text>
            <View style={[styles.currentBirdsPill, { backgroundColor: theme.accent }]}>
              <Text style={[styles.birdFlowLabel, { color: '#35551F' }]}>Current</Text>
              <Text style={[styles.currentBirdsValue, { color: '#222' }]}>{currentBirds}</Text>
            </View>
          </View>
        </View>

        {/* Egg Log — layer batches only */}
        {isLayer && (
          <>
            <View style={[styles.sectionHeaderRow, { marginTop: 12 }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Egg Log</Text>
            </View>
            <LogSummaryCard
              stats={[
                { label: 'Total Eggs', value: String(totalEggs) },
                { label: `Crates (≈${DEFAULT_CRATE_SIZE})`, value: totalEggCrates.toFixed(1) },
                { label: 'Cracked', value: String(totalCracked) },
              ]}
              count={eggLogs.length}
              latest={latestEgg}
              emptyText="No eggs logged yet. Tap 'Add Eggs' after each collection."
              onPress={() => router.push({ pathname: '/egg-log', params: { batchId: id } })}
            />
          </>
        )}

          </>
        )}

        {/* Add Feed Log modal */}
        <Modal visible={feedModalVisible} animationType="slide" transparent>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                  <Text style={[styles.modalTitle, { color: theme.text }]}>Add Feed</Text>
                  <Text style={[styles.modalSubtitle, { color: theme.textFaint }]}>Date: {new Date().toISOString().split('T')[0]}</Text>

                  <TextInput
                    style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                    placeholder="Feed type (e.g. Starter, Grower, Finisher)"
                    placeholderTextColor={theme.textFaint}
                    value={feedType}
                    onChangeText={setFeedType}
                  />
                  <TextInput
                    style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                    placeholder="Brand (optional, e.g. Ultima Plus)"
                    placeholderTextColor={theme.textFaint}
                    value={feedBrand}
                    onChangeText={setFeedBrand}
                  />

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TextInput
                      style={[styles.input, { flex: 1, borderColor: theme.border, color: theme.text }]}
                      placeholder="Number of bags"
                      placeholderTextColor={theme.textFaint}
                      keyboardType="numeric"
                      value={feedBagCount}
                      onChangeText={setFeedBagCount}
                    />
                    <TextInput
                      style={[styles.input, { flex: 1, borderColor: theme.border, color: theme.text }]}
                      placeholder="Bag size (kg)"
                      placeholderTextColor={theme.textFaint}
                      keyboardType="numeric"
                      value={feedBagSize}
                      onChangeText={setFeedBagSize}
                    />
                  </View>

                  {feedBagCount && feedBagSize ? (
                    <Text style={[styles.modalSubtitle, { color: theme.textMuted, marginTop: -4 }]}>
                      = {(parseFloat(feedBagCount) * parseFloat(feedBagSize) || 0)}kg total
                    </Text>
                  ) : null}

                  <TextInput
                    style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                    placeholder="Cost (₦, optional — also logs to Expenses)"
                    placeholderTextColor={theme.textFaint}
                    keyboardType="numeric"
                    value={feedCost}
                    onChangeText={setFeedCost}
                  />
                  <TextInput
                    style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                    placeholder="Notes (optional)"
                    placeholderTextColor={theme.textFaint}
                    value={feedNotes}
                    onChangeText={setFeedNotes}
                  />

                  <TouchableOpacity style={styles.saveButton} onPress={handleAddFeedLog} disabled={savingFeed}>
                    <Text style={styles.saveButtonText}>{savingFeed ? 'Saving...' : 'Save Feed Entry'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setFeedModalVisible(false)}>
                    <Text style={[styles.cancelText, { color: theme.textFaint }]}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Add Egg Log modal */}
        <Modal visible={eggModalVisible} animationType="slide" transparent>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                  <ScrollView keyboardShouldPersistTaps="handled">
                    <Text style={[styles.modalTitle, { color: theme.text }]}>Add Eggs</Text>
                    <Text style={[styles.modalSubtitle, { color: theme.textFaint }]}>Date: {new Date().toISOString().split('T')[0]}</Text>

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TextInput
                        style={[styles.input, { flex: 1, borderColor: theme.border, color: theme.text }]}
                        placeholder="Crates"
                        placeholderTextColor={theme.textFaint}
                        keyboardType="numeric"
                        value={eggCrates}
                        onChangeText={setEggCrates}
                      />
                      <TextInput
                        style={[styles.input, { flex: 1, borderColor: theme.border, color: theme.text }]}
                        placeholder="Eggs/crate"
                        placeholderTextColor={theme.textFaint}
                        keyboardType="numeric"
                        value={eggCrateSize}
                        onChangeText={setEggCrateSize}
                      />
                    </View>

                    <TextInput
                      style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                      placeholder="Loose eggs (not a full crate)"
                      placeholderTextColor={theme.textFaint}
                      keyboardType="numeric"
                      value={eggLoose}
                      onChangeText={setEggLoose}
                    />

                    {(eggCrates || eggLoose) ? (
                      <Text style={[styles.modalSubtitle, { color: theme.textMuted, marginTop: -4 }]}>
                        = {((parseFloat(eggCrates || '0') * parseFloat(eggCrateSize || String(DEFAULT_CRATE_SIZE))) + parseFloat(eggLoose || '0'))} eggs total
                      </Text>
                    ) : null}

                    <Text style={[styles.modalSubtitle, { color: theme.textMuted, marginTop: 8 }]}>Grading (optional)</Text>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TextInput
                        style={[styles.input, { flex: 1, borderColor: theme.border, color: theme.text }]}
                        placeholder="Small"
                        placeholderTextColor={theme.textFaint}
                        keyboardType="numeric"
                        value={eggSmall}
                        onChangeText={setEggSmall}
                      />
                      <TextInput
                        style={[styles.input, { flex: 1, borderColor: theme.border, color: theme.text }]}
                        placeholder="Medium"
                        placeholderTextColor={theme.textFaint}
                        keyboardType="numeric"
                        value={eggMedium}
                        onChangeText={setEggMedium}
                      />
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TextInput
                        style={[styles.input, { flex: 1, borderColor: theme.border, color: theme.text }]}
                        placeholder="Large"
                        placeholderTextColor={theme.textFaint}
                        keyboardType="numeric"
                        value={eggLarge}
                        onChangeText={setEggLarge}
                      />
                      <TextInput
                        style={[styles.input, { flex: 1, borderColor: theme.border, color: theme.text }]}
                        placeholder="Cracked"
                        placeholderTextColor={theme.textFaint}
                        keyboardType="numeric"
                        value={eggCracked}
                        onChangeText={setEggCracked}
                      />
                    </View>

                    <TextInput
                      style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                      placeholder="Notes (optional)"
                      placeholderTextColor={theme.textFaint}
                      value={eggNotes}
                      onChangeText={setEggNotes}
                    />

                    <TouchableOpacity style={styles.saveButton} onPress={handleAddEggLog} disabled={savingEgg}>
                      <Text style={styles.saveButtonText}>{savingEgg ? 'Saving...' : 'Save Egg Entry'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setEggModalVisible(false)}>
                      <Text style={[styles.cancelText, { color: theme.textFaint }]}>Cancel</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {datePickerVisible && (
          <DateTimePicker
            value={new Date(batch.start_date)}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={handleChangeStartDate}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  infoCard: { borderRadius: 16, padding: 16, marginBottom: 16 },
  infoTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoSource: { fontSize: 15 },
  tabRow: { flexDirection: 'row', gap: 8, borderRadius: 14, padding: 4, marginBottom: 20 },
  tabButton: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, borderRadius: 10, paddingVertical: 11 },
  tabText: { fontSize: 13, fontWeight: '700' },
  sectionEyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  feedTabHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 },
  addFeedButton: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  addFeedButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  viewLogButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 12, paddingVertical: 12, marginBottom: 12 },
  viewLogButtonText: { fontSize: 13, fontWeight: '700' },
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 22 },
  quickAction: { width: '48%', minHeight: 70, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  quickActionIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  quickActionLabel: { fontSize: 13, fontWeight: '700', flexShrink: 1 },
  breedTag: { backgroundColor: '#FFE0B2', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  breedTagText: { color: '#E65100', fontWeight: '600', fontSize: 12 },
  divider: { height: 1, marginVertical: 12 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statLabel: { fontSize: 13, marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: '700' },
  birdFlowCard: { borderRadius: 16, padding: 16, marginBottom: 16 },
  birdFlowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardHint: { fontSize: 12, marginTop: 3 },
  birdFlowDivider: { height: 1, marginVertical: 14 },
  birdFlowRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  birdFlowItem: { alignItems: 'center', minWidth: 42 },
  birdFlowLabel: { fontSize: 11, marginBottom: 4 },
  birdFlowValue: { fontSize: 19, fontWeight: '800' },
  birdFlowMinus: { fontSize: 20, marginHorizontal: 2 },
  birdFlowEquals: { fontSize: 18, marginHorizontal: 2 },
  currentBirdsPill: { alignItems: 'center', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7, minWidth: 54 },
  currentBirdsValue: { fontSize: 20, fontWeight: '800' },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  addRecordButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#B9E37D', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  addRecordText: { fontWeight: '600', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '85%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalSubtitle: { marginBottom: 16, marginTop: 2 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 12 },
  saveButton: { backgroundColor: '#B9E37D', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  saveButtonText: { fontWeight: '600' },
  cancelText: { textAlign: 'center', marginTop: 16, marginBottom: 8 },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});