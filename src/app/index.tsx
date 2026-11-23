// Aiguillage au démarrage : espace pro si le garagiste est connecté, sinon espace client.
import { Redirect } from 'expo-router';
import { useStore } from '@/lib/store';

export default function Index() {
  const { isGarage } = useStore();
  return <Redirect href={isGarage ? '/vehicules' : '/client'} />;
}
