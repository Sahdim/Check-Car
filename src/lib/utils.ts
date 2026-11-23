// Petits outils (dates, kilomètres, prix, plaque, marques), repris de l'ancienne version.
import * as Crypto from 'expo-crypto';
import type { Vehicle } from './types';

const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

export const uid = () => 'i' + Crypto.randomUUID().replace(/-/g, '').slice(0, 10);
export const newVehicleId = () => Crypto.randomUUID();
export const norm = (t: unknown) =>
  String(t ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

const nf = (n: number, max = 0) => {
  // toLocaleString n'est pas toujours complet sur Android : on formate à la main
  const neg = n < 0;
  const [ent, dec] = Math.abs(n).toFixed(max).split('.');
  const s = ent.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const d = dec && /[1-9]/.test(dec) ? ',' + dec.replace(/0+$/, '') : '';
  return (neg ? '-' : '') + s + d;
};
export const fmtKm = (n: unknown) => nf(Number(n) || 0) + ' km';
export const fmtEur = (n: unknown) => nf(Number(n) || 0, 2) + ' €';

const pad = (n: number) => String(n).padStart(2, '0');
export const isoDate = (d: Date) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
export const today = () => isoDate(new Date());
export const isValidDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(new Date(d + 'T12:00:00').getTime());
export const fmtDate = (d: string) => {
  const p = String(d || '').split('-');
  return p.length < 3 ? String(d || '') : +p[2] + ' ' + MOIS[+p[1] - 1] + ' ' + p[0];
};
export const fmtDateShort = (d: string) => {
  const p = String(d || '').split('-');
  return p.length < 3 ? { day: String(d || ''), year: '' } : { day: +p[2] + ' ' + MOIS[+p[1] - 1].replace('.', ''), year: p[0] };
};
// Date française JJ/MM/AAAA <-> AAAA-MM-JJ (pour les champs de saisie)
export const toFr = (d: string) => (isValidDate(d) ? d.slice(8, 10) + '/' + d.slice(5, 7) + '/' + d.slice(0, 4) : '');
export const fromFr = (s: string) => {
  const m = String(s || '').trim().match(/^(\d{1,2})[/.\-\s](\d{1,2})[/.\-\s](\d{4})$/);
  if (!m) return '';
  const iso = m[3] + '-' + pad(+m[2]) + '-' + pad(+m[1]);
  return isValidDate(iso) ? iso : '';
};
// Ajoute les « / » pendant la saisie d'une date
export const maskDate = (s: string) => {
  const d = s.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return d.slice(0, 2) + '/' + d.slice(2);
  return d.slice(0, 2) + '/' + d.slice(2, 4) + '/' + d.slice(4);
};
export const addMonths = (d: string, m: number) => {
  const x = new Date(d + 'T12:00:00');
  x.setMonth(x.getMonth() + m);
  return isoDate(x);
};
export const daysUntil = (d: string) =>
  Math.round((new Date(d + 'T12:00:00').getTime() - new Date(today() + 'T12:00:00').getTime()) / 86400000);
export const byDate = (a: { date: string; km?: number }, b: { date: string; km?: number }) =>
  a.date < b.date ? 1 : a.date > b.date ? -1 : (b.km || 0) - (a.km || 0);

// Code client XXXX-XXXX, sans caractères qui se confondent (0/O, 1/I/L)
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const mkCode = () => {
  const a = Crypto.getRandomBytes(8);
  let o = '';
  for (let i = 0; i < 8; i++) {
    o += CODE_CHARS[a[i] % CODE_CHARS.length];
    if (i === 3) o += '-';
  }
  return o;
};
export const normCode = (c: string) => {
  const s = String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return s.length === 8 ? s.slice(0, 4) + '-' + s.slice(4) : s;
};
export const maskCode = (c: string) => {
  const s = String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  return s.length > 4 ? s.slice(0, 4) + '-' + s.slice(4) : s;
};

// Plaque française AA-123-AA (formatée pendant la saisie)
export const fmtPlate = (p: string) => {
  const s = String(p || '').toUpperCase().replace(/[\s-]+/g, '');
  const m = s.match(/^([A-Z]{2})(\d{3})([A-Z]{2})$/);
  return m ? m[1] + '-' + m[2] + '-' + m[3] : String(p || '').toUpperCase().trim();
};
export const maskPlate = (p: string) => {
  const s = String(p || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  // format SIV : 2 lettres, 3 chiffres, 2 lettres
  if (/^[A-Z]{1,2}$/.test(s) || /^[A-Z]{2}\d{1,3}$/.test(s) || /^[A-Z]{2}\d{3}[A-Z]{1,2}$/.test(s)) {
    let o = s.slice(0, 2);
    if (s.length > 2) o += '-' + s.slice(2, 5);
    if (s.length > 5) o += '-' + s.slice(5, 7);
    return o;
  }
  return String(p || '').toUpperCase(); // ancienne plaque ou étrangère : on laisse tel quel
};

export const BODIES: [string, string][] = [
  ['', 'Non précisée'], ['5p', 'Citadine / compacte 5 portes'], ['3p', 'Citadine / compacte 3 portes'], ['berline', 'Berline'],
  ['break', 'Break'], ['monospace', 'Monospace'], ['suv', 'SUV / 4x4'], ['coupe', 'Coupé'], ['cabriolet', 'Cabriolet'], ['utilitaire', 'Utilitaire / fourgon'],
];
export const MARQUES = ['Renault', 'Peugeot', 'Citroën', 'Dacia', 'DS', 'Volkswagen', 'Audi', 'Seat', 'Cupra', 'Skoda', 'BMW', 'Mini', 'Mercedes-Benz', 'Opel', 'Ford', 'Fiat', 'Alfa Romeo',
  'Lancia', 'Jeep', 'Toyota', 'Lexus', 'Nissan', 'Honda', 'Mazda', 'Mitsubishi', 'Suzuki', 'Hyundai', 'Kia', 'Volvo', 'Tesla', 'Smart', 'Land Rover', 'Porsche', 'MG', 'Iveco'];

export const normBrand = (b: string) => {
  const t = String(b || '').trim();
  const k = (x: string) => norm(x).replace(/[^a-z0-9]/g, ''); // « MERCEDES BENZ » = « Mercedes-Benz »
  return MARQUES.find(m => k(m) === k(t)) || t;
};

const GUESS: Record<string, string> = {
  megane: 'Renault', clio: 'Renault', scenic: 'Renault', laguna: 'Renault', twingo: 'Renault', kangoo: 'Renault', captur: 'Renault', espace: 'Renault', kadjar: 'Renault', modus: 'Renault', trafic: 'Renault', master: 'Renault',
  sandero: 'Dacia', duster: 'Dacia', logan: 'Dacia', lodgy: 'Dacia', dokker: 'Dacia', jogger: 'Dacia', spring: 'Dacia',
  golf: 'Volkswagen', polo: 'Volkswagen', touran: 'Volkswagen', passat: 'Volkswagen', tiguan: 'Volkswagen', caddy: 'Volkswagen', transporter: 'Volkswagen',
  picasso: 'Citroën', berlingo: 'Citroën', saxo: 'Citroën', xsara: 'Citroën', jumpy: 'Citroën', jumper: 'Citroën', c1: 'Citroën', c2: 'Citroën', c3: 'Citroën', c4: 'Citroën', c5: 'Citroën',
  partner: 'Peugeot', expert: 'Peugeot', boxer: 'Peugeot', corsa: 'Opel', astra: 'Opel', zafira: 'Opel', meriva: 'Opel', fiesta: 'Ford', focus: 'Ford', kuga: 'Ford', transit: 'Ford',
  ibiza: 'Seat', leon: 'Seat', fabia: 'Skoda', octavia: 'Skoda', yaris: 'Toyota', auris: 'Toyota', corolla: 'Toyota', qashqai: 'Nissan', micra: 'Nissan', juke: 'Nissan', punto: 'Fiat', panda: 'Fiat',
};
// Devine la marque à partir du modèle (« Clio IV » -> Renault, « 308 » -> Peugeot)
export const guessBrand = (name: string) => {
  const n = norm(name);
  if (/^(1|2|3|5)0\d\b/.test(n) || /\b(106|206|207|208|306|307|308|406|407|508|2008|3008|5008)\b/.test(n)) return 'Peugeot';
  for (const k in GUESS) if (new RegExp('\\b' + k + '\\b').test(n)) return GUESS[k];
  return '';
};

export const vName = (v: Vehicle) => [v.brand, v.model, v.engine].filter(Boolean).join(' ') || v.name || 'Véhicule';
export const vTitle = (v: Vehicle) => (v.brand ? v.brand.toUpperCase() + ' ' + (v.model || '') : v.name || 'Véhicule').trim();
export const vSub = (v: Vehicle) => {
  const p: string[] = [];
  if (v.engine) p.push(v.engine);
  if (v.hp) p.push(v.hp + ' ch');
  if (v.year) p.push(String(v.year));
  return p.join(' · ');
};
