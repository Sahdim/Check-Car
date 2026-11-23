// Base de données : UNE seule interface, deux façons de ranger les données.
//  - « local »    : sur le téléphone (AsyncStorage). Seulement quand Supabase n'est PAS configuré (développement).
//  - « supabase » : en ligne. Quand Supabase est configuré, l'espace pro EXIGE la connexion.
// Le reste de l'appli passe par le store (src/lib/store.tsx).
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { materializeDocs, uploadLocalDocs } from './docs';
import { toDataUri } from './photos';
import { supabase, supabaseEnabled } from './supabase';
import type { Doc, DtcEntry, Item, Vehicle } from './types';
import { guessBrand, mkCode, newVehicleId, normCode, uid } from './utils';

export interface Db {
  kind: 'local' | 'supabase';
  listVehicles(): Promise<Vehicle[]>;
  saveVehicle(v: Vehicle): Promise<Vehicle>;
  deleteVehicle(id: string): Promise<void>;
  getVehicleByCode(code: string): Promise<Vehicle | null>;
  /** Remplace tous les véhicules (restauration d'une sauvegarde) */
  replaceAll(vs: Vehicle[]): Promise<void>;
}

/* ---------- Messages d'erreur compréhensibles ---------- */
export function niceError(e: unknown): Error {
  const raw = String((e as any)?.message || e || 'Erreur inconnue');
  const code = String((e as any)?.code || '');
  if (/failed to fetch|network request failed|fetch failed|networkerror|load failed|timed? ?out/i.test(raw))
    return new Error('Pas de connexion internet. Réessaie quand le réseau revient.');
  if (code === 'PGRST204' || code === '42703' || /column .*(docs|dtc|dept)|'(docs|dtc|dept)' column/i.test(raw))
    return new Error('La base en ligne n’est pas à jour : exécute le fichier supabase/migration-002.sql dans Supabase (SQL Editor).');
  if (/jwt|refresh token|not authenticated|non connecté/i.test(raw)) return new Error('Session expirée : déconnecte-toi puis reconnecte-toi (Réglages).');
  if (/bucket not found/i.test(raw)) return new Error('Le dossier « rapports » n’existe pas dans Supabase : exécute supabase/migration-002.sql.');
  if (/row-level security|permission denied|unauthorized/i.test(raw)) return new Error('Accès refusé par la base en ligne. Vérifie que tu es connecté avec le compte du garage.');
  return new Error(raw);
}

/* ---------- Mise à niveau des données (ancienne version -> nouvelle) ---------- */
const str = (x: unknown) => (typeof x === 'string' ? x : x == null ? '' : String(x));

export function upgradeVehicle(x: Partial<Vehicle> & Record<string, unknown>): Vehicle {
  const v = { ...x } as Vehicle;
  v.id = v.id || newVehicleId();
  v.items = (Array.isArray(v.items) ? v.items : []).map((i: Partial<Item>) => {
    const parts = Array.isArray(i.parts) && i.parts.length ? i.parts.map(str) : str(i.kind).split(/\s*,\s*/).filter(Boolean);
    return {
      id: i.id || uid(),
      date: str(i.date),
      kind: parts.join(', ') || str(i.kind),
      parts,
      km: Number(i.km) || 0,
      price: Number(i.price) || 0,
      note: str(i.note),
    };
  });
  v.docs = (Array.isArray(v.docs) ? v.docs : [])
    .filter((d: Partial<Doc>) => d && typeof d.path === 'string' && d.path)
    .map((d: Partial<Doc>) => ({
      id: str(d.id) || uid(),
      title: str(d.title) || 'Document',
      date: str(d.date),
      path: str(d.path),
      type: d.type === 'image' ? 'image' : 'pdf',
      mime: str(d.mime) || (d.type === 'image' ? 'image/jpeg' : 'application/pdf'),
      size: Number(d.size) || 0,
    }));
  v.dtc = (Array.isArray(v.dtc) ? v.dtc : [])
    .filter((d: Partial<DtcEntry>) => d && d.code)
    .map((d: Partial<DtcEntry>) => ({ id: str(d.id) || uid(), code: str(d.code).toUpperCase(), date: str(d.date), km: Number(d.km) || 0, note: str(d.note) }));
  v.owner = str(v.owner);
  v.phone = str(v.phone);
  v.engine = str(v.engine);
  v.body = str(v.body);
  v.plate = str(v.plate);
  v.dept = str(v.dept).toUpperCase().slice(0, 3);
  v.vin = str(v.vin);
  v.ct = str(v.ct);
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
  v.brand = str(v.brand);
  v.model = str(v.model);
  return v;
}

