import { api } from './api';

// ─── Tipos ───────────────────────────────────────────────────

export interface FoodItem {
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface FoodAnalysis {
  items: FoodItem[];
  total: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
  overview: string;
  safety_warning: string | null;
  matches_plan: 'dentro' | 'fuera' | null;
  feedback: string;
  meal_type: string;
}

export interface FoodEntry {
  id: string;
  meal_type: string | null;
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  source: string;
  matches_plan: 'dentro' | 'fuera' | null;
  feedback: string | null;
  created_at: string;
}

export interface FoodDaySummary {
  date: string;
  entries: FoodEntry[];
  total: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
  plan: { daily_calories: number; protein_g: number; carbs_g: number; fat_g: number } | null;
  remaining: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  } | null;
  exceeded: {
    calories: boolean;
    protein_g: boolean;
    carbs_g: boolean;
    fat_g: boolean;
  } | null;
  streak: number;
  goal_met: boolean;
}

// ─── API ─────────────────────────────────────────────────────

/** Analiza una foto de comida (base64) y devuelve lo que hay en el plato. */
export function analyzeFood(image: string): Promise<FoodAnalysis> {
  return api<FoodAnalysis>('/api/foodlog/analyze', {
    method: 'POST',
    body: { image },
  });
}

/** Guarda una comida confirmada en el diario. */
export async function logFood(data: {
  name: string;
  calories: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  meal_type?: string | null;
  source?: string;
  matches_plan?: 'dentro' | 'fuera' | null;
  feedback?: string | null;
}): Promise<FoodEntry & FoodDaySummary> {
  return api<any>('/api/foodlog', {
    method: 'POST',
    body: data,
  });
}

/** Resumen del día: entradas, restante, streak. */
export function getTodaySummary(): Promise<FoodDaySummary> {
  return api<FoodDaySummary>('/api/foodlog/today');
}

/** Elimina una entrada del diario. */
export async function deleteFood(id: string): Promise<FoodDaySummary> {
  return api<any>(`/api/foodlog/${id}`, { method: 'DELETE' });
}