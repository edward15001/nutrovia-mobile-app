import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getPlan, isPro, NutritionPlan } from '@/lib/plan';
import { Spacing } from '@/constants/theme';
import { Icon } from '@/components/icon';

const GOLD = '#C9A84C';
const DARK = '#0D0D0D';
const MUTED = '#888880';
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const MEALS = [
  { key: 'desayuno', label: '🌅 Desayuno' },
  { key: 'almuerzo', label: '☕ Almuerzo' },
  { key: 'comida', label: '🍽️ Comida' },
  { key: 'merienda', label: '🍎 Merienda' },
  { key: 'cena', label: '🌙 Cena' },
] as const;

export default function NutritionScreen() {
  const [plan, setPlan] = useState<NutritionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [day, setDay] = useState('Lunes');

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

  const menu = plan?.weekly_menu?.[day];
  const pro = isPro(plan);
  // En modo free el backend envía solo { _kcal } por día (sin las comidas):
  // mostramos las kcal y bloqueamos el detalle con un CTA a Pro.
  const dimmed = menu && typeof (menu as any)._kcal === 'number';
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <Icon name="restaurant" size={20} />
          <Text style={styles.title}>Mi Nutrición</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayTabs}>
          {DAYS.map(d => (
            <Pressable
              key={d}
              onPress={() => setDay(d)}
              style={[styles.dayTab, day === d && styles.dayTabActive]}>
              <Text style={[styles.dayTabText, day === d && styles.dayTabTextActive]}>
                {d.slice(0, 3)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {plan?.notas_dieta?.length ? (
          <View style={styles.notesBox}>
            {plan.notas_dieta.map((n, i) => (
              <Text key={i} style={styles.note}>
                {n}
              </Text>
            ))}
          </View>
        ) : null}

        {!menu ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No hay menú disponible para este día.</Text>
          </View>
        ) : dimmed ? (
          // Plan FREE ("a oscuras"): solo kcal del día, comidas bloqueadas
          <View style={styles.lockBox}>
            <Icon name="lock-closed" size={26} />
            <Text style={styles.lockTitle}>Nutrición detallada solo en Pro</Text>
            <Text style={styles.lockText}>
              El día {day} suma {(menu as any)._kcal} kcal. El detalle de comidas está en el plan Pro.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.lockBtn, pressed && { opacity: 0.85 }]}
              onPress={() => router.push('/subscription')}>
              <Text style={styles.lockBtnText}>Subir a Pro →</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={styles.dayTitle}>
              {day} — {plan?.daily_calories} kcal totales
            </Text>
            {MEALS.map(({ key, label }) => {
              const meal = (menu as any)[key];
              if (!meal) return null;
              return (
                <View key={key} style={styles.mealCard}>
                  <View style={styles.mealHeader}>
                    <Text style={styles.mealLabel}>{label}</Text>
                    <Text style={styles.mealCalories}>{meal.calorias} kcal</Text>
                  </View>
                  <Text style={styles.mealName}>{meal.nombre}</Text>
                  <Text style={styles.mealIngredients}>
                    {Array.isArray(meal.ingredientes) ? meal.ingredientes.join(' · ') : ''}
                  </Text>
                </View>
              );
            })}
          </>
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
  dayTabs: { flexGrow: 0 },
  dayTab: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 8,
    backgroundColor: '#1A1A1A',
    marginRight: Spacing.two,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  dayTabActive: { backgroundColor: GOLD, borderColor: GOLD },
  dayTabText: { color: MUTED, fontWeight: '600', fontSize: 13 },
  dayTabTextActive: { color: DARK },
  notesBox: {
    backgroundColor: 'rgba(201,168,76,0.08)',
    borderColor: 'rgba(201,168,76,0.35)',
    borderWidth: 1,
    borderRadius: 10,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  note: { color: MUTED, fontSize: 13, lineHeight: 19 },
  dayTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: Spacing.one },
  mealCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mealLabel: { color: GOLD, fontSize: 13, fontWeight: '700' },
  mealCalories: { color: '#fff', fontSize: 13, fontWeight: '600' },
  mealName: { color: '#fff', fontSize: 15, fontWeight: '700', marginTop: Spacing.two },
  mealIngredients: { color: MUTED, fontSize: 12, marginTop: Spacing.one, lineHeight: 18 },
  empty: { padding: Spacing.four, alignItems: 'center' },
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
