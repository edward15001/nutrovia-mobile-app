import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
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
import { getTodaySummary, FoodDaySummary } from '@/lib/foodlog';
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

export default function OverviewScreen() {
  const [plan, setPlan] = useState<NutritionPlan | null>(null);
  const [day, setDay] = useState<FoodDaySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [userName, setUserName] = useState('');

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
    } catch (err: any) {
      setError(err.message || 'Error cargando el plan');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function onRefresh() {
    setRefreshing(true);
    load();
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

        {/* Saludo */}
        <Text style={styles.greeting}>
          {userName ? `Hola, ${userName}` : 'Tu resumen'} 👋
        </Text>

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

        {/* Bloque Hoy (descuento del día + streak) */}
        {day && (
          <View style={styles.todayCard}>
            <View style={styles.todayHeader}>
              <Text style={styles.bentoLabel}>Hoy</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text style={styles.todayValue}>{Math.round(day.total.calories)}</Text>
                <Text style={styles.todayUnit}> kcal</Text>
              </View>
            </View>
            {day.streak > 0 && (
              <View style={styles.streakPill}>
                <Icon name="trophy" size={12} />
                <Text style={styles.streakText}> {day.streak} día{day.streak > 1 ? 's' : ''}</Text>
              </View>
            )}
            {day.plan && day.remaining && (
              <Text style={styles.todayRemain}>{day.remaining.calories} kcal restantes</Text>
            )}
            {day.entries.length === 0 && (
              <Text style={styles.todayEmpty}>
                Ninguna comida registrada. Usa la cámara para analizar tu plato.
              </Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: DARK },
  center: { flex: 1, backgroundColor: DARK, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  scroll: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  greeting: { color: '#fff', fontSize: 22, fontWeight: '800' },

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
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.three },
  emptyTitle: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  emptyText: { color: MUTED, fontSize: 14, textAlign: 'center', marginTop: Spacing.two },
  ctaBtn: { backgroundColor: GOLD, borderRadius: 12, paddingVertical: 14, paddingHorizontal: Spacing.four, marginTop: Spacing.four },
  ctaText: { color: DARK, fontSize: 15, fontWeight: '800' },
});