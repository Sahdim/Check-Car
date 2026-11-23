// Base de données : UNE seule interface, deux façons de ranger les données.
//  - « local »    : sur le téléphone (AsyncStorage). Utilisée par défaut, marche tout de suite.
//  - « supabase » : en ligne, quand Supabase est configuré (.env) ET que le garagiste est connecté.
// Le reste de l'appli n'utilise que `getDb()` et les fonctions de l'interface `Db`.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { supabase, supabaseEnabled } from './supabase';
import { toDataUri } from './photos';
import type { Item, Vehicle } from './types';
import { guessBrand, mkCode, newVehicleId, normCode, uid } from './utils';

export interface Db {
  kind: 'local' | 'supabase';
  listVehicles(): Promise<Vehicle[]>;
  getVehicle(id: string): Promise<Vehicle | null>;
  saveVehicle(v: Vehicle): Promise<Vehicle>;
  deleteVehicle(id: string): Promise<void>;
  getVehicleByCode(code: string): Promise<Vehicle | null>;
  /** Remplace tous les véhicules (restauration d'une sauvegarde) */
  replaceAll(vs: Vehicle[]): Promise<void>;
}

/* ---------- Mise à niveau des données (ancienne version -> nouvelle) ---------- */
export function upgradeVehicle(x: Partial<Vehicle> & Record<string, unknown>): Vehicle {
  const v = { ...x } as Vehicle;
  v.id = v.id || newVehicleId();
  v.items = Array.isArray(v.items) ? v.items : [];
  v.items = v.items.map((i: Partial<Item>) => {
    const parts = Array.isArray(i.parts) && i.parts.length ? i.parts : String(i.kind || '').split(/\s*,\s*/).filter(Boolean);
    return {
      id: i.id || uid(),
      date: i.date || '',
      kind: parts.join(', ') || String(i.kind || ''),
      parts,
      km: Number(i.km) || 0,
      price: Number(i.price) || 0,
      note: i.note || '',
    };
  });
  v.owner = v.owner || '';
  v.phone = v.phone || '';
  v.engine = v.engine || '';
  v.body = v.body || '';
  v.plate = v.plate || '';
  v.vin = v.vin || '';
  v.ct = v.ct || '';
  v.hp = Number(v.hp) || 0;
  v.year = Number(v.year) || 0;
  v.km = Number(v.km) || 0;
  v.interval = Number(v.interval) || 15000;
  v.intervalMonths = Number(v.intervalMonths) || 12;
  v.code = v.code ? normCode(v.code) : mkCode();
  if (!v.brand) {
    const b = guessBrand(v.name || v.model || '');
    v.brand = b;
    if (b && !v.model) v.model = String(v.name || '').replace(new RegExp('^\\s*' + b + '\\s*', 'i'), '').replace(/\s*\(\d{4}\)\s*$/, '').trim();
  }
  v.model = v.model || '';
  return v;
}

/* ---------- Données d'exemple (premier lancement) ---------- */
function seed(): Vehicle[] {
  const it = (date: string, parts: string[], km: number, note: string, price = 0): Item => ({ id: uid(), date, kind: parts.join(', '), parts, km, price, note });
  return [
    upgradeVehicle({
      id: newVehicleId(), example: true, owner: 'Exemple : Karim', phone: '06 00 00 00 00', brand: 'Renault', model: 'Clio IV', engine: '1.5 dCi', hp: 90, body: '5p',
      plate: 'AB-123-CD', year: 2016, km: 128400, interval: 15000, intervalMonths: 12, ct: '2027-01-15', code: mkCode(),
      items: [
        it('2026-09-14', ['Vidange', 'Filtre à huile'], 126900, 'Huile 5W30', 129),
        it('2026-03-02', ['Rotules'], 119500, 'Rotule de direction côté gauche', 85),
        it('2025-10-21', ['Plaquettes AV'], 112000, 'Plaquettes avant', 95),
      ],
    }),
    upgradeVehicle({
      id: newVehicleId(), example: true, owner: 'Exemple : Sophie', phone: '07 00 00 00 00', brand: 'Peugeot', model: '208', engine: '1.2 PureTech', hp: 82, body: '5p',
      plate: 'EF-456-GH', year: 2020, km: 61200, interval: 15000, intervalMonths: 12, ct: '', code: mkCode(),
      items: [it('2026-02-10', ['Vidange', 'Filtre à huile', 'Filtre à air'], 48800, 'Huile 0W30', 159)],
    }),
  ];
}

/* ---------- (a) Version locale : AsyncStorage ---------- */
const KEY = 'carnet-garage-v2';

