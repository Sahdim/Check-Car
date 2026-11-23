import { Stack } from 'expo-router';
import { largeHeader } from '@/lib/nav';

export default function Layout() {
  return (
    <Stack screenOptions={largeHeader}>
      <Stack.Screen name="index" options={{ title: 'Réglages' }} />
    </Stack>
  );
}
