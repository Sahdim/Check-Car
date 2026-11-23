// Mode garagiste : barre d'onglets en verre dépoli en bas de l'écran.
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/tabs';
import { Platform, StyleSheet, View, type ColorValue } from 'react-native';
import { useStore } from '@/lib/store';
import { C } from '@/lib/theme';

type IconName = keyof typeof Ionicons.glyphMap;
const icon =
  (on: IconName, off: IconName) =>
  ({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) => <Ionicons name={focused ? on : off} size={size} color={color as string} />;

export default function GarageTabs() {
  const { isGarage } = useStore();
  if (!isGarage) return <Redirect href="/client" />; // déconnecté : retour à l'espace client
  const blur = Platform.OS !== 'android'; // le flou Android demande une config spéciale : fond sombre presque opaque à la place
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.text,
        tabBarInactiveTintColor: C.text3,
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: '600' },
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: blur ? 'transparent' : 'rgba(18,18,20,0.96)',
          borderTopColor: C.sep,
          borderTopWidth: StyleSheet.hairlineWidth,
          elevation: 0,
          ...(Platform.OS === 'web' ? { height: 68, paddingBottom: 12, paddingTop: 6 } : null),
        },
        tabBarBackground: () =>
          blur ? (
            <BlurView tint="systemChromeMaterialDark" intensity={90} style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(18,18,20,0.96)' }]} />
          ),
        sceneStyle: { backgroundColor: C.bg },
      }}>
      <Tabs.Screen name="vehicules" options={{ title: 'Véhicules', tabBarIcon: icon('car-sport', 'car-sport-outline') }} />
      <Tabs.Screen name="clients" options={{ title: 'Clients', tabBarIcon: icon('people', 'people-outline') }} />
      <Tabs.Screen name="codes" options={{ title: 'Codes', tabBarIcon: icon('warning', 'warning-outline') }} />
      <Tabs.Screen name="atelier" options={{ title: 'Atelier', tabBarIcon: icon('construct', 'construct-outline') }} />
      <Tabs.Screen name="reglages" options={{ title: 'Réglages', tabBarIcon: icon('settings', 'settings-outline') }} />
    </Tabs>
  );
}
