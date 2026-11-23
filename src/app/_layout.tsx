import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { smallHeader } from '@/lib/nav';
import { StoreProvider, useStore } from '@/lib/store';
import { C } from '@/lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: C.bg, card: C.bg, text: C.text, border: C.sep, primary: C.orange, notification: C.red },
};

function Root() {
  const { ready, isGarage } = useStore();
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);
  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.text3} />
      </View>
    );
  }
  const modal = Platform.OS === 'ios' ? ('modal' as const) : ('card' as const);
  return (
    <Stack screenOptions={{ ...smallHeader, headerShown: false, headerBackTitle: 'Retour' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(garage)" options={{ animation: 'fade' }} />
      <Stack.Screen name="client" options={{ animation: 'fade' }} />
      {/* écrans de l'espace pro : inaccessibles sans connexion */}
      <Stack.Protected guard={isGarage}>
        <Stack.Screen name="vehicule/[id]" options={{ headerShown: true, title: '' }} />
        <Stack.Screen name="vehicule-form" options={{ headerShown: true, presentation: modal, title: 'Véhicule' }} />
        <Stack.Screen name="intervention" options={{ headerShown: true, presentation: modal, title: 'Intervention' }} />
        <Stack.Screen name="code-releve" options={{ headerShown: true, presentation: modal, title: 'Code relevé' }} />
      </Stack.Protected>
      <Stack.Screen name="nouveau-mot-de-passe" options={{ headerShown: true, title: 'Nouveau mot de passe' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider style={{ backgroundColor: C.bg }}>
      <ThemeProvider value={theme}>
        <StoreProvider>
          <StatusBar style="light" />
          <Root />
        </StoreProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
