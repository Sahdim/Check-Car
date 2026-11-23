// Aiguillage au démarrage : on reprend le mode choisi la dernière fois.
import { Redirect } from 'expo-router';
import { useStore } from '@/lib/store';

export default function Index() {
  const { settings } = useStore();
  if (settings.mode === 'garage') return <Redirect href="/vehicules" />;
  if (settings.mode === 'client') return <Redirect href="/client" />;
  return <Redirect href="/accueil" />;
}
