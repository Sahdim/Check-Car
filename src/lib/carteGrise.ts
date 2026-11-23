// Analyse du texte lu sur une carte grise française (certificat d'immatriculation).
// Fonction PURE : aucun import, testable avec node (voir tests/carteGrise.test.ts).
//
// Rubriques utilisées :
//   A   immatriculation          B   date de 1re immatriculation
//   C.1 nom du titulaire         D.1 marque
//   D.2 type, variante, version  D.3 dénomination commerciale (modèle)
//   E   numéro VIN (17 car.)     J.1 genre national (VP, CTTE…)
//   P.1 cylindrée (cm3)          P.2 puissance (kW)    P.3 énergie (GO, ES…)

export type CarteGriseLue = {
  plate: string; // AB-123-CD ou 1234 AB 33
  dept: string; // département (seulement pour les anciennes plaques)
  firstReg: string; // AAAA-MM-JJ
  year: number;
  brand: string;
  model: string;
  version: string; // D.2
  vin: string;
  cc: number; // cylindrée cm3
  kw: number;
  hp: number; // ch = kW × 1,36
  energy: string; // code P.3 (GO, ES…)
  energyLabel: string; // Diesel, Essence…
  genre: string; // code J.1 (VP, CTTE…)
  genreLabel: string;
  body: string; // carrosserie déduite (utilitaire pour CTTE), sinon ''
  engine: string; // proposition : « 1.5 Diesel »
  owner: string; // C.1
  /** nombre de rubriques reconnues (0 = rien lu) */
  found: number;
};

export const ENERGIES: Record<string, string> = {
  GO: 'Diesel',
  ES: 'Essence',
  EL: 'Électrique',
  GP: 'GPL',
  GN: 'GNV',
  EH: 'Hybride essence',
  EE: 'Hybride rechargeable essence',
  GH: 'Hybride diesel',
  GL: 'Hybride rechargeable diesel',
  FE: 'Superéthanol E85',
  EG: 'Essence + GPL',
  EN: 'Essence + GNV',
};

export const GENRES: Record<string, string> = {
  VP: 'Voiture particulière',
  CTTE: 'Camionnette',
  CAM: 'Camion',
  VASP: 'Véhicule spécialisé',
  MTL: 'Moto légère',
  MTT1: 'Moto',
  MTT2: 'Moto',
  CL: 'Cyclomoteur',
  QM: 'Quadricycle à moteur',
  TCP: 'Autocar / autobus',
};

/* ---------- Repérage des rubriques ---------- */

// Rubriques à plusieurs caractères (D.1, P.3, C.4.1…) : reconnues n'importe où dans la ligne.
// Rubriques d'une seule lettre (A, B, E…) : seulement en début de ligne (sinon on les confond avec des mots).
const MULTI = /(?:^|[\s(|])((?:C|D|F|G|J|P|S|U|V|X|Y|Z)\s?[.,]?\s?\d(?:\s?[.,]\s?\d)?)(?=\s*[:.)]?\s|\s*:|$)/g;
const SINGLE = /^\(?([ABEHIKQ])\)?(?=\s*[:.)]?\s+\S|\s*$)/;

const keyOf = (raw: string) => {
  const s = raw.toUpperCase().replace(/[\s,]/g, '.').replace(/\.+/g, '.').replace(/[^A-Z0-9.]/g, '');
  const m = s.match(/^([A-Z])\.?(\d)(?:\.?(\d))?$/);
  if (!m) return s;
  return m[1] + '.' + m[2] + (m[3] ? '.' + m[3] : '');
};

const clean = (s: string) => s.replace(/^[\s:.)\-–]+/, '').replace(/\s+/g, ' ').trim();

function fields(lines: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  const startsWithLabel = (l: string) => SINGLE.test(l.trim()) || /^\(?(?:C|D|F|G|J|P|S|U|V|X|Y|Z)\s?[.,]?\s?\d/.test(l.trim());
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li].trim();
    if (!line) continue;
    const hits: { key: string; start: number; end: number }[] = [];
    const s = line.match(SINGLE);
    if (s) hits.push({ key: s[1], start: 0, end: s[0].length });
    MULTI.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = MULTI.exec(line))) {
      const start = m.index + m[0].indexOf(m[1]);
      if (hits.some(h => start < h.end)) continue;
      hits.push({ key: keyOf(m[1]), start, end: start + m[1].length });
    }
    hits.sort((a, b) => a.start - b.start);
    hits.forEach((h, i) => {
      let val = clean(line.slice(h.end, i + 1 < hits.length ? hits[i + 1].start : undefined));
      // rubrique seule sur sa ligne : la valeur est sur la ligne suivante
      if (!val && i === hits.length - 1 && li + 1 < lines.length && !startsWithLabel(lines[li + 1])) val = clean(lines[li + 1]);
      if (val && !(h.key in out)) out[h.key] = val;
    });
  }
  return out;
}

/* ---------- Valeurs ---------- */

const SIV = /\b([A-Z]{2})[\s-]?(\d{3})[\s-]?([A-Z]{2})\b/;
const FNI = /\b(\d{1,4})\s?([A-Z]{1,3})\s?(\d{2}|2A|2B|97[1-6])\b/;

function readPlate(v: string): { plate: string; dept: string } | null {
  let t = v.toUpperCase();
  // erreurs de lecture courantes dans la partie chiffres : O -> 0, I -> 1
  t = t.replace(/\b([A-Z]{2})[\s-]?([0-9OI]{3})[\s-]?([A-Z]{2})\b/, (_x, a, b, c) => a + '-' + b.replace(/O/g, '0').replace(/I/g, '1') + '-' + c);
  const s = t.match(SIV);
  if (s) return { plate: s[1] + '-' + s[2] + '-' + s[3], dept: '' };
  const f = t.match(FNI);
  if (f) return { plate: f[1] + ' ' + f[2] + ' ' + f[3], dept: f[3] };
  return null;
}