/* ---------- Données d'exemple (premier lancement en mode local) ---------- */
function seed(): Vehicle[] {
  const it = (date: string, parts: string[], km: number, note: string, price = 0): Item => ({ id: uid(), date, kind: parts.join(', '), parts, km, price, note });
  return [
    upgradeVehicle({
      id: newVehicleId(), example: true, owner: 'Exemple : Karim', phone: '06 00 00 00 00', brand: 'Renault', model: 'Clio IV', engine: '1.5 dCi', hp: 90, body: '5p',
      plate: 'AB-123-CD', dept: '33', year: 2016, km: 128400, interval: 15000, intervalMonths: 12, ct: '2027-01-15', code: mkCode(),
      items: [
        it('2026-09-14', ['Vidange', 'Filtre à huile'], 126900, 'Huile 5W30', 129),
        it('2026-03-02', ['Rotules', 'Parallélisme'], 119500, 'Rotule de direction côté gauche', 85),
        it('2025-10-21', ['Plaquettes AV'], 112000, 'Plaquettes avant', 95),
      ],
      dtc: [{ id: uid(), code: 'P0299', date: '2026-09-14', km: 126900, note: 'Perte de puissance en côte' }],
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
  await AsyncStorage.setItem(KEY, JSON.stringify({ version: 4, vehicles: vs }));
}

/** Véhicules enregistrés sur ce téléphone, sans créer les exemples (pour « Envoyer les véhicules du téléphone ») */
export async function peekLocalVehicles(): Promise<Vehicle[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const d = JSON.parse(raw);
    return (Array.isArray(d.vehicles) ? d.vehicles : []).map(upgradeVehicle).filter((v: Vehicle) => !v.example);
  } catch {
    return [];
  }
}

export const localDb: Db = {
  kind: 'local',
  listVehicles: readLocal,
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
    const out: Vehicle[] = [];
    for (const v of vs) {
      const u = upgradeVehicle(v);
      u.docs = await materializeDocs(u.docs, u.id); // documents de la sauvegarde -> fichiers sur le téléphone
      out.push(u);
    }
    await writeLocal(out);
  },
};

/* ---------- (b) Version en ligne : Supabase ---------- */
type Row = Record<string, any>;
const toRow = (v: Vehicle): Row => ({
  id: v.id,
  owner: v.owner, phone: v.phone, brand: v.brand, model: v.model, engine: v.engine, hp: v.hp || null, body: v.body,
  plate: v.plate, dept: v.dept, vin: v.vin, year: v.year || null, km: v.km, interval_km: v.interval, interval_months: v.intervalMonths,
  ct: v.ct || null, code: v.code, items: v.items, docs: v.docs, dtc: v.dtc, photo_cg: v.photoCg || null, example: !!v.example,
});
export const fromRow = (r: Row): Vehicle =>
  upgradeVehicle({
    id: r.id, owner: r.owner, phone: r.phone, brand: r.brand, model: r.model, engine: r.engine, hp: r.hp, body: r.body,
    plate: r.plate, dept: r.dept, vin: r.vin, year: r.year, km: r.km, interval: r.interval_km, intervalMonths: r.interval_months,
    ct: r.ct || '', code: r.code, items: r.items || [], docs: r.docs || [], dtc: r.dtc || [], photoCg: r.photo_cg || undefined, example: !!r.example,
  });
const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

/** Identifiant du compte garage connecté (lu dans la session enregistrée, sans internet) */
export async function currentUserId(): Promise<string> {
  const { data } = await supabase!.auth.getSession();
  const id = data.session?.user?.id;
  if (!id) throw new Error('Non connecté');
  return id;
}

export const supabaseDb: Db = {
  kind: 'supabase',
  async listVehicles() {
    try {
      const { data, error } = await supabase!.from('vehicles').select('*').order('updated_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(fromRow);
    } catch (e) {
      throw niceError(e);
    }
  },
  async saveVehicle(v) {
    try {
      const userId = await currentUserId();
      const copy: Vehicle = { ...v, id: isUuid(v.id) ? v.id : Crypto.randomUUID() };
      copy.photoCg = await toDataUri(copy.photoCg); // la photo part en ligne sous forme de texte base64
      copy.docs = await uploadLocalDocs(copy.docs, userId, copy.id); // documents restés sur le téléphone -> envoyés en ligne
      for (let essai = 0; essai < 3; essai++) {
        const { data, error } = await supabase!
          .from('vehicles')
          .upsert({ ...toRow(copy), garage_id: userId, updated_at: new Date().toISOString() })
          .select()
          .single();
        if (!error) return fromRow(data);
        // code client déjà pris par un autre véhicule : on en tire un nouveau
        if (error.code === '23505' && /code/.test(error.message)) {
          copy.code = mkCode();
          continue;
        }
        throw error;
      }
      throw new Error("Impossible d'enregistrer le véhicule");
    } catch (e) {
      throw niceError(e);
    }
  },
  async deleteVehicle(id) {
    const { error } = await supabase!.from('vehicles').delete().eq('id', id);
    if (error) throw niceError(error);
  },
  async getVehicleByCode(code) {
    // Fonction SQL sécurisée : renvoie seulement le véhicule de ce code, sans téléphone, photo ni garage (voir supabase/schema.sql)
    try {
      const { data, error } = await supabase!.rpc('get_vehicle_by_code', { code: normCode(code) });
      if (error) throw error;
      const r = Array.isArray(data) ? data[0] : data;
      if (!r) return null;
      const v = fromRow(r);
      v.phone = '';
      v.photoCg = undefined;
      return v;
    } catch (e) {
      throw niceError(e);
    }
  },
  async replaceAll(vs) {
    for (const v of vs) await supabaseDb.saveVehicle(upgradeVehicle(v));
  },
};

/** La base du garagiste : en ligne si Supabase est configuré (connexion obligatoire), sinon le téléphone. */
export const getDb = (): Db => (supabaseEnabled ? supabaseDb : localDb);
/** Recherche par code client : en ligne si Supabase est configuré, sinon sur ce téléphone (développement). */
export const getVehicleByCode = (code: string) => getDb().getVehicleByCode(code);
