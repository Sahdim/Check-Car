// Atelier : tableau de bord (rappels, dernières interventions, chiffre du mois et de l'année).
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Card, Empty, HeroCard, Row, Screen, SectionTitle, Sep, T, tap } from '@/components/ui';
import { VehicleRow } from '@/components/VehicleRow';
import { urgency } from '@/lib/alerts';
import { itemParts } from '@/lib/parts';
import { useStore } from '@/lib/store';
import { C, R } from '@/lib/theme';
import { byDate, fmtDate, fmtEur, fmtKm, today } from '@/lib/utils';

export default function Atelier() {
  const { vehicles } = useStore();

  const s = useMemo(() => {
    const t = today();
    const month = t.slice(0, 7);
    const year = t.slice(0, 4);
    let late = 0,
      soon = 0,
      caMonth = 0,
      caYear = 0,
      nMonth = 0;
    const all: { vid: string; plate: string; title: string; date: string; km: number; price: number; parts: string[]; id: string }[] = [];
    vehicles.forEach(v => {
      const u = urgency(v);
      if (u === 2) late++;
      else if (u === 1) soon++;
      v.items.forEach(i => {
        if (i.date.startsWith(month)) {
          caMonth += +i.price || 0;
          nMonth++;
        }
        if (i.date.startsWith(year)) caYear += +i.price || 0;
        all.push({ vid: v.id, plate: v.plate, title: [v.brand, v.model].filter(Boolean).join(' '), date: i.date, km: i.km, price: i.price, parts: itemParts(i), id: i.id });
      });
    });
    all.sort(byDate);
    const todo = vehicles.filter(v => urgency(v) >= 1).sort((a, b) => urgency(b) - urgency(a));
    return { late, soon, caMonth, caYear, nMonth, recent: all.slice(0, 6), todo, year };
  }, [vehicles]);

  return (
    <Screen>
      <HeroCard>
        <Text style={T.label}>Chiffre des interventions</Text>
        <Text style={{ color: C.text, fontSize: 40, fontWeight: '800', marginTop: 6 }}>{fmtEur(s.caMonth)}</Text>
        <Text style={T.sub}>
          ce mois-ci · {s.nMonth} intervention{s.nMonth > 1 ? 's' : ''}
        </Text>
        <Sep />
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={T.sub}>Année {s.year}</Text>
          <Text style={{ color: C.text, fontSize: 20, fontWeight: '700' }}>{fmtEur(s.caYear)}</Text>
        </Row>
      </HeroCard>

      <Row gap={10}>
        <Stat icon="car-sport" color={C.sky} value={vehicles.length} label="Véhicules" />
        <Stat icon="alert-circle" color={C.red} value={s.late} label="En retard" />
        <Stat icon="time" color={C.orange} value={s.soon} label="Bientôt" />
      </Row>

      <SectionTitle>À prévoir</SectionTitle>
      {!s.todo.length ? <Empty icon="checkmark-circle-outline" text="Rien en retard. Tout est à jour." /> : s.todo.slice(0, 8).map(v => <VehicleRow key={v.id} v={v} />)}

      <SectionTitle>Dernières interventions</SectionTitle>
      {!s.recent.length ? (
        <Empty icon="construct-outline" text="Aucune intervention notée." />
      ) : (
        <Card style={{ paddingVertical: 6 }}>
          {s.recent.map((i, idx) => (
            <Pressable
              key={i.id}
              onPress={() => {
                tap();
                router.push({ pathname: '/vehicule/[id]', params: { id: i.vid } });
              }}
              style={({ pressed }) => ({
                paddingVertical: 10,
                borderTopWidth: idx ? 0.5 : 0,
                borderTopColor: C.sep,
                opacity: pressed ? 0.6 : 1,
                gap: 2,
              })}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={[T.body, { fontWeight: '600', flex: 1 }]} numberOfLines={1}>
                  {i.parts.join(', ')}
                </Text>
                {i.price ? <Text style={[T.body, { fontWeight: '600' }]}>{fmtEur(i.price)}</Text> : null}
              </Row>
              <Text style={T.tiny}>
                {fmtDate(i.date)} · {i.title} · {i.plate} · {fmtKm(i.km)}
              </Text>
            </Pressable>
          ))}
        </Card>
      )}
    </Screen>
  );
}

function Stat({ icon, color, value, label }: { icon: keyof typeof Ionicons.glyphMap; color: string; value: number; label: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.card, borderRadius: R.card, padding: 14, gap: 6 }}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={{ color: C.text, fontSize: 26, fontWeight: '800' }}>{value}</Text>
      <Text style={T.tiny}>{label}</Text>
    </View>
  );
}
