import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { isLoggedIn } from '@/lib/auth';
import { Icon } from '@/components/icon';

const GOLD = '#C9A84C';
const DARK = '#0D0D0D';
const MUTED = '#888880';

/** Splash de bienvenida con animación del logo. Tras unos instantes lleva a
 *  login (sin sesión) o al panel (con sesión). */
export default function SplashScreen() {
  useEffect(() => {
    const t = setTimeout(async () => {
      const ok = await isLoggedIn();
      router.replace(ok ? '/(tabs)' : '/login');
    }, 1900);
    return () => clearTimeout(t);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.center}>
        <Animated.View entering={ZoomIn.duration(700).delay(100)} style={styles.logoBadge}>
          <Icon name="nutrition" size={46} color="#0D0D0D" />
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(700).delay(350)}>
          <Text style={styles.logo}>
            NUTROVIA<Text style={styles.logoDot}>.</Text>
          </Text>
        </Animated.View>

        <Animated.Text entering={FadeInDown.duration(700).delay(600)} style={styles.tagline}>
          Tu nutrición y entrenamiento personalizado
        </Animated.Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: DARK },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  logoBadge: {
    width: 92,
    height: 92,
    borderRadius: 24,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: GOLD,
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  logo: {
    color: GOLD,
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 5,
  },
  logoDot: {
    color: '#fff',
  },
  tagline: {
    color: MUTED,
    fontSize: 14,
    textAlign: 'center',
    letterSpacing: 1,
  },
});