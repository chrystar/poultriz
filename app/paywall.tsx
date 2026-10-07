import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';

type PlanKey = '3_month' | 'yearly';

const FEATURES = [
  'Unlimited batch types — broilers and layers',
  'Expenses and sales tracked per batch',
  'Feed Log, Egg Log and the feed calculator',
  'Daily records, mortality and profit insights',
  'PDF export and sharing',
];

const PLANS: {
  key: PlanKey;
  label: string;
  price: string;
  perBatch: string;
  quota: number;
  badge?: string;
}[] = [
  { key: '3_month', label: '3 Months', price: '₦5,000', perBatch: 'Up to 10 new batches', quota: 10 },
  { key: 'yearly', label: 'Yearly', price: '₦20,000', perBatch: 'Up to 40 new batches', quota: 40, badge: 'Pay once a year' },
];

export default function PaywallScreen() {
  const { theme } = useTheme();
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);
  const [selected, setSelected] = useState<PlanKey>('yearly');
  const [userLimits, setUserLimits] = useState<any>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadUserLimits();
    }, [])
  );

  async function loadUserLimits() {
    setLoadingStatus(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from('user_limits')
      .select('*')
      .eq('user_id', user?.id)
      .single();
    setUserLimits(data);
    setLoadingStatus(false);
  }

  async function handleSubscribe(plan: PlanKey) {
    setLoadingPlan(plan);
    try {
      const { data, error } = await supabase.functions.invoke('init-payment', {
        body: { plan },
      });

      if (error || !data?.authorization_url) {
        Alert.alert('Error', error?.message ?? 'Could not start payment. Please try again.');
        setLoadingPlan(null);
        return;
      }

      await WebBrowser.openBrowserAsync(data.authorization_url);

      setLoadingPlan(null);
      Alert.alert(
        'Payment window closed',
        "If your payment went through, you're all set. If not, you can try again.",
        [{ text: 'OK', onPress: () => loadUserLimits() }]
      );
    } catch (err: any) {
      setLoadingPlan(null);
      Alert.alert('Error', err?.message ?? 'Something went wrong.');
    }
  }

  if (loadingStatus) {
    return (
      <SafeAreaView style={[styles.container, styles.centerFill, { backgroundColor: theme.background }]} edges={['top']}>
        <ActivityIndicator color={theme.accentDark} />
      </SafeAreaView>
    );
  }

  const hasActiveWindow = userLimits?.plan && new Date(userLimits.access_until) > new Date();
  const hasExpiredPlan = userLimits?.plan && !hasActiveWindow;
  const hasUsedFreeBatch = (userLimits?.batches_created_count ?? 0) >= 1;
  const batchesLeft = userLimits ? Math.max(0, userLimits.batch_quota - userLimits.batches_created_count) : 0;
  const batchesUsedOfQuota = userLimits ? Math.min(userLimits.batches_created_count, userLimits.batch_quota) : 0;
  const progressPct = userLimits && userLimits.batch_quota > 0 ? (batchesUsedOfQuota / userLimits.batch_quota) * 100 : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {hasActiveWindow ? 'Your Plan' : 'Upgrade'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {hasActiveWindow ? (
          <>
            {/* ACTIVE SUBSCRIBER VIEW */}
            <View style={[styles.statusCard, { backgroundColor: theme.cardBackgroundAlt }]}>
              <View style={styles.statusTopRow}>
                <View>
                  <Text style={[styles.statusPlanName, { color: theme.text }]}>
                    {userLimits.plan === 'yearly' ? 'Yearly Plan' : '3-Month Plan'}
                  </Text>
                  <View style={styles.statusBadgeRow}>
                    <View style={[styles.statusDot, { backgroundColor: theme.accentDark }]} />
                    <Text style={[styles.statusBadgeText, { color: theme.accentDark }]}>Active</Text>
                  </View>
                </View>
                <View style={[styles.statusIconCircle, { backgroundColor: theme.accentDark + '18' }]}>
                  <Ionicons name="shield-checkmark" size={22} color={theme.accentDark} />
                </View>
              </View>

              <View style={styles.progressSection}>
                <View style={styles.progressLabelRow}>
                  <Text style={[styles.progressLabel, { color: theme.textMuted }]}>Batches used</Text>
                  <Text style={[styles.progressValue, { color: theme.text }]}>
                    {batchesUsedOfQuota} of {userLimits.batch_quota}
                  </Text>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
                  <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: theme.accentDark }]} />
                </View>
              </View>

              <View style={[styles.statusDivider, { backgroundColor: theme.border }]} />

              <View style={styles.statusRow}>
                <Ionicons name="calendar-outline" size={16} color={theme.textMuted} />
                <Text style={[styles.statusRowText, { color: theme.textMuted }]}>
                  Expires {new Date(userLimits.access_until).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
              </View>
              <View style={styles.statusRow}>
                <Ionicons name="layers-outline" size={16} color={theme.textMuted} />
                <Text style={[styles.statusRowText, { color: theme.textMuted }]}>
                  {batchesLeft} new batch{batchesLeft === 1 ? '' : 'es'} remaining
                </Text>
              </View>
            </View>

            <Text style={[styles.topUpTitle, { color: theme.text }]}>Need more room?</Text>
            <Text style={[styles.topUpSubtitle, { color: theme.textMuted }]}>
              Buying a plan adds extra batches on top of what you have, and resets your expiry date.
            </Text>

            {PLANS.map((plan) => (
              <View key={plan.key} style={[styles.topUpRow, { backgroundColor: theme.cardBackground }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.topUpLabel, { color: theme.text }]}>{plan.label}</Text>
                  <Text style={[styles.topUpSub, { color: theme.textMuted }]}>{plan.perBatch}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.topUpButton, { backgroundColor: theme.accentDark }]}
                  onPress={() => handleSubscribe(plan.key)}
                  disabled={loadingPlan !== null}
                >
                  {loadingPlan === plan.key ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.topUpButtonText}>{plan.price}</Text>
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </>
        ) : (
          <>
            {/* FREE / EXPIRED — PURCHASE VIEW */}
            <View style={[styles.iconBadge, { backgroundColor: theme.accentDark }]}>
              <Ionicons name="leaf" size={26} color="#fff" />
            </View>

            {hasExpiredPlan && (
              <View style={[styles.expiredBanner, { backgroundColor: theme.danger + '18' }]}>
                <Ionicons name="alert-circle" size={16} color={theme.danger} />
                <Text style={[styles.expiredBannerText, { color: theme.danger }]}>
                  Your plan expired on {new Date(userLimits.access_until).toLocaleDateString()}
                </Text>
              </View>
            )}

            <Text style={[styles.title, { color: theme.text }]}>
              {hasExpiredPlan ? 'Renew to keep going' : 'Keep your farm on record'}
            </Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              {hasExpiredPlan
                ? "Your batches are safe and still viewable. Renew to start new ones again."
                : hasUsedFreeBatch
                ? "You've used your one free batch. Pick a plan to keep adding new batches — everything you've already recorded stays accessible either way."
                : 'Your first batch is free. Pick a plan any time to go beyond that.'}
            </Text>

            <View style={styles.planRow}>
              {PLANS.map((plan) => {
                const isSelected = selected === plan.key;
                return (
                  <TouchableOpacity
                    key={plan.key}
                    activeOpacity={0.85}
                    onPress={() => setSelected(plan.key)}
                    style={[
                      styles.planCard,
                      { backgroundColor: theme.cardBackgroundAlt, borderColor: 'transparent' },
                      isSelected && { borderColor: theme.accentDark, backgroundColor: theme.accentDark + '14' },
                    ]}
                  >
                    {plan.badge && (
                      <View style={[styles.badge, { backgroundColor: theme.accentDark }]}>
                        <Text style={styles.badgeText}>{plan.badge}</Text>
                      </View>
                    )}
                    <Text style={[styles.planLabel, { color: theme.text }]}>{plan.label}</Text>
                    <Text style={[styles.planPrice, { color: theme.text }]}>{plan.price}</Text>
                    <Text style={[styles.planSub, { color: theme.textMuted }]}>{plan.perBatch}</Text>

                    <View style={[styles.radioOuter, { borderColor: isSelected ? theme.accentDark : theme.border }]}>
                      {isSelected && <View style={[styles.radioInner, { backgroundColor: theme.accentDark }]} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.featureList}>
              {FEATURES.map((f) => (
                <View key={f} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={18} color={theme.accentDark} />
                  <Text style={[styles.featureText, { color: theme.text }]}>{f}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {!hasActiveWindow && (
        <View style={[styles.footer, { borderTopColor: theme.border, backgroundColor: theme.background }]}>
          <TouchableOpacity
            style={[styles.subscribeButton, { backgroundColor: theme.accentDark }]}
            onPress={() => handleSubscribe(selected)}
            disabled={loadingPlan !== null}
          >
            {loadingPlan === selected ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.subscribeText}>
                {hasExpiredPlan ? 'Renew' : 'Subscribe'} — {PLANS.find((p) => p.key === selected)?.price}
              </Text>
            )}
          </TouchableOpacity>
          <Text style={[styles.footerNote, { color: theme.textFaint }]}>
            One-time payment, not auto-renewing. Secured by Paystack.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerFill: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 24, alignItems: 'center' },

  statusCard: { width: '100%', borderRadius: 20, padding: 20, marginTop: 12 },
  statusTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  statusPlanName: { fontSize: 19, fontWeight: '800' },
  statusBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  statusBadgeText: { fontSize: 12.5, fontWeight: '700' },
  statusIconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  progressSection: { marginTop: 20 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 12.5 },
  progressValue: { fontSize: 12.5, fontWeight: '700' },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  statusDivider: { height: 1, marginVertical: 18 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  statusRowText: { fontSize: 13 },

  topUpTitle: { fontSize: 17, fontWeight: '800', marginTop: 28, alignSelf: 'flex-start' },
  topUpSubtitle: { fontSize: 13, lineHeight: 18, marginTop: 6, marginBottom: 16, alignSelf: 'flex-start' },
  topUpRow: { flexDirection: 'row', alignItems: 'center', width: '100%', borderRadius: 14, padding: 14, marginBottom: 10 },
  topUpLabel: { fontSize: 14.5, fontWeight: '700' },
  topUpSub: { fontSize: 12, marginTop: 2 },
  topUpButton: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, minWidth: 84, alignItems: 'center' },
  topUpButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  iconBadge: {
    width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center',
    marginTop: 8, marginBottom: 18,
  },
  expiredBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 14, marginBottom: 16, width: '100%',
  },
  expiredBannerText: { fontSize: 12.5, fontWeight: '600', flex: 1 },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginTop: 8, marginBottom: 28, maxWidth: 320 },
  planRow: { flexDirection: 'row', gap: 12, width: '100%' },
  planCard: {
    flex: 1, borderRadius: 16, borderWidth: 2, padding: 16, position: 'relative',
  },
  badge: {
    position: 'absolute', top: -10, left: 12, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  planLabel: { fontSize: 14, fontWeight: '600', marginTop: 4 },
  planPrice: { fontSize: 22, fontWeight: '800', marginTop: 6 },
  planSub: { fontSize: 12, marginTop: 4, lineHeight: 16 },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center',
    marginTop: 14, alignSelf: 'flex-end',
  },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  featureList: { width: '100%', marginTop: 28, gap: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontSize: 13.5, flex: 1 },
  footer: { borderTopWidth: 1, padding: 16, paddingBottom: 24 },
  subscribeButton: { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  subscribeText: { color: '#fff', fontWeight: '700', fontSize: 15.5 },
  footerNote: { fontSize: 11.5, textAlign: 'center', marginTop: 10 },
});