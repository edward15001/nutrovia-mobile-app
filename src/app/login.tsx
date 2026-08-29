import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { login, register } from '@/lib/auth';
import { Spacing } from '@/constants/theme';

const GOLD = '#C9A84C';
const DARK = '#0D0D0D';
const MUTED = '#888880';

export default function LoginScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    setError('');
    if (!email || !password || (mode === 'register' && !name)) {
      setError('Rellena todos los campos');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener mínimo 8 caracteres');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'register') {
        await register(name.trim(), email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
      // No navegar manualmente: el Stack.Protected de _layout.tsx cambia
      // a la pantalla (tabs) automáticamente cuando loggedIn pasa a true.
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.logo}>
            NUTROVIA<Text style={styles.logoDot}>.</Text>
          </Text>
          <Text style={styles.subtitle}>
            {mode === 'login' ? 'Bienvenido de nuevo' : 'Crea tu cuenta para empezar'}
          </Text>
        </View>

        <View style={styles.form}>
          {mode === 'register' && (
            <TextInput
              style={styles.input}
              placeholder="Tu nombre"
              placeholderTextColor={MUTED}
              value={name}
              onChangeText={setName}
              autoComplete="name"
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={MUTED}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            placeholderTextColor={MUTED}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={mode === 'register' ? 'new-password' : 'password'}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={handleSubmit}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color={DARK} />
            ) : (
              <Text style={styles.buttonText}>
                {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
              </Text>
            )}
          </Pressable>

          <Pressable onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
            <Text style={styles.switchText}>
              {mode === 'login'
                ? '¿No tienes cuenta? Regístrate'
                : '¿Ya tienes cuenta? Inicia sesión'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: DARK,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.five,
  },
  logo: {
    color: GOLD,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 4,
  },
  logoDot: {
    color: '#fff',
  },
  subtitle: {
    color: MUTED,
    marginTop: Spacing.two,
    fontSize: 15,
  },
  form: {
    gap: Spacing.three,
  },
  input: {
    backgroundColor: '#1A1A1A',
    color: '#E8E0D0',
    borderRadius: 10,
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  error: {
    color: '#E55B5B',
    fontSize: 13,
  },
  button: {
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: DARK,
    fontSize: 16,
    fontWeight: '700',
  },
  switchText: {
    color: GOLD,
    textAlign: 'center',
    marginTop: Spacing.two,
    fontSize: 14,
  },
});
