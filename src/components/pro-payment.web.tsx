import * as WebBrowser from 'expo-web-browser';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';

const GOLD = '#C9A84C';
const DARK = '#0D0D0D';
const MUTED = '#888880';

interface Props {
  onActivated: () => void;
  onError: (message: string) => void;
  onClose: () => void;
}

/**
 * Fallback web: Stripe PaymentSheet es un módulo nativo, no está disponible
 * en el navegador. Aquí redirigimos al flujo web de NutroVia.
 */
export default function ProPaymentWeb({ onClose }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        El pago con tarjeta está disponible en la app móvil o en la versión web.
      </Text>
      <Pressable
        style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
        onPress={() => {
          WebBrowser.openBrowserAsync('https://nutrovia.vercel.app');
          onClose();
        }}>
        <Text style={styles.btnText}>Abrir la web de NutroVia</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.three, paddingVertical: Spacing.two },
  text: { color: MUTED, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  btn: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnPressed: { opacity: 0.85 },
  btnText: { color: DARK, fontSize: 14, fontWeight: '800' },
});
