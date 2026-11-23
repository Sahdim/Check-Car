// Lecture automatique de la carte grise, gratuite et faite SUR LE TÉLÉPHONE (aucun envoi sur internet).
//
// Module utilisé : expo-text-extractor
//   - iPhone  : reconnaissance de texte d'Apple (Vision), déjà dans iOS
//   - Android : ML Kit de Google (sur l'appareil)
// Ce module est natif : il marche dans l'appli compilée (Codemagic), PAS dans Expo Go ni sur le web.
// On le charge « à la demande » : s'il manque, lireCarteGrise() renvoie null et l'appli
// affiche « Lecture automatique indisponible ici » au lieu de planter.
import { Platform } from 'react-native';
import { analyserCarteGrise, type CarteGriseLue } from './carteGrise';

export type { CarteGriseLue } from './carteGrise';

type TextModule = { isSupported?: boolean; extractTextFromImage(uri: string): Promise<string[]> };
let cached: TextModule | null | undefined;

function loadModule(): TextModule | null {
  if (cached !== undefined) return cached;
  cached = null;
  if (Platform.OS === 'web') return cached;
  try {
    // requireOptionalNativeModule renvoie null (sans erreur) si le module natif n'est pas dans l'appli
    const { requireOptionalNativeModule } = require('expo') as typeof import('expo');
    const m = requireOptionalNativeModule<TextModule>('ExpoTextExtractor');
    if (m && m.isSupported !== false && typeof m.extractTextFromImage === 'function') cached = m;
  } catch {
    cached = null;
  }
  return cached;
}

/** true si la lecture automatique marche sur cet appareil */
export const ocrDisponible = () => !!loadModule();

// Remet la photo à l'endroit et la réduit (lecture plus rapide et plus fiable)
async function preparer(uri: string): Promise<string> {
  try {
    const { ImageManipulator, SaveFormat } = require('expo-image-manipulator') as typeof import('expo-image-manipulator');
    const img = await ImageManipulator.manipulate(uri).resize({ width: 2200 }).renderAsync();
    const out = await img.saveAsync({ compress: 0.9, format: SaveFormat.JPEG });
    return out.uri;
  } catch {
    return uri;
  }
}

/**
 * Lit la carte grise sur la photo.
 * Renvoie null si la lecture automatique n'existe pas ici (Expo Go, web).
 * Sinon renvoie ce qui a été lu (found = 0 si rien n'a été reconnu).
 */
export async function lireCarteGrise(uri: string): Promise<CarteGriseLue | null> {
  const m = loadModule();
  if (!m) return null;
  const src = await preparer(uri);
  const lignes = await m.extractTextFromImage(src);
  return analyserCarteGrise(Array.isArray(lignes) ? lignes : []);
}
