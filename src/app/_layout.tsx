import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

import { isLoggedIn, onAuthChange } from '@/lib/auth';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      const ok = await isLoggedIn();
      if (mounted) setLoggedIn(ok);
    };

    // Estado inicial + re-comprobación cuando cambia la sesión
    // (login, registro o logout) para que los guards se actualicen.
    check().finally(() => SplashScreen.hideAsync());
    const unsubscribe = onAuthChange(check);

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  if (loggedIn === null) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Splash inicial (siempre visible al arrancar), luego redirige a login o al panel */}
        <Stack.Screen name="splash" />
        <Stack.Protected guard={loggedIn}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="questionnaire" />
        </Stack.Protected>
        <Stack.Protected guard={!loggedIn}>
          <Stack.Screen name="login" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
