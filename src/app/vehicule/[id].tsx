// Fiche véhicule (mode garagiste).
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, Platform } from 'react-native';
import { Empty, Screen, tap } from '@/components/ui';
import { VehicleDetail } from '@/components/VehicleDetail';
import { deletePhoto } from '@/lib/photos';
import { useStore, useVehicle } from '@/lib/store';

export default function Fiche() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const v = useVehicle(id);
  const { settings, saveVehicle, deleteVehicle } = useStore();

  const del = () => {
    if (!v) return;
    const go = async () => {
      await deleteVehicle(v.id);
      deletePhoto(v.photoCg);
      tap('success');
      router.back();
    };
    const msg = (v.brand + ' ' + v.model + ' ' + v.plate).trim() + ' et tout son historique seront effacés.';
    if (Platform.OS === 'web') {
      if (window.confirm('Supprimer ce véhicule ?\n' + msg)) go();
    } else Alert.alert('Supprimer ce véhicule ?', msg, [{ text: 'Annuler', style: 'cancel' }, { text: 'Supprimer', style: 'destructive', onPress: go }]);
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
