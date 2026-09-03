import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { Border, Font, NV } from '@/constants/nutrovia';

function TabIcon({ name, color }: { name: any; color: any }) {
  return <Ionicons name={name} size={20} color={color} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Barra en papel elevado con filete de 2px en tinta: la misma
        // estructura que separa las secciones en la web.
        tabBarStyle: {
          backgroundColor: NV.papelAlt,
          borderTopColor: NV.tinta,
          borderTopWidth: Border.structural,
        },
        tabBarLabelStyle: { fontFamily: Font.medium, fontSize: 11, letterSpacing: 0.2 },
        tabBarActiveTintColor: NV.savia700,
        tabBarInactiveTintColor: NV.textoSuave,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Resumen',
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="camera"
        options={{
          title: 'Cámara',
          tabBarIcon: ({ color }) => <TabIcon name="camera" color={color} />,
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          title: 'Nutrición',
          tabBarIcon: ({ color }) => <TabIcon name="restaurant" color={color} />,
        }}
      />
      <Tabs.Screen
        name="training"
        options={{
          title: 'Entreno',
          tabBarIcon: ({ color }) => <TabIcon name="barbell" color={color} />,
        }}
      />
      <Tabs.Screen
        name="supplements"
        options={{
          title: 'Suplementos',
          tabBarIcon: ({ color }) => <TabIcon name="flask" color={color} />,
        }}
      />
      <Tabs.Screen
        name="subscription"
        options={{
          title: 'Suscripción',
          tabBarIcon: ({ color }) => <TabIcon name="card" color={color} />,
        }}
      />
    </Tabs>
  );
}
