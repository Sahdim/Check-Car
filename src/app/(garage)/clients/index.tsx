// Clients : regroupés à partir du nom et du téléphone des véhicules.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, Pressable, Text, TextInput, View } from 'react-native';
import { Card, Dot, Empty, IconBtn, Row, Screen, Sep, T, tap } from '@/components/ui';
import { worstAlert } from '@/lib/alerts';
import { useStore } from '@/lib/store';
import { C } from '@/lib/theme';
import type { Vehicle } from '@/lib/types';
import { norm } from '@/lib/utils';

type Client = { key: string; name: string; phone: string; vehicles: Vehicle[] };

const digits = (p: string) => p.replace(/[^\d+]/g, '');

export default function Clients() {
  const { vehicles } = useStore();
  const [q, setQ] = useState('');

  const clients = useMemo(() => {
    const map = new Map<string, Client>();
    vehicles.forEach(v => {
      const name = v.owner.trim();
      const phone = v.phone.trim();
      // même téléphone = même client ; sinon même nom
      const key = digits(phone) || norm(name) || '—';
      const c = map.get(key) || { key, name: '', phone: '', vehicles: [] };
      if (!c.name && name) c.name = name;
      if (!c.phone && phone) c.phone = phone;
      c.vehicles.push(v);
      map.set(key, c);
    });
    const words = norm(q).split(/\s+/).filter(Boolean);
    return [...map.values()]
      .filter(c => words.every(w => norm(c.name + ' ' + c.phone + ' ' + c.vehicles.map(v => v.plate + ' ' + v.model).join(' ')).includes(w)))
      .sort((a, b) => (a.name || 'zzz').localeCompare(b.name || 'zzz'));
  }, [vehicles, q]);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 12, height: 44, gap: 8 }}>
        <Ionicons name="search" size={18} color={C.text3} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Nom, téléphone, plaque…"
          placeholderTextColor={C.text3}
          style={{ flex: 1, color: C.text, fontSize: 17, height: 44 }}
          autoCorrect={false}
          keyboardAppearance="dark"
        />
      </View>
      <Text style={T.sub}>
        {clients.length} client{clients.length > 1 ? 's' : ''}
      </Text>
      {!clients.length ? (
        <Empty icon="people-outline" text="Aucun client. Les clients apparaissent quand tu ajoutes un véhicule avec un nom ou un téléphone." />
      ) : (
        clients.map(c => (
          <Card key={c.key}>
            <Row>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.card2, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: C.text, fontSize: 18, fontWeight: '700' }}>{(c.name.replace(/^Exemple : /, '') || '?').charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[T.body, { fontWeight: '700' }]}>{c.name || 'Sans nom'}</Text>
                <Text style={T.sub}>{c.phone || 'Pas de téléphone'}</Text>
              </View>
              {c.phone ? <IconBtn icon="call" color={C.green} label={'Appeler ' + c.name} onPress={() => Linking.openURL('tel:' + digits(c.phone))} /> : null}
              {c.phone ? <IconBtn icon="chatbubble" color={C.blue} label={'SMS à ' + c.name} onPress={() => Linking.openURL('sms:' + digits(c.phone))} /> : null}
            </Row>
            <Sep />
            {c.vehicles.map(v => {
              const w = worstAlert(v);
              return (
                <Pressable
                  key={v.id}
                  onPress={() => {
                    tap();
                    router.push({ pathname: '/vehicule/[id]', params: { id: v.id } });
                  }}
                  style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, opacity: pressed ? 0.6 : 1 })}>
                  <Ionicons name="car-sport-outline" size={20} color={C.text2} />
                  <View style={{ flex: 1 }}>
                    <Text style={[T.body, { fontSize: 15, fontWeight: '600' }]}>
                      {[v.brand, v.model].filter(Boolean).join(' ')} · {v.plate}
                    </Text>
                    <Row gap={6}>
                      <Dot level={w.level} />
                      <Text style={T.tiny}>{w.txt}</Text>
                    </Row>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={C.text3} />
                </Pressable>
              );
            })}
          </Card>
        ))
      )}
    </Screen>
  );
}
