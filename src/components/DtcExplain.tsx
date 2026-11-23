// Explication d'un code défaut : système, générique ou constructeur, signification (si connue),
// causes fréquentes, première vérification et gravité indicative. Rien n'est inventé.
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';
import { dtcFirstCheck, dtcGravity, dtcStructure, findDtc, normDtc } from '@/lib/dtc';
import { C, levelColor } from '@/lib/theme';
import { Card, T } from './ui';

function Line({ icon, color, label, children }: { icon: keyof typeof Ionicons.glyphMap; color: string; label: string; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: C.card2, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={17} color={color} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={T.tiny}>{label}</Text>
        <Text style={[T.body, { fontSize: 15 }]}>{children}</Text>
      </View>
    </View>
  );
}

export function DtcExplain({ code, compact }: { code: string; compact?: boolean }) {
  const c = normDtc(code);
  if (!c) return null;
  const info = findDtc(c);
  const st = dtcStructure(c);
  const g = dtcGravity(c);
  const check = dtcFirstCheck(c);
  return (
    <Card style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text style={{ color: C.text, fontSize: compact ? 24 : 30, fontWeight: '800', letterSpacing: 1.5 }}>{c}</Text>
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: levelColor(g.level) + '26', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: levelColor(g.level) }} />
          <Text style={{ color: levelColor(g.level), fontWeight: '700', fontSize: 13 }}>Gravité : {g.label}</Text>
        </View>
      </View>

      {info ? (
        <Text style={{ color: C.text, fontSize: 18, fontWeight: '700' }}>{info.label}</Text>
      ) : (
        <Text style={[T.body, { color: C.yellow }]}>
          {st?.kind === 'generic'
            ? 'Code générique absent de la base de l’appli : je ne donne pas de signification au hasard. Lis le libellé exact sur ta valise.'
            : 'Signification non disponible ici : lis le libellé exact sur ta valise ou l’outil constructeur.'}
        </Text>
      )}

      {st ? (
        <Line icon="hardware-chip-outline" color={C.sky} label="Système concerné">
          {st.system}
          {st.family ? ' · ' + st.family : ''}
        </Line>
      ) : null}
      {st ? (
        <Line icon={st.kind === 'generic' ? 'globe-outline' : 'business-outline'} color={st.kind === 'generic' ? C.green : C.orange} label="Type de code">
          {st.kindTxt}
        </Line>
      ) : null}
      {info?.causes ? (
        <Line icon="search-outline" color={C.orange} label="Causes fréquentes (pistes, pas un diagnostic)">
          {info.causes}
        </Line>
      ) : null}
      {check ? (
        <Line icon="checkmark-done-outline" color={C.green} label="Première vérification">
          {check}
        </Line>
      ) : null}
      <Line icon="speedometer-outline" color={levelColor(g.level)} label="Gravité indicative">
        {g.why}
      </Line>
      {!compact ? <Text style={T.tiny}>Explication indicative : confirme toujours avec la valise et la documentation du constructeur.</Text> : null}
    </Card>
  );
}
