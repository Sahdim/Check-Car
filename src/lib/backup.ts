// Sauvegarde / restauration en fichier JSON.
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { upgradeVehicle } from './db';
import { toDataUri } from './photos';
import type { Garage, Vehicle } from './types';
import { today } from './utils';

export async function exportBackup(vehicles: Vehicle[], garage: Garage) {
  // les photos sont mises dans le fichier (base64) pour pouvoir les retrouver sur un autre téléphone
  const vs = await Promise.all(vehicles.map(async v => ({ ...v, photoCg: await toDataUri(v.photoCg) })));
  const json = JSON.stringify({ app: 'Check & Car', version: 3, date: today(), garage, vehicles: vs }, null, 1);
  const name = 'check-and-car-' + today() + '.json';
  if (Platform.OS === 'web') {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    a.download = name;
    a.click();
    return;
  }
  const f = new File(Paths.cache, name);
  if (f.exists) f.delete();
  f.create();
  f.write(json);
  await Sharing.shareAsync(f.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Sauvegarde Check & Car' });
}

/** Ouvre un fichier de sauvegarde. Renvoie null si annulé. Accepte aussi les sauvegardes de la version Windows. */
export async function pickBackup(): Promise<{ vehicles: Vehicle[]; garage?: Garage } | null> {
  const r = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true });
  if (r.canceled || !r.assets?.length) return null;
  const a = r.assets[0];
  const text = Platform.OS === 'web' ? await (await fetch(a.uri)).text() : await new File(a.uri).text();
  const d = JSON.parse(text);
  if (!d || !Array.isArray(d.vehicles)) throw new Error('Ce fichier n’est pas une sauvegarde Check & Car');
  const garage = d.garage || d.settings?.garage;
  return { vehicles: d.vehicles.map(upgradeVehicle), garage };
}
