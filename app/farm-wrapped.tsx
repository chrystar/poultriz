import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { router, useFocusEffect } from 'expo-router';
import { captureRef } from 'react-native-view-shot';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import MultiShareModule from '../modules/multi-share/src/MultiShareModule';

type Period = 'month' | 'year' | 'all';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'month', label: 'This month' },
  { key: 'year', label: 'This year' },
  { key: 'all', label: 'All time' },
];

type WrappedStats = {
  batches: number;
  birds: number;
  mortality: number;
  revenue: number;
  expenses: number;
};

function getPeriodStart(period: Period): string | null {
  if (period === 'all') return null;
  const date = new Date();
  if (period === 'month') date.setDate(1);
  else {
    date.setMonth(0);
    date.setDate(1);
  }
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[character] ?? character));
}

function naira(value: number): string {
  return `₦${Math.round(value).toLocaleString()}`;
}

function createWrappedHtml(periodLabel: string, stats: WrappedStats, includeMoney: boolean): string {
  const profit = stats.revenue - stats.expenses;
  const moneyRows = `
    <div class="finance-card">
      <div class="finance-title">${includeMoney ? 'THE NUMBERS BEHIND THE GROWTH' : 'YOUR GROWTH STORY'}</div>
      <div class="money-row">
        <div><span>REVENUE</span><strong>${includeMoney ? naira(stats.revenue) : 'PRIVATE'}</strong></div>
        <div><span>EXPENSES</span><strong>${includeMoney ? naira(stats.expenses) : 'PRIVATE'}</strong></div>
        <div class="profit"><span>NET PROFIT</span><strong class="${profit >= 0 ? 'positive' : 'negative'}">${includeMoney ? naira(profit) : 'PRIVATE'}</strong></div>
      </div>
    </div>
  `;

  return `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; background: #F3F5E9; font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #17251A; }
          .card { position: relative; overflow: hidden; width: 100%; min-height: 675px; padding: 28px 30px; background: #F3F5E9; page-break-after: always; }
          .card:before { content: ''; position: absolute; width: 470px; height: 155px; border: 9px solid #B9E37D; border-left-color: transparent; border-right-color: transparent; border-radius: 50%; top: -82px; right: -120px; transform: rotate(-18deg); }
          .card:after { content: ''; position: absolute; width: 420px; height: 120px; border: 2px solid #315B21; border-left-color: transparent; border-right-color: transparent; border-radius: 50%; top: -44px; right: -120px; transform: rotate(-18deg); }
          .content { position: relative; z-index: 1; }
          .topline, .money-row, .footer { display: flex; justify-content: space-between; align-items: center; }
          .brand-wrap { display: flex; align-items: center; gap: 9px; }
          .brand-mark { display: inline-block; width: 27px; height: 27px; border-radius: 50%; background: #17251A; color: #B9E37D; text-align: center; line-height: 27px; font-size: 16px; font-weight: 800; }
          .brand { font-size: 15px; font-weight: 800; letter-spacing: 2px; color: #17251A; }
          .share-label { padding: 7px 10px; background: #17251A; font-size: 9px; font-weight: 800; letter-spacing: 1px; color: #B9E37D; }
          .eyebrow { margin-top: 68px; font-size: 11px; font-weight: 800; color: #4B7438; text-transform: uppercase; letter-spacing: 2px; }
          h1 { margin: 10px 0 7px; font-size: 43px; line-height: .98; color: #17251A; letter-spacing: -1.5px; }
          .subhead { margin: 0 0 22px; max-width: 315px; font-size: 13px; line-height: 1.45; color: #4B5E4D; }
          .hero-stat { position: relative; overflow: hidden; padding: 19px 20px 17px; margin-bottom: 11px; background: #17251A; color: #F3F5E9; }
          .hero-stat:after { content: ''; position: absolute; width: 170px; height: 170px; border: 1px solid rgba(185,227,125,.35); border-radius: 50%; right: -35px; top: -90px; }
          .hero-stat span, .stat span, .money-row span { display: block; font-size: 10px; font-weight: 800; letter-spacing: 1px; color: #5E8750; }
          .hero-stat span { color: #B9E37D; }
          .hero-stat strong { display: block; position: relative; z-index: 1; margin-top: 2px; font-size: 64px; line-height: .95; color: #F3F5E9; letter-spacing: -2px; }
          .hero-stat em { display: block; position: relative; z-index: 1; margin-top: 8px; font-size: 11px; font-style: normal; color: #B4C8B4; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 11px; }
          .stat { padding: 14px 15px; border: 1px solid #CAD4C2; background: #FFFFFF; }
          .stat .stat-icon { display: block; margin-bottom: 11px; font-size: 16px; color: #4B7438; }
          .stat strong { display: block; margin-top: 5px; font-size: 28px; color: #17251A; }
          .finance-card { margin-top: 11px; padding: 14px 15px; background: #B9E37D; }
          .finance-title { margin-bottom: 14px; font-size: 9px; font-weight: 900; letter-spacing: 1px; color: #315B21; }
          .money-row { align-items: flex-end; gap: 10px; }
          .money-row div { flex: 1; }
          .money-row .profit { padding-left: 10px; border-left: 1px solid rgba(49,91,33,.3); }
          .money-row span { color: #315B21; }
          .money-row strong { display: block; margin-top: 5px; font-size: 15px; color: #17251A; }
          .positive { color: #315B21 !important; } .negative { color: #A83228 !important; }
          .quote { margin: 22px 0 0; font-size: 14px; line-height: 1.25; font-weight: 800; color: #315B21; }
          .footer { position: absolute; z-index: 1; bottom: 25px; left: 30px; right: 30px; font-size: 10px; color: #637663; letter-spacing: .3px; }
          .footer strong { color: #315B21; font-weight: 800; }
          .dark { background: #17251A; color: #F3F5E9; }
          .dark:before { border-color: rgba(185,227,125,.4); border-left-color: transparent; border-right-color: transparent; }
          .dark:after { border-color: rgba(185,227,125,.5); border-left-color: transparent; border-right-color: transparent; }
          .dark .brand, .dark h1, .dark .quote { color: #F3F5E9; }
          .dark .brand-mark, .dark .share-label { background: #B9E37D; color: #17251A; }
          .dark .eyebrow { color: #B9E37D; }
          .dark .subhead, .dark .footer { color: #B4C8B4; }
          .dark .footer strong { color: #B9E37D; }
          .statement { margin-top: 170px; font-size: 52px; line-height: .98; font-weight: 900; letter-spacing: -2px; }
          .statement-accent { color: #B9E37D; }
          .big-number { margin-top: 90px; font-size: 104px; line-height: .85; font-weight: 900; letter-spacing: -5px; color: #17251A; }
          .big-label { margin-top: 18px; font-size: 14px; font-weight: 900; letter-spacing: 2px; color: #4B7438; }
        </style>
      </head>
      <body>
        <div class="card dark">
          <div class="content">
          <div class="topline">
            <div class="brand-wrap"><span class="brand-mark">↗</span><span class="brand">POULTRIZ</span></div>
            <span class="share-label">MY FARM WRAPPED</span>
          </div>
          <div class="statement">My farm.<br/><span class="statement-accent">My progress.</span></div>
          <p class="subhead">A visual story of the care, consistency, and growth behind every batch.</p>
          </div>
          <div class="footer"><span>My farm progress</span><strong>POWERED BY POULTRIZ</strong></div>
        </div>
        <div class="card">
          <div class="content">
            <div class="topline"><div class="brand-wrap"><span class="brand-mark">↗</span><span class="brand">POULTRIZ</span></div>            <span class="share-label">THE FLOCK</span></div>
            <div class="eyebrow">${escapeHtml(periodLabel)}  /  the flock</div>
            <h1>Every bird<br/>counts.</h1>
            <p class="subhead">From the first record to the latest check-in, your consistency is building something real.</p>
            <div class="big-number">${stats.birds.toLocaleString()}</div>
            <div class="big-label">BIRDS RAISED</div>
            <div class="quote">Small steps. Stronger flock.</div>
          </div>
          <div class="footer"><span>My farm progress</span><strong>POWERED BY POULTRIZ</strong></div>
        </div>
        <div class="card">
          <div class="content">
            <div class="topline"><div class="brand-wrap"><span class="brand-mark">↗</span><span class="brand">POULTRIZ</span></div><span class="share-label">THE WORK</span></div>
            <div class="eyebrow">${escapeHtml(periodLabel)}  /  the work</div>
            <h1>Care in.<br/>Progress out.</h1>
            <div class="grid" style="margin-top: 55px">
              <div class="stat"><span class="stat-icon">✦</span><span>BATCHES</span><strong>${stats.batches}</strong></div>
              <div class="stat"><span class="stat-icon">♡</span><span>MORTALITY</span><strong>${stats.mortality.toLocaleString()}</strong></div>
            </div>
            <div class="quote">The best results start with paying attention.</div>
          </div>
          <div class="footer"><span>My farm progress</span><strong>POWERED BY POULTRIZ</strong></div>
        </div>
        <div class="card dark">
          <div class="content">
            <div class="topline"><div class="brand-wrap"><span class="brand-mark">↗</span><span class="brand">POULTRIZ</span></div><span class="share-label">THE NUMBERS</span></div>
            <div class="eyebrow">the numbers behind the growth</div>
            <h1>Growing<br/><span class="statement-accent">with purpose.</span></h1>
            ${moneyRows}
            <div class="quote">Know your numbers. Grow with confidence.</div>
          </div>
          <div class="footer"><span>My farm progress</span><strong>POWERED BY POULTRIZ</strong></div>
        </div>
        <div class="card">
          <div class="content">
            <div class="topline"><div class="brand-wrap"><span class="brand-mark">↗</span><span class="brand">POULTRIZ</span></div><span class="share-label">NEXT CHAPTER</span></div>
            <div class="statement">Keep growing.<br/><span class="statement-accent">Keep going.</span></div>
            <p class="subhead">Your farm story is still being written — one smart decision at a time.</p>
            <div class="quote">Growing better, one batch at a time.</div>
          </div>
          <div class="footer"><span>My farm progress</span><strong>POWERED BY POULTRIZ</strong></div>
        </div>
      </body>
    </html>
  `;
}

