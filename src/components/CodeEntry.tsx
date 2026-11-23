// Carte « Entre ton code » (espace client) : ajoute un véhicule à la liste avec son code XXXX-XXXX.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useStore } from '@/lib/store';
import { C } from '@/lib/theme';
import { maskCode } from '@/lib/utils';
import { Btn, HeroCard, T, tap } from './ui';

export function CodeEntry({ onDone, again }: { onDone?: () => void; again?: boolean }) {
  const { addClientCode } = useStore();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const enter = async () => {
    if (busy) return;
    setErr('');
    setBusy(true);
    try {
      const m = await addClientCode(code);
      if (m) return setErr(m);
      tap('success');
      setCode('');
      onDone?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <HeroCard>
      <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(10,132,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
        <Ionicons name="key" size={24} color={C.blue} />
      </View>
      <Text style={T.title}>Entre ton code</Text>
      <Text style={[T.sub, { marginTop: 4 }]}>
        {again
          ? 'Chaque véhicule a son propre code. Tes autres véhicules restent dans ta liste.'
          : 'Ton garagiste t’a donné un code de 8 caractères. Tu verras le carnet d’entretien de ton véhicule.'}
      </Text>
      <TextInput
        value={code}
        onChangeText={t => setCode(maskCode(t))}
        placeholder="XXXX-XXXX"
        placeholderTextColor={C.text3}
        autoCapitalize="characters"
        autoCorrect={false}
        autoFocus={again}
        keyboardAppearance="dark"
        returnKeyType="go"
        onSubmitEditing={enter}
        maxLength={9}
        accessibilityLabel="Code du véhicule"
        style={{ marginTop: 16, backgroundColor: 'rgba(0,0,0,0.35)', color: C.text, borderRadius: 14, height: 64, fontSize: 28, fontWeight: '800', letterSpacing: 5, textAlign: 'center' }}
      />
      {err ? <Text style={{ color: C.red, marginTop: 10, textAlign: 'center' }}>{err}</Text> : null}
      <Btn title={again ? 'Ajouter ce véhicule' : 'Voir mon véhicule'} icon="arrow-forward" loading={busy} onPress={enter} style={{ marginTop: 14 }} />
    </HeroCard>
  );
}
