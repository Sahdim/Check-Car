// Éléments qu'on peut cocher dans une intervention, rangés par sections.
import type { Item } from './types';

export const PART_SECTIONS: { title: string; parts: string[] }[] = [
  { title: 'Entretien', parts: ['Vidange', 'Filtre à huile', 'Filtre à air', 'Filtre habitacle', 'Filtre à carburant', 'Liquide de refroidissement', 'Essuie-glaces'] },
  { title: 'Freinage', parts: ['Plaquettes AV', 'Plaquettes AR', 'Disques AV', 'Disques AR', 'Mâchoires / tambours', 'Liquide de frein'] },
  { title: 'Pneus & train avant', parts: ['Pneus AV', 'Pneus AR', 'Parallélisme', 'Géométrie', 'Équilibrage', 'Permutation des pneus'] },
  { title: 'Moteur & distribution', parts: ['Bougies', 'Bougies de préchauffage', 'Courroie de distribution', 'Kit distribution + pompe à eau', 'Chaîne de distribution', "Courroie d'accessoires", 'Embrayage', 'Volant moteur', 'Échappement'] },
  { title: 'Suspension & direction', parts: ['Amortisseurs AV', 'Amortisseurs AR', 'Rotules', 'Biellettes', 'Triangles', 'Silent-blocs', 'Cardan / soufflet'] },
  { title: 'Électricité', parts: ['Batterie', 'Démarreur', 'Alternateur', 'Ampoules', 'Climatisation'] },
  { title: 'Divers', parts: ['Contrôle technique', 'Diagnostic', 'Parallélisme', 'Géométrie', 'Équilibrage', 'Permutation des pneus', 'Autre'] },
];

// Liste sans doublons (Parallélisme, Géométrie… apparaissent dans deux sections)
export const ALL_PARTS = [...new Set(PART_SECTIONS.flatMap(s => s.parts))];

// Anciens libellés toujours acceptés (affichés tels quels dans l'historique)
export const LEGACY_PARTS = ['Géométrie / parallélisme'];

// Liste des éléments d'une intervention (nouveau format `parts`, sinon l'ancien `kind`)
export const itemParts = (i: Item): string[] =>
  Array.isArray(i.parts) && i.parts.length ? i.parts : String(i.kind || '').split(/\s*,\s*/).filter(Boolean);

// Une intervention compte comme vidange si « Vidange » est coché (ou ancien kind = « Vidange »)
export const isOilChange = (i: Item) => itemParts(i).some(p => p.toLowerCase() === 'vidange');
