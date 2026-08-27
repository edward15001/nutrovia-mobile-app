import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/lib/api';
import { logout } from '@/lib/auth';
import { Spacing } from '@/constants/theme';
import TrialPayment from '@/components/trial-payment';

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
  trial: '🟡 Período de prueba',
  active: '🟢 Activa',
  cancelled: '🔴 Cancelada',
  expired: '⚫ Expirada',
  past_due: '🟠 Pago pendiente',
  none: 'Sin suscripción',
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
        <Text style={styles.title}>⭐ Mi Suscripción</Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Estado</Text>
          <Text style={styles.statusText}>{STATUS_LABELS[sub?.status || 'none'] || sub?.status}</Text>

          {sub?.status === 'trial' && sub.phase === 'prueba_gratuita' && (
            <Text style={styles.meta}>Quedan {sub.days_remaining_trial} días de prueba gratis</Text>
          )}
          {sub?.trial_end && <Text style={styles.meta}>Fin de prueba: {fmt(sub.trial_end)}</Text>}
          {sub?.next_billing_date && <Text style={styles.meta}>Próximo cobro: {fmt(sub.next_billing_date)}</Text>}
          {sub?.cancelled_at && <Text style={styles.meta}>Cancelada el: {fmt(sub.cancelled_at)}</Text>}
        </View>

        {(!sub || ['none', 'cancelled', 'expired'].includes(sub.status)) && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Activa tu prueba gratuita</Text>
            <Text style={styles.trialTitle}>🎁 7 días gratis</Text>
            <Text style={styles.meta}>
              {sub?.status === 'none'
                ? '25 €/mes después de la prueba · Cancela cuando quieras'
                : 'Reanuda tu plan · 25 €/mes · Cancela cuando quieras'}
            </Text>

            {!showPayment ? (
              <Pressable
                style={({ pressed }) => [styles.ctaBtn, pressed && styles.ctaBtnPressed]}
                onPress={() => {
                  setPayError('');
                  setShowPayment(true);
                }}>
                <Text style={styles.ctaText}>
                  {sub?.status === 'none' ? 'Activar prueba de 7 días' : 'Reactivar suscripción'}
                </Text>
              </Pressable>
            ) : (
              <TrialPayment
                onActivated={() => {
                  setShowPayment(false);
                  setPayError('');
                  load();
                }}
                onError={setPayError}
                onClose={() => setShowPayment(false)}
              />
            )}

            {payError ? <Text style={styles.payError}>{payError}</Text> : null}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Plan</Text>
          <Text style={styles.price}>
            25 €<Text style={styles.priceUnit}>/mes</Text>
          </Text>
          <Text style={styles.meta}>Plan NutroVia Personalizado · Cancela cuando quieras</Text>
        </View>

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
  title: { color: '#fff', fontSize: 22, fontWeight: '800' },
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
