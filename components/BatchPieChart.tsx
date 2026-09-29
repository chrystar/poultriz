import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';

type Props = {
  active: number;
  planned: number;
  completed: number;
};

const SIZE = 160;
const STROKE_WIDTH = 28;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function BatchPieChart({ active, planned, completed }: Props) {
  const { theme } = useTheme();
  const total = active + planned + completed;

  const segments = [
    { label: 'Active', value: active, color: theme.accentDark },
    { label: 'Planned', value: planned, color: '#FF9800' },
    { label: 'Completed', value: completed, color: '#9E9E9E' },
  ];

  let cumulativeOffset = 0;

  return (
    <View style={[styles.card, { backgroundColor: theme.cardBackgroundAlt }]}>
      <Text style={[styles.title, { color: theme.text }]}>Batch Distribution</Text>

      {total === 0 ? (
        <Text style={[styles.emptyText, { color: theme.textFaint }]}>No batches yet.</Text>
      ) : (
        <View style={styles.row}>
          <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              stroke={theme.border}
              strokeWidth={STROKE_WIDTH}
              fill="none"
            />
            {segments.map((seg, i) => {
              if (seg.value === 0) return null;
              const fraction = seg.value / total;
              const dashLength = fraction * CIRCUMFERENCE;
              const dashArray = `${dashLength} ${CIRCUMFERENCE - dashLength}`;
              const rotation = (cumulativeOffset / total) * 360 - 90;
              cumulativeOffset += seg.value;

              return (
                <Circle
                  key={i}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  stroke={seg.color}
                  strokeWidth={STROKE_WIDTH}
                  strokeDasharray={dashArray}
                  strokeLinecap="butt"
                  fill="none"
                  rotation={rotation}
                  origin={`${SIZE / 2}, ${SIZE / 2}`}
                />
              );
            })}
          </Svg>

          <View style={styles.legend}>
            {segments.map((seg, i) => (
              <View key={i} style={styles.legendRow}>
                <View style={[styles.dot, { backgroundColor: seg.color }]} />
                <Text style={[styles.legendLabel, { color: theme.text }]}>{seg.label}</Text>
                <Text style={[styles.legendValue, { color: theme.textMuted }]}>{seg.value}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, marginTop: 16 },
  title: { fontSize: 15, fontWeight: '700', marginBottom: 16 },
  emptyText: { textAlign: 'center', paddingVertical: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  legend: { flex: 1, gap: 10 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { flex: 1, fontSize: 14, fontWeight: '500' },
  legendValue: { fontSize: 14, fontWeight: '700' },
});