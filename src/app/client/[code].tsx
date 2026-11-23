// Espace client : carnet d'un véhicule (lecture seule).
import { Stack, useLocalSearchParams } from 'expo-router';
import { RefreshControl } from 'react-native';
import { Empty, Screen } from '@/components/ui';
import { VehicleDetail } from '@/components/VehicleDetail';
import { useStore } from '@/lib/store';
import { C } from '@/lib/theme';
import { normCode } from '@/lib/utils';

export default function ClientVehicule() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { clientCars, clientLoading, refreshClient } = useStore();
  const c = clientCars.find(x => x.code === normCode(code || ''));
  const v = c?.v;
  return (
    <>
      <Stack.Screen options={{ title: v?.plate || v?.model || 'Véhicule' }} />
      <Screen refreshControl={<RefreshControl refreshing={clientLoading} onRefresh={refreshClient} tintColor={C.text3} />}>
        {!v ? (
          <Empty
            icon="alert-circle-outline"
            text={c?.status === 'missing' ? 'Ce code n’existe plus. Demande le nouveau code à ton garagiste.' : c?.status === 'loading' ? 'Chargement…' : 'Véhicule introuvable. Tire vers le bas pour réessayer.'}
          />
        ) : (
          <VehicleDetail v={v} garage={{ name: '', phone: '', address: '' }} readOnly />
        )}
      </Screen>
    </>
  );
}
