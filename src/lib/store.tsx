// État partagé de l'appli : mode (garagiste / client), infos du garage, liste des véhicules.
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getDb, localDb, setOnline, supabaseDb } from './db';
import { supabase, supabaseEnabled } from './supabase';
import type { Garage, Mode, Vehicle } from './types';

const SETTINGS_KEY = 'carnet-garage-reglages';

type Settings = { mode: Mode; garage: Garage; clientCode: string };
const DEFAULTS: Settings = { mode: null, garage: { name: '', phone: '', address: '' }, clientCode: '' };

type Store = {
  ready: boolean;
  settings: Settings;
  setMode(m: Mode): Promise<void>;
  setGarage(g: Garage): Promise<void>;
  setClientCode(c: string): Promise<void>;
  vehicles: Vehicle[];
  loading: boolean;
  error: string;
  refresh(): Promise<void>;
  saveVehicle(v: Vehicle): Promise<Vehicle>;
  deleteVehicle(id: string): Promise<void>;
  replaceAll(vs: Vehicle[]): Promise<void>;
  // Compte en ligne (Supabase)
  online: boolean;
  userEmail: string;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<string>;
  signOut(): Promise<void>;
  pushLocalToOnline(): Promise<number>;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const online = !!userEmail && supabaseEnabled;

  const writeSettings = useCallback(async (s: Settings) => {
    setSettings(s);
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
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

  // Démarrage : réglages + session en ligne éventuelle
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SETTINGS_KEY);
        if (raw) setSettings({ ...DEFAULTS, ...JSON.parse(raw), garage: { ...DEFAULTS.garage, ...(JSON.parse(raw).garage || {}) } });
      } catch {
        // réglages illisibles : on garde ceux par défaut
      }
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        const email = data.session?.user?.email || '';
        setOnline(!!data.session);
        setUserEmail(email);
      }
      setReady(true);
    })();
    if (!supabase) return;
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setOnline(!!session);
      setUserEmail(session?.user?.email || '');
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Recharge les véhicules quand on passe en mode garagiste ou qu'on se (dé)connecte
  useEffect(() => {
    if (ready && settings.mode === 'garage') refresh();
  }, [ready, settings.mode, userEmail, refresh]);

  const store: Store = useMemo(
    () => ({
      ready,
      settings,
      setMode: m => writeSettings({ ...settings, mode: m }),
      setGarage: g => writeSettings({ ...settings, garage: g }),
      setClientCode: c => writeSettings({ ...settings, clientCode: c }),
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
        await getDb().deleteVehicle(id);
        setVehicles(vs => vs.filter(v => v.id !== id));
      },
      async replaceAll(vs) {
        await getDb().replaceAll(vs);
        await refresh();
      },
      online,
      userEmail,
      async signIn(email, password) {
        if (!supabase) throw new Error('Supabase n’est pas configuré');
        const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (e) throw new Error(e.message === 'Invalid login credentials' ? 'E-mail ou mot de passe incorrect' : e.message);
      },
      async signUp(email, password) {
        if (!supabase) throw new Error('Supabase n’est pas configuré');
        const { data, error: e } = await supabase.auth.signUp({ email: email.trim(), password });
        if (e) throw new Error(e.message);
        return data.session ? 'Compte créé, tu es connecté.' : 'Compte créé. Ouvre l’e-mail de confirmation puis connecte-toi.';
      },
      async signOut() {
        await supabase?.auth.signOut();
      },
      async pushLocalToOnline() {
        if (!online) throw new Error('Connecte-toi d’abord');
        const locals = (await localDb.listVehicles()).filter(v => !v.example);
        for (const v of locals) await supabaseDb.saveVehicle(v);
        await refresh();
        return locals.length;
      },
    }),
    [ready, settings, vehicles, loading, error, refresh, online, userEmail, writeSettings],
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
