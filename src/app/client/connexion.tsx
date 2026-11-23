// Espace pro : connexion du garagiste (e-mail + mot de passe Supabase). Pas d'inscription dans l'appli :
// le compte du garage est créé à la main dans le tableau de bord Supabase.
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Btn, Card, Field, Screen, T, TextLink, tap } from '@/components/ui';
import { useStore } from '@/lib/store';
import { supabaseEnabled } from '@/lib/supabase';
import { C } from '@/lib/theme';

const emailOk = (e: string) => /^\S+@\S+\.\S+$/.test(e.trim());

export default function Connexion() {
  const { signIn, resetPassword, enterLocalPro } = useStore();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const login = async () => {
    setErr('');
    setMsg('');
    if (!emailOk(email)) return setErr('E-mail incorrect.');
    if (!pass) return setErr('Entre ton mot de passe.');
    setBusy('in');
    try {
      await signIn(email, pass);
      tap('success');
      // l'espace pro s'ouvre tout seul (voir client/_layout.tsx)
    } catch (e: any) {
      setErr(e?.message || 'Connexion impossible');
    } finally {
      setBusy('');
    }
  };

  const forgot = async () => {
    setErr('');
    setMsg('');
    if (!emailOk(email)) return setErr('Écris d’abord ton e-mail dans le champ ci-dessus.');
    setBusy('reset');
    try {
      await resetPassword(email, Linking.createURL('nouveau-mot-de-passe'));
      setMsg('Si ce compte existe, un e-mail vient d’être envoyé. Ouvre le lien sur ce téléphone pour choisir un nouveau mot de passe.');
    } catch (e: any) {
      setErr(e?.message || 'Envoi impossible');
    } finally {
      setBusy('');
    }
  };

  if (!supabaseEnabled) {
    return (
      <Screen>
        <Card style={{ gap: 12 }}>
          <Text style={[T.body, { fontWeight: '700' }]}>Mode développement</Text>
          <Text style={T.sub}>
            La base en ligne (Supabase) n’est pas configurée dans cette version. L’espace pro marche en local : les véhicules restent sur ce téléphone.
          </Text>
          <Btn title="Entrer dans l’espace pro (local)" icon="construct-outline" onPress={() => enterLocalPro()} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ gap: 4 }}>
        <Text style={T.title}>Connexion garagiste</Text>
        <Text style={T.sub}>Réservé au garage. Les clients n’ont besoin que de leur code.</Text>
      </View>
      <Card style={{ gap: 14 }}>
        <Field
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="username"
          autoComplete="email"
          returnKeyType="next"
        />
        <Field label="Mot de passe" value={pass} onChangeText={setPass} secureTextEntry textContentType="password" autoComplete="current-password" returnKeyType="go" onSubmitEditing={login} />
      </Card>
      {err ? <Text style={{ color: C.red, textAlign: 'center' }}>{err}</Text> : null}
      {msg ? <Text style={{ color: C.green, textAlign: 'center' }}>{msg}</Text> : null}
      <Btn title="Se connecter" icon="log-in-outline" loading={busy === 'in'} onPress={login} />
      <TextLink title={busy === 'reset' ? 'Envoi…' : 'Mot de passe oublié ?'} color={C.blue} onPress={forgot} />
    </Screen>
  );
}
