// Mode client : on entre son code XXXX-XXXX et on voit SON véhicule, sans pouvoir le modifier.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, Text, TextInput, View } from 'react-native';
import { Btn, Card, HeroCard, Screen, T, tap } from '@/components/ui';
import { VehicleDetail } from '@/components/VehicleDetail';
import { getVehicleByCode } from '@/lib/db';
import { useStore } from '@/lib/store';
import { supabaseEnabled } from '@/lib/supabase';
import { C } from '@/lib/theme';
import type { Vehicle } from '@/lib/types';
import { maskCode, normCode } from '@/lib/utils';

export default function ClientScreen() {
  const { settings, setClientCode, setMode } = useStore();
  const [code, setCode] = useState(settings.clientCode);
  const [v, setV] = useState<Vehicle | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async (c: string, silent = false) => {
    setErr('');
    setBusy(true);
    try {
      const found = await getVehicleByCode(normCode(c));
      if (found) {
        setV(found);
        if (!silent) tap('success');
        return true;
      }
      setErr('Code inconnu. Vérifie-le avec ton garagiste.');
      return false;
    } catch (e: any) {
      setErr('Connexion impossible : ' + (e?.message || 'vérifie internet'));
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  // code déjà enregistré : on recharge le véhicule tout de suite
  useEffect(() => {
    if (settings.clientCode) load(settings.clientCode, true);
  }, [settings.clientCode, load]);

  const enter = async () => {
    const c = normCode(code);
    if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(c)) return setErr('Le code a 8 caractères : XXXX-XXXX.');
    if (await load(c)) await setClientCode(c);
  };

  const quit = async () => {
    setV(null);
    setCode('');
    await setClientCode('');
  };

  const backToChoice = async () => {
    await setMode(null);
    router.replace('/accueil');
  };

  if (v) {
    return (
      <Screen refreshControl={<RefreshControl refreshing={busy} onRefresh={() => {
          load(v.code, true);
        }} tintColor={C.text3} />}>
        <VehicleDetail v={v} garage={{ name: '', phone: '', address: '' }} readOnly />
        <Btn kind="secondary" title="Utiliser un autre code" icon="key-outline" style={{ marginTop: 18 }} onPress={quit} />
      </Screen>
    );
  }

  return (
    <Screen>
      <HeroCard>
        <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(10,132,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <Ionicons name="key" size={24} color={C.blue} />
        </View>
        <Text style={T.title}>Entre ton code</Text>
        <Text style={[T.sub, { marginTop: 4 }]}>Ton garagiste t’a donné un code de 8 caractères. Tu verras uniquement ton véhicule.</Text>
        <TextInput
          value={code}
          onChangeText={t => setCode(maskCode(t))}
          placeholder="XXXX-XXXX"
          placeholderTextColor={C.text3}
          autoCapitalize="characters"
          autoCorrect={false}
          keyboardAppearance="dark"
          returnKeyType="go"
          onSubmitEditing={enter}
          maxLength={9}
          style={{
            marginTop: 16,
            backgroundColor: 'rgba(0,0,0,0.35)',
            color: C.text,
            borderRadius: 14,
            height: 64,
            fontSize: 28,
            fontWeight: '800',
            letterSpacing: 5,
            textAlign: 'center',
          }}
        />
        {err ? <Text style={{ color: C.red, marginTop: 10, textAlign: 'center' }}>{err}</Text> : null}
        <Btn title="Voir mon véhicule" icon="arrow-forward" loading={busy} onPress={enter} style={{ marginTop: 14 }} />
      </HeroCard>
      {!supabaseEnabled ? (
        <Card>
          <Text style={T.tiny}>Version d’essai : sans compte en ligne, le code ne marche que sur le téléphone du garagiste.</Text>
        </Card>
      ) : null}
      <Btn kind="ghost" title="Je suis le garagiste" icon="swap-horizontal" onPress={backToChoice} />
    </Screen>
  );
}
