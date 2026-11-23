// Codes défaut (OBD) : recherche et explication en français.
// Règle d'or : on n'invente JAMAIS la signification d'un code. Un code absent de la base
// est seulement « décodé » (lettre, générique/constructeur, famille), sans signification.
import { DTC_BASE } from './dtcData';
import type { Level } from './theme';
import type { Vehicle } from './types';
import { fmtKm, norm, vName } from './utils';

export type DtcInfo = { code: string; label: string; causes: string };

export const DTC_LIST: DtcInfo[] = DTC_BASE.map(([code, label, causes]) => ({ code, label, causes }));
const BY_CODE = new Map(DTC_LIST.map(d => [d.code, d]));

export const SYSTEMS: Record<string, string> = {
  P: 'Moteur et boîte de vitesses (groupe motopropulseur)',
  C: 'Châssis (freins, ABS, direction, suspension)',
  B: 'Carrosserie (habitacle, airbags, confort, éclairage)',
  U: 'Réseau (communication entre calculateurs)',
};

/** « p0420 », « P 0420 », « 0420 » -> « P0420 ». Renvoie '' si ce n'est pas un code. */
export function normDtc(q: string): string {
  const s = String(q || '').toUpperCase().replace(/[\s\-.]/g, '');
  if (/^[PCBU][0-3][0-9A-F]{3}$/.test(s)) return s;
  if (/^[0-3][0-9A-F]{3}$/.test(s)) return 'P' + s; // sans lettre : on suppose un code moteur (P)
  if (/^DF\d{3,4}$/.test(s)) return s;
  return '';
}

/** Recherche par code (complet ou début) ou par mot */
export function searchDtc(q: string): DtcInfo[] {
  const raw = String(q || '').trim();
  if (!raw) return [];
  const up = raw.toUpperCase().replace(/[\s\-.]/g, '');
  if (/^[PCBU]?[0-3][0-9A-F]{0,3}$/.test(up) || /^[PCBU]$/.test(up)) {
    // début de code : P04, 042, U01…
    return DTC_LIST.filter(d => (/^[PCBU]/.test(up) ? d.code.startsWith(up) : d.code.slice(1).startsWith(up)));
  }
  const words = norm(raw).split(/\s+/).filter(Boolean);
  return DTC_LIST.filter(d => {
    const h = norm(d.code + ' ' + d.label + ' ' + d.causes);
    return words.every(w => h.includes(w));
  });
}

export const findDtc = (code: string) => BY_CODE.get(normDtc(code)) || null;

/* ---------- Structure du code ---------- */
const P0_FAMILY: Record<string, string> = {
  '0': 'dosage air / carburant et dépollution auxiliaire',
  '1': 'dosage air / carburant',
  '2': 'dosage air / carburant (circuit des injecteurs)',
  '3': 'allumage ou ratés d’allumage',
  '4': 'dépollution (EGR, évaporation, catalyseur, air secondaire)',
  '5': 'vitesse du véhicule, ralenti et entrées auxiliaires',
  '6': 'calculateur et sorties auxiliaires',
  '7': 'boîte de vitesses',
  '8': 'boîte de vitesses',
  '9': 'boîte de vitesses',
  A: 'propulsion hybride',
};

export type DtcStructure = { system: string; kind: 'generic' | 'brand' | 'reserved'; kindTxt: string; family?: string };

