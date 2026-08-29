import { Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';

type Name = ComponentProps<typeof Ionicons>['name'];

// Iconos minimalistas (mismo espíritu que el rediseño web de NutroVia).
const GOLD = '#C9A84C';

export type IconName =
  | 'home'
  | 'restaurant'
  | 'barbell'
  | 'flask'
  | 'card'
  | 'camera'
  | 'flame'
  | 'body'
  | 'nutrition'
  | 'water'
  | 'checkmark-circle'
  | 'lock-closed'
  | 'sparkles'
  | 'arrow-forward'
  | 'calendar'
  | 'trophy'
  | 'trending-up'
  | 'document-text-outline'
  | 'refresh'
  | 'rotate-left'
  | 'medkit'
  | 'leaf'
  | 'flash'
  | 'warning';

const MAP: Record<IconName, Name> = {
  home: 'home-outline',
  restaurant: 'restaurant-outline',
  barbell: 'barbell-outline',
  flask: 'flask-outline',
  card: 'card-outline',
  camera: 'camera-outline',
  flame: 'flame',
  body: 'body-outline',
  nutrition: 'nutrition-outline',
  water: 'water-outline',
  'checkmark-circle': 'checkmark-circle',
  'lock-closed': 'lock-closed',
  sparkles: 'sparkles-outline',
  'arrow-forward': 'arrow-forward',
  calendar: 'calendar-outline',
  trophy: 'trophy-outline',
  'trending-up': 'trending-up-outline',
  'document-text-outline': 'document-text-outline',
  refresh: 'refresh-outline',
  'rotate-left': 'arrow-undo-outline',
  medkit: 'medkit-outline',
  leaf: 'leaf-outline',
  flash: 'flash-outline',
  warning: 'warning-outline',
};

/** Ícono minimalista del set de NutroVia. Usa Ionicons (multiplataforma). */
export function Icon({
  name,
  size = 18,
  color = GOLD,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return <Ionicons name={MAP[name]} size={size} color={color} />;
}