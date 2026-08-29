import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getPlan, isPro, NutritionPlan, DayMenu, Meal, swapMeal } from '@/lib/plan';
import { Spacing } from '@/constants/theme';
import { Icon } from '@/components/icon';

const GOLD = '#C9A84C';
const DARK = '#0D0D0D';
const MUTED = '#888880';
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const MEALS = [
  { key: 'desayuno', label: 'Desayuno', icon: 'sunny' },
  { key: 'almuerzo', label: 'Almuerzo', icon: 'cafe' },
  { key: 'comida', label: 'Comida', icon: 'restaurant' },
  { key: 'merienda', label: 'Merienda', icon: 'nutrition' },
  { key: 'cena', label: 'Cena', icon: 'moon' },
] as const;

type MealKey = (typeof MEALS)[number]['key'];

// Copia profunda simple (el menú es JSON puro)
function cloneMenu(menu: Record<string, DayMenu>): Record<string, DayMenu> {
  return JSON.parse(JSON.stringify(menu));
}

export default function NutritionScreen() {
  const [plan, setPlan] = useState<NutritionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [day, setDay] = useState(DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1] || 'Lunes');
  const [menu, setMenu] = useState<Record<string, DayMenu> | null>(null);
  const [original, setOriginal] = useState<Record<string, DayMenu> | null>(null);
  const [openMeal, setOpenMeal] = useState<MealKey | null>(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const p = await getPlan();
          setPlan(p);
          if (p?.weekly_menu) {
            setMenu(cloneMenu(p.weekly_menu));
            setOriginal(cloneMenu(p.weekly_menu));
          }
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

  const pro = isPro(plan);
  const dayMenu = menu?.[day] as any;

  // En modo free el backend envía solo { _kcal } por día (sin las comidas)
  const dimmed = dayMenu && typeof dayMenu._kcal === 'number';

  // Comidas del día con kcal (para el header)
  const dayKcal = dayMenu
    ? MEALS.reduce((acc, m) => acc + (Number(dayMenu[m.key]?.calorias) || 0), 0)
    : 0;
  const origKcal = original?.[day]
    ? MEALS.reduce((acc, m) => acc + (Number((original[day] as any)[m.key]?.calorias) || 0), 0)
    : 0;
  const kcalDiff = dayKcal - origKcal;
  const daySwapped = MEALS.some(m => isMealSwapped(day, m.key));

  function isMealSwapped(d: string, key: MealKey): boolean {
    if (!menu || !original) return false;
    const cur = (menu[d] as any)?.[key];
    const orig = (original[d] as any)?.[key];
    if (!cur || !orig) return false;
    return cur.nombre !== orig.nombre || Number(cur.calorias) !== Number(orig.calorias);
  }

  async function applySwap(key: MealKey, sourceDay: string | null) {
    if (!menu || !original || !dayMenu) return;
    const replacement = sourceDay
      ? (menu[sourceDay] as any)?.[key]
      : (original[day] as any)?.[key];
    if (!replacement) return;

    // Optimista: aplica el cambio en local al momento
    const next = cloneMenu(menu);
    next[day][key] = JSON.parse(JSON.stringify(replacement));
    setMenu(next);
    setOpenMeal(null);

    try {
      const updated = await swapMeal(day, key, {
        nombre: replacement.nombre,
        calorias: Number(replacement.calorias),
        ingredientes: Array.isArray(replacement.ingredientes) ? replacement.ingredientes : [],
      });
      setMenu(updated);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo guardar el cambio.');
      // Revertir a lo persistido
      setMenu(cloneMenu(menu));
    }
  }

  async function restoreDay() {
    if (!menu || !original || !dayMenu) return;
    const changed = MEALS.filter(m => isMealSwapped(day, m.key));
    for (const { key } of changed) {
      await applySwap(key, null);
    }
    setOpenMeal(null);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <Icon name="restaurant" size={20} />
          <Text style={styles.title}>Mi Nutrición</Text>
        </View>

        {/* Selector de día */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayTabs}>
          {DAYS.map(d => (
            <Pressable
              key={d}
              onPress={() => { setDay(d); setOpenMeal(null); }}
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

        {!dayMenu ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No hay menú disponible para este día.</Text>
          </View>
        ) : dimmed ? (
          // Plan FREE ("a oscuras"): solo kcal del día, comidas bloqueadas
          <View style={styles.lockBox}>
            <Icon name="lock-closed" size={26} />
            <Text style={styles.lockTitle}>Nutrición detallada solo en Pro</Text>
            <Text style={styles.lockText}>
              El día {day} suma {dayMenu._kcal} kcal. El detalle de comidas está en el plan Pro.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.lockBtn, pressed && { opacity: 0.85 }]}
              onPress={() => router.push('/subscription')}>
              <Text style={styles.lockBtnText}>Subir a Pro →</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Cabecera del día */}
            <View style={styles.dayHead}>
              <View style={styles.dayHeadInfo}>
                <View style={styles.dayTitleRow}>
                  <Text style={styles.dayTitle}>{day}</Text>
                  {daySwapped && (
                    <Text style={styles.modifiedBadge}>
                      <Icon name="refresh" size={10} /> Modificado
                    </Text>
                  )}
                </View>
                <Text style={styles.dayKcal}>
                  {dayKcal.toLocaleString('es-ES')} kcal
                  {kcalDiff !== 0 ? (
                    <Text style={kcalDiff > 0 ? styles.diffUp : styles.diffDown}>
                      {' '}
                      {kcalDiff > 0 ? '+' : ''}
                      {kcalDiff} kcal
                    </Text>
                  ) : null}
                </Text>
                <Text style={styles.dayHint}>
                  <Icon name="refresh" size={11} /> Pulsa «Cambiar» en una comida para elegir otra opción de la semana.
                </Text>
              </View>
              {daySwapped && (
                <Pressable
                  style={({ pressed }) => [styles.restoreBtn, pressed && { opacity: 0.85 }]}
                  onPress={restoreDay}>
                  <Icon name="rotate-left" size={13} />
                  <Text style={styles.restoreText}>Restaurar día</Text>
                </Pressable>
              )}
            </View>

            {/* Comidas del día */}
            {MEALS.map(m => {
              const meal = (dayMenu as any)[m.key] as Meal | undefined;
              if (!meal) return null;
              const open = openMeal === m.key;
              const mealSwapped = isMealSwapped(day, m.key);
              const opts = DAYS
                .filter(o => o !== day && (menu as any)?.[o]?.[m.key])
                .map(o => ({ day: o, meal: (menu as any)[o][m.key] as Meal }));

              return (
                <View key={m.key} style={[styles.mealCard, open && styles.mealCardOpen, mealSwapped && styles.mealCardChanged]}>
                  <View style={styles.mealRow}>
                    <View style={styles.mealIconWrap}>
                      <Icon name="nutrition" size={15} />
                    </View>
                    <View style={styles.mealInfo}>
                      <Text style={styles.mealName} numberOfLines={2}>{meal.nombre}</Text>
                      <Text style={styles.mealKcal}>{meal.calorias} kcal</Text>
                      {Array.isArray(meal.ingredientes) && meal.ingredientes.length > 0 && (
                        <Text style={styles.mealIng} numberOfLines={2}>
                          {meal.ingredientes.join(' · ')}
                        </Text>
                      )}
                      {mealSwapped && (
                        <Text style={styles.changedBadge}>
                          <Icon name="refresh" size={10} /> Modificado
                        </Text>
                      )}
                    </View>
                    <Pressable
                      style={({ pressed }) => [styles.swapBtn, pressed && { opacity: 0.85 }]}
                      onPress={() => setOpenMeal(open ? null : m.key)}>
                      <Icon name="refresh" size={12} />
                      <Text style={styles.swapBtnText}>Cambiar</Text>
                    </Pressable>
                  </View>

                  {open && (
                    <View style={styles.optionsBox}>
                      <Text style={styles.optionsTitle}>
                        Elige otra opción para el {m.label.toLowerCase()}:
                      </Text>
                      {opts.map(o => (
                        <Pressable
                          key={o.day}
                          style={({ pressed }) => [styles.optBtn, pressed && { opacity: 0.85 }]}
                          onPress={() => applySwap(m.key, o.day)}>
                          <Text style={styles.optName} numberOfLines={1}>{o.meal.nombre}</Text>
                          <Text style={styles.optMeta}>
                            {o.day.slice(0, 3)} · {o.meal.calorias} kcal
                          </Text>
                        </Pressable>
                      ))}
                      {mealSwapped && (
                        <Pressable
                          style={({ pressed }) => [styles.optBtn, styles.optOriginal, pressed && { opacity: 0.85 }]}
                          onPress={() => applySwap(m.key, null)}>
                          <Text style={[styles.optName, styles.optOriginalText]}>
                            <Icon name="rotate-left" size={12} /> Volver a la original
                          </Text>
                          <Text style={styles.optMeta}>
                            {(original as any)?.[day]?.[m.key]?.nombre || ''}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  )}
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

  dayHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  dayHeadInfo: { flex: 1, gap: Spacing.one },
  dayTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  dayTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  modifiedBadge: {
    color: GOLD,
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: 'rgba(201,168,76,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 3,
  },
  dayKcal: { color: '#fff', fontSize: 14, fontWeight: '600' },
  diffUp: { color: '#E8D9A0', fontSize: 12 },
  diffDown: { color: '#7BC47F', fontSize: 12 },
  dayHint: { color: MUTED, fontSize: 11, lineHeight: 16, flexDirection: 'row', alignItems: 'center' as const, gap: 4 },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: GOLD,
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    paddingVertical: 7,
  },
  restoreText: { color: GOLD, fontSize: 12, fontWeight: '700' },

  mealCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  mealCardOpen: { borderColor: 'rgba(201,168,76,0.5)' },
  mealCardChanged: { borderColor: 'rgba(201,168,76,0.45)' },
  mealRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  mealIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(201,168,76,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealInfo: { flex: 1, gap: 2 },
  mealName: { color: '#fff', fontSize: 14, fontWeight: '700' },
  mealKcal: { color: GOLD, fontSize: 12, fontWeight: '600' },
  mealIng: { color: MUTED, fontSize: 11, lineHeight: 16 },
  changedBadge: { color: GOLD, fontSize: 11, fontWeight: '700', marginTop: 2, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 3 },
  swapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.5)',
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    paddingVertical: 7,
  },
  swapBtnText: { color: GOLD, fontSize: 12, fontWeight: '700' },

  optionsBox: {
    marginTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  optionsTitle: { color: MUTED, fontSize: 12, marginBottom: Spacing.one },
  optBtn: {
    backgroundColor: '#242424',
    borderRadius: 10,
    padding: Spacing.two + 2,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    gap: 2,
  },
  optOriginal: { borderColor: 'rgba(201,168,76,0.4)', backgroundColor: 'rgba(201,168,76,0.06)' },
  optName: { color: '#fff', fontSize: 13, fontWeight: '600' },
  optOriginalText: { color: GOLD },
  optMeta: { color: MUTED, fontSize: 11 },

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
