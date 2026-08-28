import { api } from './api';

// ─── Tipos ───────────────────────────────────────────────────

export interface QuestionnaireAnswers {
  sex: string;
  age: number;
  height_cm: number;
  weight_kg: number;
  target_weight_kg: number | null;
  goal: string;
  activity_level: string;
  dietary_preference: string;
  health_conditions: string[];
  training_experience: string;
  training_days_per_week: number;
  training_equipment: string;
}

export interface Option {
  value: string;
  label: string;
}

// ─── Opciones (mismas que el cuestionario web) ───────────────

export const SEX_OPTIONS: Option[] = [
  { value: 'hombre', label: 'Hombre' },
  { value: 'mujer', label: 'Mujer' },
];

export const GOAL_OPTIONS: Option[] = [
  { value: 'perder_peso', label: 'Perder peso' },
  { value: 'ganar_masa', label: 'Ganar masa' },
  { value: 'mantener', label: 'Mantener' },
  { value: 'mejorar_salud', label: 'Mejorar salud' },
];

export const ACTIVITY_OPTIONS: Option[] = [
  { value: 'sedentario', label: 'Sedentario' },
  { value: 'ligero', label: 'Ligero' },
  { value: 'moderado', label: 'Moderado' },
  { value: 'activo', label: 'Activo' },
  { value: 'muy_activo', label: 'Muy activo' },
];

export const DIET_OPTIONS: Option[] = [
  { value: 'omnivoro', label: 'Omnívoro' },
  { value: 'vegetariano', label: 'Vegetariano' },
  { value: 'vegano', label: 'Vegano' },
  { value: 'sin_gluten', label: 'Sin gluten' },
  { value: 'sin_lactosa', label: 'Sin lactosa' },
];

export const EXPERIENCE_OPTIONS: Option[] = [
  { value: 'principiante', label: 'Principiante' },
  { value: 'intermedio', label: 'Intermedio' },
  { value: 'avanzado', label: 'Avanzado' },
];

export const EQUIPMENT_OPTIONS: Option[] = [
  { value: 'casa', label: 'En casa' },
  { value: 'gimnasio', label: 'Gimnasio' },
  { value: 'mixto', label: 'Mixto' },
];

export const HEALTH_OPTIONS: Option[] = [
  { value: 'ninguna', label: 'Ninguna' },
  { value: 'diabetes', label: 'Diabetes' },
  { value: 'hipertension', label: 'Hipertensión' },
  { value: 'celiaquia', label: 'Celiaquía' },
  { value: 'colesterol', label: 'Colesterol alto' },
  { value: 'hipotiroidismo', label: 'Hipotiroidismo' },
];

// ─── Envío al backend ────────────────────────────────────────

/**
 * Envía las respuestas y genera/actualiza el plan en el servidor.
 * 'ninguna' en health_conditions se filtra: el backend espera la lista
 * de condiciones reales (vacía si no hay ninguna).
 */
export async function submitQuestionnaire(answers: QuestionnaireAnswers) {
  return api('/api/questionnaire', {
    method: 'POST',
    body: {
      ...answers,
      health_conditions: answers.health_conditions.filter(c => c !== 'ninguna'),
    },
  });
}