export default function FarmWrappedScreen() {
  const { theme } = useTheme();
  const [period, setPeriod] = useState<Period>('all');
  const [includeMoney, setIncludeMoney] = useState(true);
  const [stats, setStats] = useState<WrappedStats>({ batches: 0, birds: 0, mortality: 0, revenue: 0, expenses: 0 });
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const previewWidth = Dimensions.get('window').width - 40;
  const carouselRef = useRef<ScrollView>(null);
  const slideRefs = useRef<(View | null)[]>([]);

  const periodLabel = useMemo(
    () => PERIODS.find((option) => option.key === period)?.label ?? 'All time',
    [period],
  );

  const loadStats = useCallback(async () => {
    setLoading(true);
    const start = getPeriodStart(period);
    const [batchesResult, salesResult, expensesResult, mortalityResult] = await Promise.all([
      (() => {
        let query = supabase.from('batches').select('bird_count, created_at');
        if (start) query = query.gte('created_at', start);
        return query;
      })(),
      (() => {
        let query = supabase.from('sales').select('quantity, unit_price, sale_date');
        if (start) query = query.gte('sale_date', start.split('T')[0]);
        return query;
      })(),
      (() => {
        let query = supabase.from('expenses').select('amount, expense_date');
        if (start) query = query.gte('expense_date', start.split('T')[0]);
        return query;
      })(),
      (() => {
        let query = supabase.from('daily_records').select('mortality_count, record_date');
        if (start) query = query.gte('record_date', start.split('T')[0]);
        return query;
      })(),
    ]);

    if (batchesResult.error || salesResult.error || expensesResult.error || mortalityResult.error) {
      setLoading(false);
      Alert.alert('Could not load summary', 'Please check your connection and try again.');
      return;
    }

    setStats({
      batches: batchesResult.data?.length ?? 0,
      birds: batchesResult.data?.reduce((sum, batch) => sum + (batch.bird_count ?? 0), 0) ?? 0,
      mortality: mortalityResult.data?.reduce((sum, record) => sum + Number(record.mortality_count ?? 0), 0) ?? 0,
      revenue: salesResult.data?.reduce((sum, sale) => sum + sale.quantity * Number(sale.unit_price), 0) ?? 0,
      expenses: expensesResult.data?.reduce((sum, expense) => sum + Number(expense.amount), 0) ?? 0,
    });
    setLoading(false);
  }, [period]);

  useFocusEffect(useCallback(() => {
    loadStats();
  }, [loadStats]));

  async function shareAllSlides() {
    setSharing(true);
    try {
      if (!MultiShareModule) {
        Alert.alert(
          'Development build required',
          'Multi-image social sharing is available in a development build, not Expo Go. Run npx expo run:ios or npx expo run:android first.',
        );
        return;
      }

      const imageUris: string[] = [];
      for (const slide of slideRefs.current) {
        if (!slide) {
          throw new Error('The Farm Wrapped slides are not ready to share.');
        }
        imageUris.push(await captureRef(slide, {
          format: 'png',
          quality: 1,
          result: 'tmpfile',
        }));
      }
      await MultiShareModule.shareImages(imageUris);
    } catch (error) {
      console.warn('All Farm Wrapped slides sharing failed:', error);
      Alert.alert('Could not share slides', 'Please try again.');
    } finally {
      setSharing(false);
    }
  }

  async function shareCurrentSlide() {
    setSharing(true);
    try {
      const slide = slideRefs.current[activeSlide];
      if (!slide) {
        throw new Error('The selected Farm Wrapped slide is not ready to share.');
      }
      const uri = await captureRef(slide, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Sharing unavailable', 'Sharing is not available on this device.');
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share your Farm Wrapped',
        UTI: 'public.png',
      });
    } catch (error) {
      console.warn('Farm Wrapped image sharing failed:', error);
      Alert.alert('Could not share image', 'Please try again.');
    } finally {
      setSharing(false);
    }
  }

  async function shareCarouselPdf() {
    setExportingPdf(true);
    try {
      const { uri } = await Print.printToFileAsync({
        html: createWrappedHtml(periodLabel, stats, includeMoney),
        width: 540,
        height: 675,
      });
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Sharing unavailable', 'Sharing is not available on this device.');
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share your Farm Wrapped carousel',
        UTI: 'com.adobe.pdf',
      });
    } catch (error) {
      console.warn('Farm Wrapped PDF sharing failed:', error);
      Alert.alert('Could not share carousel', 'Please try again.');
    } finally {
      setExportingPdf(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.screenBackground }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Farm Wrapped</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.introBlock}>
          <Text style={[styles.kicker, { color: theme.accentDark }]}>YOUR FARM, IN FOCUS</Text>
          <Text style={[styles.intro, { color: theme.text }]}>
            A clear look at how your farm is growing.
          </Text>
          <Text style={[styles.introSupporting, { color: theme.textMuted }]}>
            Choose a period to turn your progress into a story worth sharing.
          </Text>
        </View>

        <View style={styles.periodRow}>
          {PERIODS.map((option) => (
            <TouchableOpacity
              key={option.key}
              onPress={() => setPeriod(option.key)}
              style={[styles.periodButton, { backgroundColor: theme.cardBackground, borderColor: theme.border }, period === option.key && { backgroundColor: theme.accentDark, borderColor: theme.accentDark }]}
            >
              <Text style={[styles.periodText, { color: period === option.key ? '#fff' : theme.text }]}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView
          horizontal
          pagingEnabled
          ref={carouselRef}
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          onMomentumScrollEnd={(event) => setActiveSlide(Math.round(event.nativeEvent.contentOffset.x / previewWidth))}
          style={styles.carousel}
        >
          <View ref={(view) => { slideRefs.current[0] = view; }} collapsable={false} style={[styles.preview, styles.coverSlide, { width: previewWidth }]}>
            <View style={styles.previewTopRow}>
              <View style={styles.darkBrandMark}><Ionicons name="leaf" size={15} color="#B9E37D" /></View>
              <Text style={styles.darkBrand}>POULTRIZ</Text>
            </View>
            <Text style={styles.darkEyebrow}>{periodLabel.toUpperCase()}  /  FARM WRAPPED</Text>
            <Text style={styles.coverTitle}>My farm.{'\n'}My progress.</Text>
            <Text style={styles.coverSubtitle}>A visual story of the care, consistency, and growth behind every batch.</Text>
            <Text style={styles.coverQuote}>Swipe through your story →</Text>
          </View>

          <View ref={(view) => { slideRefs.current[1] = view; }} collapsable={false} style={[styles.preview, styles.lightSlide, { width: previewWidth }]}>
            <View style={styles.previewTopRow}>
              <View style={styles.lightBrandMark}><Ionicons name="leaf" size={14} color="#F3F5E9" /></View>
              <Text style={styles.lightBrand}>POULTRIZ</Text>
            </View>
            <Text style={styles.slideLabel}>THE FLOCK</Text>
            <Text style={styles.slideTitle}>Every bird{'\n'}counts.</Text>
            {loading ? <ActivityIndicator color="#315B21" style={styles.bigLoader} /> : <>
              <Text style={styles.bigNumber}>{stats.birds.toLocaleString()}</Text>
              <Text style={styles.bigLabel}>BIRDS RAISED</Text>
            </>}
            <Text style={styles.slideQuote}>Small steps. Stronger flock.</Text>
          </View>

          <View ref={(view) => { slideRefs.current[2] = view; }} collapsable={false} style={[styles.preview, styles.lightSlide, { width: previewWidth }]}>
            <View style={styles.previewTopRow}>
              <View style={styles.lightBrandMark}><Ionicons name="leaf" size={14} color="#F3F5E9" /></View>
              <Text style={styles.lightBrand}>POULTRIZ</Text>
            </View>
            <Text style={styles.slideLabel}>THE WORK</Text>
            <Text style={styles.slideTitle}>Care in.{'\n'}Progress out.</Text>
            {loading ? <ActivityIndicator color="#315B21" style={styles.bigLoader} /> : <>
              <View style={styles.carouselStatRow}>
                <View style={styles.carouselStat}><Text style={styles.carouselIcon}>✦</Text><Text style={styles.carouselStatLabel}>BATCHES</Text><Text style={styles.carouselStatValue}>{stats.batches}</Text></View>
                <View style={styles.carouselStat}><Text style={styles.carouselIcon}>♡</Text><Text style={styles.carouselStatLabel}>MORTALITY</Text><Text style={styles.carouselStatValue}>{stats.mortality}</Text></View>
              </View>
            </>}
            <Text style={styles.slideQuote}>The best results start with paying attention.</Text>
          </View>

          <View ref={(view) => { slideRefs.current[3] = view; }} collapsable={false} style={[styles.preview, styles.darkSlide, { width: previewWidth }]}>
            <View style={styles.previewTopRow}>
              <View style={styles.darkBrandMark}><Ionicons name="leaf" size={15} color="#17251A" /></View>
              <Text style={styles.darkBrand}>POULTRIZ</Text>
            </View>
            <Text style={styles.slideLabelDark}>THE NUMBERS</Text>
            <Text style={styles.slideTitleDark}>Growing{'\n'}with purpose.</Text>
            {includeMoney ? (
              <View style={styles.carouselFinance}>
                <View><Text style={styles.financeLabel}>REVENUE</Text><Text style={styles.financeValue}>{naira(stats.revenue)}</Text></View>
                <View><Text style={styles.financeLabel}>EXPENSES</Text><Text style={styles.financeValue}>{naira(stats.expenses)}</Text></View>
                <View><Text style={styles.financeLabel}>PROFIT</Text><Text style={[styles.financeValue, { color: '#B9E37D' }]}>{naira(stats.revenue - stats.expenses)}</Text></View>
              </View>
            ) : <Text style={styles.privateMessage}>Financial figures are private.</Text>}
            <Text style={styles.slideQuoteDark}>Know your numbers. Grow with confidence.</Text>
          </View>

          <View ref={(view) => { slideRefs.current[4] = view; }} collapsable={false} style={[styles.preview, styles.coverSlide, { width: previewWidth }]}>
            <View style={styles.previewTopRow}>
              <View style={styles.darkBrandMark}><Ionicons name="leaf" size={15} color="#17251A" /></View>
              <Text style={styles.darkBrand}>POULTRIZ</Text>
            </View>
            <Text style={styles.darkEyebrow}>YOUR NEXT CHAPTER</Text>
            <Text style={styles.coverTitle}>Keep growing.{'\n'}Keep going.</Text>
            <Text style={styles.coverSubtitle}>Your farm story is still being written — one smart decision at a time.</Text>
            <Text style={styles.coverQuote}>Growing better, one batch at a time.</Text>
          </View>
        </ScrollView>
        <View style={styles.pagination}>
          {[0, 1, 2, 3, 4].map((slide) => <View key={slide} style={[styles.dot, { backgroundColor: slide === activeSlide ? theme.accentDark : theme.border }]} />)}
        </View>

        <View style={[styles.optionRow, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <View style={[styles.optionIcon, { backgroundColor: theme.accent + '55' }]}>
            <Ionicons name="lock-closed-outline" size={18} color={theme.accentDark} />
          </View>
          <View style={styles.optionCopy}>
            <Text style={[styles.optionTitle, { color: theme.text }]}>Include financial figures</Text>
            <Text style={[styles.optionSubtitle, { color: theme.textMuted }]}>Turn off to hide money figures</Text>
          </View>
          <Switch value={includeMoney} onValueChange={setIncludeMoney} trackColor={{ false: theme.border, true: theme.accentDark }} />
        </View>

        <TouchableOpacity style={[styles.shareButton, { backgroundColor: theme.accentDark, shadowColor: theme.accentDark }]} onPress={shareAllSlides} disabled={loading || sharing || exportingPdf}>
          {sharing ? <ActivityIndicator color="#fff" /> : <><Ionicons name="images-outline" size={20} color="#fff" /><Text style={styles.shareText}>Share all slides to social media</Text></>}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.pdfButton, { borderColor: theme.border }]} onPress={shareCurrentSlide} disabled={loading || sharing || exportingPdf}>
          <Ionicons name="image-outline" size={18} color={theme.accentDark} /><Text style={[styles.pdfButtonText, { color: theme.text }]}>Share current slide</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.pdfButton, { borderColor: theme.border }]} onPress={shareCarouselPdf} disabled={loading || sharing || exportingPdf}>
          {exportingPdf ? <ActivityIndicator color={theme.accentDark} /> : <><Ionicons name="document-text-outline" size={18} color={theme.accentDark} /><Text style={[styles.pdfButtonText, { color: theme.text }]}>Share full carousel PDF</Text></>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  content: { padding: 20, paddingBottom: 36 },
  introBlock: { alignItems: 'center', marginTop: 14, marginBottom: 20 },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 8 },
  intro: { fontSize: 23, lineHeight: 29, fontWeight: '800', textAlign: 'center' },
  introSupporting: { fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 7, maxWidth: 300 },
  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  periodButton: { flex: 1, paddingVertical: 11, borderWidth: 1, borderRadius: 12, alignItems: 'center' },
  periodText: { fontSize: 12, fontWeight: '600' },
  carousel: { marginHorizontal: -20 },
  preview: { padding: 24, minHeight: 430, overflow: 'hidden', position: 'relative' },
  coverSlide: { backgroundColor: '#17251A' },
  lightSlide: { backgroundColor: '#F3F5E9' },
  darkSlide: { backgroundColor: '#17251A' },
  previewTopRow: { flexDirection: 'row', alignItems: 'center' },
  darkBrandMark: { width: 27, height: 27, borderRadius: 14, backgroundColor: '#B9E37D', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  darkBrand: { fontSize: 14, fontWeight: '800', letterSpacing: 1.5, color: '#F3F5E9' },
  lightBrandMark: { width: 27, height: 27, borderRadius: 14, backgroundColor: '#17251A', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  lightBrand: { fontSize: 14, fontWeight: '800', letterSpacing: 1.5, color: '#17251A' },
  darkEyebrow: { marginTop: 54, fontSize: 10, fontWeight: '800', letterSpacing: 1.3, color: '#B9E37D' },
  coverTitle: { fontSize: 40, lineHeight: 41, fontWeight: '900', color: '#F3F5E9', marginTop: 14, letterSpacing: -1 },
  coverSubtitle: { fontSize: 13, lineHeight: 19, color: '#B4C8B4', marginTop: 16, maxWidth: 270 },
  coverQuote: { position: 'absolute', bottom: 25, left: 24, fontSize: 13, fontWeight: '800', color: '#B9E37D' },
  slideLabel: { marginTop: 8, fontSize: 10, fontWeight: '800', letterSpacing: 1.3, color: '#4B7438' },
  slideTitle: { fontSize: 34, lineHeight: 35, fontWeight: '900', color: '#17251A', marginTop: 14, letterSpacing: -1 },
  bigLoader: { marginTop: 90 },
  bigNumber: { marginTop: 85, fontSize: 72, lineHeight: 74, fontWeight: '900', color: '#17251A', letterSpacing: -3 },
  bigLabel: { fontSize: 12, fontWeight: '900', letterSpacing: 1.5, color: '#4B7438', marginTop: 8 },
  slideQuote: { position: 'absolute', bottom: 25, left: 24, right: 24, fontSize: 14, lineHeight: 19, fontWeight: '800', color: '#315B21' },
  carouselStatRow: { flexDirection: 'row', gap: 10, marginTop: 58 },
  carouselStat: { flex: 1, padding: 15, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CAD4C2' },
  carouselIcon: { fontSize: 18, color: '#4B7438' },
  carouselStatLabel: { fontSize: 10, fontWeight: '800', color: '#5E8750', marginTop: 17, letterSpacing: .8 },
  carouselStatValue: { fontSize: 29, fontWeight: '900', color: '#17251A', marginTop: 5 },
  slideLabelDark: { marginTop: 8, fontSize: 10, fontWeight: '800', letterSpacing: 1.3, color: '#B9E37D' },
  slideTitleDark: { fontSize: 34, lineHeight: 35, fontWeight: '900', color: '#F3F5E9', marginTop: 14, letterSpacing: -1 },
  carouselFinance: { marginTop: 55, padding: 16, backgroundColor: '#B9E37D', gap: 17 },
  financeLabel: { fontSize: 10, fontWeight: '800', color: '#315B21', letterSpacing: .8 },
  financeValue: { fontSize: 18, fontWeight: '900', color: '#17251A', marginTop: 4 },
  privateMessage: { marginTop: 80, fontSize: 19, fontWeight: '800', color: '#B9E37D' },
  slideQuoteDark: { position: 'absolute', bottom: 25, left: 24, right: 24, fontSize: 14, lineHeight: 19, fontWeight: '800', color: '#B9E37D' },
  pagination: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12, marginBottom: 2 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  pdfButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 16, paddingVertical: 14, marginTop: 10 },
  pdfButtonText: { fontSize: 14, fontWeight: '700' },
  optionRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, padding: 14, marginTop: 16 },
  optionIcon: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 11 },
  optionCopy: { flex: 1 },
  optionTitle: { fontSize: 14, fontWeight: '700' },
  optionSubtitle: { fontSize: 12, marginTop: 3 },
  shareButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, borderRadius: 16, paddingVertical: 16, marginTop: 16, shadowOpacity: 0.22, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  shareText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
