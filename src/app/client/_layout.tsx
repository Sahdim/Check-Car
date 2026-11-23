// Espace client : jamais affiché quand le garagiste est connecté.
import { Redirect, Stack } from 'expo-router';
import { Platform } from 'react-native';
import { largeHeader, smallHeader } from '@/lib/nav';
import { useStore } from '@/lib/store';

export default function Layout() {
  const { isGarage } = useStore();
  if (isGarage) return <Redirect href="/vehicules" />;
  const modal = Platform.OS === 'ios' ? ('modal' as const) : ('card' as const);
  return (
    <Stack screenOptions={{ ...largeHeader, headerBackTitle: 'Retour' }}>
      <Stack.Screen name="index" options={{ title: 'Mes véhicules' }} />
      <Stack.Screen name="[code]" options={{ ...smallHeader, title: '' }} />
      <Stack.Screen name="ajouter" options={{ ...smallHeader, presentation: modal, title: 'Ajouter un véhicule' }} />
      <Stack.Screen name="connexion" options={{ ...smallHeader, title: 'Espace pro' }} />
    </Stack>
  );
}
