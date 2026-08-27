import { Tabs } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

const GOLD = '#C9A84C';
const DARK = '#0D0D0D';

function TabIcon({ icon, color }: { icon: string; color: any }) {
  return <Text style={[styles.icon, { color }]}>{icon}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#111', borderTopColor: '#222' },
        tabBarActiveTintColor: GOLD,
        tabBarInactiveTintColor: '#888880',
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Resumen',
          tabBarIcon: ({ color }) => <TabIcon icon="🏠" color={color} />,
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          title: 'Nutrición',
          tabBarIcon: ({ color }) => <TabIcon icon="🥗" color={color} />,
        }}
      />
      <Tabs.Screen
        name="training"
        options={{
          title: 'Entreno',
          tabBarIcon: ({ color }) => <TabIcon icon="💪" color={color} />,
        }}
      />
      <Tabs.Screen
        name="supplements"
        options={{
          title: 'Suplementos',
          tabBarIcon: ({ color }) => <TabIcon icon="💊" color={color} />,
        }}
      />
      <Tabs.Screen
        name="subscription"
        options={{
          title: 'Suscripción',
          tabBarIcon: ({ color }) => <TabIcon icon="⭐" color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  icon: {
    fontSize: 20,
  },
});
