// Briques d'interface réutilisées partout (thème « Mon Job Méca »).
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomTabBarHeightContext } from 'expo-router/tabs';
import React, { useContext } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ScrollViewProps,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, R, levelColor, type Level } from '@/lib/theme';

export const tap = (style: 'light' | 'medium' | 'success' = 'light') => {
  if (Platform.OS === 'web') return;
  if (style === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  else Haptics.impactAsync(style === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};

/* ---------- Écran qui défile (gère le grand titre iOS et la barre d'onglets) ---------- */
export function Screen({ children, contentContainerStyle, ...rest }: ScrollViewProps & { children: React.ReactNode }) {
  const tabH = useContext(BottomTabBarHeightContext) ?? 0;
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={[{ padding: 16, paddingBottom: Math.max(tabH, insets.bottom) + 32, gap: 12 }, contentContainerStyle]}
      {...rest}>
      {children}
    </ScrollView>
  );
}

/* ---------- Textes ---------- */
export const T = StyleSheet.create({
  large: { color: C.text, fontSize: 34, fontWeight: '700', letterSpacing: 0.3 },
  title: { color: C.text, fontSize: 22, fontWeight: '700' },
  h2: { color: C.text, fontSize: 20, fontWeight: '700', marginTop: 12 },
  body: { color: C.text, fontSize: 16 },
  sub: { color: C.text2, fontSize: 14 },
  tiny: { color: C.text3, fontSize: 12 },
  label: { color: C.text3, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
});

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 14, marginBottom: 2 }}>
      <Text style={[T.title, { flex: 1 }]}>{children}</Text>
      {right}
    </View>
  );
}

/* ---------- Cartes ---------- */
export function Card({ children, style, secondary }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; secondary?: boolean }) {
  return <View style={[{ backgroundColor: secondary ? C.card2 : C.card, borderRadius: R.card, padding: 16 }, style]}>{children}</View>;
}

// Carte mise en avant : dégradé gris -> graphite, halo orange en haut à droite, bleu en bas à gauche
export function HeroCard({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ borderRadius: R.card, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.08)' }, style]}>
      <LinearGradient colors={['#3A3A3C', '#1C1C1E', '#111113']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <LinearGradient pointerEvents="none" colors={['rgba(255,159,10,0.34)', 'rgba(255,159,10,0.08)', 'rgba(255,159,10,0)']} locations={[0, 0.35, 0.7]} start={{ x: 1, y: 0 }} end={{ x: 0.3, y: 0.75 }} style={StyleSheet.absoluteFill} />
      <LinearGradient pointerEvents="none" colors={['rgba(10,132,255,0.30)', 'rgba(10,132,255,0.06)', 'rgba(10,132,255,0)']} locations={[0, 0.35, 0.7]} start={{ x: 0, y: 1 }} end={{ x: 0.6, y: 0.3 }} style={StyleSheet.absoluteFill} />
      <View style={{ padding: 18 }}>{children}</View>
    </View>
  );
}
/* ---------- Boutons ---------- */
type BtnProps = {
  title: string;
  onPress?: () => void;
  kind?: 'primary' | 'secondary' | 'danger' | 'ghost';
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
  haptic?: boolean;
};
export function Btn({ title, onPress, kind = 'primary', icon, disabled, loading, small, style, haptic = true }: BtnProps) {
  const bg = kind === 'primary' ? '#FFFFFF' : kind === 'danger' ? 'rgba(255,69,58,0.16)' : kind === 'ghost' ? 'transparent' : C.card2;
  const fg = kind === 'primary' ? '#000000' : kind === 'danger' ? C.red : kind === 'ghost' ? C.blue : C.text;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={() => {
        if (haptic) tap(kind === 'primary' ? 'medium' : 'light');
        onPress?.();
      }}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderRadius: R.btn,
          height: small ? 38 : 48,
          paddingHorizontal: small ? 14 : 18,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}>
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Ionicons name={icon} size={small ? 16 : 19} color={fg} /> : null}
      <Text style={{ color: fg, fontSize: small ? 14 : 16, fontWeight: '600' }} numberOfLines={1}>
        {title}
      </Text>
    </Pressable>
  );
}

export function IconBtn({ icon, onPress, color = C.text, label }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void; color?: string; label: string }) {
  return (
    <Pressable
      accessibilityLabel={label}
      hitSlop={8}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 18, backgroundColor: C.card2, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
      <Ionicons name={icon} size={18} color={color} />
    </Pressable>
  );
}

