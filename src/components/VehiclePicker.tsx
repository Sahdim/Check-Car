// Fenêtre pour choisir un véhicule du garage (recherche par plaque, client, modèle).
import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useStore } from '@/lib/store';
import { C, R } from '@/lib/theme';
import type { Vehicle } from '@/lib/types';
import { norm, vTitle } from '@/lib/utils';
import { PlaqueFR } from './PlaqueFR';
import { Empty, Sheet, T, tap } from './ui';

export function VehiclePicker({ visible, onClose, onPick }: { visible: boolean; onClose: () => void; onPick: (v: Vehicle) => void }) {
  const { vehicles } = useStore();
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const words = norm(q).replace(/-/g, '').split(/\s+/).filter(Boolean);
    return vehicles.filter(v => words.every(w => norm([v.brand, v.model, v.plate, v.owner].join(' ')).replace(/-/g, '').includes(w)));
  }, [vehicles, q]);
  return (
    <Sheet visible={visible} title="Choisir le véhicule" onClose={onClose}>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.card2, borderRadius: 12, paddingHorizontal: 12, height: 44, gap: 8 }}>
        <Ionicons name="search" size={18} color={C.text3} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Plaque, client, modèle…"
          placeholderTextColor={C.text3}
          style={{ flex: 1, color: C.text, fontSize: 17, height: 44 }}
          autoCorrect={false}
          autoCapitalize="none"
          keyboardAppearance="dark"
        />
      </View>
      {!vehicles.length ? (
        <Empty icon="car-sport-outline" text="Aucun véhicule dans le garage." />
      ) : !list.length ? (
        <Empty icon="search" text="Aucun véhicule ne correspond." />
      ) : (
        list.map(v => (
          <Pressable
            key={v.id}
            onPress={() => {
              tap();
              onPick(v);
            }}
            style={({ pressed }) => ({ backgroundColor: C.card2, borderRadius: R.card, padding: 14, gap: 6, opacity: pressed ? 0.7 : 1 })}>
            <Text style={[T.body, { fontWeight: '700' }]} numberOfLines={1}>
              {vTitle(v)}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <PlaqueFR plate={v.plate} dept={v.dept} size="sm" />
              {v.owner ? (
                <Text style={T.tiny} numberOfLines={1}>
                  {v.owner}
                </Text>
              ) : null}
            </View>
          </Pressable>
        ))
      )}
    </Sheet>
  );
}
