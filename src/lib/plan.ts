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

export interface NutritionPlan {
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
