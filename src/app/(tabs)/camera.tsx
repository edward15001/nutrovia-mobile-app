import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { analyzeFood, FoodAnalysis, logFood } from '@/lib/foodlog';
import { Spacing } from '@/constants/theme';

const GOLD = '#C9A84C';
const DARK = '#0D0D0D';
const MUTED = '#888880';

export default function CameraScreen() {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<FoodAnalysis | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Reiniciar estado visual al volver a la pestaña
  useFocusEffect(
    useCallback(() => {
      setResult(null);
      setSaved(false);
      return;
    }, [])
  );

  async function takeAndAnalyze() {
    if (!cameraRef.current) return;
    try {
      setAnalyzing(true);
      setSaved(false);
      const photo = await cameraRef.current.takePictureAsync({
        // quality baja para que el payload no exceda el límite del backend
        quality: 0.5,
        base64: true,
        skipProcessing: true,
      });

      // En web photo.uri llega como data URI; en nativo construimos uno
      // a partir del campo base64.
      let dataUrl: string;
      if (Platform.OS === 'web' && typeof photo.uri === 'string' && photo.uri.startsWith('data:image/')) {
        dataUrl = photo.uri;
      } else if (photo.base64) {
        dataUrl = `data:image/jpeg;base64,${photo.base64}`;
      } else if (typeof photo.uri === 'string') {
        dataUrl = photo.uri;
      } else {
        throw new Error('No se pudo obtener la imagen');
      }

      const analysis = await analyzeFood(dataUrl);
      setResult(analysis);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo analizar la imagen. Inténtalo de nuevo.');
    } finally {
      setAnalyzing(false);
    }
  }

  async function confirmSave() {
    if (!result) return;
    setSaving(true);
    try {
      await logFood({
        name: result.overview || result.items[0]?.name || 'Comida',
        calories: Math.round(result.total.calories),
        protein_g: Math.round(result.total.protein_g),
        carbs_g: Math.round(result.total.carbs_g),
        fat_g: Math.round(result.total.fat_g),
        meal_type: result.meal_type,
        source: 'camera',
        matches_plan: result.matches_plan,
        feedback: result.feedback,
      });
      setSaved(true);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo guardar. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  // ── Estados intermedios de permiso ──
  if (!permission) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={GOLD} />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.permissionEmoji}>📷</Text>
        <Text style={styles.permissionTitle}>Necesitamos tu cámara</Text>
        <Text style={styles.permissionText}>
          Fotografía tu plato para que la IA lo analice y te diga si cuadra con tu plan.
        </Text>
        <Pressable style={({ pressed }) => [styles.permissionBtn, pressed && styles.pressed]} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Permitir cámara</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // ── Resultado del análisis ──
  if (saved) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.savedTitle}>Comida registrada</Text>
        <Text style={styles.savedText}>Ya aparece en tu diario del día y se descontó de tus kcal.</Text>
        <Pressable style={({ pressed }) => [styles.permissionBtn, pressed && styles.pressed]} onPress={() => { setResult(null); setSaved(false); }}>
          <Text style={styles.permissionBtnText}>Registrar otra comida</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (result) {
    const fits = result.matches_plan === 'dentro';
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <Text style={styles.title}>🍽️ Tu plato</Text>

          {result.safety_warning ? (
            <View style={styles.safetyBox}>
              <Text style={styles.safetyText}>{result.safety_warning}</Text>
            </View>
          ) : null}

          <View style={[styles.fitBox, fits ? styles.fitGood : styles.fitBad]}>
            <Text style={styles.fitBadge}>{fits ? 'Encaja con tu plan' : 'Cuidado'}</Text>
            <Text style={[styles.fitText, !fits && styles.fitTextBad]}>{result.feedback}</Text>
          </View>

          <View style={styles.totalCard}>
            <Text style={styles.totalKcal}>{Math.round(result.total.calories)}</Text>
            <Text style={styles.totalUnit}>kcal</Text>
            <View style={styles.macroRow}>
              <View style={styles.macroPill}><Text style={styles.macroText}>P {Math.round(result.total.protein_g)}g</Text></View>
              <View style={styles.macroPill}><Text style={styles.macroText}>C {Math.round(result.total.carbs_g)}g</Text></View>
              <View style={styles.macroPill}><Text style={styles.macroText}>G {Math.round(result.total.fat_g)}g</Text></View>
            </View>
          </View>

          {result.items.length > 1 && (
            <View style={styles.itemsBox}>
              <Text style={styles.itemsTitle}>Detalle</Text>
              {result.items.map((it, i) => (
                <View key={i} style={styles.itemRow}>
                  <Text style={styles.itemName} numberOfLines={2}>{it.name}</Text>
                  <Text style={styles.itemKcal}>{Math.round(it.calories)} kcal</Text>
                </View>
              ))}
            </View>
          )}

          <Pressable style={({ pressed }) => [styles.saveBtn, (pressed || saving) && styles.pressed]} onPress={confirmSave} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? 'Guardando...' : 'Guardar en mi diario'}</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.retakeBtn, pressed && styles.pressed]} onPress={() => setResult(null)} disabled={saving}>
            <Text style={styles.retakeBtnText}>Volver a fotografiar</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Vista principal: cámara ──
  return (
    <SafeAreaView style={styles.safeArea}>
      <Text style={styles.title}>📷 Foto de tu comida</Text>
      <Text style={styles.subtitle}>
        Enfoca tu plato y dispara. La IA lo reconoce y te dice los valores.
      </Text>

      <View style={styles.cameraWrap}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back" />
        {analyzing && (
          <View style={styles.analyzingOverlay}>
            <ActivityIndicator size="large" color={GOLD} />
            <Text style={styles.analyzingText}>Analizando tu plato con IA...</Text>
          </View>
        )}
      </View>

      <Pressable
        style={({ pressed }) => [styles.shutter, pressed && styles.shutterPressed]}
        onPress={takeAndAnalyze}
        disabled={analyzing}>
        <View style={styles.shutterInner} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: DARK },
  center: { flex: 1, backgroundColor: DARK, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  scroll: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  title: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: MUTED, fontSize: 13, textAlign: 'center', lineHeight: 19 },

  cameraWrap: { flex: 1, marginTop: Spacing.three, borderRadius: 16, overflow: 'hidden', backgroundColor: '#000' },
  camera: { flex: 1, width: '100%' },
  analyzingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    gap: Spacing.two,
  },
  analyzingText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  shutter: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: GOLD,
    marginTop: Spacing.four,
    marginBottom: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  shutterPressed: { opacity: 0.7 },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: GOLD },

  permissionEmoji: { fontSize: 48, marginBottom: Spacing.three },
  permissionTitle: { color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  permissionText: { color: MUTED, fontSize: 14, textAlign: 'center', marginTop: Spacing.two, lineHeight: 20 },
  permissionBtn: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: Spacing.four,
    marginTop: Spacing.four,
  },
  permissionBtnText: { color: DARK, fontSize: 15, fontWeight: '800' },
  pressed: { opacity: 0.85 },

  safetyBox: { backgroundColor: 'rgba(229,91,91,0.12)', borderColor: 'rgba(229,91,91,0.4)', borderWidth: 1, borderRadius: 10, padding: Spacing.three },
  safetyText: { color: '#E55B5B', fontSize: 13, lineHeight: 19 },

  fitBox: { padding: Spacing.three, borderRadius: 12, borderWidth: 1 },
  fitGood: { backgroundColor: 'rgba(76,175,80,0.12)', borderColor: 'rgba(76,175,80,0.4)' },
  fitBad: { backgroundColor: 'rgba(201,168,76,0.1)', borderColor: 'rgba(201,168,76,0.4)' },
  fitBadge: { color: '#fff', fontSize: 15, fontWeight: '800' },
  fitText: { color: '#C5E8C7', fontSize: 13, marginTop: Spacing.one, lineHeight: 19 },
  fitTextBad: { color: '#E8D9A0' },

  totalCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: Spacing.four,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  totalKcal: { color: GOLD, fontSize: 44, fontWeight: '900' },
  totalUnit: { color: MUTED, fontSize: 14 },
  macroRow: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.three },
  macroPill: { backgroundColor: '#2A2A2A', borderRadius: 8, paddingHorizontal: Spacing.two, paddingVertical: 6 },
  macroText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  itemsBox: { gap: Spacing.two },
  itemsTitle: { color: GOLD, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  itemName: { color: '#fff', fontSize: 13, flex: 1 },
  itemKcal: { color: MUTED, fontSize: 13, fontWeight: '600' },

  saveBtn: { backgroundColor: GOLD, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: Spacing.two },
  saveBtnText: { color: DARK, fontSize: 15, fontWeight: '800' },
  retakeBtn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  retakeBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  savedTitle: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  savedText: { color: MUTED, fontSize: 14, textAlign: 'center', marginTop: Spacing.two, lineHeight: 20 },
});