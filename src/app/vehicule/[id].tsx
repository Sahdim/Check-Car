// Fiche véhicule (espace pro).
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ask, Empty, notify, Screen, tap } from '@/components/ui';
import { VehicleDetail } from '@/components/VehicleDetail';
import { useStore, useVehicle } from '@/lib/store';

export default function Fiche() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const v = useVehicle(id);
  const { settings, saveVehicle, deleteVehicle } = useStore();

  const del = () => {
    if (!v) return;
    const msg = (v.brand + ' ' + v.model + ' ' + v.plate).trim() + ', tout son historique et ses documents seront effacés.';
    ask('Supprimer ce véhicule ?', msg, 'Supprimer', async () => {
      try {
        await deleteVehicle(v.id);
        tap('success');
        router.back();
      } catch (e: any) {
        notify('Suppression impossible', e?.message);
      }
    }, true);
  };

  return (
    <>
      <Stack.Screen options={{ title: v?.plate || v?.model || 'Véhicule' }} />
      <Screen>
        {!v ? (
          <Empty icon="alert-circle-outline" text="Véhicule introuvable." />
        ) : (
          <VehicleDetail v={v} garage={settings.garage} onSave={saveVehicle} onDelete={del} />
        )}
      </Screen>
    </>
  );
}
