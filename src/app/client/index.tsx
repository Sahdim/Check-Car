// Espace client : « Mes véhicules ». Le client entre le code donné par son garagiste.
// Il peut suivre plusieurs véhicules (un code par véhicule), sans pouvoir les modifier.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, RefreshControl, Text, View } from 'react-native';
import { CodeEntry } from '@/components/CodeEntry';
import { PlaqueFR } from '@/components/PlaqueFR';
import { ask, Btn, Card, Dot, Screen, T, TextLink, tap } from '@/components/ui';
import { worstAlert } from '@/lib/alerts';
import { useStore, type ClientCar } from '@/lib/store';
import { supabaseEnabled } from '@/lib/supabase';
import { C, R } from '@/lib/theme';
import { vSub, vTitle } from '@/lib/utils';

export default function MesVehicules() {
  const { clientCars, clientLoading, refreshClient, removeClientCode } = useStore();

  const remove = (c: ClientCar) =>
    ask(
      'Retirer ce véhicule ?',
      (c.v ? vTitle(c.v) + ' ' + c.v.plate : 'Code ' + c.code) + ' ne sera plus dans ta liste. Tu pourras le remettre avec le même code.',
      'Retirer',
      () => {
        removeClientCode(c.code);
        tap('success');
      },
      true,
    );

  const offline = clientCars.some(c => c.status === 'error');

  return (
    <Screen refreshControl={clientCars.length ? <RefreshControl refreshing={clientLoading} onRefresh={refreshClient} tintColor={C.text3} /> : undefined}>
      {!clientCars.length ? (
        <CodeEntry />
      ) : (
        <>
          {offline ? (
            <Card style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <Ionicons name="cloud-offline-outline" size={20} color={C.orange} />
              <Text style={[T.sub, { flex: 1 }]}>Pas de connexion : tu vois les dernières infos enregistrées. Tire vers le bas pour réessayer.</Text>
            </Card>
          ) : null}
          {clientCars.map(c => (
            <CarCard key={c.code} c={c} onRemove={() => remove(c)} />
          ))}
          <Btn kind="secondary" title="Ajouter un véhicule" icon="add" onPress={() => router.push('/client/ajouter')} style={{ marginTop: 6 }} />
        </>
      )}

      {!supabaseEnabled ? (
        <Text style={[T.tiny, { textAlign: 'center' }]}>Version d’essai (sans base en ligne) : les codes ne marchent que sur le téléphone du garagiste.</Text>
      ) : null}
      <TextLink title="Espace pro" onPress={() => router.push('/client/connexion')} style={{ marginTop: 18 }} />
    </Screen>
  );
}

function CarCard({ c, onRemove }: { c: ClientCar; onRemove: () => void }) {
  const v = c.v;
  if (!v) {
    // code supprimé par le garage, ou pas encore chargé
    return (
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons name={c.status === 'missing' ? 'alert-circle' : c.status === 'loading' ? 'time-outline' : 'cloud-offline-outline'} size={22} color={c.status === 'missing' ? C.red : C.text3} />
          <View style={{ flex: 1 }}>
            <Text style={[T.body, { fontWeight: '700', letterSpacing: 1 }]}>{c.code}</Text>
            <Text style={T.sub}>
              {c.status === 'missing'
                ? 'Ce code n’existe plus. Demande le nouveau code à ton garagiste.'
                : c.status === 'loading'
                  ? 'Chargement…'
                  : c.error || 'Connexion impossible'}
            </Text>
          </View>
        </View>
        <Btn kind="danger" small title="Retirer de ma liste" icon="trash-outline" onPress={onRemove} />
      </Card>
    );
  }
  const w = worstAlert(v);
  return (
    <Pressable
      onPress={() => {
        tap();
        router.push({ pathname: '/client/[code]', params: { code: c.code } });
      }}
      onLongPress={onRemove}
      style={({ pressed }) => ({ backgroundColor: C.card, borderRadius: R.card, padding: 16, gap: 10, opacity: pressed ? 0.75 : 1 })}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: C.text, fontSize: 19, fontWeight: '800' }} numberOfLines={1}>
            {vTitle(v)}
          </Text>
          {vSub(v) ? (
            <Text style={T.sub} numberOfLines={1}>
              {vSub(v)}
            </Text>
          ) : null}
        </View>
        <Pressable accessibilityLabel="Retirer ce véhicule" hitSlop={10} onPress={onRemove} style={{ padding: 2 }}>
          <Ionicons name="ellipsis-horizontal-circle" size={24} color={C.text3} />
        </Pressable>
      </View>
      <PlaqueFR plate={v.plate} dept={v.dept} size="md" />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Dot level={w.level} />
        <Text style={[T.sub, { color: C.text, flex: 1 }]} numberOfLines={2}>
          {w.txt}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={C.text3} />
      </View>
      {c.status === 'missing' ? <Text style={{ color: C.red, fontSize: 13 }}>Ce code n’existe plus chez le garage : infos peut-être anciennes.</Text> : null}
    </Pressable>
  );
}
