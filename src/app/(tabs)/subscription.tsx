import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/lib/api';
import { logout } from '@/lib/auth';
import { Spacing } from '@/constants/theme';
import TrialPayment from '@/components/trial-payment';
import { Icon } from '@/components/icon';

const GOLD = '#C9A84C';
const DARK = '#0D0D0D';
const MUTED = '#888880';

interface SubscriptionStatus {
  status: string;
  trial_start?: string;
  trial_end?: string;
  next_billing_date?: string;
  cancelled_at?: string;
  phase?: string;
  days_remaining_trial?: number;
  days_to_charge?: number;
}

interface Payment {
  amount_eur: string;
  status: string;
  paid_at?: string;
  stripe_invoice_id?: string;
}

const STATUS_LABELS: Record<string, string> = {
  trial: '🟡 Período de prueba Pro',
  active: '🟢 Pro activa',
  cancelled: '🔴 Cancelada',
  expired: '⚫ Expirada',
  past_due: '🟠 Pago pendiente',
  none: '🟢 Plan gratuito',
};

const PAYMENT_LABELS: Record<string, string> = {
  paid: '✅ Pagado',
  failed: '❌ Fallido',
  pending: '⏳ Pendiente',
  refunded: '↩️ Reembolsado',
};

function fmt(dateStr?: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function SubscriptionScreen() {
  const [sub, setSub] = useState<SubscriptionStatus | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [payError, setPayError] = useState('');

  const load = useCallback(async () => {
    try {
      const [s, p] = await Promise.all([
        api<SubscriptionStatus>('/api/subscription/status'),
        api<{ payments: Payment[] }>('/api/subscription/history'),
      ]);
      setSub(s);
      setPayments(p.payments || []);
    } catch {
      // sin sesión o error
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={GOLD} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <Icon name="card" size={20} />
          <Text style={styles.title}>Mi Suscripción</Text>
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.cardLabel}>Estado actual</Text>
          <Text style={styles.statusText}>{STATUS_LABELS[sub?.status || 'none'] || sub?.status}</Text>
          {sub?.status === 'trial' && sub.phase === 'prueba_gratuita' && <Text style={styles.meta}>Quedan {sub.days_remaining_trial} días de prueba gratis</Text>}
        </View>

        <View style={styles.planGrid}>
          <View style={[styles.planCard, (!sub || ['none', 'cancelled', 'expired'].includes(sub.status)) && styles.planCardCurrent]}>
            <View style={styles.planHeader}>
              <Text style={styles.planName}>Free</Text>
              {(!sub || ['none', 'cancelled', 'expired'].includes(sub.status)) && <Text style={styles.currentBadge}>ACTUAL</Text>}
            </View>
            <Text style={styles.planPrice}>0 €<Text style={styles.priceUnit}> / siempre</Text></Text>
            <Text style={styles.planFeature}>✓ Plan personalizado</Text>
            <Text style={styles.planFeature}>✓ Calorías y macros</Text>
            <Text style={styles.planFeature}>✓ Regeneraciones limitadas</Text>
            <Text style={styles.planMuted}>— Menú detallado y suplementos</Text>
          </View>

          <View style={[styles.planCard, styles.planCardPro, sub?.status && !['none', 'cancelled', 'expired'].includes(sub.status) && styles.planCardCurrent]}>
            <View style={styles.planHeader}>
              <Text style={styles.planName}>Pro</Text>
              {sub?.status && !['none', 'cancelled', 'expired'].includes(sub.status) && <Text style={styles.currentBadge}>ACTUAL</Text>}
            </View>
            <Text style={styles.planPrice}>14 €<Text style={styles.priceUnit}> / mes</Text></Text>
            <Text style={styles.planFeature}>✓ Menú semanal detallado</Text>
            <Text style={styles.planFeature}>✓ IA y suplementación</Text>
            <Text style={styles.planFeature}>✓ Check-ins de progreso</Text>
            <Text style={styles.planFeature}>✓ Regeneraciones ilimitadas</Text>
            {(!sub || ['none', 'cancelled', 'expired'].includes(sub.status)) && <Pressable style={({ pressed }) => [styles.ctaBtn, pressed && styles.ctaBtnPressed]} onPress={() => { setPayError(''); setShowPayment(true); }}><Text style={styles.ctaText}>Actualizar a Pro →</Text></Pressable>}
          </View>
        </View>

        {sub && !['none', 'cancelled', 'expired'].includes(sub.status) && (sub.next_billing_date || sub.cancelled_at) && (
          <View style={styles.detailsCard}>
            <Text style={styles.cardLabel}>Detalles Pro</Text>
            {sub.next_billing_date && <View style={styles.detailRow}><Text style={styles.meta}>Próximo cobro</Text><Text style={styles.detailValue}>{fmt(sub.next_billing_date)}</Text></View>}
            {sub.cancelled_at && <View style={styles.detailRow}><Text style={styles.meta}>Cancelada el</Text><Text style={styles.detailValue}>{fmt(sub.cancelled_at)}</Text></View>}
          </View>
        )}

        {showPayment && (
          <TrialPayment
            onActivated={() => { setShowPayment(false); setPayError(''); load(); }}
            onError={setPayError}
            onClose={() => setShowPayment(false)}
          />
        )}
        {payError ? <Text style={styles.payError}>{payError}</Text> : null}

        {payments.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Historial de pagos</Text>
            {payments.map((p, i) => (
              <View key={i} style={styles.paymentRow}>
                <Text style={styles.paymentAmount}>{p.amount_eur} €</Text>
                <Text style={styles.paymentDate}>{p.paid_at ? fmt(p.paid_at) : '—'}</Text>
                <Text style={styles.paymentStatus}>{PAYMENT_LABELS[p.status] || p.status}</Text>
              </View>
            ))}
          </View>
        )}

        <Pressable style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.7 }]} onPress={handleLogout}>
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </Pressable>
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
  statusCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  planGrid: { gap: Spacing.two },
  planCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    gap: 8,
  },
  planCardCurrent: { borderColor: GOLD },
  planCardPro: { backgroundColor: 'rgba(201,168,76,0.1)', borderColor: 'rgba(201,168,76,0.4)' },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planName: { color: '#fff', fontSize: 18, fontWeight: '800' },
  currentBadge: { color: GOLD, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  planPrice: { color: GOLD, fontSize: 28, fontWeight: '900', marginVertical: 4 },
  planFeature: { color: '#fff', fontSize: 13, lineHeight: 19 },
  planMuted: { color: MUTED, fontSize: 13, lineHeight: 19 },
  detailsCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#2A2A2A' },
  detailValue: { color: '#fff', fontSize: 13, fontWeight: '700', textAlign: 'right' },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  cardLabel: { color: GOLD, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.two },
  statusText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  price: { color: GOLD, fontSize: 28, fontWeight: '800' },
  priceUnit: { fontSize: 14, color: MUTED, fontWeight: '400' },
  meta: { color: MUTED, fontSize: 13, marginTop: Spacing.one, lineHeight: 19 },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  paymentAmount: { color: '#fff', fontSize: 14, fontWeight: '700', flex: 1 },
  paymentDate: { color: MUTED, fontSize: 12 },
  paymentStatus: { color: '#fff', fontSize: 12, fontWeight: '600' },
  trialTitle: { color: GOLD, fontSize: 24, fontWeight: '800', marginTop: Spacing.one },
  ctaBtn: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: Spacing.three,
  },
  ctaBtnPressed: { opacity: 0.85 },
  ctaText: { color: DARK, fontSize: 15, fontWeight: '800' },
  payError: { color: '#E55B5B', fontSize: 13, marginTop: Spacing.two, textAlign: 'center' },
  logoutBtn: {
    borderWidth: 1,
    borderColor: '#E55B5B',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: Spacing.three,
  },
  logoutText: { color: '#E55B5B', fontSize: 14, fontWeight: '600' },
});
