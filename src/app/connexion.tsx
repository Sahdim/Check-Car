// Connexion du garagiste à son compte en ligne (Supabase : e-mail + mot de passe).
import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { Btn, Card, Field, Screen, T, tap } from '@/components/ui';
import { useStore } from '@/lib/store';
import { supabaseEnabled } from '@/lib/supabase';
import { C } from '@/lib/theme';

export default function Connexion() {
  const { signIn, signUp } = useStore();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const run = async (what: 'in' | 'up') => {
    setErr('');
    setMsg('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErr('E-mail incorrect.');
    if (pass.length < 6) return setErr('Mot de passe : 6 caractères minimum.');
    setBusy(what);
    try {
      if (what === 'in') {
        await signIn(email, pass);
        tap('success');
        router.back();
      } else {
        setMsg(await signUp(email, pass));
      }
    } catch (e: any) {
      setErr(e?.message || 'Erreur');
    } finally {
      setBusy('');
    }
  };

  if (!supabaseEnabled) {
    return (
      <Screen>
        <Card>
          <Text style={T.sub}>Supabase n’est pas configuré dans cette version (voir LISEZMOI.md).</Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={T.sub}>Connecte-toi pour retrouver tes véhicules sur tous tes appareils et permettre aux clients de voir leur carnet avec leur code.</Text>
      <Card style={{ gap: 14 }}>
        <Field label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress" autoComplete="email" />
        <Field label="Mot de passe" value={pass} onChangeText={setPass} secureTextEntry textContentType="password" autoComplete="password" />
      </Card>
      {err ? <Text style={{ color: C.red, textAlign: 'center' }}>{err}</Text> : null}
      {msg ? <Text style={{ color: C.green, textAlign: 'center' }}>{msg}</Text> : null}
      <Btn title="Se connecter" icon="log-in-outline" loading={busy === 'in'} onPress={() => run('in')} />
      <Btn kind="secondary" title="Créer mon compte" icon="person-add-outline" loading={busy === 'up'} onPress={() => run('up')} />
    </Screen>
  );
}
