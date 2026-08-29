import { api } from './api';

export interface Meal {
  nombre: string;
  calorias: number;
  ingredientes: string[];
}

export interface DayMenu {
  desayuno: Meal;
  almuerzo: Meal;
  comida: Meal;
  merienda: Meal;
  cena: Meal;
}

export interface TrainingSession {
  dia: string;
  tipo: string;
  ejercicios: string[];
}

export interface TrainingPlan {
  nivel: string;
  objetivo: string;
  dias_semana: number;
  equipamiento: string;
  sesiones: TrainingSession[];
  progresion: string[];
  notas: string[];
}

export interface Supplement {
  nombre: string;
  dosis: string;
  motivo: string;
}

export interface PlanProfile {
  goal: string;
  activity_level: string;
  dietary_preference: string;
  sex: string;
  age: number;
  weight_kg: number;
  height_cm: number;
  target_weight_kg: number | null;
  health_conditions: string[];
  training_experience: string;
  training_days_per_week: number;
  training_equipment: string;
}

export interface PlanAccess {
  tier: 'free' | 'pro';
  isPro: boolean;
  canRegenerate: boolean;
  features?: { ia: boolean; supplements: boolean; checkins: boolean; mealDetail: boolean };
}

export interface NutritionPlan {
  access?: PlanAccess;
  daily_calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  weekly_menu: Record<string, DayMenu>;
  training_plan: TrainingPlan;
  supplements: Supplement[];
  notas_dieta: string[];
  consejos_generales: string[];
  profile: PlanProfile;
  generated_at: string;
}

export async function getPlan(): Promise<NutritionPlan | null> {
  try {
    return await api<NutritionPlan>('/api/plan');
  } catch (err: any) {
    // 404 = no tiene plan todavía
    if (err.status === 404) return null;
    throw err;
  }
}

/**
 * Intercambia una comida de un día por otra del mismo tipo de otro día.
 * Endpoint: POST /api/plan/swap (exclusivo de Pro). Devuelve el menú completo
 * ya persistido por el backend.
 */
export async function swapMeal(
  day: string,
  mealKey: keyof DayMenu,
  replacement: Meal
): Promise<Record<string, DayMenu>> {
  const data = await api<{ menu: Record<string, DayMenu> }>('/api/plan/swap', {
    method: 'POST',
    body: { day, meal_key: mealKey, replacement },
  });
  return data.menu;
}

/**
 * ¿El usuario tiene acceso Pro? Prioriza el campo access que devuelve /api/plan;
 * para planes antiguos sin él, deriva del estado de la suscripción que traiga.
 */
export function isPro(plan: NutritionPlan | null | undefined): boolean {
  if (plan?.access?.isPro !== undefined) return plan.access.isPro;
  const anyPlan = plan as any;
  if (typeof anyPlan?.sub_status === 'string') {
    return ['trial', 'active', 'past_due'].includes(anyPlan.sub_status);
  }
  return false;
}
