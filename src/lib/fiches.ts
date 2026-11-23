// Fiche technique automatique : lue dans data/fiches.json (marque + modèle + moteur).
import data from '../../data/fiches.json';
import type { Vehicle } from './types';
import { norm } from './utils';

export type Fiche = {
  exemple?: boolean;
  huile?: { viscosite?: string; norme?: string; quantite?: string };
  pneus?: string;
  pression?: string;
  distribution?: { type?: string; intervalle?: string };
  couple_roues?: string;
  batterie?: string;
};

const FICHES = (data as { fiches: Record<string, Fiche> }).fiches;
const k = (s: string) => norm(s).replace(/\s+/g, ' ').trim();

export function findFiche(v: Vehicle): Fiche | null {
  return FICHES[k(v.brand) + '|' + k(v.model) + '|' + k(v.engine)] || null;
}
