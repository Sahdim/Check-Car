// Plaque d'immatriculation française réaliste : fond blanc crème, bande bleue UE avec les 12 étoiles
// et la lettre F, bande bleue à droite avec le numéro de département (facultatif). Pas de logo de région.
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { fmtPlate } from '@/lib/utils';

const BLEU = '#003399';
const JAUNE = '#FFCC00';

type Size = 'sm' | 'md' | 'lg';
const DIMS: Record<Size, { h: number; band: number; font: number; spacing: number; pad: number; radius: number }> = {
  sm: { h: 24, band: 13, font: 13.5, spacing: 1.1, pad: 7, radius: 4 },
  md: { h: 34, band: 18, font: 19, spacing: 1.6, pad: 10, radius: 5 },
  lg: { h: 52, band: 27, font: 30, spacing: 2.6, pad: 16, radius: 7 },
};

// Une étoile à 5 branches centrée en (cx, cy)
function starPoints(cx: number, cy: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? r * 0.4 : r;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push((cx + rad * Math.cos(a)).toFixed(2) + ',' + (cy + rad * Math.sin(a)).toFixed(2));
  }
  return pts.join(' ');
}

function Etoiles({ size }: { size: number }) {
  const c = size / 2;
  const R = size * 0.36; // rayon du cercle d'étoiles
  const r = size * 0.085; // taille d'une étoile
  return (
    <Svg width={size} height={size} viewBox={'0 0 ' + size + ' ' + size}>
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * Math.PI) / 6;
        return <Polygon key={i} points={starPoints(c + R * Math.sin(a), c - R * Math.cos(a), r)} fill={JAUNE} />;
      })}
    </Svg>
  );
}

export function PlaqueFR({ plate, dept, size = 'md', style }: { plate: string; dept?: string; size?: Size; style?: StyleProp<ViewStyle> }) {
  if (!plate) return null;
  const d = DIMS[size];
  const txt = fmtPlate(plate);
  const dep = String(dept || '').trim().toUpperCase();
  return (
    <View
      accessibilityLabel={'Plaque ' + txt + (dep ? ', département ' + dep : '')}
      style={[
        {
          flexDirection: 'row',
          height: d.h,
          borderRadius: d.radius,
          backgroundColor: '#FBFAF3',
          borderWidth: size === 'sm' ? 1 : 1.5,
          borderColor: '#151515',
          overflow: 'hidden',
          alignSelf: 'flex-start',
        },
        Platform.select({
          web: { boxShadow: '0 2px 4px rgba(0,0,0,0.45)' } as any,
          default: { shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 3, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
        }),
        style,
      ]}>
      {/* Bande UE */}
      <View style={{ width: d.band, backgroundColor: BLEU, alignItems: 'center', justifyContent: 'space-between', paddingTop: d.h * 0.06, paddingBottom: d.h * 0.07 }}>
        <Etoiles size={d.band * 0.92} />
        <Text style={{ color: '#fff', fontSize: d.h * 0.32, lineHeight: d.h * 0.36, fontWeight: '700', includeFontPadding: false }}>F</Text>
      </View>
      {/* Numéro */}
      <View style={{ justifyContent: 'center', paddingHorizontal: d.pad }}>
        <Text
          numberOfLines={1}
          style={{
            color: '#0B0B0B',
            fontSize: d.font,
            fontWeight: '900',
            letterSpacing: d.spacing,
            includeFontPadding: false,
            fontVariant: ['tabular-nums'],
            textShadowColor: 'rgba(0,0,0,0.18)',
            textShadowOffset: { width: 0, height: 0.6 },
            textShadowRadius: 0.5,
          }}>
          {txt}
        </Text>
      </View>
      {/* Bande département */}
      <View style={{ width: d.band, backgroundColor: BLEU, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: d.h * 0.07 }}>
        {dep ? (
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: '#fff', fontSize: d.h * (dep.length > 2 ? 0.26 : 0.32), lineHeight: d.h * 0.36, fontWeight: '800', includeFontPadding: false }}>
            {dep}
          </Text>
        ) : null}
      </View>
      {/* Relief : léger reflet en haut */}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0)', 'rgba(0,0,0,0.06)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