/* ---------- Puces ---------- */
export function Chip({ label, active, onPress, icon }: { label: string; active?: boolean; onPress?: () => void; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      onPress={() => {
        if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
        onPress?.();
      }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        height: 36,
        borderRadius: R.chip,
        backgroundColor: active ? '#FFFFFF' : C.card2,
        opacity: pressed ? 0.75 : 1,
      })}>
      {icon ? <Ionicons name={icon} size={15} color={active ? '#000' : C.text2} /> : null}
      <Text style={{ color: active ? '#000' : C.text, fontSize: 14, fontWeight: active ? '600' : '500' }}>{label}</Text>
    </Pressable>
  );
}

export function PrioBadge({ label = 'PRIO' }: { label?: string }) {
  return (
    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, alignSelf: 'flex-start' }}>
      <Text style={{ color: '#000', fontSize: 11, fontWeight: '800', letterSpacing: 0.6 }}>{label}</Text>
    </View>
  );
}

export function Dot({ level, size = 8 }: { level: Level; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: levelColor(level) }} />;
}

export function StatusPill({ level, text }: { level: Level; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.card2, borderRadius: R.chip, paddingHorizontal: 12, paddingVertical: 7, alignSelf: 'flex-start', maxWidth: '100%' }}>
      <Dot level={level} />
      <Text style={{ color: C.text, fontSize: 14, flexShrink: 1 }}>{text}</Text>
    </View>
  );
}

/* ---------- Plaque d'immatriculation française ---------- */
export function Plate({ plate, big }: { plate: string; big?: boolean }) {
  if (!plate) return null;
  const h = big ? 38 : 24;
  return (
    <View style={{ flexDirection: 'row', height: h, borderRadius: 5, overflow: 'hidden', backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#111', alignSelf: 'flex-start' }}>
      <View style={{ width: big ? 20 : 13, backgroundColor: '#0A4AA8', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: big ? 3 : 1 }}>
        <Text style={{ color: '#fff', fontSize: big ? 11 : 8, fontWeight: '700' }}>F</Text>
      </View>
      <View style={{ justifyContent: 'center', paddingHorizontal: big ? 12 : 7 }}>
        <Text style={{ color: '#111', fontSize: big ? 21 : 13, fontWeight: '800', letterSpacing: big ? 1.5 : 0.8, fontVariant: ['tabular-nums'] }}>{plate}</Text>
      </View>
      <View style={{ width: big ? 20 : 13, backgroundColor: '#0A4AA8' }} />
    </View>
  );
}

/* ---------- Champs de saisie ---------- */
export function Field({
  label,
  hint,
  style,
  inputStyle,
  ...props
}: TextInputProps & { label: string; hint?: string; style?: StyleProp<ViewStyle>; inputStyle?: StyleProp<TextStyle> }) {
  return (
    <View style={[{ gap: 6 }, style]}>
      <Text style={T.label}>{label}</Text>
      <TextInput
        placeholderTextColor={C.text3}
        selectionColor={C.orange}
        keyboardAppearance="dark"
        style={[
          { backgroundColor: C.card2, color: C.text, borderRadius: 12, paddingHorizontal: 14, minHeight: 48, fontSize: 17 },
          props.multiline ? { paddingTop: 12, paddingBottom: 12, minHeight: 96, textAlignVertical: 'top' } : null,
          inputStyle,
        ]}
        {...props}
      />
      {hint ? <Text style={T.tiny}>{hint}</Text> : null}
    </View>
  );
}

export function Row({ children, style, gap = 12 }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', gap, alignItems: 'center' }, style]}>{children}</View>;
}

export function Sep() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.sep, marginVertical: 10 }} />;
}

export function Empty({ icon, text, children }: { icon: keyof typeof Ionicons.glyphMap; text: string; children?: React.ReactNode }) {
  return (
    <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 28 }}>
      <Ionicons name={icon} size={34} color={C.text3} />
      <Text style={[T.sub, { textAlign: 'center' }]}>{text}</Text>
      {children}
    </Card>
  );
}

export function Fact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={{ minWidth: '45%', flexGrow: 1, gap: 2 }}>
      <Text style={T.tiny}>{label}</Text>
      <Text style={{ color: C.text, fontSize: 16, fontWeight: '600', fontFamily: mono ? Platform.select({ ios: 'Menlo', default: 'monospace' }) : undefined }} selectable>
        {value}
      </Text>
    </View>
  );
}
