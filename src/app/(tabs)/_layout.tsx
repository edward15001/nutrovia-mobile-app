import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Border, Font, NV } from '@/constants/nutrovia';

// Color de dominio por pestaña: activa = celda entera rellena en `active`,
// icono y etiqueta en papel. Inactiva: siempre en tinta suave neutra, sin
// fondo — el color solo aparece al seleccionar.
const TAB_COLORS: Record<string, { active: string; icon: string }> = {
  index: { active: NV.savia, icon: 'home-outline' },
  nutrition: { active: NV.savia, icon: 'restaurant-outline' },
  training: { active: NV.arcilla, icon: 'barbell-outline' },
  supplements: { active: NV.malva, icon: 'flask-outline' },
  subscription: { active: NV.ambar, icon: 'card-outline' },
};

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: NV.papelAlt, borderTopWidth: Border.structural, borderTopColor: NV.tinta, paddingBottom: insets.bottom }}>
      {state.routes.map((route: any, index: number) => {
        const cfg = TAB_COLORS[route.name];
        if (!cfg) return null; // cámara: oculta de la barra por ahora
        const { options } = descriptors[route.key];
        const label = options.title ?? route.name;
        const focused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 8,
              backgroundColor: focused ? cfg.active : 'transparent',
            }}>
            <Ionicons name={cfg.icon as any} size={20} color={focused ? NV.papel : NV.textoSuave} />
            <Text style={{ fontFamily: Font.medium, fontSize: 11, letterSpacing: 0.2, marginTop: 2, color: focused ? NV.papel : NV.textoSuave }}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={props => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Hoy' }} />
      {/* Oculta de la barra por ahora (sin quitar la pantalla ni su ruta): la
          cámara se integrará en el flujo de "Comer" más adelante. */}
      <Tabs.Screen name="camera" options={{ href: null }} />
      <Tabs.Screen name="nutrition" options={{ title: 'Comer' }} />
      <Tabs.Screen name="training" options={{ title: 'Entrenar' }} />
      <Tabs.Screen name="supplements" options={{ title: 'Suplem.' }} />
      <Tabs.Screen name="subscription" options={{ title: 'Cuenta' }} />
    </Tabs>
  );
}