export function dtcStructure(code: string): DtcStructure | null {
  const c = normDtc(code);
  if (/^DF\d{3,4}$/.test(c))
    return { system: 'Code Renault / Dacia (outil CLIP)', kind: 'brand', kindTxt: 'Code constructeur : sa signification dépend du calculateur. Lis le libellé sur la valise ou l’outil CLIP.' };
  const m = c.match(/^([PCBU])([0-3])([0-9A-F])([0-9A-F]{2})$/);
  if (!m) return null;
  const [, letter, d2, d3] = m;
  let kind: DtcStructure['kind'];
  if (letter === 'P') kind = d2 === '0' || d2 === '2' || (d2 === '3' && parseInt(d3, 16) >= 4) ? 'generic' : 'brand';
  else kind = d2 === '0' ? 'generic' : d2 === '3' ? 'reserved' : 'brand';
  const kindTxt =
    kind === 'generic'
      ? 'Code générique (norme SAE) : même sens sur toutes les marques.'
      : kind === 'brand'
        ? 'Code constructeur : sa signification dépend de la marque. Lis le libellé exact sur ta valise ou l’outil constructeur.'
        : 'Plage réservée par la norme : lis le libellé exact sur ta valise.';
  let family: string | undefined;
  if (letter === 'P' && d2 === '0') family = P0_FAMILY[d3];
  if (letter === 'U' && d2 === '0') family = d3 === '0' ? 'réseau de communication (liaison électrique)' : d3 === '1' || d3 === '2' ? 'perte de communication avec un calculateur' : d3 === '3' ? 'logiciel ou configuration incompatible' : d3 === '4' ? 'données invalides reçues d’un calculateur' : undefined;
  return { system: SYSTEMS[letter], kind, kindTxt, family };
}

/* ---------- Gravité indicative ---------- */
export type Gravity = { level: Level; label: string; why: string };

const HIGH: [RegExp, string][] = [
  [/^P030\d$|^P031[0-2]$/, 'Ratés d’allumage : si le voyant clignote, arrête-toi (risque d’abîmer le catalyseur).'],
  [/^P0016$/, 'Possible décalage de distribution : évite de rouler avant contrôle (risque de casse moteur).'],
  [/^P0011$/, 'Calage d’arbre à cames anormal : vérifie vite le niveau d’huile et la distribution.'],
  [/^P0087$|^P0093$/, 'Pression de carburant trop basse ou fuite : risque de calage et d’incendie si fuite.'],
  [/^P0234$/, 'Surpression turbo : risque pour le moteur, limiter l’effort.'],
  [/^P0335$/, 'Sans capteur de vilebrequin, le moteur peut caler ou ne plus démarrer.'],
  [/^P0480$/, 'Ventilateur de refroidissement : risque de surchauffe, surveille la température.'],
  [/^P0606$|^U0100$/, 'Calculateur moteur muet ou en défaut : risque de panne immobilisante.'],
  [/^U0121$/, 'ABS sans communication : freinage sans assistance ABS.'],
];
const LOW: RegExp[] = [/^P044\d$/, /^P045[0-9A-F]$/, /^P0135$/, /^P0141$/, /^P0128$/, /^P0113$/, /^P0603$/, /^U0155$/];

export function dtcGravity(code: string): Gravity {
  const c = normDtc(code);
  const h = HIGH.find(([re]) => re.test(c));
  if (h) return { level: 'bad', label: 'Élevée', why: h[1] };
  if (LOW.some(re => re.test(c))) return { level: 'ok', label: 'Faible', why: 'Le véhicule peut en général rouler, mais il faut réparer (pollution, consommation, contrôle technique).' };
  if (BY_CODE.has(c)) return { level: 'warn', label: 'Moyenne', why: 'À contrôler rapidement : le défaut peut s’aggraver ou mettre le moteur en mode dégradé.' };
  return { level: 'warn', label: 'Inconnue', why: 'Dépend du libellé exact du code : à juger avec la valise.' };
}

