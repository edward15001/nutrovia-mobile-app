import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getPlan, NutritionPlan } from '@/lib/plan';
import { Spacing } from '@/constants/theme';

const GOLD = '#C9A84C';
const DARK = '#0D0D0D';
const MUTED = '#888880';

const ICONS = ['💊', '🌿', '⚡', '🥤', '💉', '🌱', '🔬'];

export default function SupplementsScreen() {
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

  const supps = plan?.supplements || [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>💊 Suplementación</Text>

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            ⚠️ Las recomendaciones son orientativas. Consulta siempre con un profesional de la salud.
          </Text>
        </View>

        {supps.length === 0 ? (
          <Text style={styles.emptyText}>No hay suplementos en tu plan.</Text>
        ) : (
          supps.map((s, i) => (
            <View key={i} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.icon}>{ICONS[i % ICONS.length]}</Text>
                <View style={styles.info}>
                  <Text style={styles.name}>{s.nombre}</Text>
                  <Text style={styles.dosis}>📏 {s.dosis}</Text>
                  <Text style={styles.motivo}>{s.motivo}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: DARK },
  center: { flex: 1, backgroundColor: DARK, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  title: { color: '#fff', fontSize: 22, fontWeight: '800' },
  disclaimer: {
    backgroundColor: 'rgba(201,168,76,0.06)',
    borderColor: 'rgba(201,168,76,0.35)',
    borderWidth: 1,
    borderRadius: 10,
    padding: Spacing.three,
  },
  disclaimerText: { color: MUTED, fontSize: 13, lineHeight: 19 },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  row: { flexDirection: 'row', gap: Spacing.three },
  icon: { fontSize: 24 },
  info: { flex: 1, gap: Spacing.one },
  name: { color: '#fff', fontSize: 15, fontWeight: '700' },
  dosis: { color: GOLD, fontSize: 13 },
  motivo: { color: MUTED, fontSize: 13, lineHeight: 19 },
  emptyText: { color: MUTED, fontSize: 14 },
});
