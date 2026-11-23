// Liste des véhicules : recherche, filtres, tri par urgence.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { Btn, Card, Chip, Empty, HeroCard, Row, Screen, T, tap } from '@/components/ui';
import { VehicleRow } from '@/components/VehicleRow';
import { urgency, worstAlert } from '@/lib/alerts';
import { useStore } from '@/lib/store';
import { C, R } from '@/lib/theme';
import type { Vehicle } from '@/lib/types';
import { norm } from '@/lib/utils';

const hay = (v: Vehicle) => norm([v.brand, v.model, v.name, v.engine, v.plate, v.owner, v.phone, v.vin].join(' ')).replace(/-/g, '');

export default function Vehicules() {
  const { vehicles, loading, refresh, error, deleteVehicle } = useStore();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'todo' | 'late'>('all');

  const counts = useMemo(() => {
    let late = 0,
      soon = 0;
    vehicles.forEach(v => {
      const l = worstAlert(v).level;
      if (l === 'bad') late++;
      else if (l === 'warn') soon++;
    });
    return { late, soon };
  }, [vehicles]);

  const list = useMemo(() => {
    const words = norm(q.trim()).replace(/-/g, '').split(/\s+/).filter(Boolean);
    return vehicles
      .filter(v => words.every(w => hay(v).includes(w)))
      .filter(v => (filter === 'all' ? true : filter === 'late' ? urgency(v) === 2 : urgency(v) >= 1))
      .sort((a, b) => urgency(b) - urgency(a) || (a.plate || '').localeCompare(b.plate || ''));
  }, [vehicles, q, filter]);

  const examples = vehicles.filter(v => v.example);
  const removeExamples = () => {
    const go = async () => {
      for (const v of examples) await deleteVehicle(v.id);
      tap('success');
    };
    const msg = 'Les ' + examples.length + ' véhicules d’exemple seront supprimés.';
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) go();
    } else Alert.alert('Supprimer les exemples ?', msg, [{ text: 'Annuler', style: 'cancel' }, { text: 'Supprimer', style: 'destructive', onPress: go }]);
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable accessibilityLabel="Ajouter un véhicule" hitSlop={10} onPress={() => router.push('/vehicule-form')}>
              <Ionicons name="add-circle" size={30} color={C.orange} />
            </Pressable>
          ),
        }}
      />
      <Screen refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={C.text3} />}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 12, height: 44, gap: 8 }}>
          <Ionicons name="search" size={18} color={C.text3} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Plaque, client, modèle…"
            placeholderTextColor={C.text3}
            style={{ flex: 1, color: C.text, fontSize: 17, height: 44 }}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
            keyboardAppearance="dark"
            returnKeyType="search"
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Chip label={'Tous (' + vehicles.length + ')'} active={filter === 'all'} onPress={() => setFilter('all')} />
          <Chip label={'À prévoir (' + (counts.late + counts.soon) + ')'} active={filter === 'todo'} onPress={() => setFilter('todo')} />
          <Chip label={'En retard (' + counts.late + ')'} active={filter === 'late'} onPress={() => setFilter('late')} />
        </ScrollView>

        {error ? (
          <Card style={{ borderWidth: 1, borderColor: C.red }}>
            <Text style={{ color: C.red }}>{error}</Text>
          </Card>
        ) : null}

        {examples.length ? (
          <HeroCard>
            <Text style={[T.body, { fontWeight: '600' }]}>Véhicules d’exemple</Text>
            <Text style={[T.sub, { marginTop: 4 }]}>Ils sont là pour essayer l’appli. Ajoute ton premier vrai véhicule, puis supprime-les.</Text>
            <Row style={{ marginTop: 12 }} gap={10}>
              <Btn small title="Ajouter un véhicule" icon="add" style={{ flex: 1 }} onPress={() => router.push('/vehicule-form')} />
              <Btn small kind="secondary" title="Supprimer" icon="trash-outline" onPress={removeExamples} />
            </Row>
          </HeroCard>
        ) : null}

        {!vehicles.length && !loading ? (
          <Empty icon="car-sport-outline" text="Aucun véhicule pour l’instant.">
            <Btn title="Ajouter un véhicule" icon="add" onPress={() => router.push('/vehicule-form')} />
          </Empty>
        ) : !list.length ? (
          <Empty icon="search" text="Aucun véhicule ne correspond." />
        ) : (
          list.map(v => <VehicleRow key={v.id} v={v} />)
        )}

        {vehicles.length && !examples.length ? (
          <Pressable
            onPress={() => router.push('/vehicule-form')}
            style={({ pressed }) => ({
              borderRadius: R.card,
              borderWidth: 1.5,
              borderStyle: 'dashed',
              borderColor: C.sep,
              padding: 18,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
              opacity: pressed ? 0.6 : 1,
            })}>
            <Ionicons name="add" size={20} color={C.text2} />
            <Text style={[T.body, { color: C.text2 }]}>Ajouter un véhicule</Text>
          </Pressable>
        ) : null}
      </Screen>
    </>
  );
}
