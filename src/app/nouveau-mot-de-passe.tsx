// Ouvert par le lien de l'e-mail « Mot de passe oublié » (checkandcar://nouveau-mot-de-passe#access_token=…).
// On récupère la session du lien, puis le garagiste choisit un nouveau mot de passe.
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { Btn, Card, Field, Screen, T, tap } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { C } from '@/lib/theme';

function paramsOf(url: string) {
  const out: Record<string, string> = {};
  const parts = [url.split('#')[1] || '', (url.split('?')[1] || '').split('#')[0]];
  for (const p of parts) new URLSearchParams(p).forEach((v, k) => (out[k] = v));
  return out;
}

export default function NouveauMotDePasse() {
  const url = Linking.useLinkingURL();
  const [state, setState] = useState<'wait' | 'ready' | 'error'>('wait');
  const [err, setErr] = useState('');
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setState('error');
      setErr('Supabase n’est pas configuré dans cette version.');
      return;
    }
    let alive = true;
    (async () => {
      try {
        const q = paramsOf(url || '');
        if (q.error_description || q.error) throw new Error(q.error_description?.replace(/\+/g, ' ') || 'Lien invalide');
        if (q.access_token && q.refresh_token) {
          const { error } = await supabase!.auth.setSession({ access_token: q.access_token, refresh_token: q.refresh_token });
          if (error) throw error;
        } else if (q.code) {
          const { error } = await supabase!.auth.exchangeCodeForSession(q.code);
          if (error) throw error;
        } else {
          const { data } = await supabase!.auth.getSession();
          if (!data.session) throw new Error('Lien incomplet. Redemande un e-mail depuis « Mot de passe oublié ».');
        }
        if (alive) setState('ready');
      } catch (e: any) {
        if (!alive) return;
        setState('error');
        setErr(/expired|invalid/i.test(String(e?.message)) ? 'Le lien a expiré ou a déjà servi. Redemande un e-mail depuis « Mot de passe oublié ».' : e?.message || 'Lien invalide');
      }
    })();
    return () => {
      alive = false;
    };
  }, [url]);

  const save = async () => {
    setErr('');
    if (p1.length < 8) return setErr('8 caractères minimum.');
    if (p1 !== p2) return setErr('Les deux mots de passe sont différents.');
    setBusy(true);
    try {
      const { error } = await supabase!.auth.updateUser({ password: p1 });
      if (error) throw error;
      tap('success');
      router.replace('/vehicules');
    } catch (e: any) {
      setErr(/fetch|network/i.test(String(e?.message)) ? 'Pas de connexion internet.' : e?.message || 'Impossible de changer le mot de passe');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      {state === 'wait' ? (
        <ActivityIndicator color={C.text3} style={{ marginTop: 40 }} />
      ) : state === 'error' ? (
        <Card style={{ gap: 12 }}>
          <Text style={{ color: C.red }}>{err}</Text>
          <Btn kind="secondary" title="Retour" onPress={() => router.replace('/')} />
        </Card>
      ) : (
        <>
          <Text style={T.sub}>Choisis ton nouveau mot de passe pour l’espace pro.</Text>
          <Card style={{ gap: 14 }}>
            <Field label="Nouveau mot de passe" value={p1} onChangeText={setP1} secureTextEntry textContentType="newPassword" autoComplete="new-password" />
            <Field label="Confirme le mot de passe" value={p2} onChangeText={setP2} secureTextEntry textContentType="newPassword" />
          </Card>
          {err ? <Text style={{ color: C.red, textAlign: 'center' }}>{err}</Text> : null}
          <Btn title="Enregistrer" icon="checkmark" loading={busy} onPress={save} />
        </>
      )}
    </Screen>
  );
}
