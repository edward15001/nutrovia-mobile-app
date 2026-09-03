import { Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';

import { NV } from '@/constants/nutrovia';

type Name = ComponentProps<typeof Ionicons>['name'];

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

/**
 * Ícono del set de NutroVia (Ionicons outline, multiplataforma).
 *
 * Por defecto va en tinta: un icono acompaña a una etiqueta, no la sustituye
 * ni pide atención. En savia solo cuando marca un estado conseguido; en el
 * color del dominio (arcilla, malva, ámbar) cuando clasifica.
 */
export function Icon({
  name,
  size = 18,
  color = NV.tinta,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return <Ionicons name={MAP[name]} size={size} color={color} />;
}
