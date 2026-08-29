import { api } from './api';

export interface CheckinStatus {
  has_plan: boolean;
  due: boolean;
  pro_only?: boolean;
  days_since_last_activity?: number;
  checkin_interval_days?: number;
}

/** ¿Toca preguntar "¿Cómo va ese progreso?"? (exclusivo de Pro) */
export function getCheckinStatus(): Promise<CheckinStatus> {
  return api<CheckinStatus>('/api/checkin/status');
}

/** Registra la respuesta del usuario al check-in semanal. */
export function respondCheckin(response: 'all_good' | 'want_change'): Promise<{ message: string }> {
  return api('/api/checkin/respond', {
    method: 'POST',
    body: { response },
  });
}
