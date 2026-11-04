import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Print from 'expo-print';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { normalizeExpenseCategory } from '../../../constants/expenseCategories';
import { normalizeSaleType, SALE_TYPES } from '../../../constants/saleTypes';
import { useTheme } from '../../../context/ThemeContext';
import { supabase } from '../../../lib/supabase';

const CATEGORY_COLORS = [
  '#4CAF50',
  '#F2A93B',
  '#7E8CE0',
  '#D06AA5',
  '#55A6C6',
  '#8B6FC1',
];

type StoreTab = 'sales' | 'insights';

export default function BatchSalesScreen() {
  const { batchId } = useLocalSearchParams<{ batchId: string }>();
  const { theme } = useTheme();
  const isGeneral = batchId === 'general';

  const [batch, setBatch] = useState<any>(null);
  const [sales, setSales] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [mortalityCount, setMortalityCount] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [saleType, setSaleType] = useState('');
  const [saleTypePickerVisible, setSaleTypePickerVisible] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [buyer, setBuyer] = useState('');
  const [saleDate, setSaleDate] = useState(new Date());
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<StoreTab>('sales');

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
            <td style="text-align:right">₦${(
              s.quantity * Number(s.unit_price)
            ).toLocaleString()}</td>
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
              <tr>
                <th>Date</th>
                <th>Item</th>
                <th>Qty</th>
                <th>Buyer</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <h3 style="text-align:right; margin-top:20px;">
            Total Revenue: ₦${totalRevenue.toLocaleString()}
          </h3>
        </body>
      </html>
    `;

    if (Platform.OS === 'web') {
      const reportUrl = URL.createObjectURL(
        new Blob([html], { type: 'text/html' })
      );

      const printWindow = window.open(reportUrl, '_blank');

      if (!printWindow) {
        URL.revokeObjectURL(reportUrl);
        Alert.alert(
          'Unable to print',
          'Please allow pop-ups for this site and try again.'
        );
        return;
      }

      printWindow.addEventListener('load', () => {
        printWindow.focus();
        printWindow.print();
        URL.revokeObjectURL(reportUrl);
      });

      return;
    }

    const { uri } = await Print.printToFileAsync({ html });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `${title} Sales PDF`,
      });
    } else {
      Alert.alert('Saved', `PDF saved at ${uri}`);
    }
  }

  async function loadData() {
    if (!isGeneral) {
      const { data: batchData } = await supabase
        .from('batches')
        .select('*')
        .eq('id', batchId)
        .single();

      setBatch(batchData);

      const { data: expenseData } = await supabase
        .from('expenses')
        .select('amount, category')
        .eq('batch_id', batchId);

      setExpenses(expenseData ?? []);

      const { data: mortalityData } = await supabase
        .from('daily_records')
        .select('mortality_count')
        .eq('batch_id', batchId);

      setMortalityCount(
        (mortalityData ?? []).reduce(
          (sum, record) => sum + Number(record.mortality_count ?? 0),
          0
        )
      );
    }

    let query = supabase
      .from('sales')
      .select('*')
      .order('sale_date', { ascending: false });

    query = isGeneral
      ? query.is('batch_id', null)
      : query.eq('batch_id', batchId);

    const { data } = await query;
    setSales(data ?? []);
  }

  function resetSaleForm() {
    setSaleType('');
    setQuantity('');
    setUnitPrice('');
    setBuyer('');
    setSaleDate(new Date());
    setSaleTypePickerVisible(false);
    setDatePickerVisible(false);
    setEditingSaleId(null);
    setModalVisible(false);
  }

  function handleEditSale(sale: any) {
    setEditingSaleId(sale.id);
    setSaleType(normalizeSaleType(sale.item));
    setQuantity(String(sale.quantity ?? ''));
    setUnitPrice(String(sale.unit_price ?? ''));
    setBuyer(sale.buyer ?? '');
    setSaleDate(new Date(`${sale.sale_date}T12:00:00`));
    setModalVisible(true);
  }

  async function handleSaveSale() {
    const parsedQuantity = Number(quantity);
    const parsedUnitPrice = Number(unitPrice);

    if (
      !saleType ||
      !quantity ||
      !unitPrice ||
      !Number.isInteger(parsedQuantity) ||
      parsedQuantity <= 0 ||
      !Number.isFinite(parsedUnitPrice) ||
      parsedUnitPrice <= 0
    ) {
      Alert.alert(
        'Invalid sale',
        'Select a sale type and enter a whole quantity and a price greater than zero.'
      );
      return;
    }

    const soldBirdsExcludingCurrent = sales
      .filter(
        (sale) =>
          sale.id !== editingSaleId &&
          normalizeSaleType(sale.item) === 'Live birds'
      )
      .reduce((sum, sale) => sum + Number(sale.quantity), 0);

    const availableBirds = Math.max(
      0,
      liveBirds - soldBirdsExcludingCurrent
    );

    if (
      !isGeneral &&
      saleType === 'Live birds' &&
      parsedQuantity > availableBirds
    ) {
      Alert.alert(
        'Not enough birds',
        `Only ${availableBirds} live bird${
          availableBirds === 1 ? '' : 's'
        } available for sale.`
      );
      return;
    }

    setSaving(true);

    const payload = {
      item: saleType,
      quantity: parsedQuantity,
      unit_price: parsedUnitPrice,
      buyer,
      sale_date: saleDate.toISOString().split('T')[0],
    };

    let error;

    if (editingSaleId) {
      ({ error } = await supabase
        .from('sales')
        .update(payload)
        .eq('id', editingSaleId));
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      ({ error } = await supabase.from('sales').insert({
        user_id: user?.id,
        batch_id: isGeneral ? null : batchId,
        ...payload,
      }));
    }

    setSaving(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    resetSaleForm();
    await loadData();
  }

  async function handleDelete(saleId: string) {
    await supabase.from('sales').delete().eq('id', saleId);
    loadData();
  }

  const totalRevenue = useMemo(
    () =>
      sales.reduce(
        (sum, s) => sum + s.quantity * Number(s.unit_price),
        0
      ),
    [sales]
  );

  const totalExpenses = useMemo(
    () => expenses.reduce((sum, e) => sum + Number(e.amount), 0),
    [expenses]
  );

  const initialCost = batch?.cost ?? 0;
  const profit = totalRevenue - totalExpenses - initialCost;

  const costPerBird =
    batch?.bird_count > 0
      ? (initialCost + totalExpenses) / batch.bird_count
      : 0;

  const liveBirds = Math.max(
    0,
    Number(batch?.bird_count ?? 0) - mortalityCount
  );

  const birdsSold = useMemo(
    () =>
      sales
        .filter(
          (sale) => normalizeSaleType(sale.item) === 'Live birds'
        )
        .reduce((sum, sale) => sum + Number(sale.quantity), 0),
    [sales]
  );

  const liveBirdRevenue = useMemo(
    () =>
      sales
        .filter(
          (sale) => normalizeSaleType(sale.item) === 'Live birds'
        )
        .reduce(
          (sum, sale) =>
            sum +
            Number(sale.quantity) * Number(sale.unit_price),
          0
        ),
    [sales]
  );

  const currentBirds = Math.max(0, liveBirds - birdsSold);

  const costPerCurrentBird =
    liveBirds > 0
      ? (initialCost + totalExpenses) / liveBirds
      : 0;

  const averageSalePricePerBird =
    birdsSold > 0 ? liveBirdRevenue / birdsSold : 0;

  const profitPerCurrentBird =
    currentBirds > 0 ? profit / currentBirds : 0;

  const categoryTotals = useMemo(() => {
    const totals = new Map<string, number>();

    expenses.forEach((expense) => {
      const category = normalizeExpenseCategory(expense.category);

      totals.set(
        category,
        (totals.get(category) ?? 0) + Number(expense.amount)
      );
    });

    return [...totals.entries()].sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  const chartItems = [
    {
      label: 'Revenue',
      value: totalRevenue,
      color: theme.accentDark,
    },
    {
      label: 'Operating expenses',
      value: totalExpenses,
      color: '#F2A93B',
    },
    {
      label: 'Bird purchase',
      value: Number(initialCost),
      color: '#7E8CE0',
    },
  ];

  const chartMax = Math.max(
    1,
    ...chartItems.map((item) => item.value)
  );

  const categoryMax = Math.max(
    1,
    ...categoryTotals.map(([, amount]) => amount)
  );

  function formatCurrency(value: number) {
    return `₦${Math.round(value).toLocaleString()}`;
  }

  function getSaleVisual(item: unknown) {
    switch (normalizeSaleType(item)) {
      case 'Live birds':
        return {
          icon: 'paw-outline' as const,
          color: '#D06AA5',
          backgroundColor: '#FBEAF3',
        };

      case 'Eggs':
        return {
          icon: 'ellipse-outline' as const,
          color: '#C2774A',
          backgroundColor: '#FCEFE7',
        };

      case 'Manure':
        return {
          icon: 'leaf-outline' as const,
          color: '#5D8A64',
          backgroundColor: '#EAF4EB',
        };

      default:
        return {
          icon: 'cash-outline' as const,
          color: '#5576B8',
          backgroundColor: '#EAF0FC',
        };
    }
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={['top']}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons
            name="arrow-back"
            size={24}
            color={theme.text}
          />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {isGeneral ? 'General' : batch?.name}
          </Text>

          <Text
            style={[
              styles.headerSubtitle,
              { color: theme.textMuted },
            ]}
          >
            Store performance
          </Text>
        </View>

        <TouchableOpacity onPress={handleExportPDF}>
          <Ionicons
            name="share-outline"
            size={22}
            color={theme.text}
          />
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.tabRow,
          { backgroundColor: theme.cardBackground },
        ]}
      >
        {([
          {
            key: 'sales' as const,
            label: 'Sales',
            icon: 'receipt-outline' as const,
          },
          {
            key: 'insights' as const,
            label: 'Insights',
            icon: 'analytics-outline' as const,
          },
        ]).map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabButton,
              activeTab === tab.key && {
                backgroundColor: theme.accentDark,
              },
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon}
              size={17}
              color={activeTab === tab.key ? '#fff' : theme.textMuted}
            />

            <Text
              style={[
                styles.tabText,
                {
                  color:
                    activeTab === tab.key ? '#fff' : theme.textMuted,
                },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'sales' && (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.salesSummary,
              { backgroundColor: theme.cardBackgroundAlt },
            ]}
          >
            <View style={styles.salesSummaryMetric}>
              <Text
                style={[
                  styles.cardSubtitle,
                  { color: theme.textMuted },
                ]}
              >
                Total revenue
              </Text>

              <Text
                style={[
                  styles.salesSummaryValue,
                  { color: theme.text },
                ]}
              >
                {formatCurrency(totalRevenue)}
              </Text>
            </View>

            <View style={styles.salesSummaryDivider} />

            <View style={styles.salesSummaryMetric}>
              <Text
                style={[
                  styles.cardSubtitle,
                  { color: theme.textMuted },
                ]}
              >
                Sales entries
              </Text>

              <Text
                style={[
                  styles.salesSummaryValue,
                  { color: theme.text },
                ]}
              >
                {sales.length}
              </Text>
            </View>

            {!isGeneral ? (
              <>
                <View style={styles.salesSummaryDivider} />

                <View style={styles.salesSummaryMetric}>
                  <Text
                    style={[
                      styles.cardSubtitle,
                      { color: theme.textMuted },
                    ]}
                  >
                    Birds remaining
                  </Text>

                  <Text
                    style={[
                      styles.salesSummaryValue,
                      { color: theme.text },
                    ]}
                  >
                    {currentBirds}
                  </Text>
                </View>
              </>
            ) : null}
          </View>

          <View style={styles.salesHeading}>
            <View>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.text },
                ]}
              >
                Sales records
              </Text>

              <Text
                style={[
                  styles.cardSubtitle,
                  { color: theme.textMuted },
                ]}
              >
                Recent transactions
              </Text>
            </View>
          </View>

          {sales.length === 0 ? (
            <Text
              style={[
                styles.emptyText,
                { color: theme.textFaint },
              ]}
            >
              No sales recorded yet.
            </Text>
          ) : (
            sales.map((sale) => {
              const visual = getSaleVisual(sale.item);

              return (
                <View
                  key={sale.id}
                  style={[
                    styles.row,
                    { backgroundColor: theme.cardBackground },
                  ]}
                >
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: visual.backgroundColor },
                    ]}
                  >
                    <Ionicons
                      name={visual.icon}
                      size={19}
                      color={visual.color}
                    />
                  </View>

                  <View style={styles.saleDetails}>
                    <View style={styles.saleTitleRow}>
                      <Text
                        style={[
                          styles.rowTitle,
                          { color: theme.text },
                        ]}
                      >
                        {normalizeSaleType(sale.item)}
                      </Text>

                      <Text
                        style={[
                          styles.rowDate,
                          { color: theme.textFaint },
                        ]}
                      >
                        {sale.sale_date}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.rowSub,
                        { color: theme.textMuted },
                      ]}
                    >
                      {sale.quantity} ×{' '}
                      {formatCurrency(Number(sale.unit_price))}
                    </Text>

                    {sale.buyer ? (
                      <View style={styles.buyerRow}>
                        <Ionicons
                          name="person-outline"
                          size={13}
                          color={theme.textFaint}
                        />

                        <Text
                          style={[
                            styles.buyerText,
                            { color: theme.textFaint },
                          ]}
                        >
                          {sale.buyer}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.saleAmount}>
                    <Text
                      style={[
                        styles.rowAmount,
                        { color: theme.text },
                      ]}
                    >
                      {formatCurrency(
                        sale.quantity * Number(sale.unit_price)
                      )}
                    </Text>

                    <View style={styles.saleActions}>
                      <TouchableOpacity
                        onPress={() => handleEditSale(sale)}
                        hitSlop={10}
                      >
                        <Ionicons
                          name="create-outline"
                          size={17}
                          color={theme.accentDark}
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleDelete(sale.id)}
                        hitSlop={10}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={17}
                          color={theme.danger}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {activeTab === 'sales' && (
        <TouchableOpacity
          style={[
            styles.floatingSaleButton,
            { backgroundColor: theme.accentDark },
          ]}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Record a sale"
        >
          <Ionicons name="add" size={22} color="#FFFFFF" />
          <Text style={styles.floatingSaleButtonText}>
            Record sale
          </Text>
        </TouchableOpacity>
      )}

      {activeTab === 'insights' && !isGeneral && (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.profitHero,
              {
                backgroundColor:
                  profit >= 0 ? theme.accentDark : theme.danger,
              },
            ]}
          >
            <View>
              <Text style={styles.heroEyebrow}>NET PROFIT</Text>
              <Text style={styles.heroValue}>
                {formatCurrency(profit)}
              </Text>
              <Text style={styles.heroCaption}>
                After bird purchase and operating expenses
              </Text>
            </View>

            <View style={styles.heroIcon}>
              <Ionicons
                name={profit >= 0 ? 'trending-up' : 'trending-down'}
                size={25}
                color="#fff"
              />
            </View>
          </View>

          <View style={styles.kpiGrid}>
            {[
              {
                label: 'Revenue',
                value: formatCurrency(totalRevenue),
                icon: 'arrow-up-circle-outline' as const,
                color: theme.accentDark,
              },
              {
                label: 'Total cost',
                value: formatCurrency(totalExpenses + Number(initialCost)),
                icon: 'wallet-outline' as const,
                color: '#F2A93B',
              },
              {
                label: 'Cost / starting bird',
                value: formatCurrency(costPerBird),
                icon: 'pricetag-outline' as const,
                color: '#7E8CE0',
              },
              {
                label: `Cost / current bird (${liveBirds})`,
                value: formatCurrency(costPerCurrentBird),
                icon: 'analytics-outline' as const,
                color: '#C2774A',
              },
              {
                label: 'Average sale price / bird',
                value: formatCurrency(averageSalePricePerBird),
                icon: 'paw-outline' as const,
                color: '#D06AA5',
              },
              {
                label: `Profit / current bird (${currentBirds})`,
                value: formatCurrency(profitPerCurrentBird),
                icon: 'trending-up-outline' as const,
                color: '#55A6C6',
              },
            ].map((item) => (
              <View
                key={item.label}
                style={[
                  styles.kpiCard,
                  { backgroundColor: theme.cardBackground },
                ]}
              >
                <Ionicons
                  name={item.icon}
                  size={20}
                  color={item.color}
                />

                <Text
                  style={[
                    styles.kpiLabel,
                    { color: theme.textMuted },
                  ]}
                >
                  {item.label}
                </Text>

                <Text
                  style={[
                    styles.kpiValue,
                    { color: theme.text },
                  ]}
                >
                  {item.value}
                </Text>
              </View>
            ))}
          </View>

          <View
            style={[
              styles.chartCard,
              { backgroundColor: theme.cardBackgroundAlt },
            ]}
          >
            <View style={styles.cardHeadingRow}>
              <View>
                <Text
                  style={[
                    styles.cardTitle,
                    { color: theme.text },
                  ]}
                >
                  Financial overview
                </Text>

                <Text
                  style={[
                    styles.cardSubtitle,
                    { color: theme.textMuted },
                  ]}
                >
                  How this batch is performing
                </Text>
              </View>

              <Ionicons
                name="bar-chart-outline"
                size={21}
                color={theme.textMuted}
              />
            </View>

            <View style={styles.legendRow}>
              {chartItems.map((item) => (
                <View key={item.label} style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: item.color },
                    ]}
                  />

                  <Text
                    style={[
                      styles.legendText,
                      { color: theme.textMuted },
                    ]}
                  >
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>

            {chartItems.map((item) => (
              <View key={item.label} style={styles.chartRow}>
                <View style={styles.chartLabelRow}>
                  <Text
                    style={[
                      styles.chartLabel,
                      { color: theme.text },
                    ]}
                  >
                    {item.label}
                  </Text>

                  <Text
                    style={[
                      styles.chartAmount,
                      { color: theme.text },
                    ]}
                  >
                    {formatCurrency(item.value)}
                  </Text>
                </View>

                <View
                  style={[
                    styles.barTrack,
                    { backgroundColor: theme.border },
                  ]}
                >
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${
                          Math.max(
                            item.value > 0 ? 4 : 0,
                            (item.value / chartMax) * 100
                          )
                        }%`,
                        backgroundColor: item.color,
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>

          <View
            style={[
              styles.chartCard,
              { backgroundColor: theme.cardBackgroundAlt },
            ]}
          >
            <View style={styles.cardHeadingRow}>
              <View>
                <Text
                  style={[
                    styles.cardTitle,
                    { color: theme.text },
                  ]}
                >
                  Where your money went
                </Text>

                <Text
                  style={[
                    styles.cardSubtitle,
                    { color: theme.textMuted },
                  ]}
                >
                  Operating expenses by category
                </Text>
              </View>

              <Ionicons
                name="pie-chart-outline"
                size={21}
                color={theme.textMuted}
              />
            </View>

            {categoryTotals.length === 0 ? (
              <Text
                style={[
                  styles.breakdownEmpty,
                  { color: theme.textFaint },
                ]}
              >
                No operating expenses recorded yet.
              </Text>
            ) : (
              categoryTotals.map(([category, amount], index) => (
                <View key={category} style={styles.chartRow}>
                  <View style={styles.chartLabelRow}>
                    <View style={styles.categoryLabel}>
                      <View
                        style={[
                          styles.legendDot,
                          {
                            backgroundColor:
                              CATEGORY_COLORS[
                                index % CATEGORY_COLORS.length
                              ],
                          },
                        ]}
                      />

                      <Text
                        style={[
                          styles.chartLabel,
                          { color: theme.text },
                        ]}
                      >
                        {category}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.chartAmount,
                        { color: theme.text },
                      ]}
                    >
                      {formatCurrency(amount)}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.barTrack,
                      { backgroundColor: theme.border },
                    ]}
                  >
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${Math.max(
                            4,
                            (amount / categoryMax) * 100
                          )}%`,
                          backgroundColor:
                            CATEGORY_COLORS[
                              index % CATEGORY_COLORS.length
                            ],
                        },
                      ]}
                    />
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}

      {activeTab === 'insights' && isGeneral && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View
            style={[
              styles.chartCard,
              { backgroundColor: theme.cardBackgroundAlt },
            ]}
          >
            <Text
              style={[
                styles.cardTitle,
                { color: theme.text },
              ]}
            >
              Sales records
            </Text>

            <Text
              style={[
                styles.cardSubtitle,
                { color: theme.textMuted },
              ]}
            >
              General sales not linked to a batch
            </Text>

            {sales.length === 0 ? (
              <Text
                style={[
                  styles.emptyText,
                  { color: theme.textFaint },
                ]}
              >
                No sales recorded yet.
              </Text>
            ) : (
              sales.map((sale) => (
                <View
                  key={sale.id}
                  style={[
                    styles.row,
                    { backgroundColor: theme.cardBackground },
                  ]}
                >
                  <View style={styles.iconCircle}>
                    <Ionicons
                      name="cash"
                      size={18}
                      color={theme.accentDark}
                    />
                  </View>

                  <View style={styles.saleDetails}>
                    <Text
                      style={[
                        styles.rowTitle,
                        { color: theme.text },
                      ]}
                    >
                      {sale.item}
                    </Text>

                    <Text
                      style={[
                        styles.rowSub,
                        { color: theme.textMuted },
                      ]}
                    >
                      {sale.quantity} × NGN{' '}
                      {Number(sale.unit_price).toLocaleString()}
                    </Text>
                  </View>

                  <View style={styles.saleAmount}>
                    <Text
                      style={[
                        styles.rowAmount,
                        { color: theme.text },
                      ]}
                    >
                      {formatCurrency(
                        sale.quantity * Number(sale.unit_price)
                      )}
                    </Text>

                    <View style={styles.saleActions}>
                      <TouchableOpacity
                        onPress={() => handleEditSale(sale)}
                        hitSlop={10}
                      >
                        <Ionicons
                          name="create-outline"
                          size={17}
                          color={theme.accentDark}
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleDelete(sale.id)}
                        hitSlop={10}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={17}
                          color={theme.danger}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContent,
                { backgroundColor: theme.background },
              ]}
            >
              <Text
                style={[
                  styles.modalTitle,
                  { color: theme.text },
                ]}
              >
                {editingSaleId ? 'Edit Sale' : 'Record Sale'}
              </Text>

              <TouchableOpacity
                style={[
                  styles.input,
                  styles.selectInput,
                  { borderColor: theme.border },
                ]}
                onPress={() =>
                  setSaleTypePickerVisible((visible) => !visible)
                }
              >
                <Text
                  style={{
                    color: saleType ? theme.text : theme.textFaint,
                  }}
                >
                  {saleType || 'Select sale type'}
                </Text>

                <Ionicons
                  name="chevron-down"
                  size={18}
                  color={theme.textMuted}
                />
              </TouchableOpacity>

              {saleTypePickerVisible ? (
                <View
                  style={[
                    styles.optionList,
                    { backgroundColor: theme.cardBackground },
                  ]}
                >
                  {SALE_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.optionRow,
                        { borderBottomColor: theme.border },
                      ]}
                      onPress={() => {
                        setSaleType(type);
                        setSaleTypePickerVisible(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          { color: theme.text },
                        ]}
                      >
                        {type}
                      </Text>

                      {saleType === type ? (
                        <Ionicons
                          name="checkmark"
                          size={19}
                          color={theme.accentDark}
                        />
                      ) : null}
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                placeholder="Quantity"
                placeholderTextColor={theme.textFaint}
                keyboardType="numeric"
                value={quantity}
                onChangeText={setQuantity}
              />

              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                placeholder="Unit price (NGN)"
                placeholderTextColor={theme.textFaint}
                keyboardType="numeric"
                value={unitPrice}
                onChangeText={setUnitPrice}
              />

              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                placeholder="Buyer (optional)"
                placeholderTextColor={theme.textFaint}
                value={buyer}
                onChangeText={setBuyer}
              />

              <TouchableOpacity
                style={[
                  styles.input,
                  styles.selectInput,
                  { borderColor: theme.border },
                ]}
                onPress={() => setDatePickerVisible(true)}
              >
                <Text style={{ color: theme.text }}>
                  Sale date: {saleDate.toISOString().split('T')[0]}
                </Text>

                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={theme.textMuted}
                />
              </TouchableOpacity>

              {datePickerVisible ? (
                <DateTimePicker
                  value={saleDate}
                  mode="date"
                  maximumDate={new Date()}
                  onChange={(_, selectedDate) => {
                    setDatePickerVisible(false);

                    if (selectedDate) {
                      setSaleDate(selectedDate);
                    }
                  }}
                />
              ) : null}

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveSale}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving
                    ? 'Saving...'
                    : editingSaleId
                      ? 'Update Sale'
                      : 'Save Sale'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={resetSaleForm}>
                <Text
                  style={[
                    styles.cancelText,
                    { color: theme.textFaint },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 14,
  },

  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },

  headerSubtitle: {
    fontSize: 12,
    marginTop: 3,
  },

  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
    padding: 4,
    borderRadius: 12,
  },

  tabButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 10,
    borderRadius: 9,
  },

  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 110,
    gap: 14,
  },

  salesSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 12,
    marginBottom: 8,
  },

  salesSummaryMetric: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 3,
  },

  salesSummaryDivider: {
    width: 1,
    height: 38,
    backgroundColor: '#D8D8D8',
  },

  salesSummaryValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 6,
  },

  salesHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },

  cardSubtitle: {
    fontSize: 12,
    marginTop: 4,
  },

  emptyText: {
    textAlign: 'center',
    paddingVertical: 28,
    fontSize: 14,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    borderRadius: 14,
    marginBottom: 9,
    gap: 10,
  },

  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },

  saleDetails: {
    flex: 1,
    minWidth: 0,
  },

  saleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },

  rowDate: {
    fontSize: 11,
  },

  rowSub: {
    fontSize: 12,
    marginTop: 5,
  },

  buyerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },

  buyerText: {
    fontSize: 11,
    flexShrink: 1,
  },

  saleAmount: {
    alignItems: 'flex-end',
    gap: 8,
  },

  rowAmount: {
    fontSize: 14,
    fontWeight: '700',
  },

  saleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },

  floatingSaleButton: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 28,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
  },

  floatingSaleButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  profitHero: {
    borderRadius: 18,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  heroEyebrow: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },

  heroValue: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '800',
    marginTop: 7,
  },

  heroCaption: {
    color: '#FFFFFF',
    opacity: 0.88,
    fontSize: 12,
    marginTop: 5,
    maxWidth: 250,
  },

  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  kpiCard: {
    width: '48%',
    flexGrow: 1,
    flexBasis: '45%',
    padding: 14,
    borderRadius: 14,
    gap: 7,
  },

  kpiLabel: {
    fontSize: 12,
    lineHeight: 17,
  },

  kpiValue: {
    fontSize: 16,
    fontWeight: '700',
  },

  chartCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 2,
  },

  cardHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },

  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 18,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },

  legendText: {
    fontSize: 11,
  },

  chartRow: {
    marginBottom: 15,
  },

  chartLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 7,
  },

  chartLabel: {
    fontSize: 13,
    flexShrink: 1,
  },

  chartAmount: {
    fontSize: 13,
    fontWeight: '600',
  },

  barTrack: {
    height: 8,
    borderRadius: 5,
    overflow: 'hidden',
  },

  barFill: {
    height: '100%',
    borderRadius: 5,
  },

  breakdownEmpty: {
    fontSize: 13,
    paddingVertical: 14,
  },

  categoryLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },

  modalContent: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 28,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    gap: 12,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },

  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 14,
  },

  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  optionList: {
    borderRadius: 11,
    overflow: 'hidden',
  },

  optionRow: {
    minHeight: 44,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  optionText: {
    fontSize: 14,
  },

  saveButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 11,
    backgroundColor: '#4CAF50',
    marginTop: 4,
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  cancelText: {
    textAlign: 'center',
    fontSize: 14,
    paddingVertical: 8,
  },
});