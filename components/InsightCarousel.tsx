import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export type Insight = {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  color: string;
};

export default function InsightCarousel({ insights }: { insights: Insight[] }) {
  const { theme } = useTheme();
  const [index, setIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (insights.length <= 1) return;

    const interval = setInterval(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => {
        setIndex((prev) => (prev + 1) % insights.length);
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [insights.length]);

  if (insights.length === 0) return null;

  const current = insights[index];

  return (
    <View style={[styles.card, { backgroundColor: theme.cardBackgroundAlt }]}>
      <Animated.View style={[styles.row, { opacity: fadeAnim }]}>
        <View style={[styles.iconCircle, { backgroundColor: current.color + '22' }]}>
          <Ionicons name={current.icon} size={20} color={current.color} />
        </View>
        <Text style={[styles.text, { color: theme.text }]}>{current.text}</Text>
      </Animated.View>

      <View style={styles.dotsRow}>
        {insights.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i === index ? theme.accentDark : theme.border },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 40 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  text: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 19 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});