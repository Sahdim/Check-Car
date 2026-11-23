// État partagé de l'appli : espace client (liste de codes) ou espace pro (garagiste connecté).
//
// Règle : l'appli s'ouvre sur l'espace client. L'espace pro demande la connexion Supabase
// (e-mail + mot de passe). Une fois connecté, on reste dans l'espace pro jusqu'à « Se déconnecter ».
// Si Supabase n'est pas configuré (développement), l'espace pro marche en local sans connexion.
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getDb, getVehicleByCode, peekLocalVehicles, supabaseDb } from './db';
import { removeDocFiles } from './docs';
import { deletePhoto } from './photos';
import { supabase, supabaseEnabled } from './supabase';
import type { Garage, Mode, Vehicle } from './types';
import { normCode } from './utils';

const SETTINGS_KEY = 'carnet-garage-reglages';
const CLIENT_CACHE_KEY = 'checkcar-client-cache';

type Settings = {
  mode: Mode; // seulement sans Supabase : 'garage' = espace pro local
  garage: Garage;
  clientCodes: string[]; // codes des véhicules suivis dans l'espace client
  proEmail: string; // compte garage connecté (Supabase)
};
const DEFAULTS: Settings = { mode: null, garage: { name: '', phone: '', address: '' }, clientCodes: [], proEmail: '' };

export type ClientCar = { code: string; v: Vehicle | null; status: 'ok' | 'missing' | 'error' | 'loading'; error?: string };

type Store = {
  ready: boolean;
  settings: Settings;
  /** true = espace pro (garagiste) */
  isGarage: boolean;
  setGarage(g: Garage): Promise<void>;
  // Espace pro
  vehicles: Vehicle[];
  loading: boolean;
  error: string;
  refresh(): Promise<void>;
  saveVehicle(v: Vehicle): Promise<Vehicle>;
  deleteVehicle(id: string): Promise<void>;
  replaceAll(vs: Vehicle[]): Promise<void>;
  userEmail: string;
  signIn(email: string, password: string): Promise<void>;
  resetPassword(email: string, redirectTo: string): Promise<void>;
  signOut(): Promise<void>;
  enterLocalPro(): Promise<void>;
  localCount(): Promise<number>;
  pushLocalToOnline(): Promise<number>;
  // Espace client
  clientCars: ClientCar[];
  clientLoading: boolean;
  refreshClient(): Promise<void>;
  /** Ajoute un code. Renvoie un message d'erreur, ou '' si c'est bon. */
  addClientCode(code: string): Promise<string>;
  removeClientCode(code: string): Promise<void>;
};

const Ctx = createContext<Store | null>(null);

