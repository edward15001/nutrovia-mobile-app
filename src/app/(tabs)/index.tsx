import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getPlan, isPro, NutritionPlan } from '@/lib/plan';
import { getUser } from '@/lib/auth';
import { deleteFood, getTodaySummary, FoodDaySummary, FoodEntry } from '@/lib/foodlog';
import { getCheckinStatus, respondCheckin } from '@/lib/checkin';
import { Spacing } from '@/constants/theme';
import { Icon, IconName } from '@/components/icon';

const GOLD = '#C9A84C';
const DARK = '#0D0D0D';
const MUTED = '#888880';

const GOAL_LABELS: Record<string, string> = {
  perder_peso: 'Perder peso',
  ganar_masa: 'Ganar masa',
  mantener: 'Mantener',
  mejorar_salud: 'Mejorar salud',
};

// Orden de visualización y etiquetas de las comidas del plan.
const MEAL_ORDER = ['desayuno', 'almuerzo', 'comida', 'merienda', 'cena'];
const MEAL_LABELS: Record<string, string> = {
  desayuno: 'Desayuno',
  almuerzo: 'Almuerzo',
  comida: 'Comida',
  merienda: 'Merienda',
  cena: 'Cena',
};

// Composición de MiniCard de bento
function BentoCard({
  icon,
  label,
  children,
  accent,
}: {
  icon: IconName;
  label: string;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <View style={[styles.bento, accent && styles.bentoAccent]}>
      <View style={styles.bentoHeader}>
        <Icon name={icon} size={16} />
        <Text style={styles.bentoLabel}>{label}</Text>
      </View>
      {children}
    </View>
  );
}

// Agrupa las entradas del diario por comida (desayuno → cena), manteniendo
// el orden del plan; las que no tienen tipo van en "Extras" al final.
function groupByMeal(entries: FoodEntry[]) {
  const grouped: Record<string, FoodEntry[]> = {};
  for (const e of entries) {
    const key = e.meal_type || 'extras';
    (grouped[key] = grouped[key] || []).push(e);
  }
  return grouped;
}

const MEAL_SECTIONS = [...MEAL_ORDER, 'extras'];

// Renderiza la lista de comidas del día agrupadas, con botón para borrar cada una.
function renderDayEntries(entries: FoodEntry[], onDelete: (e: FoodEntry) => void) {
  const grouped = groupByMeal(entries);
  return MEAL_SECTIONS.filter(k => (grouped[k]?.length || 0) > 0).map(k => {
    const list = grouped[k];
    const kcal = list.reduce((s, e) => s + Number(e.calories || 0), 0);
    const label = MEAL_LABELS[k] || 'Extras';
    return (
      <View key={k} style={styles.mealSection}>
        <View style={styles.mealSectionHeader}>
          <Text style={styles.mealSectionLabel}>{label}</Text>
          <Text style={styles.mealSectionKcal}>{Math.round(kcal)} kcal</Text>
        </View>
        {list.map(e => (
          <View key={e.id} style={styles.entryRow}>
            <View style={styles.entryInfo}>
              <Text style={styles.entryName} numberOfLines={1}>{e.name}</Text>
              <Text style={styles.entryMacros}>
                P {Math.round(e.protein_g)} · C {Math.round(e.carbs_g)} · G {Math.round(e.fat_g)}g
              </Text>
            </View>
            <Text style={styles.entryKcal}>{Math.round(e.calories)} kcal</Text>
            <Pressable
              style={({ pressed }) => [styles.deleteBtn, pressed && styles.pressed]}
              onPress={() => onDelete(e)}
              hitSlop={8}>
              <Text style={styles.deleteBtnText}>✕</Text>
            </Pressable>
          </View>
        ))}
      </View>
    );
  });
}

