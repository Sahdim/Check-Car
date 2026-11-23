// Ajout / modification d'une intervention : on coche les éléments avec des boutons.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, Text, View } from 'react-native';
import { Btn, Card, Empty, Field, Row, Screen, T, tap } from '@/components/ui';
import { itemParts, PART_SECTIONS } from '@/lib/parts';
import { useStore, useVehicle } from '@/lib/store';
import { C } from '@/lib/theme';
import type { Item } from '@/lib/types';
import { fmtKm, fromFr, maskDate, toFr, today, uid, vTitle } from '@/lib/utils';
import * as Haptics from 'expo-haptics';

export default function InterventionForm() {
  const { vid, iid } = useLocalSearchParams<{ vid: string; iid?: string }>();
  const v = useVehicle(vid);
  const { saveVehicle } = useStore();
  const old = v?.items.find(i => i.id === iid);

  const [parts, setParts] = useState<string[]>(old ? itemParts(old) : []);
  const [date, setDate] = useState(toFr(old?.date || today()));
  const [km, setKm] = useState(old ? String(old.km || '') : v ? String(v.km || '') : '');
  const [price, setPrice] = useState(old?.price ? String(old.price).replace('.', ',') : '');
  const [note, setNote] = useState(old?.note || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  if (!v) {
    return (
      <Screen>
        <Empty icon="alert-circle-outline" text="Véhicule introuvable." />
      </Screen>
    );
  }

  const toggle = (p: string) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
    setParts(ps => (ps.includes(p) ? ps.filter(x => x !== p) : [...ps, p]));
  };

  const save = async () => {
    setErr('');
    const iso = fromFr(date);
    if (!iso) return setErr('Date incorrecte (JJ/MM/AAAA).');
    if (!parts.length && !note.trim()) return setErr('Coche au moins un élément ou écris une note.');
    const kmN = +km.replace(/\D/g, '') || 0;
    const priceN = Math.round((parseFloat(price.replace(',', '.').replace(/[^\d.]/g, '')) || 0) * 100) / 100;
    // garde l'ordre de la liste
    const ordered = PART_SECTIONS.flatMap(s => s.parts).filter(p => parts.includes(p));
    const finalParts = ordered.length ? ordered : ['Autre'];
    const item: Item = { id: old?.id || uid(), date: iso, kind: finalParts.join(', '), parts: finalParts, km: kmN, price: priceN, note: note.trim() };
    const items = old ? v.items.map(i => (i.id === old.id ? item : i)) : [item, ...v.items];
    setBusy(true);
    try {
      // le kilométrage du véhicule est mis à jour s'il est plus grand
      await saveVehicle({ ...v, items, km: Math.max(v.km || 0, kmN) });
      tap('success');
      router.back();
    } catch (x: any) {
      setErr(x?.message || 'Enregistrement impossible');
    } finally {
      setBusy(false);
    }
  };

  const del = () => {
    if (!old) return;
    const go = async () => {
      await saveVehicle({ ...v, items: v.items.filter(i => i.id !== old.id) });
      tap('success');
      router.back();
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Supprimer cette intervention ?')) go();
    } else Alert.alert('Supprimer cette intervention ?', undefined, [{ text: 'Annuler', style: 'cancel' }, { text: 'Supprimer', style: 'destructive', onPress: go }]);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: old ? 'Modifier l’intervention' : 'Nouvelle intervention',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={10} style={{ paddingHorizontal: Platform.OS === 'ios' ? 0 : 8 }}>
              <Text style={{ color: C.orange, fontSize: 17 }}>Annuler</Text>
            </Pressable>
          ),
        }}
      />
      <Screen>
        <Text style={T.sub}>
          {vTitle(v)} · {v.plate} · {fmtKm(v.km)}
        </Text>

        {PART_SECTIONS.map(s => (
          <Card key={s.title} style={{ gap: 10 }}>
            <Text style={T.label}>{s.title}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {s.parts.map(p => {
                const on = parts.includes(p);
                return (
                  <Pressable
                    key={p}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    onPress={() => toggle(p)}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 13,
                      minHeight: 40,
                      borderRadius: 999,
                      backgroundColor: on ? '#FFFFFF' : C.card2,
                      opacity: pressed ? 0.7 : 1,
                    })}>
                    {on ? <Ionicons name="checkmark-circle" size={17} color="#000" /> : null}
                    <Text style={{ color: on ? '#000' : C.text, fontSize: 15, fontWeight: on ? '700' : '500' }}>{p}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        ))}

        <Card style={{ gap: 14 }}>
          <Row gap={10}>
            <Field label="Date" value={date} onChangeText={t => setDate(maskDate(t))} keyboardType="number-pad" placeholder="JJ/MM/AAAA" style={{ flex: 1 }} />
            <Field label="Kilométrage" value={km} onChangeText={t => setKm(t.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="128400" style={{ flex: 1 }} />
          </Row>
          <Field label="Prix (€)" value={price} onChangeText={t => setPrice(t.replace(/[^\d,.]/g, ''))} keyboardType="decimal-pad" placeholder="0" />
          <Field
            label="Notes"
            value={note}
            onChangeText={setNote}
            multiline
            placeholder="Marque d’huile, références des pièces, remarques…"
            autoCapitalize="sentences"
          />
        </Card>

        {parts.length ? (
          <Text style={[T.sub, { textAlign: 'center' }]}>
            {parts.length} élément{parts.length > 1 ? 's' : ''} coché{parts.length > 1 ? 's' : ''}
            {parts.includes('Vidange') ? ' · compte pour le rappel de vidange' : ''}
          </Text>
        ) : null}
        {err ? <Text style={{ color: C.red, fontSize: 15, textAlign: 'center' }}>{err}</Text> : null}
        <Btn title="Enregistrer" icon="checkmark" loading={busy} onPress={save} />
        {old ? <Btn kind="danger" title="Supprimer l’intervention" icon="trash-outline" onPress={del} /> : null}
      </Screen>
    </>
  );
}
