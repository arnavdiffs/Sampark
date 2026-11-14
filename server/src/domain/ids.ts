import { randomUUID } from 'crypto';

export function generateId(prefix: 'agt' | 'sess' | 'tsk' | 'ctx' | 'evt' | 'cor'): string {
  const hex = randomUUID().replace(/-/g, '').slice(0, 10);
  return `${prefix}_${hex}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function hoursFromNowIso(hours: number): string {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}