export default function OverviewScreen() {
  const [plan, setPlan] = useState<NutritionPlan | null>(null);
  const [day, setDay] = useState<FoodDaySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [userName, setUserName] = useState('');
  const [checkinVisible, setCheckinVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function load() {
    try {
      const user = await getUser();
      setUserName(user?.name?.split(' ')[0] || '');
      const p = await getPlan();
      setPlan(p);
      getTodaySummary().then(setDay).catch(() => {});
      // Check-in semanal (Pro): preguntar si lleva 7+ días sin actividad
      if (p) {
        getCheckinStatus()
          .then(s => {
            if (s.due) setCheckinVisible(true);
          })
          .catch(() => {});
      }
    } catch (err: any) {
      setError(err.message || 'Error cargando el plan');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // ── Check-in semanal: responder ──
  async function onCheckin(response: 'all_good' | 'want_change') {
    setCheckinVisible(false);
    try {
      await respondCheckin(response);
    } catch {
      // si falla el registro, seguimos igual
    }
    if (response === 'want_change') {
      router.push('/questionnaire?edit=1');
    }
  }

  function onRefresh() {
    setRefreshing(true);
    load();
  }

  // Borra una comida mal registrada del diario y actualiza el resumen.
  function onDeleteEntry(entry: FoodEntry) {
    Alert.alert(
      'Eliminar comida',
      `¿Descartar "${entry.name}" (${Math.round(entry.calories)} kcal) del diario de hoy?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const summary = await deleteFood(entry.id);
              setDay(summary);
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'No se pudo eliminar la comida.');
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={GOLD} />
      </SafeAreaView>
    );
  }

  if (!plan) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.emptyEmoji}>📋</Text>
        <Text style={styles.emptyTitle}>Aún no tienes un plan</Text>
        <Text style={styles.emptyText}>Completa el cuestionario para recibir tu plan personalizado</Text>
        <Pressable
          style={({ pressed }) => [styles.ctaBtn, pressed && styles.pressed]}
          onPress={() => router.push('/questionnaire')}>
          <Text style={styles.ctaText}>Comenzar ahora</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const pro = isPro(plan);
  const goal = GOAL_LABELS[plan.profile?.goal] || plan.profile?.goal || 'Tu objetivo';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />}>

        {/* Saludo + editar plan */}
        <View style={styles.greetingRow}>
          <Text style={styles.greeting}>
            {userName ? `Hola, ${userName}` : 'Tu resumen'} 👋
          </Text>
          <Pressable
            style={({ pressed }) => [styles.editBtn, pressed && styles.pressed]}
            onPress={() => router.push('/questionnaire?edit=1')}
            hitSlop={8}>
            <Icon name="document-text-outline" size={13} />
            <Text style={styles.editBtnText}>Editar plan</Text>
          </Pressable>
        </View>

        {/* Tarjeta Pro / estado */}
        {!pro && (
          <Pressable
            style={({ pressed }) => [styles.upgradeCard, pressed && styles.pressed]}
            onPress={() => router.push('/subscription')}>
            <Icon name="sparkles" size={20} />
            <View style={styles.upgradeTextWrap}>
              <Text style={styles.upgradeTitle}>Actualiza a Pro · 14 €/mes</Text>
              <Text style={styles.upgradeSub}>Desbloquea menú detallado, IA y suplementos</Text>
            </View>
            <Icon name="arrow-forward" size={16} color={DARK} />
          </Pressable>
        )}

        {/* Bloque Hoy (descuento del día + streak + lista de comidas) */}
        {day && (
          <View style={styles.todayCard}>
            <View style={styles.todayHeader}>
              <Text style={styles.bentoLabel}>Hoy</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text style={styles.todayValue}>{Math.round(day.total.calories)}</Text>
                <Text style={styles.todayUnit}> kcal</Text>
              </View>
            </View>

            <View style={styles.todayMeta}>
              {day.streak > 0 && (
                <View style={styles.streakPill}>
                  <Icon name="trophy" size={12} />
                  <Text style={styles.streakText}> {day.streak} día{day.streak > 1 ? 's' : ''}</Text>
                </View>
              )}
              {day.plan && day.remaining && (
                <Text style={styles.todayRemain}>{day.remaining.calories} kcal restantes</Text>
              )}
            </View>

            {day.entries.length === 0 ? (
              <Text style={styles.todayEmpty}>
                Ninguna comida registrada. Usa la cámara para analizar tu plato.
              </Text>
            ) : (
              renderDayEntries(day.entries, onDeleteEntry)
            )}
          </View>
        )}

        {/* Bento grid principal */}
        <View style={styles.bentoGrid}>
          <BentoCard icon="body" label="Objetivo" accent>
            <Text style={styles.bentoEmphasis}>{goal}</Text>
            <Text style={styles.bentoSub}>Meta principal</Text>
          </BentoCard>

          <BentoCard icon="flame" label="Calorías">
            <Text style={styles.bentoEmphasis}>{plan.daily_calories}</Text>
            <Text style={styles.bentoSub}>kcal/día</Text>
          </BentoCard>

          <BentoCard icon="nutrition" label="Proteína">
            <Text style={styles.bentoEmphasis}>{plan.protein_g}<Text style={styles.bentoUnit}>g</Text></Text>
            <Text style={styles.bentoSub}>diarias</Text>
          </BentoCard>

          <BentoCard icon="nutrition" label="Carbos">
            <Text style={styles.bentoEmphasis}>{plan.carbs_g}<Text style={styles.bentoUnit}>g</Text></Text>
            <Text style={styles.bentoSub}>diarios</Text>
          </BentoCard>

          <BentoCard icon="nutrition" label="Grasas">
            <Text style={styles.bentoEmphasis}>{plan.fat_g}<Text style={styles.bentoUnit}>g</Text></Text>
            <Text style={styles.bentoSub}>diarias</Text>
          </BentoCard>

          {plan.consejos_generales?.length > 0 && (
            <BentoCard icon="sparkles" label="Consejos">
              {plan.consejos_generales.slice(0, 2).map((tip, i) => (
                <Text key={i} style={styles.tip}>• {tip}</Text>
              ))}
            </BentoCard>
          )}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      {/* Check-in semanal: ¿Cómo va ese progreso? */}
      <Modal
        visible={checkinVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCheckinVisible(false)}>
        <View style={styles.checkinOverlay}>
          <View style={styles.checkinModal}>
            <View style={styles.checkinIcon}>
              <Icon name="sparkles" size={40} />
            </View>
            <Text style={styles.checkinTitle}>¿Cómo va ese progreso?</Text>
            <Text style={styles.checkinText}>
              Llevas un tiempo sin actualizar tus datos. ¿Quieres contarnos cómo va todo?
              Si algo ha cambiado, podemos ajustar tu plan al momento.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.checkinGoodBtn, pressed && styles.pressed]}
              onPress={() => onCheckin('all_good')}>
              <Text style={styles.checkinGoodText}>Todo va bien</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.checkinChangeBtn, pressed && styles.pressed]}
              onPress={() => onCheckin('want_change')}>
              <Text style={styles.checkinChangeText}>Quiero cambiar algo</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: DARK },
  center: { flex: 1, backgroundColor: DARK, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  scroll: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  greetingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  greeting: { color: '#fff', fontSize: 22, fontWeight: '800', flexShrink: 1 },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.4)',
    borderRadius: 8,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 6,
  },
  editBtnText: { color: GOLD, fontSize: 12, fontWeight: '700' },

  upgradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: 'rgba(201,168,76,0.1)',
    borderColor: 'rgba(201,168,76,0.4)',
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.three,
  },
  upgradeTextWrap: { flex: 1 },
  upgradeTitle: { color: '#fff', fontSize: 14, fontWeight: '800' },
  upgradeSub: { color: MUTED, fontSize: 12, marginTop: 2 },
  pressed: { opacity: 0.85 },

  todayCard: {
    backgroundColor: 'rgba(201,168,76,0.08)',
    borderColor: 'rgba(201,168,76,0.35)',
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  todayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  todayMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mealSection: { borderTopWidth: 1, borderTopColor: 'rgba(201,168,76,0.2)', paddingTop: Spacing.two, gap: Spacing.two },
  mealSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mealSectionLabel: { color: GOLD, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  mealSectionKcal: { color: MUTED, fontSize: 12, fontWeight: '600' },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  entryInfo: { flex: 1 },
  entryName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  entryMacros: { color: MUTED, fontSize: 11, marginTop: 1 },
  entryKcal: { color: '#fff', fontSize: 13, fontWeight: '700' },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(229,91,91,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(229,91,91,0.4)',
  },
  deleteBtnText: { color: '#E55B5B', fontSize: 13, fontWeight: '800', lineHeight: 15 },

  bentoLabel: { color: GOLD, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  todayValue: { color: '#fff', fontSize: 26, fontWeight: '900' },
  todayUnit: { color: MUTED, fontSize: 14 },
  streakPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: 'rgba(201,168,76,0.15)', borderRadius: 8, paddingHorizontal: Spacing.two, paddingVertical: 4 },
  streakText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  todayRemain: { color: GOLD, fontSize: 13, fontWeight: '700' },
  todayEmpty: { color: MUTED, fontSize: 12, lineHeight: 18 },

  bentoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  bento: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: '#1A1A1A',
    borderColor: '#2A2A2A',
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  bentoAccent: { backgroundColor: 'rgba(201,168,76,0.1)', borderColor: 'rgba(201,168,76,0.35)' },
  bentoHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  bentoEmphasis: { color: '#fff', fontSize: 22, fontWeight: '900' },
  bentoUnit: { fontSize: 14, color: MUTED, fontWeight: '600' },
  bentoSub: { color: MUTED, fontSize: 12 },
  tip: { color: MUTED, fontSize: 12, lineHeight: 18 },

  profileGrid: { gap: Spacing.one },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  error: { color: '#E55B5B', fontSize: 13, marginTop: Spacing.two },

  checkinOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  checkinModal: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.4)',
    padding: Spacing.four,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    gap: Spacing.two,
  },
  checkinIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(201,168,76,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  checkinTitle: { color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  checkinText: { color: MUTED, fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: Spacing.two },
  checkinGoodBtn: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    width: '100%',
  },
  checkinGoodText: { color: DARK, fontSize: 15, fontWeight: '800' },
  checkinChangeBtn: {
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#333',
  },
  checkinChangeText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.three },
  emptyTitle: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  emptyText: { color: MUTED, fontSize: 14, textAlign: 'center', marginTop: Spacing.two },
  ctaBtn: { backgroundColor: GOLD, borderRadius: 12, paddingVertical: 14, paddingHorizontal: Spacing.four, marginTop: Spacing.four },
  ctaText: { color: DARK, fontSize: 15, fontWeight: '800' },
});