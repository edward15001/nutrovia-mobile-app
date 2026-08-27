import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getPlan, NutritionPlan } from '@/lib/plan';
import { getUser } from '@/lib/auth';
import { Spacing } from '@/constants/theme';

const GOLD = '#C9A84C';
const DARK = '#0D0D0D';
const MUTED = '#888880';

const GOAL_LABELS: Record<string, string> = {
  perder_peso: '🔥 Perder peso',
  ganar_masa: '💪 Ganar masa',
  mantener: '⚖️ Mantener',
  mejorar_salud: '❤️ Mejorar salud',
};

export default function OverviewScreen() {
  const [plan, setPlan] = useState<NutritionPlan | null>(null);
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
          style={({ pressed }) => [styles.ctaBtn, pressed && styles.ctaBtnPressed]}
          onPress={() => router.push('/questionnaire')}>
          <Text style={styles.ctaText}>📝 Completar cuestionario</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />}>
        <Text style={styles.greeting}>
          {userName ? `Hola, ${userName} 👋` : 'Tu resumen'}
        </Text>

        <View style={styles.macroRow}>
          <View style={styles.macroCard}>
            <Text style={styles.macroValue}>{plan.daily_calories}</Text>
            <Text style={styles.macroUnit}>kcal/día</Text>
          </View>
          <View style={styles.macroCard}>
            <Text style={styles.macroValue}>{plan.protein_g}</Text>
            <Text style={styles.macroUnit}>proteína g</Text>
          </View>
          <View style={styles.macroCard}>
            <Text style={styles.macroValue}>{plan.carbs_g}</Text>
            <Text style={styles.macroUnit}>carbos g</Text>
          </View>
          <View style={styles.macroCard}>
            <Text style={styles.macroValue}>{plan.fat_g}</Text>
            <Text style={styles.macroUnit}>grasas g</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>Tu perfil</Text>
            <Pressable onPress={() => router.push('/questionnaire?edit=1')} hitSlop={8}>
              <Text style={styles.editLink}>✏️ Editar</Text>
            </Pressable>
          </View>
          <View style={styles.profileGrid}>
            <Text style={styles.profileItem}>🎯 {GOAL_LABELS[plan.profile.goal] || plan.profile.goal}</Text>
            <Text style={styles.profileItem}>⚖️ {plan.profile.weight_kg} kg{plan.profile.target_weight_kg ? ` → ${plan.profile.target_weight_kg} kg` : ''}</Text>
            <Text style={styles.profileItem}>📏 {plan.profile.height_cm} cm</Text>
            <Text style={styles.profileItem}>🎂 {plan.profile.age} años</Text>
          </View>
        </View>

        {plan.consejos_generales?.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>💡 Consejos generales</Text>
            {plan.consejos_generales.map((tip, i) => (
              <Text key={i} style={styles.tip}>
                {tip}
              </Text>
            ))}
          </View>
        )}

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
  greeting: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: Spacing.two },
  macroRow: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  macroCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  macroValue: { color: GOLD, fontSize: 24, fontWeight: '800' },
  macroUnit: { color: MUTED, fontSize: 12, marginTop: 2 },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  cardLabel: { color: GOLD, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.two },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  editLink: { color: GOLD, fontSize: 13, fontWeight: '700', marginBottom: Spacing.two },
  profileGrid: { gap: Spacing.one },
  profileItem: { color: '#E8E0D0', fontSize: 14 },
  tip: { color: MUTED, fontSize: 13, lineHeight: 19, marginBottom: Spacing.one },
  error: { color: '#E55B5B', fontSize: 13, marginTop: Spacing.two },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.three },
  emptyTitle: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  emptyText: { color: MUTED, fontSize: 14, textAlign: 'center', marginTop: Spacing.two },
  ctaBtn: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: Spacing.four,
    marginTop: Spacing.four,
  },
  ctaBtnPressed: { opacity: 0.85 },
  ctaText: { color: DARK, fontSize: 15, fontWeight: '800' },
});
