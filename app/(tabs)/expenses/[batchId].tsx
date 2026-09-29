import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Keyboard, Modal, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../context/ThemeContext';
import { supabase } from '../../../lib/supabase';

const CATEGORY_ICONS: Record<string, string> = {
  Feed: 'leaf',
  'Medicine & Vaccines': 'medkit',
};

export default function BatchExpensesScreen() {
  const { batchId } = useLocalSearchParams<{ batchId: string }>();
  const { theme } = useTheme();
  const isGeneral = batchId === 'general';

  const [batchName, setBatchName] = useState('General');
  const [expenses, setExpenses] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [batchId])
  );

  async function loadData() {
    if (!isGeneral) {
      const { data: batchData } = await supabase.from('batches').select('name').eq('id', batchId).single();
      setBatchName(batchData?.name ?? 'Batch');
    }

    let query = supabase.from('expenses').select('*').order('expense_date', { ascending: false });
    query = isGeneral ? query.is('batch_id', null) : query.eq('batch_id', batchId);
    const { data } = await query;
    setExpenses(data ?? []);
  }

  async function handleExportPDF() {
    if (expenses.length === 0) {
      Alert.alert('No data', 'There are no expenses to export.');
      return;
    }

    const rows = expenses
      .map(
        (e) => `
          <tr>
            <td>${e.expense_date}</td>
            <td>${e.category}</td>
            <td>${e.description || '-'}</td>
            <td style="text-align:right">₦${Number(e.amount).toLocaleString()}</td>
          </tr>`
      )
      .join('');

    const html = `
      <html>
        <body style="font-family: -apple-system, sans-serif; padding: 24px;">
          <h1 style="color:#4CAF50;">Poultriz — ${batchName} Expenses</h1>
          <p>Generated: ${new Date().toLocaleDateString()}</p>
          <table style="width:100%; border-collapse: collapse;" border="1" cellpadding="8">
            <thead style="background:#F2F2F2;">
              <tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <h3 style="text-align:right; margin-top:20px;">Total: ₦${total.toLocaleString()}</h3>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `${batchName} Expenses PDF` });
    } else {
      Alert.alert('Saved', `PDF saved at ${uri}`);
    }
  }

  async function handleAddExpense() {
    if (!category || !amount) {
      Alert.alert('Error', 'Please enter category and amount');
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('expenses').insert({
      user_id: user?.id,
      batch_id: isGeneral ? null : batchId,
      category,
      description,
      amount: parseFloat(amount),
      expense_date: new Date().toISOString().split('T')[0],
    });
    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setCategory(''); setDescription(''); setAmount('');
    setModalVisible(false);
    loadData();
  }

  async function handleDelete(expenseId: string) {
    await supabase.from('expenses').delete().eq('id', expenseId);
    loadData();
  }

  const total = useMemo(() => expenses.reduce((sum, e) => sum + Number(e.amount), 0), [expenses]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>            <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{batchName} Expenses</Text>
        <TouchableOpacity onPress={handleExportPDF}>
          <Ionicons name="share-outline" size={22} color={theme.text} />
        </TouchableOpacity>
      </View>

      <View style={[styles.summaryCard, { backgroundColor: theme.cardBackgroundAlt }]}>
        <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Total Expenses</Text>
        <Text style={[styles.summaryValue, { color: theme.text }]}>NGN {total.toLocaleString()}</Text>
      </View>

      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={[styles.emptyText, { color: theme.textFaint }]}>No expenses yet.</Text>}
        renderItem={({ item }) => (
          <View style={[styles.row, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.iconCircle}>
              <Ionicons name={(CATEGORY_ICONS[item.category] as any) || 'pricetag'} size={18} color="#4CAF50" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>{item.category}</Text>
              {item.description ? <Text style={[styles.rowSub, { color: theme.textFaint }]}>{item.description}</Text> : null}
              <Text style={[styles.rowDate, { color: theme.textFaint }]}>{item.expense_date}</Text>
            </View>
            <Text style={[styles.rowAmount, { color: theme.text }]}>NGN {Number(item.amount).toLocaleString()}</Text>
            <TouchableOpacity onPress={() => handleDelete(item.id)} style={{ marginLeft: 10 }}>
              <Ionicons name="trash-outline" size={18} color={theme.danger} />
            </TouchableOpacity>
          </View>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={28} color="#222" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>

        <View style={styles.modalOverlay}>
        <TouchableWithoutFeedback>
        <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Add Expense</Text>
            <TextInput style={[styles.input, { borderColor: theme.border, color: theme.text }]} placeholder="Category (e.g. Feed)" placeholderTextColor={theme.textFaint} value={category} onChangeText={setCategory} />
            <TextInput style={[styles.input, { borderColor: theme.border, color: theme.text }]} placeholder="Description (optional)" placeholderTextColor={theme.textFaint} value={description} onChangeText={setDescription} />
            <TextInput style={[styles.input, { borderColor: theme.border, color: theme.text }]} placeholder="Amount (NGN)" placeholderTextColor={theme.textFaint} keyboardType="numeric" value={amount} onChangeText={setAmount} />
            <TouchableOpacity style={styles.saveButton} onPress={handleAddExpense} disabled={saving}>
              <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Expense'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  summaryCard: { borderRadius: 16, padding: 16, marginBottom: 20 },
  summaryLabel: { fontSize: 13, marginBottom: 4 },
  summaryValue: { fontSize: 24, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', marginTop: 40 },
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 12, marginBottom: 10 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  rowTitle: { fontWeight: '700' },
  rowSub: { fontSize: 12, marginTop: 2 },
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