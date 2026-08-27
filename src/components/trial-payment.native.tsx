import { StripeProvider, useStripe } from '@stripe/stripe-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { api } from '@/lib/api';

const GOLD = '#C9A84C';
const MUTED = '#888880';

interface Props {
  onActivated: () => void;
  onError: (message: string) => void;
  onClose: () => void;
}

/**
 * Flujo de activación de la prueba gratuita con Stripe PaymentSheet.
 * 1. POST /api/subscription/setup-intent → client_secret + publishable_key
 * 2. PaymentSheet guarda la tarjeta (SetupIntent) sin cobrar
 * 3. POST /api/subscription/start con setup_intent_id → prueba 7 días
 */
export default function TrialPayment({ onActivated, onError, onClose }: Props) {
  const [clientSecret, setClientSecret] = useState('');
  const [publishableKey, setPublishableKey] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await api<{ client_secret: string; publishable_key: string }>(
          '/api/subscription/setup-intent',
          { method: 'POST' }
        );
        if (!data.client_secret || !data.publishable_key) {
          throw new Error('Respuesta de pago inválida');
        }
        setClientSecret(data.client_secret);
        setPublishableKey(data.publishable_key);
        setReady(true);
      } catch (err: any) {
        onError(err.message || 'No se pudo preparar el pago');
        onClose();
      }
    })();
  }, [onClose, onError]);

  if (!ready) {
    return (
      <View style={styles.loadingRow}>
        <ActivityIndicator color={GOLD} />
        <Text style={styles.loadingText}>Preparando pago seguro…</Text>
      </View>
    );
  }

  return (
    <StripeProvider publishableKey={publishableKey}>
      <PaymentSheetLauncher
        clientSecret={clientSecret}
        onActivated={onActivated}
        onError={onError}
        onClose={onClose}
      />
    </StripeProvider>
  );
}

function PaymentSheetLauncher({
  clientSecret,
  onActivated,
  onError,
  onClose,
}: Props & { clientSecret: string }) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const launched = useRef(false);

  useEffect(() => {
    if (launched.current) return;
    launched.current = true;

    (async () => {
      try {
        const { error: initError } = await initPaymentSheet({
          setupIntentClientSecret: clientSecret,
          merchantDisplayName: 'NutroVia',
          style: 'alwaysDark',
        });
        if (initError) {
          onError(initError.message || 'No se pudo iniciar el pago');
          onClose();
          return;
        }

        const { error: presentError } = await presentPaymentSheet();
        if (presentError) {
          if (presentError.code === 'Canceled') {
            onClose();
            return;
          }
          onError(
            presentError.localizedMessage ||
              presentError.message ||
              'No se pudo completar el pago'
          );
          onClose();
          return;
        }

        // Éxito: el SetupIntent ya está confirmado. El ID va codificado en
        // el client_secret (seti_xxx_secret_yyy → seti_xxx).
        const setupIntentId = clientSecret.split('_secret_')[0];
        await api('/api/subscription/start', {
          method: 'POST',
          body: { setup_intent_id: setupIntentId },
        });
        onActivated();
      } catch (err: any) {
        onError(err.message || 'Error al activar la prueba gratuita');
        onClose();
      }
    })();
  }, [clientSecret, onActivated, onClose, onError]);

  return (
    <View style={styles.loadingRow}>
      <ActivityIndicator color={GOLD} />
      <Text style={styles.loadingText}>Activando tu prueba gratuita…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  loadingText: { color: MUTED, fontSize: 14 },
});