async function readLocal(): Promise<Vehicle[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (raw == null) {
    const s = seed();
    await writeLocal(s);
    return s;
  }
  try {
    const d = JSON.parse(raw);
    return (Array.isArray(d.vehicles) ? d.vehicles : []).map(upgradeVehicle);
  } catch {
    return [];
  }
}
async function writeLocal(vs: Vehicle[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify({ version: 3, vehicles: vs }));
}

export const localDb: Db = {
  kind: 'local',
  listVehicles: readLocal,
  async getVehicle(id) {
    return (await readLocal()).find(v => v.id === id) || null;
  },
  async saveVehicle(v) {
    const vs = await readLocal();
    const i = vs.findIndex(x => x.id === v.id);
    if (i >= 0) vs[i] = v;
    else vs.unshift(v);
    await writeLocal(vs);
    return v;
  },
  async deleteVehicle(id) {
    await writeLocal((await readLocal()).filter(v => v.id !== id));
  },
  async getVehicleByCode(code) {
    const c = normCode(code);
    return (await readLocal()).find(v => v.code === c) || null;
  },
  async replaceAll(vs) {
    await writeLocal(vs.map(upgradeVehicle));
  },
};

/* ---------- (b) Version en ligne : Supabase ---------- */
type Row = Record<string, any>;
const toRow = (v: Vehicle): Row => ({
  id: v.id,
  owner: v.owner, phone: v.phone, brand: v.brand, model: v.model, engine: v.engine, hp: v.hp || null, body: v.body,
  plate: v.plate, vin: v.vin, year: v.year || null, km: v.km, interval_km: v.interval, interval_months: v.intervalMonths,
  ct: v.ct || null, code: v.code, items: v.items, photo_cg: v.photoCg || null, example: !!v.example,
});
const fromRow = (r: Row): Vehicle =>
  upgradeVehicle({
    id: r.id, owner: r.owner, phone: r.phone, brand: r.brand, model: r.model, engine: r.engine, hp: r.hp, body: r.body,
    plate: r.plate, vin: r.vin, year: r.year, km: r.km, interval: r.interval_km, intervalMonths: r.interval_months,
    ct: r.ct || '', code: r.code, items: r.items || [], photoCg: r.photo_cg || undefined, example: !!r.example,
  });
const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

export const supabaseDb: Db = {
  kind: 'supabase',
  async listVehicles() {
    const { data, error } = await supabase!.from('vehicles').select('*').order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(fromRow);
  },
  async getVehicle(id) {
    const { data, error } = await supabase!.from('vehicles').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? fromRow(data) : null;
  },
  async saveVehicle(v) {
    const { data: u } = await supabase!.auth.getUser();
    if (!u.user) throw new Error('Non connecté');
    const copy: Vehicle = { ...v, id: isUuid(v.id) ? v.id : Crypto.randomUUID() };
    copy.photoCg = await toDataUri(copy.photoCg); // la photo part en ligne sous forme de texte base64
    for (let essai = 0; essai < 3; essai++) {
      const { data, error } = await supabase!
        .from('vehicles')
        .upsert({ ...toRow(copy), garage_id: u.user.id, updated_at: new Date().toISOString() })
        .select()
        .single();
      if (!error) return fromRow(data);
      // code client déjà pris par un autre véhicule : on en tire un nouveau
      if (error.code === '23505' && /code/.test(error.message)) {
        copy.code = mkCode();
        continue;
      }
      throw new Error(error.message);
    }
    throw new Error("Impossible d'enregistrer le véhicule");
  },
  async deleteVehicle(id) {
    const { error } = await supabase!.from('vehicles').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
  async getVehicleByCode(code) {
    // Fonction SQL sécurisée : renvoie seulement le véhicule de ce code (voir supabase/schema.sql)
    const { data, error } = await supabase!.rpc('get_vehicle_by_code', { code: normCode(code) });
    if (error) throw new Error(error.message);
    const r = Array.isArray(data) ? data[0] : data;
    return r ? fromRow(r) : null;
  },
  async replaceAll(vs) {
    for (const v of vs) await supabaseDb.saveVehicle(upgradeVehicle(v));
  },
};

/* ---------- Choix automatique ---------- */
let connected = false;
export const setOnline = (on: boolean) => {
  connected = on && supabaseEnabled;
};
/** La base utilisée par le garagiste : Supabase si configuré ET connecté, sinon le téléphone. */
export const getDb = (): Db => (connected ? supabaseDb : localDb);
/** Recherche par code client : en ligne si Supabase est configuré, sinon sur ce téléphone. */
export const getVehicleByCode = (code: string) => (supabaseEnabled ? supabaseDb : localDb).getVehicleByCode(code);
