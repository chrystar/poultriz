import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../context/ThemeContext';
import { supabase } from '../../../lib/supabase';

export default function BatchSalesScreen() {
  const { batchId } = useLocalSearchParams<{ batchId: string }>();
  const { theme } = useTheme();
  const isGeneral = batchId === 'general';

  const [batch, setBatch] = useState<any>(null);
  const [sales, setSales] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [item, setItem] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [buyer, setBuyer] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [batchId])
  );

  async function handleExportPDF() {
    if (sales.length === 0) {
      Alert.alert('No data', 'There are no sales to export.');
      return;
    }

    const rows = sales
      .map(
        (s) => `
          <tr>
            <td>${s.sale_date}</td>
            <td>${s.item}</td>
            <td>${s.quantity}</td>
            <td>${s.buyer || '-'}</td>
            <td style="text-align:right">₦${(s.quantity * Number(s.unit_price)).toLocaleString()}</td>
          </tr>`
      )
      .join('');

    const title = isGeneral ? 'General' : batch?.name;
    const html = `
      <html>
        <body style="font-family: -apple-system, sans-serif; padding: 24px;">
          <h1 style="color:#4CAF50;">Poultriz — ${title} Sales</h1>
          <p>Generated: ${new Date().toLocaleDateString()}</p>
          <table style="width:100%; border-collapse: collapse;" border="1" cellpadding="8">
            <thead style="background:#F2F2F2;">
              <tr><th>Date</th><th>Item</th><th>Qty</th><th>Buyer</th><th>Amount</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <h3 style="text-align:right; margin-top:20px;">Total Revenue: ₦${totalRevenue.toLocaleString()}</h3>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `${title} Sales PDF` });
    } else {
      Alert.alert('Saved', `PDF saved at ${uri}`);
    }
  }

  async function loadData() {
    if (!isGeneral) {
      const { data: batchData } = await supabase.from('batches').select('*').eq('id', batchId).single();
      setBatch(batchData);

      const { data: expenseData } = await supabase.from('expenses').select('amount').eq('batch_id', batchId);
      setExpenses(expenseData ?? []);
    }

    let query = supabase.from('sales').select('*').order('sale_date', { ascending: false });
    query = isGeneral ? query.is('batch_id', null) : query.eq('batch_id', batchId);
    const { data } = await query;
    setSales(data ?? []);
  }

  async function handleAddSale() {
    if (!item || !quantity || !unitPrice) {
      Alert.alert('Error', 'Please enter item, quantity, and unit price');
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('sales').insert({
      user_id: user?.id,
      batch_id: isGeneral ? null : batchId,
      item,
      quantity: parseInt(quantity, 10),
      unit_price: parseFloat(unitPrice),
      buyer,
      sale_date: new Date().toISOString().split('T')[0],
    });
    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setItem(''); setQuantity(''); setUnitPrice(''); setBuyer('');
    setModalVisible(false);
    loadData();
  }

  async function handleDelete(saleId: string) {
    await supabase.from('sales').delete().eq('id', saleId);
    loadData();
  }

  const totalRevenue = useMemo(
    () => sales.reduce((sum, s) => sum + s.quantity * Number(s.unit_price), 0),
    [sales]
  );
  const totalExpenses = useMemo(
    () => expenses.reduce((sum, e) => sum + Number(e.amount), 0),
    [expenses]
  );
  const initialCost = batch?.cost ?? 0;
  const profit = totalRevenue - totalExpenses - initialCost;
  const costPerBird = batch?.bird_count > 0 ? (initialCost + totalExpenses) / batch.bird_count : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>           <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{isGeneral ? 'General' : batch?.name} Sales</Text>
        <TouchableOpacity onPress={handleExportPDF}>
          <Ionicons name="share-outline" size={22} color={theme.text} />
        </TouchableOpacity>
      </View>

      {!isGeneral && (
        <View style={[styles.insightCard, { backgroundColor: theme.cardBackgroundAlt }]}>
          <Text style={[styles.insightTitle, { color: theme.text }]}>Profit Insight</Text>

          <View style={styles.insightRow}>
            <View style={styles.insightItem}>
              <Text style={[styles.insightLabel, { color: theme.textMuted }]}>Revenue</Text>
              <Text style={[styles.insightValue, { color: theme.accentDark }]}>₦{totalRevenue.toLocaleString()}</Text>
            </View>
            <View style={styles.insightItem}>
              <Text style={[styles.insightLabel, { color: theme.textMuted }]}>Expenses</Text>
              <Text style={[styles.insightValue, { color: theme.danger }]}>₦{totalExpenses.toLocaleString()}</Text>
            </View>
            <View style={styles.insightItem}>
              <Text style={[styles.insightLabel, { color: theme.textMuted }]}>Initial Cost</Text>
              <Text style={[styles.insightValue, { color: theme.text }]}>₦{initialCost.toLocaleString()}</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.insightRow}>
            <View style={styles.insightItem}>
              <Text style={[styles.insightLabel, { color: theme.textMuted }]}>Profit</Text>
              <Text style={[styles.insightValueLarge, { color: profit >= 0 ? theme.accentDark : theme.danger }]}>
                ₦{profit.toLocaleString()}
              </Text>
            </View>
            <View style={styles.insightItem}>
              <Text style={[styles.insightLabel, { color: theme.textMuted }]}>Cost / Bird</Text>
              <Text style={[styles.insightValueLarge, { color: theme.text }]}>₦{costPerBird.toFixed(0)}</Text>
            </View>
          </View>
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Sales</Text>

      <FlatList
        data={sales}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={[styles.emptyText, { color: theme.textFaint }]}>No sales recorded yet.</Text>}
        renderItem={({ item: sale }) => (
          <View style={[styles.row, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.iconCircle}>
              <Ionicons name="cash" size={18} color="#4CAF50" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>{sale.item}</Text>
              <Text style={[styles.rowSub, { color: theme.textMuted }]}>
                {sale.quantity} × NGN {Number(sale.unit_price).toLocaleString()} {sale.buyer ? `• ${sale.buyer}` : ''}
              </Text>
              <Text style={[styles.rowDate, { color: theme.textFaint }]}>{sale.sale_date}</Text>
            </View>
            <Text style={[styles.rowAmount, { color: theme.text }]}>
              NGN {(sale.quantity * Number(sale.unit_price)).toLocaleString()}
            </Text>
            <TouchableOpacity onPress={() => handleDelete(sale.id)} style={{ marginLeft: 10 }}>
              <Ionicons name="trash-outline" size={18} color={theme.danger} />
            </TouchableOpacity>
          </View>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={28} color="#222" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Record Sale</Text>
            <TextInput style={[styles.input, { borderColor: theme.border, color: theme.text }]} placeholder="Item (e.g. Live birds, Eggs)" placeholderTextColor={theme.textFaint} value={item} onChangeText={setItem} />
            <TextInput style={[styles.input, { borderColor: theme.border, color: theme.text }]} placeholder="Quantity" placeholderTextColor={theme.textFaint} keyboardType="numeric" value={quantity} onChangeText={setQuantity} />
            <TextInput style={[styles.input, { borderColor: theme.border, color: theme.text }]} placeholder="Unit price (NGN)" placeholderTextColor={theme.textFaint} keyboardType="numeric" value={unitPrice} onChangeText={setUnitPrice} />
            <TextInput style={[styles.input, { borderColor: theme.border, color: theme.text }]} placeholder="Buyer (optional)" placeholderTextColor={theme.textFaint} value={buyer} onChangeText={setBuyer} />
            <TouchableOpacity style={styles.saveButton} onPress={handleAddSale} disabled={saving}>
              <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Sale'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={[styles.cancelText, { color: theme.textFaint }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  insightCard: { borderRadius: 16, padding: 16, marginBottom: 20 },
  insightTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  insightRow: { flexDirection: 'row', justifyContent: 'space-between' },
  insightItem: { flex: 1 },
  insightLabel: { fontSize: 12, marginBottom: 4 },
  insightValue: { fontSize: 15, fontWeight: '700' },
  insightValueLarge: { fontSize: 20, fontWeight: '700' },
  divider: { height: 1, marginVertical: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  emptyText: { textAlign: 'center', marginTop: 40 },
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 12, marginBottom: 10 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  rowTitle: { fontWeight: '700' },
  rowSub: { fontSize: 13, marginTop: 2 },
  rowDate: { fontSize: 12, marginTop: 2 },
  rowAmount: { fontWeight: '700' },
  fab: { position: 'absolute', bottom: 20, right: 16, backgroundColor: '#B9E37D', width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 12 },
  saveButton: { backgroundColor: '#B9E37D', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  saveButtonText: { fontWeight: '600' },
  cancelText: { textAlign: 'center', marginTop: 16 },
});