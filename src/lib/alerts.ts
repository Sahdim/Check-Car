// Rappels : vidange (au km OU à la date, le premier des deux) et contrôle technique.
import type { Level } from './theme';
import type { Vehicle } from './types';
import { addMonths, byDate, daysUntil, fmtDate, fmtKm } from './utils';
import { isOilChange } from './parts';

export type Alert = { level: Level; txt: string; detail?: string; kind: 'vidange' | 'ct' };

export function alerts(v: Vehicle): Alert[] {
  const out: Alert[] = [];
  const last = v.items.filter(isOilChange).sort(byDate)[0];
  if (!last) out.push({ level: 'warn', txt: 'Aucune vidange notée', kind: 'vidange' });
  else {
    const due = (+last.km || 0) + (+v.interval || 15000);
    const left = due - (+v.km || 0);
    const dueDate = addMonths(last.date, +v.intervalMonths || 12);
    const days = daysUntil(dueDate);
    const detail = 'Prévue à ' + fmtKm(due) + ' ou le ' + fmtDate(dueDate) + ' (le premier des deux)';
    if (left <= 0) out.push({ level: 'bad', txt: 'Vidange dépassée de ' + fmtKm(-left), detail, kind: 'vidange' });
    else if (days < 0) out.push({ level: 'bad', txt: 'Vidange dépassée (date : ' + fmtDate(dueDate) + ')', detail, kind: 'vidange' });
    else if (left <= 2000) out.push({ level: 'warn', txt: 'Vidange dans ' + fmtKm(left), detail, kind: 'vidange' });
    else if (days <= 30) out.push({ level: 'warn', txt: 'Vidange avant le ' + fmtDate(dueDate), detail, kind: 'vidange' });
    else out.push({ level: 'ok', txt: 'Vidange dans ' + fmtKm(left), detail, kind: 'vidange' });
  }
  if (v.ct) {
    const d = daysUntil(v.ct);
    if (d < 0) out.push({ level: 'bad', txt: 'Contrôle technique dépassé (' + fmtDate(v.ct) + ')', kind: 'ct' });
    else if (d <= 45) out.push({ level: 'warn', txt: 'Contrôle technique avant le ' + fmtDate(v.ct), kind: 'ct' });
    else out.push({ level: 'ok', txt: 'Contrôle technique : ' + fmtDate(v.ct), kind: 'ct' });
  }
  return out;
}

const RANK: Record<Level, number> = { bad: 2, warn: 1, ok: 0 };
export const worstAlert = (v: Vehicle): Alert => alerts(v).sort((a, b) => RANK[b.level] - RANK[a.level])[0];
export const urgency = (v: Vehicle) => RANK[worstAlert(v).level];
