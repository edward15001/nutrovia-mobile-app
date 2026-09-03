import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getPlan, NutritionPlan } from '@/lib/plan';
import { Spacing } from '@/constants/theme';
import { Border, Font, NV, Radius } from '@/constants/nutrovia';
import { Icon } from '@/components/icon';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DAY_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function todayDayLabel(): string {
  const d = new Date().getDay();
  return DAYS[d === 0 ? 6 : d - 1];
}

// Semana ISO del año, para la cabecera "SEMANA 04".
function isoWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export default function TrainingScreen() {
  const [plan, setPlan] = useState<NutritionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(todayDayLabel());

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const p = await getPlan();
          setPlan(p);
          const sesiones = p?.training_plan?.sesiones || [];
          const today = todayDayLabel();
          const hasToday = sesiones.some(s => s.dia?.trim().toLowerCase() === today.toLowerCase());
          if (!hasToday) {
            const firstWithSession = DAYS.find(d =>
              sesiones.some(s => s.dia?.trim().toLowerCase() === d.toLowerCase())
            );
            setSelectedDay(firstWithSession || today);
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

  const sessionOf = (d: string) => tp.sesiones.find(s => s.dia?.trim().toLowerCase() === d.toLowerCase());
  const session = sessionOf(selectedDay);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Cabecera de la sesión seleccionada */}
        <View style={[styles.section, styles.headSection]}>
          <View style={styles.headLeft}>
            <Text style={styles.weekLabel}>Semana {String(isoWeek(new Date())).padStart(2, '0')}</Text>
            <Text style={styles.sessionTitle}>{session ? session.tipo : 'Descanso'}</Text>
          </View>
          {session && (
            <View style={styles.headRight}>
              {/* "42 min" es un ejemplo: aún no hay duración ni nº de series real en el plan. */}
              <Text style={styles.headDuration}>42 min</Text>
              <Text style={styles.headSets}>22 series</Text>
            </View>
          )}
        </View>

        {/* Selector de la semana */}
        <View style={[styles.section, styles.weekRow]}>
          {DAYS.map((d, i) => {
            const active = selectedDay === d;
            const has = !!sessionOf(d);
            return (
              <Pressable
                key={d}
                onPress={() => setSelectedDay(d)}
                style={[styles.weekCell, active && styles.weekCellActive]}>
                <Text style={[styles.weekLetter, active && styles.weekLetterActive]}>{DAY_LETTERS[i]}</Text>
                {has ? (
                  <Icon name="barbell" size={14} color={active ? NV.papel : NV.tinta} />
                ) : (
                  <Text style={[styles.weekRest, active && styles.weekLetterActive]}>—</Text>
                )}
              </Pressable>
            );
          })}
        </View>

        {!session ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Día de descanso. Aprovecha para recuperar.</Text>
          </View>
        ) : (
          <>
            {/* Ejercicios de la sesión */}
            <View style={styles.exerciseList}>
              {session.ejercicios.map((e, i) => (
                <View key={i} style={[styles.exerciseRow, i > 0 && styles.exerciseRowDivider]}>
                  <Icon name="circle-outline" size={22} color={NV.neutro500} />
                  <Text style={styles.exerciseText}>{e}</Text>
                </View>
              ))}
            </View>

            {tp.progresion?.length > 0 && (
              <View style={[styles.section, styles.notesSection]}>
                <View style={styles.notesLabelRow}><Icon name="trending-up" size={14} /><Text style={styles.notesLabel}>Progresión</Text></View>
                {tp.progresion.map((p, i) => (
                  <Text key={i} style={styles.note}>{p}</Text>
                ))}
              </View>
            )}

            {tp.notas?.length > 0 && (
              <View style={[styles.section, styles.notesSection]}>
                <View style={styles.notesLabelRow}><Icon name="document-text-outline" size={14} /><Text style={styles.notesLabel}>Notas</Text></View>
                {tp.notas.map((n, i) => (
                  <Text key={i} style={styles.note}>{n}</Text>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Empezar sesión: sin implementar todavía, solo el punto de entrada visual. */}
      {session && (
        <View style={styles.startBarWrap}>
          <Pressable style={({ pressed }) => [styles.startBar, pressed && styles.startBarPressed]} onPress={() => {}}>
            <Text style={styles.startBarText}>Comenzar sesión</Text>
            <Icon name="arrow-forward" size={16} color={NV.papel} />
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: NV.papel },
  center: { flex: 1, backgroundColor: NV.papel, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  scroll: { flex: 1 },
  content: { paddingBottom: Spacing.four },

  // Todas las secciones son de ancho completo: sin cajas, solo un filete
  // horizontal de 2px en tinta que cierra cada una por abajo.
  section: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: Border.structural,
    borderBottomColor: NV.tinta,
  },

  headSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: NV.arcilla100,
    paddingTop: Spacing.four,
  },
  headLeft: { gap: 4 },
  weekLabel: { color: NV.arcilla700, fontFamily: Font.medium, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  sessionTitle: { color: NV.tinta, fontFamily: Font.bold, fontSize: 22, fontWeight: '900', textTransform: 'capitalize' },
  headRight: { alignItems: 'flex-end', gap: 2 },
  headDuration: { color: NV.tinta, fontFamily: Font.bold, fontSize: 22, fontWeight: '900', fontVariant: ['tabular-nums'] },
  headSets: { color: NV.textoSuave, fontFamily: Font.regular, fontSize: 12, fontVariant: ['tabular-nums'] },

  weekRow: { flexDirection: 'row', paddingHorizontal: Spacing.two, paddingVertical: Spacing.two },
  weekCell: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: Spacing.one, borderRadius: Radius.none },
  weekCellActive: { backgroundColor: NV.arcilla },
  weekLetter: { color: NV.textoSuave, fontFamily: Font.medium, fontSize: 11, fontWeight: '700' },
  weekLetterActive: { color: NV.papel },
  weekRest: { color: NV.neutro500, fontFamily: Font.regular, fontSize: 14 },

  empty: { padding: Spacing.four, alignItems: 'center' },
  emptyText: { color: NV.textoSuave, fontFamily: Font.regular, fontSize: 14, textAlign: 'center' },

  exerciseList: { borderBottomWidth: Border.structural, borderBottomColor: NV.tinta },
  exerciseRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.four, paddingVertical: Spacing.three },
  exerciseRowDivider: { borderTopWidth: Border.inner, borderTopColor: NV.fileteSuave },
  exerciseText: { flex: 1, color: NV.tinta, fontFamily: Font.bold, fontSize: 15, fontWeight: '700' },

  notesSection: { gap: Spacing.one },
  notesLabelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, marginBottom: 2 },
  notesLabel: { color: NV.arcilla700, fontFamily: Font.medium, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  note: { color: NV.textoSuave, fontFamily: Font.regular, fontSize: 13, lineHeight: 19 },

  startBarWrap: {
    borderTopWidth: Border.structural,
    borderTopColor: NV.tinta,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  startBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: NV.arcilla,
    borderRadius: Radius.none,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  startBarPressed: { backgroundColor: NV.arcilla700 },
  startBarText: { color: NV.papel, fontFamily: Font.bold, fontSize: 15, fontWeight: '800' },
});
