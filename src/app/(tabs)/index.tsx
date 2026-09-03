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
import Svg, { Circle } from 'react-native-svg';

import { getPlan, isPro, NutritionPlan } from '@/lib/plan';
import { getUser } from '@/lib/auth';
import { deleteFood, getTodaySummary, FoodDaySummary, FoodEntry } from '@/lib/foodlog';
import { getCheckinStatus, respondCheckin } from '@/lib/checkin';
import { Spacing } from '@/constants/theme';
import { Border, Font, NV, Radius } from '@/constants/nutrovia';
import { Icon, IconName } from '@/components/icon';

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

// Anillo de macros concéntricos (P/C/G) con las kcal en el centro.
// Mismo espíritu que el anillo de objetivo de la web, en versión móvil.
function GoalRing({ kcal, proteinG, carbsG, fatG }: { kcal: number; proteinG: number; carbsG: number; fatG: number }) {
  const base = kcal || 1;
  const pFrac = Math.min(1, (proteinG * 4) / base);
  const cFrac = Math.min(1, (carbsG * 4) / base);
  const gFrac = Math.min(1, (fatG * 9) / base);
  const circ = (r: number) => 2 * Math.PI * r;
  const size = 130;
  const cx = size / 2;

  return (
    <View style={styles.ringBox}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* fondo del anillo */}
        <Circle cx={cx} cy={cx} r={50} fill="none" stroke={NV.neutro300} strokeWidth={7} />
        {/* Proteína (exterior) */}
        <Circle
          cx={cx} cy={cx} r={50} fill="none" stroke={NV.savia} strokeWidth={7} strokeLinecap="round"
          strokeDasharray={`${pFrac * circ(50)} ${circ(50)}`}
          transform={`rotate(-90 ${cx} ${cx})`}
        />
        {/* Carbos (medio) */}
        <Circle
          cx={cx} cy={cx} r={40} fill="none" stroke={NV.malva} strokeWidth={7} strokeLinecap="round"
          strokeDasharray={`${cFrac * circ(40)} ${circ(40)}`}
          strokeDashoffset={-circ(40) * pFrac}
          transform={`rotate(-90 ${cx} ${cx})`}
        />
        {/* Grasas (interior) */}
        <Circle
          cx={cx} cy={cx} r={30} fill="none" stroke={NV.ambar} strokeWidth={7} strokeLinecap="round"
          strokeDasharray={`${gFrac * circ(30)} ${circ(30)}`}
          strokeDashoffset={-circ(30) * (pFrac + cFrac)}
          transform={`rotate(-90 ${cx} ${cx})`}
        />
      </Svg>
      <View style={styles.ringCenter}>
        <Text style={styles.ringNum}>{kcal}</Text>
        <Text style={styles.ringUnit}>KCAL / DÍA</Text>
      </View>
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
        <ActivityIndicator size="large" color={NV.savia} />
      </SafeAreaView>
    );
  }

  if (!plan) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.emptyTitle}>Aún no tienes un plan</Text>
        <Text style={styles.emptyText}>Completa el cuestionario para recibir tu plan personalizado</Text>
        <Pressable
          style={({ pressed }) => [styles.ctaBtn, pressed && styles.ctaBtnPressed]}
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={NV.savia} />}>

        {/* Saludo + editar plan */}
        <View style={styles.greetingRow}>
          <Text style={styles.greeting}>
            {userName ? `Hola, ${userName}` : 'Tu resumen'}
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
            <Icon name="arrow-forward" size={16} color={NV.papel} />
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

        {/* Tu objetivo: tarjeta destacada con anillo de macros */}
        <View style={styles.goalCard}>
          <View style={styles.goalInfo}>
            <View style={styles.bentoHeader}>
              <Icon name="body" size={16} />
              <Text style={styles.bentoLabel}>Tu objetivo</Text>
            </View>
            <Text style={styles.goalTitle}>{goal}</Text>
            <Text style={styles.goalSub}>
              {plan.profile?.weight_kg
                ? `${plan.profile.weight_kg} kg${plan.profile.target_weight_kg ? ` → ${plan.profile.target_weight_kg} kg` : ''}`
                : 'Meta principal'}
            </Text>
            <View style={styles.goalChips}>
              <Text style={styles.goalChip}>P {plan.protein_g}g</Text>
              <Text style={styles.goalChip}>C {plan.carbs_g}g</Text>
              <Text style={styles.goalChip}>G {plan.fat_g}g</Text>
            </View>
          </View>
          <GoalRing kcal={plan.daily_calories} proteinG={plan.protein_g} carbsG={plan.carbs_g} fatG={plan.fat_g} />
        </View>

        {/* Bento grid principal */}
        <View style={styles.bentoGrid}>
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
              style={({ pressed }) => [styles.checkinGoodBtn, pressed && styles.checkinGoodBtnPressed]}
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
  safeArea: { flex: 1, backgroundColor: NV.papel },
  center: { flex: 1, backgroundColor: NV.papel, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  scroll: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  greetingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  greeting: { color: NV.tinta, fontFamily: Font.bold, fontSize: 22, fontWeight: '800', flexShrink: 1 },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: NV.papelAlt,
    borderWidth: Border.structural,
    borderColor: NV.savia,
    borderRadius: Radius.none,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 6,
  },
  editBtnText: { color: NV.savia, fontFamily: Font.medium, fontSize: 12, fontWeight: '700' },

  upgradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: NV.savia100,
    borderColor: NV.savia,
    borderWidth: Border.structural,
    borderRadius: Radius.none,
    padding: Spacing.three,
  },
  upgradeTextWrap: { flex: 1 },
  upgradeTitle: { color: NV.tinta, fontFamily: Font.bold, fontSize: 14, fontWeight: '800' },
  upgradeSub: { color: NV.textoSuave, fontFamily: Font.regular, fontSize: 12, marginTop: 2 },
  pressed: { opacity: 0.85 },

  todayCard: {
    backgroundColor: NV.savia100,
    borderColor: NV.savia,
    borderWidth: Border.structural,
    borderRadius: Radius.none,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  todayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  todayMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mealSection: { borderTopWidth: Border.inner, borderTopColor: NV.fileteSuave, paddingTop: Spacing.two, gap: Spacing.two },
  mealSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mealSectionLabel: { color: NV.savia700, fontFamily: Font.medium, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  mealSectionKcal: { color: NV.textoSuave, fontFamily: Font.medium, fontSize: 12, fontWeight: '600' },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  entryInfo: { flex: 1 },
  entryName: { color: NV.tinta, fontFamily: Font.medium, fontSize: 14, fontWeight: '600' },
  entryMacros: { color: NV.textoSuave, fontFamily: Font.regular, fontSize: 11, marginTop: 1 },
  entryKcal: { color: NV.tinta, fontFamily: Font.bold, fontSize: 13, fontWeight: '700' },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: Radius.none,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: NV.arcilla100,
    borderWidth: Border.structural,
    borderColor: NV.arcilla,
  },
  deleteBtnText: { color: NV.arcilla700, fontFamily: Font.bold, fontSize: 13, fontWeight: '800', lineHeight: 15 },

  bentoLabel: { color: NV.savia700, fontFamily: Font.medium, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  todayValue: { color: NV.tinta, fontFamily: Font.bold, fontSize: 26, fontWeight: '900', fontVariant: ['tabular-nums'] },
  todayUnit: { color: NV.textoSuave, fontFamily: Font.regular, fontSize: 14 },
  streakPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: NV.savia100, borderRadius: Radius.none, paddingHorizontal: Spacing.two, paddingVertical: 4 },
  streakText: { color: NV.tinta, fontFamily: Font.medium, fontSize: 12, fontWeight: '700' },
  todayRemain: { color: NV.savia700, fontFamily: Font.medium, fontSize: 13, fontWeight: '700' },
  todayEmpty: { color: NV.textoSuave, fontFamily: Font.regular, fontSize: 12, lineHeight: 18 },

  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    backgroundColor: NV.savia100,
    borderColor: NV.savia,
    borderWidth: Border.structural,
    borderRadius: Radius.none,
    padding: Spacing.three,
  },
  goalInfo: { flex: 1, gap: 6 },
  goalTitle: { color: NV.tinta, fontFamily: Font.bold, fontSize: 20, fontWeight: '900' },
  goalSub: { color: NV.textoSuave, fontFamily: Font.regular, fontSize: 12 },
  goalChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  goalChip: {
    color: NV.savia700,
    fontFamily: Font.medium,
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: NV.savia100,
    borderRadius: Radius.none,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  ringBox: { width: 130, height: 130, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { position: 'absolute', alignItems: 'center' },
  ringNum: { color: NV.tinta, fontFamily: Font.bold, fontSize: 22, fontWeight: '900', fontVariant: ['tabular-nums'] },
  ringUnit: { color: NV.textoSuave, fontFamily: Font.medium, fontSize: 9, letterSpacing: 0.5, marginTop: 1 },

  bentoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  bento: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: NV.papelAlt,
    borderColor: NV.tinta,
    borderWidth: Border.structural,
    borderRadius: Radius.none,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  bentoAccent: { backgroundColor: NV.savia100, borderColor: NV.savia },
  bentoHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  bentoEmphasis: { color: NV.tinta, fontFamily: Font.bold, fontSize: 22, fontWeight: '900', fontVariant: ['tabular-nums'] },
  bentoUnit: { fontFamily: Font.medium, fontSize: 14, color: NV.textoSuave, fontWeight: '600' },
  bentoSub: { color: NV.textoSuave, fontFamily: Font.regular, fontSize: 12 },
  tip: { color: NV.textoSuave, fontFamily: Font.regular, fontSize: 12, lineHeight: 18 },

  profileGrid: { gap: Spacing.one },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  error: { color: NV.arcilla700, fontFamily: Font.regular, fontSize: 13, marginTop: Spacing.two },

  checkinOverlay: {
    flex: 1,
    backgroundColor: NV.veloTinta,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  checkinModal: {
    backgroundColor: NV.papelAlt,
    borderRadius: Radius.none,
    borderWidth: Border.structural,
    borderColor: NV.savia,
    padding: Spacing.four,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    gap: Spacing.two,
  },
  checkinIcon: {
    width: 64,
    height: 64,
    borderRadius: Radius.none,
    backgroundColor: NV.savia100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  checkinTitle: { color: NV.tinta, fontFamily: Font.bold, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  checkinText: { color: NV.textoSuave, fontFamily: Font.regular, fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: Spacing.two },
  checkinGoodBtn: {
    backgroundColor: NV.savia,
    borderRadius: Radius.none,
    paddingVertical: 14,
    alignItems: 'center',
    width: '100%',
  },
  checkinGoodBtnPressed: { backgroundColor: NV.savia700 },
  checkinGoodText: { color: NV.papel, fontFamily: Font.bold, fontSize: 15, fontWeight: '800' },
  checkinChangeBtn: {
    borderRadius: Radius.none,
    paddingVertical: 13,
    alignItems: 'center',
    width: '100%',
    borderWidth: Border.structural,
    borderColor: NV.tinta,
  },
  checkinChangeText: { color: NV.tinta, fontFamily: Font.medium, fontSize: 14, fontWeight: '700' },
  emptyTitle: { color: NV.tinta, fontFamily: Font.bold, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  emptyText: { color: NV.textoSuave, fontFamily: Font.regular, fontSize: 14, textAlign: 'center', marginTop: Spacing.two },
  ctaBtn: { backgroundColor: NV.savia, borderRadius: Radius.none, paddingVertical: 14, paddingHorizontal: Spacing.four, marginTop: Spacing.four },
  ctaBtnPressed: { backgroundColor: NV.savia700 },
  ctaText: { color: NV.papel, fontFamily: Font.bold, fontSize: 15, fontWeight: '800' },
});
