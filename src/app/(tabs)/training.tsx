import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getPlan, NutritionPlan } from '@/lib/plan';
import { Spacing } from '@/constants/theme';
import { Border, Font, NV, Radius } from '@/constants/nutrovia';
import { Icon } from '@/components/icon';

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
        <ActivityIndicator size="large" color={NV.arcilla} />
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
            <View style={styles.cardLabelRow}><Icon name="trending-up" size={16} /><Text style={styles.cardLabel}>Progresión</Text></View>
            {tp.progresion.map((p, i) => (
              <Text key={i} style={styles.tip}>
                {p}
              </Text>
            ))}
          </View>
        )}

        {tp.notas?.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardLabelRow}><Icon name="document-text-outline" size={16} /><Text style={styles.cardLabel}>Notas</Text></View>
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
  safeArea: { flex: 1, backgroundColor: NV.papel },
  center: { flex: 1, backgroundColor: NV.papel, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  scroll: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: NV.tinta, fontFamily: Font.bold, fontSize: 22, fontWeight: '800' },
  card: {
    backgroundColor: NV.papelAlt,
    borderRadius: Radius.none,
    padding: Spacing.three,
    borderWidth: Border.structural,
    borderColor: NV.tinta,
  },
  cardLabel: { color: NV.arcilla700, fontFamily: Font.medium, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.two },
  cardLabelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, marginBottom: Spacing.two },
  routineTitle: { color: NV.tinta, fontFamily: Font.bold, fontSize: 16, fontWeight: '700', textTransform: 'capitalize' },
  meta: { color: NV.textoSuave, fontFamily: Font.regular, fontSize: 13, marginTop: Spacing.one },
  sessionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.two },
  sessionDay: {
    backgroundColor: NV.arcilla,
    color: NV.papel,
    fontFamily: Font.bold,
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: Radius.none,
  },
  sessionType: { color: NV.tinta, fontFamily: Font.medium, fontSize: 14, fontWeight: '700', flex: 1 },
  exercise: { color: NV.textoSuave, fontFamily: Font.regular, fontSize: 13, lineHeight: 20 },
  tip: { color: NV.textoSuave, fontFamily: Font.regular, fontSize: 13, lineHeight: 19, marginBottom: Spacing.one },
  emptyText: { color: NV.textoSuave, fontFamily: Font.regular, fontSize: 14, textAlign: 'center' },
});
