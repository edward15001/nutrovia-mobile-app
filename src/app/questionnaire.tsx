import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getPlan } from '@/lib/plan';
import { Spacing } from '@/constants/theme';
import { Border, Font, NV, Radius } from '@/constants/nutrovia';
import {
  ACTIVITY_OPTIONS,
  DIET_OPTIONS,
  EQUIPMENT_OPTIONS,
  EXPERIENCE_OPTIONS,
  GOAL_OPTIONS,
  HEALTH_OPTIONS,
  Option,
  SEX_OPTIONS,
  submitQuestionnaire,
} from '@/lib/questionnaire';

const DAY_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

export default function QuestionnaireScreen() {
  // ?edit=1 → viene de "Editar cuestionario" (plan ya existente)
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const isEdit = edit === '1';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [sex, setSex] = useState('');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [goal, setGoal] = useState('');
  const [activity, setActivity] = useState('');
  const [diet, setDiet] = useState('');
  const [experience, setExperience] = useState('');
  const [equipment, setEquipment] = useState('');
  const [days, setDays] = useState(3);
  const [health, setHealth] = useState<string[]>([]);

  // Modo edición: rellenar con los valores actuales del plan
  useEffect(() => {
    (async () => {
      try {
        const plan = await getPlan();
        const p = plan?.profile;
        if (p) {
          setSex(p.sex || '');
          setAge(p.age ? String(p.age) : '');
          setHeight(p.height_cm ? String(p.height_cm) : '');
          setWeight(p.weight_kg ? String(p.weight_kg) : '');
          setTargetWeight(p.target_weight_kg ? String(p.target_weight_kg) : '');
          setGoal(p.goal || '');
          setActivity(p.activity_level || '');
          setDiet(p.dietary_preference || '');
          setExperience(p.training_experience || '');
          setEquipment(p.training_equipment || '');
          setDays(p.training_days_per_week || 3);
          setHealth(
            p.health_conditions?.length ? p.health_conditions : ['ninguna']
          );
        }
      } catch {
        // sin plan → formulario vacío
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleHealth = useCallback(
    (value: string) => {
      setHealth(prev => {
        if (value === 'ninguna') {
          return ['ninguna'];
        }
        const withoutNone = prev.filter(c => c !== 'ninguna');
        return withoutNone.includes(value)
          ? withoutNone.filter(c => c !== value)
          : [...withoutNone, value];
      });
    },
    []
  );

  function validate(): string {
    if (!sex) return 'Selecciona tu sexo biológico.';
    const a = parseInt(age);
    if (!a || a < 15 || a > 100) return 'Introduce una edad válida (15-100).';
    const h = parseInt(height);
    if (!h || h < 100 || h > 250) return 'Introduce una altura válida (100-250 cm).';
    const w = parseFloat(weight);
    if (!w || w < 30 || w > 300) return 'Introduce un peso válido (30-300 kg).';
    if (targetWeight) {
      const tw = parseFloat(targetWeight);
      if (!tw || tw < 30 || tw > 300) return 'Peso objetivo inválido (30-300 kg).';
    }
    if (!goal) return 'Selecciona tu objetivo principal.';
    if (!activity) return 'Selecciona tu nivel de actividad.';
    if (!diet) return 'Selecciona tu preferencia dietética.';
    if (!experience) return 'Selecciona tu nivel de experiencia.';
    if (!equipment) return 'Selecciona dónde entrenas.';
    return '';
  }

  async function handleSubmit() {
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await submitQuestionnaire({
        sex,
        age: parseInt(age),
        height_cm: parseInt(height),
        weight_kg: parseFloat(weight),
        target_weight_kg: targetWeight ? parseFloat(targetWeight) : null,
        goal,
        activity_level: activity,
        dietary_preference: diet,
        health_conditions: health,
        training_experience: experience,
        training_days_per_week: days,
        training_equipment: equipment,
      });
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/');
      }
    } catch (err: any) {
      setError(err.message || 'Error generando el plan. Inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={NV.savia} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={12}>
            <Text style={styles.backText}>←</Text>
          </Pressable>
          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>Tu cuestionario</Text>
            <Text style={styles.subtitle}>
              {isEdit
                ? 'Actualiza tus datos y regenera tu plan'
                : 'Cuéntanos sobre ti para crear tu plan personalizado'}
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          {/* ─── Datos físicos ─── */}
          <Section title="Datos físicos">
            <Text style={styles.label}>Sexo biológico</Text>
            <View style={styles.chipRow}>
              {SEX_OPTIONS.map(opt => (
                <OptionChip
                  key={opt.value}
                  option={opt}
                  selected={sex === opt.value}
                  onPress={() => setSex(opt.value)}
                />
              ))}
            </View>

            <View style={styles.numGrid}>
              <NumField
                label="Edad"
                value={age}
                onChange={setAge}
                placeholder="28"
                suffix="años"
              />
              <NumField
                label="Altura"
                value={height}
                onChange={setHeight}
                placeholder="175"
                suffix="cm"
              />
              <NumField
                label="Peso"
                value={weight}
                onChange={setWeight}
                placeholder="80"
                suffix="kg"
              />
              <NumField
                label="Peso objetivo (opcional)"
                value={targetWeight}
                onChange={setTargetWeight}
                placeholder="75"
                suffix="kg"
              />
            </View>
          </Section>

          {/* ─── Objetivo ─── */}
          <Section title="Objetivo">
            <Text style={styles.label}>¿Qué quieres conseguir?</Text>
            <View style={styles.chipRow}>
              {GOAL_OPTIONS.map(opt => (
                <OptionChip
                  key={opt.value}
                  option={opt}
                  selected={goal === opt.value}
                  onPress={() => setGoal(opt.value)}
                />
              ))}
            </View>
          </Section>

          {/* ─── Actividad ─── */}
          <Section title="Nivel de actividad">
            <Text style={styles.label}>¿Cómo es tu día a día?</Text>
            <View style={styles.chipRow}>
              {ACTIVITY_OPTIONS.map(opt => (
                <OptionChip
                  key={opt.value}
                  option={opt}
                  selected={activity === opt.value}
                  onPress={() => setActivity(opt.value)}
                />
              ))}
            </View>
          </Section>

          {/* ─── Dieta ─── */}
          <Section title="Preferencia dietética">
            <Text style={styles.label}>¿Qué tipo de alimentación sigues?</Text>
            <View style={styles.chipRow}>
              {DIET_OPTIONS.map(opt => (
                <OptionChip
                  key={opt.value}
                  option={opt}
                  selected={diet === opt.value}
                  onPress={() => setDiet(opt.value)}
                />
              ))}
            </View>
          </Section>

          {/* ─── Entrenamiento ─── */}
          <Section title="Entrenamiento">
            <Text style={styles.label}>Experiencia en el gimnasio</Text>
            <View style={styles.chipRow}>
              {EXPERIENCE_OPTIONS.map(opt => (
                <OptionChip
                  key={opt.value}
                  option={opt}
                  selected={experience === opt.value}
                  onPress={() => setExperience(opt.value)}
                />
              ))}
            </View>

            <Text style={styles.label}>¿Dónde entrenas?</Text>
            <View style={styles.chipRow}>
              {EQUIPMENT_OPTIONS.map(opt => (
                <OptionChip
                  key={opt.value}
                  option={opt}
                  selected={equipment === opt.value}
                  onPress={() => setEquipment(opt.value)}
                />
              ))}
            </View>

            <Text style={styles.label}>Días por semana</Text>
            <View style={styles.chipRow}>
              {DAY_OPTIONS.map(d => (
                <Pressable
                  key={d}
                  onPress={() => setDays(d)}
                  style={[styles.dayChip, days === d && styles.chipSelected]}>
                  <Text
                    style={[
                      styles.dayChipText,
                      days === d && styles.chipTextSelected,
                    ]}>
                    {d}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Section>

          {/* ─── Salud ─── */}
          <Section title="Condiciones de salud">
            <Text style={styles.label}>
              Tu plan excluirá alimentos contraindicados. Selecciona todo lo que
              aplique.
            </Text>
            <View style={styles.chipRow}>
              {HEALTH_OPTIONS.map(opt => (
                <OptionChip
                  key={opt.value}
                  option={opt}
                  selected={health.includes(opt.value)}
                  onPress={() => toggleHealth(opt.value)}
                />
              ))}
            </View>
          </Section>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={({ pressed }) => [
              styles.submitBtn,
              pressed && styles.submitBtnPressed,
              submitting && styles.submitBtnDisabled,
            ]}
            onPress={handleSubmit}
            disabled={submitting}>
            {submitting ? (
              <View style={styles.submitLoading}>
                <ActivityIndicator color={NV.papel} />
                <Text style={styles.submitText}>Generando tu plan…</Text>
              </View>
            ) : (
              <Text style={styles.submitText}>
                {isEdit ? 'Actualizar mi plan' : 'Generar mi plan'}
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Subcomponentes ──────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function OptionChip({
  option,
  selected,
  onPress,
}: {
  option: Option;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {option.label}
      </Text>
    </Pressable>
  );
}

function NumField({
  label,
  value,
  onChange,
  placeholder,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  suffix: string;
}) {
  return (
    <View style={styles.numField}>
      <Text style={styles.numLabel}>{label}</Text>
      <View style={styles.numInputRow}>
        <TextInput
          style={styles.numInput}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={NV.textoTenue}
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={3}
        />
        <Text style={styles.numSuffix}>{suffix}</Text>
      </View>
    </View>
  );
}

// ─── Estilos ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: NV.papel },
  flex: { flex: 1 },
  center: {
    flex: 1,
    backgroundColor: NV.papel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
    borderBottomWidth: Border.structural,
    borderBottomColor: NV.tinta,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.none,
    backgroundColor: NV.papelAlt,
    borderWidth: Border.structural,
    borderColor: NV.tinta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { color: NV.savia700, fontFamily: Font.bold, fontSize: 20, fontWeight: '700' },
  headerTextWrap: { flex: 1 },
  title: { color: NV.tinta, fontFamily: Font.bold, fontSize: 20, fontWeight: '800' },
  subtitle: { color: NV.textoSuave, fontFamily: Font.regular, fontSize: 13, marginTop: 2 },
  content: { padding: Spacing.four, paddingBottom: Spacing.six, gap: Spacing.three },
  section: { gap: Spacing.two },
  sectionTitle: {
    color: NV.savia700,
    fontFamily: Font.medium,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingLeft: Spacing.one,
  },
  card: {
    backgroundColor: NV.papelAlt,
    borderRadius: Radius.none,
    padding: Spacing.three,
    borderWidth: Border.structural,
    borderColor: NV.tinta,
    gap: Spacing.three,
  },
  label: { color: NV.textoSuave, fontFamily: Font.medium, fontSize: 13, marginBottom: Spacing.one },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    backgroundColor: NV.hueso,
    borderRadius: Radius.none,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 4,
    borderWidth: Border.structural,
    borderColor: NV.tinta,
  },
  chipSelected: { backgroundColor: NV.savia, borderColor: NV.savia },
  chipText: { color: NV.textoSuave, fontFamily: Font.medium, fontSize: 14, fontWeight: '600' },
  chipTextSelected: { color: NV.papel, fontFamily: Font.bold, fontWeight: '700' },
  dayChip: {
    width: 40,
    height: 40,
    borderRadius: Radius.none,
    backgroundColor: NV.hueso,
    borderWidth: Border.structural,
    borderColor: NV.tinta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipText: { color: NV.textoSuave, fontFamily: Font.medium, fontSize: 15, fontWeight: '700' },
  numGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  numField: { flex: 1, minWidth: '42%' },
  numLabel: { color: NV.textoSuave, fontFamily: Font.medium, fontSize: 12, marginBottom: Spacing.one },
  numInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NV.hueso,
    borderRadius: Radius.none,
    borderWidth: Border.structural,
    borderColor: NV.tinta,
    paddingHorizontal: Spacing.three,
  },
  numInput: {
    flex: 1,
    color: NV.tinta,
    fontFamily: Font.regular,
    fontSize: 16,
    paddingVertical: 12,
    minWidth: 0,
  },
  numSuffix: { color: NV.textoSuave, fontFamily: Font.regular, fontSize: 13 },
  error: { color: NV.arcilla700, fontFamily: Font.regular, fontSize: 13, textAlign: 'center' },
  submitBtn: {
    backgroundColor: NV.savia,
    borderRadius: Radius.none,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  submitBtnPressed: { backgroundColor: NV.savia700 },
  submitBtnDisabled: { opacity: 0.6 },
  submitLoading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  submitText: { color: NV.papel, fontFamily: Font.bold, fontSize: 16, fontWeight: '800' },
});
