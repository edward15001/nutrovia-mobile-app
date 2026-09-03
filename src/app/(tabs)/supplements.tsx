import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getPlan, isPro, NutritionPlan } from '@/lib/plan';
import { Spacing } from '@/constants/theme';
import { Border, Font, NV, Radius } from '@/constants/nutrovia';
import { Icon, IconName } from '@/components/icon';

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
        <ActivityIndicator size="large" color={NV.malva} />
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
              style={({ pressed }) => [styles.lockBtn, pressed && styles.lockBtnPressed]}
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
  safeArea: { flex: 1, backgroundColor: NV.papel },
  center: { flex: 1, backgroundColor: NV.papel, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: NV.tinta, fontFamily: Font.bold, fontSize: 22, fontWeight: '800' },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: NV.ambar100,
    borderColor: NV.ambar,
    borderWidth: Border.structural,
    borderRadius: Radius.none,
    padding: Spacing.three,
  },
  disclaimerText: { color: NV.textoSuave, fontFamily: Font.regular, fontSize: 13, lineHeight: 19, flex: 1 },
  card: {
    backgroundColor: NV.papelAlt,
    borderRadius: Radius.none,
    padding: Spacing.three,
    borderWidth: Border.structural,
    borderColor: NV.tinta,
  },
  row: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
  info: { flex: 1, gap: Spacing.one },
  name: { color: NV.tinta, fontFamily: Font.bold, fontSize: 15, fontWeight: '700' },
  dosis: { color: NV.malva700, fontFamily: Font.medium, fontSize: 13 },
  motivo: { color: NV.textoSuave, fontFamily: Font.regular, fontSize: 13, lineHeight: 19 },
  emptyText: { color: NV.textoSuave, fontFamily: Font.regular, fontSize: 14 },
  lockBox: {
    backgroundColor: NV.malva100,
    borderColor: NV.malva,
    borderWidth: Border.structural,
    borderRadius: Radius.none,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
  },
  lockTitle: { color: NV.tinta, fontFamily: Font.bold, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  lockText: { color: NV.textoSuave, fontFamily: Font.regular, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  lockBtn: { backgroundColor: NV.savia, borderRadius: Radius.none, paddingHorizontal: Spacing.four, paddingVertical: 12, marginTop: Spacing.two },
  lockBtnPressed: { backgroundColor: NV.savia700 },
  lockBtnText: { color: NV.papel, fontFamily: Font.bold, fontSize: 14, fontWeight: '800' },
});
