// Section « Codes relevés » de la fiche : codes défaut lus sur le véhicule (date, km, note).
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { dtcGravity, dtcStructure, findDtc } from '@/lib/dtc';
import { C, levelColor } from '@/lib/theme';
import type { DtcEntry, Vehicle } from '@/lib/types';
import { fmtDate, fmtKm } from '@/lib/utils';
import { ask, Btn, Card, IconBtn, SectionTitle, T, notify, tap } from './ui';

export const dtcLabel = (code: string) => findDtc(code)?.label || (dtcStructure(code)?.kind === 'brand' ? 'Code constructeur (libellé sur la valise)' : 'Libellé non disponible');

export function DtcSection({ v, readOnly, onSave }: { v: Vehicle; readOnly?: boolean; onSave?: (v: Vehicle) => Promise<unknown> }) {
  const list = v.dtc.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  if (readOnly && !list.length) return null;

  const del = (d: DtcEntry) =>
    ask('Retirer ce code ?', d.code + ' sera retiré des codes relevés.', 'Retirer', async () => {
      try {
        await onSave?.({ ...v, dtc: v.dtc.filter(x => x.id !== d.id) });
        tap('success');
      } catch (e: any) {
        notify('Impossible', e?.message);
      }
    }, true);

  return (
    <>
      <SectionTitle right={list.length ? <Text style={T.sub}>{list.length}</Text> : null}>Codes relevés</SectionTitle>
      <Card style={{ paddingVertical: list.length ? 8 : 16 }}>
        {!list.length ? (
          <Text style={[T.sub, { textAlign: 'center' }]}>Aucun code défaut relevé.</Text>
        ) : (
          list.map((d, i) => {
            const g = dtcGravity(d.code);
            const content = (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: i ? 0.5 : 0, borderTopColor: C.sep }}>
                <View style={{ backgroundColor: levelColor(g.level) + '2A', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ color: levelColor(g.level), fontWeight: '800', fontSize: 14, letterSpacing: 0.5 }}>{d.code}</Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[T.body, { fontSize: 15, fontWeight: '600' }]} numberOfLines={2}>
                    {dtcLabel(d.code)}
                  </Text>
                  <Text style={T.tiny}>
                    {fmtDate(d.date)}
                    {d.km ? ' · ' + fmtKm(d.km) : ''}
                  </Text>
                  {d.note ? <Text style={[T.sub, { fontSize: 13 }]}>{d.note}</Text> : null}
                </View>
                {!readOnly ? <IconBtn icon="trash-outline" color={C.red} label={'Retirer ' + d.code} onPress={() => del(d)} /> : null}
              </View>
            );
            return readOnly ? (
              <View key={d.id}>{content}</View>
            ) : (
              <Pressable key={d.id} onPress={() => router.push({ pathname: '/code-releve', params: { vid: v.id, eid: d.id } })} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
                {content}
              </Pressable>
            );
          })
        )}
      </Card>
      {!readOnly ? (
        <Btn kind="secondary" title="Ajouter un code relevé" icon="warning-outline" onPress={() => router.push({ pathname: '/code-releve', params: { vid: v.id } })} />
      ) : null}
      {readOnly ? null : (
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 4 }}>
          <Ionicons name="information-circle-outline" size={14} color={C.text3} />
          <Text style={[T.tiny, { flex: 1 }]}>Touchez un code pour modifier la date, le kilométrage ou la note.</Text>
        </View>
      )}
    </>
  );
}
