// Espace client : ajouter un autre véhicule (un autre code), sans effacer les anciens.
import { router } from 'expo-router';
import { Screen } from '@/components/ui';
import { CodeEntry } from '@/components/CodeEntry';

export default function Ajouter() {
  return (
    <Screen>
      <CodeEntry again onDone={() => router.back()} />
    </Screen>
  );
}
