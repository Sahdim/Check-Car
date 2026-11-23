// Photos de carte grise : copie dans le dossier de l'appli, conversion en image base64 pour l'envoi.
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

const dir = () => new Directory(Paths.document, 'cartes-grises');

// Copie la photo choisie dans le dossier de l'appli (sinon le téléphone peut l'effacer)
export async function keepPhoto(uri: string, vehicleId: string): Promise<string> {
  if (Platform.OS === 'web' || uri.startsWith('data:')) return uri;
  try {
    const d = dir();
    if (!d.exists) d.create({ intermediates: true });
    const dest = new File(d, vehicleId + '-' + Date.now() + '.jpg');
    await new File(uri).copy(dest);
    return dest.uri;
  } catch {
    return uri;
  }
}

// Transforme une photo enregistrée en texte base64 (pour la sauvegarde et Supabase)
export async function toDataUri(uri?: string): Promise<string | undefined> {
  if (!uri || uri.startsWith('data:') || uri.startsWith('http')) return uri;
  if (Platform.OS === 'web') return uri;
  try {
    const b64 = await new File(uri).base64();
    return 'data:image/jpeg;base64,' + b64;
  } catch {
    return undefined;
  }
}

export function deletePhoto(uri?: string) {
  if (!uri || Platform.OS === 'web' || !uri.startsWith('file:')) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // pas grave
  }
}