/* ---------- Première vérification (seulement pour les codes où elle est sûre) ---------- */
const FIRST: [RegExp, string][] = [
  [/^P010[1-3]$/, 'Contrôle le filtre à air et les durites entre le débitmètre et le moteur (prise d’air, durite fendue).'],
  [/^P0106$|^P0236$/, 'Vérifie la petite durite de prise de pression et le connecteur du capteur.'],
  [/^P011[3-8]$/, 'Débranche et contrôle le connecteur de la sonde (oxydation, fils abîmés).'],
  [/^P0128$/, 'Regarde si le moteur monte bien en température : un thermostat bloqué ouvert est la cause la plus fréquente.'],
  [/^P0171$/, 'Cherche une prise d’air moteur tournant (durites, joint d’admission, reniflard).'],
  [/^P0172$/, 'Contrôle le filtre à air et le débitmètre, puis cherche un injecteur qui fuit.'],
  [/^P030\d$/, 'Permute la bobine (ou la bougie) du cylindre en défaut avec un cylindre voisin : si le défaut suit, la pièce est en cause.'],
  [/^P0087$/, 'Commence par le filtre à carburant et la pompe de gavage avant de toucher à la haute pression.'],
  [/^P0299$|^P2263$/, 'Cherche une fuite d’air de suralimentation : durites, colliers, échangeur, avant le turbo lui-même.'],
  [/^P040[0-2]$/, 'Démonte et regarde l’encrassement de la vanne EGR et de ses conduits.'],
  [/^P0420$/, 'Vérifie qu’il n’y a pas de fuite à l’échappement avant la sonde aval, puis compare les signaux des sondes amont et aval.'],
  [/^P0455$|^P0442$/, 'Vérifie d’abord le bouchon de réservoir (bien fermé, joint en bon état).'],
  [/^P056[0-3]$/, 'Mesure la tension de la batterie moteur arrêté puis moteur tournant, et contrôle les masses.'],
  [/^P0380$|^P067[0-4]$/, 'Contrôle les bougies de préchauffage une par une et leur alimentation.'],
  [/^P0700$/, 'Lis les codes du calculateur de boîte : celui-ci indique seulement qu’un défaut y est enregistré.'],
  [/^P2002$|^P2463$|^P242F$/, 'Lis la pression différentielle et la masse de suies, et vérifie les durites du capteur de pression différentielle.'],
  [/^P245[23]$/, 'Vérifie les deux durites du capteur de pression différentielle (percées, bouchées ou inversées).'],
  [/^U01\d\d$/, 'Contrôle la batterie, les fusibles, l’alimentation et la masse du calculateur qui ne répond plus.'],
];
export const dtcFirstCheck = (code: string) => FIRST.find(([re]) => re.test(normDtc(code)))?.[1] || '';

/* ---------- Texte pour « Demander à Claude » ---------- */
export function claudePrompt(code: string, v: Vehicle | null | undefined, symptoms: string): string {
  const c = normDtc(code) || String(code || '').toUpperCase();
  const info = findDtc(c);
  const st = dtcStructure(c);
  const l: string[] = [];
  l.push('Aide-moi à diagnostiquer cette panne (je suis mécanicien). Ne m’invente pas la signification d’un code constructeur : dis-moi si tu n’es pas sûr.');
  l.push('');
  if (v) {
    l.push('Véhicule : ' + vName(v) + (v.hp ? ' (' + v.hp + ' ch)' : '') + (v.year ? ', ' + v.year : '') + ', ' + fmtKm(v.km) + '.');
    if (v.vin) l.push('VIN : ' + v.vin);
  } else l.push('Véhicule : non précisé.');
  l.push('Code défaut : ' + (c || 'aucun'));
  if (st) l.push('- ' + st.kindTxt);
  if (info) l.push('- Libellé générique : ' + info.label);
  l.push('Symptômes et mesures déjà faites : ' + (symptoms.trim() || 'non précisés'));
  if (v) {
    const its = v.items.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6);
    if (its.length) {
      l.push('Dernières interventions :');
      its.forEach(i => l.push('- ' + i.date + ' : ' + (i.parts?.join(', ') || i.kind) + ' à ' + fmtKm(i.km) + (i.note ? ' (' + i.note + ')' : '')));
    }
    const autres = v.dtc.filter(d => d.code !== c).slice(0, 6);
    if (autres.length) l.push('Autres codes relevés sur ce véhicule : ' + autres.map(d => d.code + ' (' + d.date + ')').join(', '));
  }
  l.push('');
  l.push('Donne-moi : 1) ce que signifie le code, 2) les causes probables de la plus à la moins probable, 3) les contrôles à faire du plus simple au plus long, 4) si on peut continuer à rouler.');
  return l.join('\n');
}
