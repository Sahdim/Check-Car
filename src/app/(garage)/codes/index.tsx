// Onglet « Codes » : recherche d'un code défaut (P0420, p0420, 0420) ou d'un mot (turbo, FAP…),
// explication en français, lien avec un véhicule, et texte prêt à coller dans Claude.
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { DtcExplain } from '@/components/DtcExplain';
import { PlaqueFR } from '@/components/PlaqueFR';
import { VehiclePicker } from '@/components/VehiclePicker';
import { Btn, Card, Chip, Empty, Field, notify, Row, Screen, SectionTitle, T, tap } from '@/components/ui';
import { claudePrompt, DTC_LIST, normDtc, searchDtc } from '@/lib/dtc';
import { useStore } from '@/lib/store';
import { C, R } from '@/lib/theme';
import type { Vehicle } from '@/lib/types';
import { vTitle } from '@/lib/utils';

const FREQUENTS = ['P0420', 'P0300', 'P0171', 'P0299', 'P0401', 'P2002', 'P0101', 'P0562'];

export default function Codes() {
  const { vehicles } = useStore();
  const [q, setQ] = useState('');
  const [vid, setVid] = useState('');
  const [sym, setSym] = useState('');
  const [picker, setPicker] = useState<'' | 'choose' | 'link'>('');
  const [copied, setCopied] = useState(false);

  const code = normDtc(q);
  const results = useMemo(() => (code ? [] : searchDtc(q).slice(0, 40)), [q, code]);
  const v = vehicles.find(x => x.id === vid) || null;

  const link = (target: Vehicle | null) => {
    if (!target) return setPicker('link');
    router.push({ pathname: '/code-releve', params: { vid: target.id, code } });
  };

  const ask = async () => {
    await Clipboard.setStringAsync(claudePrompt(code, v, sym));
    tap('success');
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    notify('Texte copié', 'Ouvre Claude et colle le texte (appui long → Coller). Ajoute ce que tu as déjà mesuré.');
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 12, height: 48, gap: 8 }}>
        <Ionicons name="search" size={18} color={C.text3} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Code ou mot : P0420, turbo, FAP…"
          placeholderTextColor={C.text3}
          style={{ flex: 1, color: C.text, fontSize: 17, height: 48 }}
          autoCorrect={false}
          autoCapitalize="characters"
          clearButtonMode="while-editing"
          keyboardAppearance="dark"
          returnKeyType="search"
          accessibilityLabel="Rechercher un code défaut"
        />
      </View>

      {code ? (
        <>
          <DtcExplain code={code} />

          <SectionTitle>Pour ce véhicule</SectionTitle>
          <Card style={{ gap: 12 }}>
            {v ? (
              <Row>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={[T.body, { fontWeight: '700' }]} numberOfLines={1}>
                    {vTitle(v)}
                  </Text>
                  <PlaqueFR plate={v.plate} dept={v.dept} size="sm" />
                </View>
                <Btn kind="secondary" small title="Changer" onPress={() => setPicker('choose')} />
              </Row>
            ) : (
              <Btn kind="secondary" title="Choisir le véhicule (facultatif)" icon="car-sport-outline" disabled={!vehicles.length} onPress={() => setPicker('choose')} />
            )}
            <Field label="Symptômes (facultatif)" value={sym} onChangeText={setSym} multiline placeholder="Perte de puissance à chaud, voyant allumé depuis…" />
          </Card>
          <Btn title="Ajouter aux codes relevés du véhicule" icon="add-circle-outline" disabled={!vehicles.length} onPress={() => link(v)} />
          <Btn kind="secondary" title={copied ? 'Copié !' : 'Demander à Claude'} icon={copied ? 'checkmark-circle' : 'copy-outline'} onPress={ask} />
          <Text style={[T.tiny, { textAlign: 'center' }]}>Copie un texte prêt à coller dans Claude (véhicule, km, code, symptômes). Aucune IA dans l’appli, rien n’est envoyé.</Text>
        </>
      ) : q.trim() ? (
        !results.length ? (
          <Empty icon="search" text="Aucun code de la base ne correspond. Tape le code complet (ex. P0420) pour voir comment il se lit." />
        ) : (
          <Card style={{ paddingVertical: 6 }}>
            {results.map((d, i) => (
              <Pressable
                key={d.code}
                onPress={() => {
                  tap();
                  setQ(d.code);
                }}
                style={({ pressed }) => ({ flexDirection: 'row', gap: 12, paddingVertical: 10, borderTopWidth: i ? 0.5 : 0, borderTopColor: C.sep, opacity: pressed ? 0.6 : 1 })}>
                <Text style={{ color: C.text, fontWeight: '800', width: 62, fontSize: 15 }}>{d.code}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[T.body, { fontSize: 15 }]}>{d.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={C.text3} style={{ alignSelf: 'center' }} />
              </Pressable>
            ))}
          </Card>
        )
      ) : (
        <>
          <Card style={{ gap: 8 }}>
            <Text style={[T.body, { fontWeight: '700' }]}>Comment lire un code</Text>
            <Text style={T.sub}>P = moteur et boîte · C = châssis · B = carrosserie · U = réseau.</Text>
            <Text style={T.sub}>Le chiffre après la lettre : 0 = code générique (même sens partout), 1 = code propre à la marque.</Text>
            <Text style={T.tiny}>{DTC_LIST.length} codes génériques dans la base. Aucun code constructeur inventé.</Text>
          </Card>
          <SectionTitle>Codes fréquents</SectionTitle>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {FREQUENTS.map(c => (
              <Chip key={c} label={c} onPress={() => setQ(c)} />
            ))}
          </View>
        </>
      )}

      <VehiclePicker
        visible={!!picker}
        onClose={() => setPicker('')}
        onPick={p => {
          const mode = picker;
          setVid(p.id);
          setPicker('');
          if (mode === 'link') setTimeout(() => router.push({ pathname: '/code-releve', params: { vid: p.id, code } }), 350);
        }}
      />
      <View style={{ height: R.card }} />
    </Screen>
  );
}
