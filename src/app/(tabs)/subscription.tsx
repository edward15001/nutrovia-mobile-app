import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/lib/api';
import { logout } from '@/lib/auth';
import { Spacing } from '@/constants/theme';
import { Border, Font, NV, Radius } from '@/constants/nutrovia';
import ProPayment from '@/components/pro-payment';
import { Icon } from '@/components/icon';

interface SubscriptionStatus {
  status: string;
  next_billing_date?: string;
}

interface Payment {
  amount_eur: string;
  status: string;
  paid_at?: string;
  stripe_invoice_id?: string;
}

// El usuario no cancela nada: o decide no pagar (plan gratuito, gratis para
// siempre) o decide pagar (Pro). Los estados 'cancelled'/'expired' del backend
// se muestran como el plan gratuito.
const STATUS_LABELS: Record<string, string> = {
  active: 'Pro activa',
  cancelled: 'Plan gratuito',
  expired: 'Plan gratuito',
  past_due: 'Pago pendiente',
  none: 'Plan gratuito',
};

const PAYMENT_LABELS: Record<string, string> = {
  paid: 'Pagado',
  failed: 'Fallido',
  pending: 'Pendiente',
  refunded: 'Reembolsado',
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
    // No navegar manualmente: el Stack.Protected de _layout.tsx muestra la
    // pantalla login automáticamente cuando loggedIn pasa a false.
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={NV.savia} />
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
          {(!sub || ['none', 'cancelled', 'expired'].includes(sub.status)) && (
            <Text style={styles.meta}>Gratis para siempre. Actualiza a Pro cuando quieras.</Text>
          )}
          {sub?.status === 'active' && sub.next_billing_date && (
            <Text style={styles.meta}>Próximo cobro: {fmt(sub.next_billing_date)}</Text>
          )}
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
            {(!sub || ['none', 'cancelled', 'expired'].includes(sub.status)) && <Pressable style={({ pressed }) => [styles.ctaBtn, pressed && styles.ctaBtnPressed]} onPress={() => { setPayError(''); setShowPayment(true); }}><Text style={styles.ctaText}>Actualizar a Pro · 14 €/mes</Text></Pressable>}
          </View>
        </View>

        {sub?.status === 'active' && sub.next_billing_date && (
          <View style={styles.detailsCard}>
            <Text style={styles.cardLabel}>Detalles Pro</Text>
            <View style={styles.detailRow}><Text style={styles.meta}>Próximo cobro</Text><Text style={styles.detailValue}>{fmt(sub.next_billing_date)}</Text></View>
          </View>
        )}

        {showPayment && (
          <ProPayment
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
  safeArea: { flex: 1, backgroundColor: NV.papel },
  center: { flex: 1, backgroundColor: NV.papel, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: NV.tinta, fontFamily: Font.bold, fontSize: 22, fontWeight: '800' },
  statusCard: {
    backgroundColor: NV.papelAlt,
    borderRadius: Radius.none,
    padding: Spacing.three,
    borderWidth: Border.structural,
    borderColor: NV.tinta,
  },
  planGrid: { gap: Spacing.two },
  planCard: {
    backgroundColor: NV.papelAlt,
    borderRadius: Radius.none,
    padding: Spacing.three,
    borderWidth: Border.structural,
    borderColor: NV.tinta,
    gap: 8,
  },
  planCardCurrent: { borderColor: NV.savia },
  planCardPro: { backgroundColor: NV.savia100, borderColor: NV.savia },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planName: { color: NV.tinta, fontFamily: Font.bold, fontSize: 18, fontWeight: '800' },
  currentBadge: { color: NV.savia700, fontFamily: Font.bold, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  planPrice: { color: NV.savia700, fontFamily: Font.bold, fontSize: 28, fontWeight: '900', marginVertical: 4, fontVariant: ['tabular-nums'] },
  planFeature: { color: NV.tinta, fontFamily: Font.regular, fontSize: 13, lineHeight: 19 },
  planMuted: { color: NV.textoSuave, fontFamily: Font.regular, fontSize: 13, lineHeight: 19 },
  detailsCard: {
    backgroundColor: NV.papelAlt,
    borderRadius: Radius.none,
    padding: Spacing.three,
    borderWidth: Border.structural,
    borderColor: NV.tinta,
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two, paddingVertical: 8, borderBottomWidth: Border.inner, borderBottomColor: NV.fileteSuave },
  detailValue: { color: NV.tinta, fontFamily: Font.bold, fontSize: 13, fontWeight: '700', textAlign: 'right' },
  card: {
    backgroundColor: NV.papelAlt,
    borderRadius: Radius.none,
    padding: Spacing.three,
    borderWidth: Border.structural,
    borderColor: NV.tinta,
  },
  cardLabel: { color: NV.savia700, fontFamily: Font.medium, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.two },
  statusText: { color: NV.tinta, fontFamily: Font.bold, fontSize: 18, fontWeight: '800' },
  price: { color: NV.savia700, fontFamily: Font.bold, fontSize: 28, fontWeight: '800', fontVariant: ['tabular-nums'] },
  priceUnit: { fontFamily: Font.regular, fontSize: 14, color: NV.textoSuave, fontWeight: '400' },
  meta: { color: NV.textoSuave, fontFamily: Font.regular, fontSize: 13, marginTop: Spacing.one, lineHeight: 19 },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderBottomWidth: Border.inner,
    borderBottomColor: NV.fileteSuave,
  },
  paymentAmount: { color: NV.tinta, fontFamily: Font.bold, fontSize: 14, fontWeight: '700', flex: 1, fontVariant: ['tabular-nums'] },
  paymentDate: { color: NV.textoSuave, fontFamily: Font.regular, fontSize: 12 },
  paymentStatus: { color: NV.tinta, fontFamily: Font.medium, fontSize: 12, fontWeight: '600' },
  ctaBtn: {
    backgroundColor: NV.savia,
    borderRadius: Radius.none,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: Spacing.three,
  },
  ctaBtnPressed: { backgroundColor: NV.savia700 },
  ctaText: { color: NV.papel, fontFamily: Font.bold, fontSize: 15, fontWeight: '800' },
  payError: { color: NV.arcilla700, fontFamily: Font.regular, fontSize: 13, marginTop: Spacing.two, textAlign: 'center' },
  logoutBtn: {
    borderWidth: Border.structural,
    borderColor: NV.arcilla,
    borderRadius: Radius.none,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: Spacing.three,
  },
  logoutText: { color: NV.arcilla700, fontFamily: Font.medium, fontSize: 14, fontWeight: '600' },
});
