// Ajouter / modifier un code défaut relevé sur un véhicule (date, km, note).
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { DtcExplain } from '@/components/DtcExplain';
import { PlaqueFR } from '@/components/PlaqueFR';
import { VehiclePicker } from '@/components/VehiclePicker';
import { ask, Btn, Card, Field, Row, Screen, T, tap } from '@/components/ui';
import { normDtc } from '@/lib/dtc';
import { useStore, useVehicle } from '@/lib/store';
import { C } from '@/lib/theme';
import type { DtcEntry } from '@/lib/types';
import { fmtKm, fromFr, maskDate, toFr, today, uid, vTitle } from '@/lib/utils';

export default function CodeReleve() {
  const p = useLocalSearchParams<{ vid?: string; code?: string; eid?: string }>();
  const { saveVehicle } = useStore();
  const [vid, setVid] = useState(p.vid || '');
  const v = useVehicle(vid);
  const old = v?.dtc.find(d => d.id === p.eid);

  const [code, setCode] = useState(old?.code || p.code || '');
  const [date, setDate] = useState(toFr(old?.date || today()));
  const [km, setKm] = useState(old ? String(old.km || '') : v ? String(v.km || '') : '');
  const [note, setNote] = useState(old?.note || '');
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const c = normDtc(code);

  const save = async () => {
    setErr('');
    if (!v) return setErr('Choisis le véhicule.');
    if (!c) return setErr('Code incorrect. Exemple : P0420 (lettre P, C, B ou U puis 4 caractères).');
    const iso = fromFr(date);
    if (!iso) return setErr('Date incorrecte (JJ/MM/AAAA).');
    const kmN = +km.replace(/\D/g, '') || 0;
    const e: DtcEntry = { id: old?.id || uid(), code: c, date: iso, km: kmN, note: note.trim() };
    const dtc = old ? v.dtc.map(d => (d.id === old.id ? e : d)) : [e, ...v.dtc];
    setBusy(true);
    try {
      await saveVehicle({ ...v, dtc, km: Math.max(v.km || 0, kmN) });
      tap('success');
      router.back();
    } catch (x: any) {
      setErr(x?.message || 'Enregistrement impossible');
    } finally {
      setBusy(false);
    }
  };

  const del = () =>
    v &&
    old &&
    ask('Retirer ce code ?', old.code + ' sera retiré des codes relevés.', 'Retirer', async () => {
      try {
        await saveVehicle({ ...v, dtc: v.dtc.filter(d => d.id !== old.id) });
        tap('success');
        router.back();
      } catch (x: any) {
        setErr(x?.message || 'Impossible');
      }
    }, true);

  return (
    <>
      <Stack.Screen
        options={{
          title: old ? 'Modifier le code' : 'Code relevé',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={10} style={{ paddingHorizontal: Platform.OS === 'ios' ? 0 : 8 }}>
              <Text style={{ color: C.orange, fontSize: 17 }}>Annuler</Text>
            </Pressable>
          ),
        }}
      />
      <Screen>
        <Card style={{ gap: 10 }}>
          <Text style={T.label}>Véhicule</Text>
          {v ? (
            <Row>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={[T.body, { fontWeight: '700' }]} numberOfLines={1}>
                  {vTitle(v)}
                </Text>
                <Row gap={8}>
                  <PlaqueFR plate={v.plate} dept={v.dept} size="sm" />
                  <Text style={T.tiny}>{fmtKm(v.km)}</Text>
                </Row>
              </View>
              {!p.vid ? <Btn kind="secondary" small title="Changer" onPress={() => setPicker(true)} /> : null}
            </Row>
          ) : (
            <Btn kind="secondary" title="Choisir le véhicule" icon="car-sport-outline" onPress={() => setPicker(true)} />
          )}
        </Card>

        <Card style={{ gap: 14 }}>
          <Field
            label="Code défaut"
            value={code}
            onChangeText={t => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            placeholder="P0420"
            autoCapitalize="characters"
            autoCorrect={false}
            inputStyle={{ fontWeight: '800', letterSpacing: 2 }}
          />
          <Row gap={10}>
            <Field label="Date" value={date} onChangeText={t => setDate(maskDate(t))} keyboardType="number-pad" placeholder="JJ/MM/AAAA" style={{ flex: 1 }} />
            <Field label="Kilométrage" value={km} onChangeText={t => setKm(t.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="128400" style={{ flex: 1 }} />
          </Row>
          <Field label="Note" value={note} onChangeText={setNote} multiline placeholder="Symptômes, ce qui a été fait, effacé ou pas…" />
        </Card>

        {c ? <DtcExplain code={c} compact /> : null}

        {err ? <Text style={{ color: C.red, textAlign: 'center' }}>{err}</Text> : null}
        <Btn title="Enregistrer" icon="checkmark" loading={busy} onPress={save} />
        {old ? <Btn kind="danger" title="Retirer ce code" icon="trash-outline" onPress={del} /> : null}
      </Screen>
      <VehiclePicker
        visible={picker}
        onClose={() => setPicker(false)}
        onPick={x => {
          setVid(x.id);
          if (!km) setKm(String(x.km || ''));
          setPicker(false);
        }}
      />
    </>
  );
}
