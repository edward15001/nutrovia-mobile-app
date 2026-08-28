import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getPlan, NutritionPlan } from '@/lib/plan';
import { Spacing } from '@/constants/theme';
import { Icon } from '@/components/icon';

const GOLD = '#C9A84C';
const DARK = '#0D0D0D';
const MUTED = '#888880';

const EQ_LABELS: Record<string, string> = { casa: 'En casa', gimnasio: 'Gimnasio', mixto: 'Mixto' };

export default function TrainingScreen() {
  const [plan, setPlan] = useState<NutritionPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          setPlan(await getPlan());
        } catch {
          // sin plan
        } finally {
          setLoading(false);
        }
      })();
    }, [])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={GOLD} />
      </SafeAreaView>
    );
  }

  const tp = plan?.training_plan;

  if (!tp) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.emptyText}>Genera tu plan para ver tu entrenamiento</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <Icon name="barbell" size={20} />
          <Text style={styles.title}>Mi Entrenamiento</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Tu rutina</Text>
          <Text style={styles.routineTitle}>
            {tp.objetivo.replace('_', ' ')} — Nivel {tp.nivel}
          </Text>
          <Text style={styles.meta}>
            {tp.dias_semana} días/semana · {EQ_LABELS[tp.equipamiento] || tp.equipamiento}
          </Text>
        </View>

        {tp.sesiones.map((s, i) => (
          <View key={i} style={styles.card}>
            <View style={styles.sessionHeader}>
              <Text style={styles.sessionDay}>{s.dia}</Text>
              <Text style={styles.sessionType}>{s.tipo}</Text>
            </View>
            {s.ejercicios.map((e, j) => (
              <Text key={j} style={styles.exercise}>
                • {e}
              </Text>
            ))}
          </View>
        ))}

        {tp.progresion?.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>📈 Progresión</Text>
            {tp.progresion.map((p, i) => (
              <Text key={i} style={styles.tip}>
                {p}
              </Text>
            ))}
          </View>
        )}

        {tp.notas?.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>📌 Notas</Text>
            {tp.notas.map((n, i) => (
              <Text key={i} style={styles.tip}>
                {n}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: DARK },
  center: { flex: 1, backgroundColor: DARK, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  scroll: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: '#fff', fontSize: 22, fontWeight: '800' },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  cardLabel: { color: GOLD, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.two },
  routineTitle: { color: '#fff', fontSize: 16, fontWeight: '700', textTransform: 'capitalize' },
  meta: { color: MUTED, fontSize: 13, marginTop: Spacing.one },
  sessionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.two },
  sessionDay: {
    backgroundColor: GOLD,
    color: DARK,
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sessionType: { color: '#fff', fontSize: 14, fontWeight: '700', flex: 1 },
  exercise: { color: MUTED, fontSize: 13, lineHeight: 20 },
  tip: { color: MUTED, fontSize: 13, lineHeight: 19, marginBottom: Spacing.one },
  emptyText: { color: MUTED, fontSize: 14, textAlign: 'center' },
});
