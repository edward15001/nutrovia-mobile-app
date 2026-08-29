import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getPlan, isPro, NutritionPlan } from '@/lib/plan';
import { Spacing } from '@/constants/theme';
import { Icon, IconName } from '@/components/icon';

const GOLD = '#C9A84C';
const DARK = '#0D0D0D';
const MUTED = '#888880';

const ICONS: IconName[] = ['medkit', 'leaf', 'flash', 'water', 'medkit', 'leaf', 'flask'];

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
  const pro = isPro(plan);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <Icon name="flask" size={20} />
          <Text style={styles.title}>Suplementación</Text>
        </View>

        <View style={styles.disclaimer}>
          <Icon name="warning" size={16} />
          <Text style={styles.disclaimerText}>
            Las recomendaciones son orientativas. Consulta siempre con un profesional de la salud.
          </Text>
        </View>

        {!pro ? (
          // La suplementación es exclusiva de Pro
          <View style={styles.lockBox}>
            <Icon name="lock-closed" size={26} />
            <Text style={styles.lockTitle}>Suplementación solo en Pro</Text>
            <Text style={styles.lockText}>
              Descubre qué suplementos encajan con tu plan actualizando a Pro.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.lockBtn, pressed && { opacity: 0.85 }]}
              onPress={() => router.push('/subscription')}>
              <Text style={styles.lockBtnText}>Subir a Pro →</Text>
            </Pressable>
          </View>
        ) : supps.length === 0 ? (
          <Text style={styles.emptyText}>No hay suplementos en tu plan.</Text>
        ) : (
          supps.map((s, i) => (
            <View key={i} style={styles.card}>
              <View style={styles.row}>
                <Icon name={ICONS[i % ICONS.length]} size={24} />
                <View style={styles.info}>
                  <Text style={styles.name}>{s.nombre}</Text>
                  <Text style={styles.dosis}>{s.dosis}</Text>
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
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: '#fff', fontSize: 22, fontWeight: '800' },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(201,168,76,0.06)',
    borderColor: 'rgba(201,168,76,0.35)',
    borderWidth: 1,
    borderRadius: 10,
    padding: Spacing.three,
  },
  disclaimerText: { color: MUTED, fontSize: 13, lineHeight: 19, flex: 1 },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  row: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
  info: { flex: 1, gap: Spacing.one },
  name: { color: '#fff', fontSize: 15, fontWeight: '700' },
  dosis: { color: GOLD, fontSize: 13 },
  motivo: { color: MUTED, fontSize: 13, lineHeight: 19 },
  emptyText: { color: MUTED, fontSize: 14 },
  lockBox: {
    backgroundColor: 'rgba(201,168,76,0.08)',
    borderColor: 'rgba(201,168,76,0.35)',
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
  },
  lockTitle: { color: '#fff', fontSize: 17, fontWeight: '800', textAlign: 'center' },
  lockText: { color: MUTED, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  lockBtn: { backgroundColor: GOLD, borderRadius: 10, paddingHorizontal: Spacing.four, paddingVertical: 12, marginTop: Spacing.two },
  lockBtnText: { color: DARK, fontSize: 14, fontWeight: '800' },
});
