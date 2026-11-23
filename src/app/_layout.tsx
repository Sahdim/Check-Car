import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
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
  if (!ready) return <View style={{ flex: 1, backgroundColor: C.bg }} />; // le logo d'ouverture reste affiché par-dessus
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

const LOGO = require('../../assets/images/splash-icon.png');

/** Ouverture : le logo (même taille et même place que l'écran de lancement) grossit légèrement puis s'efface en fondu. */
function Ouverture() {
  const { ready } = useStore();
  const [fini, setFini] = useState(false);
  const fond = useRef(new Animated.Value(1)).current;
  const logo = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!ready) return;
    SplashScreen.hideAsync().catch(() => {});
    Animated.parallel([
      Animated.timing(logo, { toValue: 1, duration: 520, delay: 120, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(fond, { toValue: 0, duration: 420, delay: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start(() => setFini(true));
  }, [ready, fond, logo]);
  if (fini) return null;
  const scale = logo.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const opacity = logo.interpolate({ inputRange: [0, 0.35, 1], outputRange: [1, 1, 0] });
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.ouverture, { opacity: fond }]}>
      <Animated.Image source={LOGO} style={[styles.logo, { opacity, transform: [{ scale }] }]} resizeMode="contain" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  ouverture: { backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  logo: { width: 160, height: 160 },
});

export default function RootLayout() {
  return (
    <SafeAreaProvider style={{ backgroundColor: C.bg }}>
      <ThemeProvider value={theme}>
        <StoreProvider>
          <StatusBar style="light" />
          <Root />
          <Ouverture />
        </StoreProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