function readDate(v: string): string {
  const m = v.match(/\b(\d{1,2})\s?[/.\-]\s?(\d{1,2})\s?[/.\-]\s?((?:19|20)\d{2})\b/);
  if (!m) return '';
  const d = +m[1],
    mo = +m[2],
    y = +m[3];
  if (d < 1 || d > 31 || mo < 1 || mo > 12) return '';
  return y + '-' + String(mo).padStart(2, '0') + '-' + String(d).padStart(2, '0');
}

const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/;
function fixVin(t: string): string {
  // le VIN n'utilise jamais I, O ni Q : ce sont des 1 et des 0 mal lus
  return t.toUpperCase().replace(/[\s\-.]/g, '').replace(/[OQ]/g, '0').replace(/I/g, '1');
}
function readVin(v: string): string {
  const t = fixVin(v);
  if (VIN_RE.test(t)) return t;
  const m = t.match(/[A-HJ-NPR-Z0-9]{17}/);
  return m ? m[0] : '';
}

const num = (v: string) => {
  const m = v.replace(/(\d)\s(?=\d{3}\b)/g, '$1').match(/\d+(?:[.,]\d+)?/);
  return m ? parseFloat(m[0].replace(',', '.')) : 0;
};

// Majuscule au début des mots. min = longueur minimale (les sigles courts comme SW, GT restent en majuscules)
const word = (w: string, min: number) => (w.length >= min && /^\p{L}+$/u.test(w) ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w.toUpperCase());
const titleCase = (s: string, min = 3) =>
  s
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w.split('-').map(x => word(x, min)).join('-'))
    .join(' ');

/** Analyse le texte lu (une entrée par ligne, ou un seul texte avec des retours à la ligne). */
export function analyserCarteGrise(input: string | string[]): CarteGriseLue {
  const lines = (Array.isArray(input) ? input : [input]).flatMap(l => String(l || '').split(/\r?\n/)).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const f = fields(lines);
  const all = lines.join('\n');
  const r: CarteGriseLue = {
    plate: '', dept: '', firstReg: '', year: 0, brand: '', model: '', version: '', vin: '', cc: 0, kw: 0, hp: 0,
    energy: '', energyLabel: '', genre: '', genreLabel: '', body: '', engine: '', owner: '', found: 0,
  };

  // A : plaque (sinon, on cherche une plaque au format AB-123-CD n'importe où)
  const p = (f.A && readPlate(f.A)) || (() => {
    const m = all.toUpperCase().match(SIV);
    return m ? { plate: m[1] + '-' + m[2] + '-' + m[3], dept: '' } : null;
  })();
  if (p) Object.assign(r, p);

  // B : date de 1re immatriculation (sinon la date la plus ancienne du document)
  r.firstReg = f.B ? readDate(f.B) : '';
  if (!r.firstReg) {
    const dates = (all.match(/\b\d{1,2}\s?[/.\-]\s?\d{1,2}\s?[/.\-]\s?(?:19|20)\d{2}\b/g) || []).map(readDate).filter(Boolean).sort();
    r.firstReg = dates[0] || '';
  }
  r.year = r.firstReg ? +r.firstReg.slice(0, 4) : 0;

  if (f['D.1']) r.brand = titleCase(f['D.1'].replace(/[^\p{L}\d\s-]/gu, ''));
  if (f['D.2']) r.version = f['D.2'].toUpperCase();
  const d3 = f['D.3'] ? titleCase(f['D.3'].replace(/[^\p{L}\d\s\-+.]/gu, '')) : '';
  r.model = d3 || r.version;

  // E : VIN (sinon un groupe de 17 caractères n'importe où)
  r.vin = f.E ? readVin(f.E) : '';
  if (!r.vin) {
    for (const tok of all.split(/\s+/)) {
      const t = fixVin(tok);
      if (VIN_RE.test(t) && /\d/.test(t) && /[A-Z]/.test(t)) {
        r.vin = t;
        break;
      }
    }
  }

  if (f['P.1']) r.cc = Math.round(num(f['P.1']));
  if (r.cc > 20000) r.cc = 0; // valeur aberrante
  if (f['P.2']) r.kw = num(f['P.2']);
  if (r.kw > 1500) r.kw = 0;
  r.hp = r.kw ? Math.round(r.kw * 1.36) : 0;
  if (f['P.3']) {
    const m = f['P.3'].toUpperCase().match(/\b([A-Z]{2})\b/);
    if (m) {
      r.energy = m[1];
      r.energyLabel = ENERGIES[m[1]] || m[1];
    }
  }
  if (f['J.1']) {
    const m = f['J.1'].toUpperCase().match(/\b([A-Z]{2,4}\d?)\b/);
    if (m) {
      r.genre = m[1];
      r.genreLabel = GENRES[m[1]] || m[1];
      if (m[1] === 'CTTE') r.body = 'utilitaire';
    }
  }
  if (f['C.1']) r.owner = titleCase(f['C.1'].replace(/[^\p{L}\s'-]/gu, ' ').trim(), 1);

  const liters = r.cc ? (Math.round(r.cc / 100) / 10).toFixed(1) : '';
  r.engine = [liters, r.energyLabel].filter(Boolean).join(' ');

  r.found = [r.plate, r.firstReg, r.brand, r.model, r.vin, r.cc, r.kw, r.energy, r.genre, r.owner].filter(Boolean).length;
  return r;
}