const authMessage = (m: string) => {
  if (/invalid login credentials/i.test(m)) return 'E-mail ou mot de passe incorrect.';
  if (/email not confirmed/i.test(m)) return 'Adresse e-mail pas encore confirmée (voir le tableau de bord Supabase).';
  if (/failed to fetch|network request failed|fetch failed/i.test(m)) return 'Pas de connexion internet.';
  if (/rate limit|too many/i.test(m)) return 'Trop d’essais. Attends quelques minutes puis réessaie.';
  return m;
};

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const settingsRef = useRef<Settings>(DEFAULTS);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cache, setCache] = useState<Record<string, ClientCar>>({});
  const [clientLoading, setClientLoading] = useState(false);

  const isGarage = supabaseEnabled ? !!settings.proEmail : settings.mode === 'garage';

  const patch = useCallback(async (p: Partial<Settings>) => {
    const s = { ...settingsRef.current, ...p };
    settingsRef.current = s;
    setSettings(s);
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    } catch {
      // stockage plein : on garde en mémoire
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setVehicles(await getDb().listVehicles());
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  // Démarrage : réglages, cache client, session en ligne
  useEffect(() => {
    let alive = true;
    (async () => {
      let s = DEFAULTS;
      try {
        const raw = await AsyncStorage.getItem(SETTINGS_KEY);
        if (raw) {
          const d = JSON.parse(raw);
          const codes: string[] = Array.isArray(d.clientCodes) ? d.clientCodes : d.clientCode ? [d.clientCode] : []; // ancien format : un seul code
          s = {
            mode: d.mode === 'garage' ? 'garage' : null,
            garage: { ...DEFAULTS.garage, ...(d.garage || {}) },
            clientCodes: [...new Set(codes.map(normCode).filter(Boolean))],
            proEmail: typeof d.proEmail === 'string' ? d.proEmail : '',
          };
        }
      } catch {
        // réglages illisibles : valeurs par défaut
      }
      try {
        const rawC = await AsyncStorage.getItem(CLIENT_CACHE_KEY);
        if (rawC && alive) {
          const c = JSON.parse(rawC) as Record<string, Vehicle>;
          const m: Record<string, ClientCar> = {};
          for (const k in c) m[k] = { code: k, v: c[k], status: 'ok' };
          setCache(m);
        }
      } catch {
        // cache illisible
      }
      if (supabase) {
        try {
          const { data, error: e } = await supabase.auth.getSession();
          if (data.session) s = { ...s, proEmail: data.session.user.email || 'compte garage' };
          else if (!e) s = { ...s, proEmail: '' }; // vraiment déconnecté (sans erreur réseau)
        } catch {
          // pas de réseau : on garde l'état enregistré (on reste dans l'espace pro)
        }
      }
      if (!alive) return;
      settingsRef.current = s;
      setSettings(s);
      setReady(true);
    })();
    if (!supabase) return () => void (alive = false);
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED' || event === 'PASSWORD_RECOVERY')) {
        const email = session.user.email || 'compte garage';
        if (settingsRef.current.proEmail !== email) patch({ proEmail: email });
      } else if (event === 'SIGNED_OUT') {
        if (settingsRef.current.proEmail) patch({ proEmail: '' });
      }
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [patch]);

  // Recharge les véhicules à l'entrée dans l'espace pro
  useEffect(() => {
    if (ready && isGarage) refresh();
    if (ready && !isGarage) setVehicles([]);
  }, [ready, isGarage, settings.proEmail, refresh]);

  /* ---------- Espace client ---------- */
  const writeCache = useCallback(async (m: Record<string, ClientCar>) => {
    const out: Record<string, Vehicle> = {};
    for (const k in m) if (m[k].v && settingsRef.current.clientCodes.includes(k)) out[k] = m[k].v!;
    try {
      await AsyncStorage.setItem(CLIENT_CACHE_KEY, JSON.stringify(out));
    } catch {
      // pas grave
    }
  }, []);

  const loadCode = useCallback(async (code: string): Promise<ClientCar> => {
    try {
      const v = await getVehicleByCode(code);
      return v ? { code, v, status: 'ok' } : { code, v: null, status: 'missing' };
    } catch (e: any) {
      return { code, v: null, status: 'error', error: e?.message || 'Connexion impossible' };
    }
  }, []);

  const refreshClient = useCallback(async () => {
    const codes = settingsRef.current.clientCodes;
    if (!codes.length) return;
    setClientLoading(true);
    try {
      const res = await Promise.all(codes.map(loadCode));
      setCache(old => {
        const m = { ...old };
        // en cas d'erreur réseau, on garde les dernières infos connues
        res.forEach(r => (m[r.code] = r.status === 'error' && old[r.code]?.v ? { ...old[r.code], status: 'error', error: r.error } : r));
        writeCache(m);
        return m;
      });
    } finally {
      setClientLoading(false);
    }
  }, [loadCode, writeCache]);

  // au démarrage de l'espace client : on rafraîchit les véhicules suivis
  useEffect(() => {
    if (ready && !isGarage) refreshClient();
  }, [ready, isGarage, refreshClient]);

  const clientCars: ClientCar[] = useMemo(
    () => settings.clientCodes.map(c => cache[c] || { code: c, v: null, status: 'loading' as const }),
    [settings.clientCodes, cache],
  );

  /* ---------- Tout le store ---------- */
  const store: Store = useMemo(
    () => ({
      ready,
      settings,
      isGarage,
      setGarage: g => patch({ garage: g }),
      vehicles,
      loading,
      error,
      refresh,
      async saveVehicle(v) {
        const saved = await getDb().saveVehicle(v);
        setVehicles(vs => {
          const i = vs.findIndex(x => x.id === v.id || x.id === saved.id);
          if (i < 0) return [saved, ...vs];
          const c = vs.slice();
          c[i] = saved;
          return c;
        });
        return saved;
      },
      async deleteVehicle(id) {
        const v = vehicles.find(x => x.id === id);
        await getDb().deleteVehicle(id);
        setVehicles(vs => vs.filter(x => x.id !== id));
        if (v) {
          removeDocFiles(v.docs).catch(() => {});
          deletePhoto(v.photoCg);
        }
      },
      async replaceAll(vs) {
        await getDb().replaceAll(vs);
        await refresh();
      },
      userEmail: settings.proEmail,
      async signIn(email, password) {
        if (!supabase) throw new Error('Supabase n’est pas configuré');
        try {
          const { data, error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
          if (e) throw e;
          await patch({ proEmail: data.user?.email || email.trim() });
        } catch (e: any) {
          throw new Error(authMessage(String(e?.message || e)));
        }
      },
      async resetPassword(email, redirectTo) {
        if (!supabase) throw new Error('Supabase n’est pas configuré');
        try {
          const { error: e } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
          if (e) throw e;
        } catch (e: any) {
          throw new Error(authMessage(String(e?.message || e)));
        }
      },
      async signOut() {
        if (supabase) {
          // « local » : efface la session de CE téléphone même sans internet
          await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        }
        setVehicles([]);
        await patch({ proEmail: '', mode: null });
      },
      async enterLocalPro() {
        await patch({ mode: 'garage' });
      },
      async localCount() {
        return (await peekLocalVehicles()).length;
      },
      async pushLocalToOnline() {
        if (!supabaseEnabled || !settings.proEmail) throw new Error('Connecte-toi d’abord');
        const locals = await peekLocalVehicles();
        for (const v of locals) await supabaseDb.saveVehicle(v);
        await refresh();
        return locals.length;
      },
      clientCars,
      clientLoading,
      refreshClient,
      async addClientCode(raw) {
        const code = normCode(raw);
        if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) return 'Le code a 8 caractères : XXXX-XXXX.';
        if (settingsRef.current.clientCodes.includes(code)) return 'Ce véhicule est déjà dans ta liste.';
        const r = await loadCode(code);
        if (r.status === 'missing') return 'Code inconnu. Vérifie-le avec ton garagiste.';
        if (r.status === 'error') return r.error || 'Connexion impossible. Vérifie internet.';
        await patch({ clientCodes: [...settingsRef.current.clientCodes, code] });
        setCache(old => {
          const m = { ...old, [code]: r };
          writeCache(m);
          return m;
        });
        return '';
      },
      async removeClientCode(code) {
        await patch({ clientCodes: settingsRef.current.clientCodes.filter(c => c !== code) });
        setCache(old => {
          const m = { ...old };
          delete m[code];
          writeCache(m);
          return m;
        });
      },
    }),
    [ready, settings, isGarage, vehicles, loading, error, refresh, patch, clientCars, clientLoading, refreshClient, loadCode, writeCache],
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore hors du StoreProvider');
  return s;
}

export const useVehicle = (id?: string) => {
  const { vehicles } = useStore();
  return vehicles.find(v => v.id === id);
};

