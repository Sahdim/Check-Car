// Réglages communs des en-têtes : grand titre iOS qui devient compact au défilement, fond flouté.
import { Platform } from 'react-native';
import { C } from './theme';

const ios = Platform.OS === 'ios';

export const largeHeader = {
  headerLargeTitleEnabled: true,
  headerTransparent: ios,
  headerBlurEffect: 'systemChromeMaterialDark' as const,
  headerLargeTitleShadowVisible: false,
  headerShadowVisible: false,
  headerStyle: { backgroundColor: ios ? 'transparent' : C.bg },
  headerLargeStyle: { backgroundColor: C.bg },
  headerTitleStyle: { color: C.text, fontWeight: '600' as const },
  headerLargeTitleStyle: { color: C.text, fontWeight: '700' as const, fontSize: 34 },
  headerTintColor: C.orange,
  contentStyle: { backgroundColor: C.bg },
};

export const smallHeader = { ...largeHeader, headerLargeTitleEnabled: false };
