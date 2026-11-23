// Ligne d'un véhicule dans les listes (pastille du rappel le plus urgent).
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { worstAlert } from '@/lib/alerts';
import { C, R, levelColor } from '@/lib/theme';
import type { Vehicle } from '@/lib/types';
import { fmtKm, vSub, vTitle } from '@/lib/utils';
import { Dot, Plate, PrioBadge, T, tap } from './ui';

export function VehicleRow({ v, showOwner = true }: { v: Vehicle; showOwner?: boolean }) {
  const w = worstAlert(v);
  return (
    <Pressable
      onPress={() => {
        tap();
        router.push({ pathname: '/vehicule/[id]', params: { id: v.id } });
      }}
      style={({ pressed }) => ({ backgroundColor: C.card, borderRadius: R.card, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center', opacity: pressed ? 0.7 : 1 })}>
      <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: levelColor(w.level) + '26', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="car-sport" size={22} color={levelColor(w.level)} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ color: C.text, fontSize: 17, fontWeight: '700', flexShrink: 1 }} numberOfLines={1}>
            {vTitle(v)}
          </Text>
          {v.example ? <PrioBadge label="EXEMPLE" /> : null}
        </View>
        {vSub(v) ? (
          <Text style={T.sub} numberOfLines={1}>
            {vSub(v)}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Plate plate={v.plate} />
          <Text style={T.tiny}>{fmtKm(v.km)}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Dot level={w.level} />
          <Text style={[T.tiny, { color: C.text2, flexShrink: 1 }]} numberOfLines={1}>
            {w.txt}
            {showOwner && v.owner ? ' · ' + v.owner : ''}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={C.text3} />
    </Pressable>
  );
}
