// Documents liés au véhicule (rapport de diagnostic en PDF ou en photo).
//  - En ligne (Supabase) : le fichier part dans le stockage « rapports » (public), au chemin
//    <garage_id>/<vehicle_id>/<uuid>.<ext> : le nom est tiré au hasard, impossible à deviner.
//    La liste (titre, date, chemin…) est rangée dans la colonne `docs` du véhicule.
//  - Sans Supabase (développement) : le fichier est copié dans le dossier de l'appli sur le téléphone.
import * as Crypto from 'expo-crypto';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { Linking, Platform } from 'react-native';
import { supabase, supabaseEnabled } from './supabase';
import type { Doc } from './types';

export const BUCKET = 'rapports';
export const MAX_DOC_SIZE = 10 * 1024 * 1024; // 10 Mo

export type PickedFile = { uri: string; name: string; size: number; mime: string; type: 'pdf' | 'image' };

/** true si le document est encore sur le téléphone (pas dans le stockage en ligne) */
export const isLocalPath = (p: string) => /^(file:|data:|blob:|content:|ph:|assets-library:)/i.test(p);
const isRemotePath = (p: string) => !!p && !isLocalPath(p) && !/^https?:/i.test(p);

export const fmtSize = (n: number) => (n >= 1024 * 1024 ? (n / 1024 / 1024).toFixed(1).replace('.', ',') + ' Mo' : Math.max(1, Math.round(n / 1024)) + ' Ko');

const tooBig = (size: number) => {
  if (size > MAX_DOC_SIZE) throw new Error('Fichier trop lourd (' + fmtSize(size) + '). La limite est de 10 Mo. Pour une photo, reprends-la ; pour un PDF, demande une version plus légère.');
};

async function sizeOf(uri: string): Promise<number> {
  try {
    if (Platform.OS === 'web' || uri.startsWith('data:') || uri.startsWith('blob:')) return (await (await fetch(uri)).blob()).size;
    return new File(uri).size || 0;
  } catch {
    return 0;
  }
}

/* ---------- Choisir un fichier ---------- */
export async function pickPdf(): Promise<PickedFile | null> {
  const r = await DocumentPicker.getDocumentAsync({ type: ['application/pdf'], copyToCacheDirectory: true, multiple: false });
  if (r.canceled || !r.assets?.length) return null;
  const a = r.assets[0];
  const size = a.size || (await sizeOf(a.uri));
  tooBig(size);
  return { uri: a.uri, name: a.name || 'rapport.pdf', size, mime: 'application/pdf', type: 'pdf' };
}

export async function pickPhoto(camera: boolean): Promise<PickedFile | null> {
  if (camera) {
    const p = await ImagePicker.requestCameraPermissionsAsync();
    if (!p.granted) throw new Error('Autorise l’appareil photo dans les réglages du téléphone.');
  }
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7 };
  const r = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (r.canceled || !r.assets?.length) return null;
  const a = r.assets[0];
  const size = a.fileSize || (await sizeOf(a.uri));
  tooBig(size);
  const png = /png$/i.test(a.mimeType || '') || /\.png$/i.test(a.uri);
  return { uri: a.uri, name: a.fileName || (png ? 'photo.png' : 'photo.jpg'), size, mime: png ? 'image/png' : 'image/jpeg', type: 'image' };
}

/* ---------- Lecture des octets ---------- */
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function b64ToBytes(b64: string): Uint8Array {
  const s = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const len = Math.floor((s.length * 3) / 4);
  const out = new Uint8Array(len);
  let o = 0;
  const at = (i: number) => (i < s.length ? B64.indexOf(s[i]) : 0);
  for (let i = 0; i < s.length; i += 4) {
    const a = at(i), b = at(i + 1), c = at(i + 2), d = at(i + 3);
    out[o++] = (a << 2) | (b >> 4);
    if (o < len) out[o++] = ((b & 15) << 4) | (c >> 2);
    if (o < len) out[o++] = ((c & 3) << 6) | d;
  }
  return out;
}
async function readBytes(uri: string): Promise<ArrayBuffer> {
  let u8: Uint8Array;
  if (uri.startsWith('data:')) u8 = b64ToBytes(uri.slice(uri.indexOf(',') + 1));
  else if (Platform.OS === 'web' || uri.startsWith('blob:')) return await (await fetch(uri)).arrayBuffer();
  else u8 = await new File(uri).bytes();
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
}

const extOf = (mime: string) => (mime === 'application/pdf' ? 'pdf' : mime === 'image/png' ? 'png' : 'jpg');

/* ---------- En ligne ---------- */
async function userId(): Promise<string> {
  const { data } = await supabase!.auth.getSession();
  const id = data.session?.user?.id;
  if (!id) throw new Error('Non connecté : reconnecte-toi dans l’espace pro.');
  return id;
}

async function uploadBytes(uri: string, mime: string, garageId: string, vehicleId: string): Promise<{ path: string; size: number }> {
  const bytes = await readBytes(uri);
  tooBig(bytes.byteLength);
  const path = garageId + '/' + vehicleId + '/' + Crypto.randomUUID() + '.' + extOf(mime);
  const { error } = await supabase!.storage.from(BUCKET).upload(path, bytes, { contentType: mime, upsert: false, cacheControl: '3600' });
  if (error) throw error;
  return { path, size: bytes.byteLength };
}

/* ---------- Sur le téléphone ---------- */
async function keepLocal(uri: string, mime: string, vehicleId: string): Promise<string> {
  if (Platform.OS === 'web') {
    // web (essai sur ordinateur) : on garde le fichier sous forme de texte
    if (uri.startsWith('data:')) return uri;
    const blob = await (await fetch(uri)).blob();
    return await new Promise<string>((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result));
      fr.onerror = () => rej(new Error('Lecture du fichier impossible'));
      fr.readAsDataURL(blob);
    });
  }
  const d = new Directory(Paths.document, 'rapports', vehicleId);
  if (!d.exists) d.create({ intermediates: true });
  const dest = new File(d, Crypto.randomUUID() + '.' + extOf(mime));
  if (uri.startsWith('data:')) {
    dest.create();
    await dest.write(uri.slice(uri.indexOf(',') + 1), { encoding: 'base64' });
  } else await new File(uri).copy(dest);
  return dest.uri;
}

/** Enregistre le fichier choisi (en ligne ou sur le téléphone) et renvoie la fiche du document. N'enregistre PAS le véhicule. */
export async function storeDoc(vehicleId: string, f: PickedFile, title: string, date: string): Promise<Doc> {
  tooBig(f.size);
  const base = { id: 'd' + Crypto.randomUUID().replace(/-/g, '').slice(0, 12), title: title.trim() || 'Rapport de diagnostic', date, type: f.type, mime: f.mime };
  if (supabaseEnabled) {
    const up = await uploadBytes(f.uri, f.mime, await userId(), vehicleId);
    return { ...base, path: up.path, size: up.size };
  }
  return { ...base, path: await keepLocal(f.uri, f.mime, vehicleId), size: f.size };
}

/** Supprime les fichiers (en ligne et/ou sur le téléphone). Les erreurs sont ignorées sauf si strict. */
export async function removeDocFiles(docs: Doc[], strict = false) {
  const remote = docs.map(d => d.path).filter(isRemotePath);
  if (remote.length && supabase) {
    const { error } = await supabase.storage.from(BUCKET).remove(remote);
    if (error && strict) throw error;
  }
  if (Platform.OS !== 'web')
    for (const d of docs)
      if (d.path.startsWith('file:'))
        try {
          const f = new File(d.path);
          if (f.exists) f.delete();
        } catch {
          // pas grave
        }
}

/** Adresse pour ouvrir le document */
export function docUrl(d: Doc): string {
  if (isRemotePath(d.path) && supabase) return supabase.storage.from(BUCKET).getPublicUrl(d.path).data.publicUrl;
  return d.path;
}

export async function openDoc(d: Doc) {
  const url = docUrl(d);
  if (/^https?:/i.test(url)) {
    if (Platform.OS === 'web') window.open(url, '_blank');
    else await WebBrowser.openBrowserAsync(url, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET });
    return;
  }
  if (Platform.OS === 'web') {
    const w = window.open();
    if (w) w.document.write('<iframe src="' + url + '" style="border:0;width:100%;height:100%"></iframe>');
    return;
  }
  if (isRemotePath(d.path)) throw new Error('Document en ligne : connexion à Supabase absente dans cette version.');
  const f = new File(url);
  if (!f.exists) throw new Error('Fichier introuvable sur ce téléphone.');
  try {
    if (await File.canPreview(f)) return await File.preview(f);
  } catch {
    // aperçu indisponible : on passe au partage
  }
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(f.uri, { mimeType: d.mime, dialogTitle: d.title });
  else await Linking.openURL(f.uri);
}

/* ---------- Sauvegarde / synchronisation ---------- */
/** Pour la sauvegarde JSON : les documents du téléphone sont mis dans le fichier (base64) */
export async function docsForBackup(docs: Doc[]): Promise<Doc[]> {
  if (Platform.OS === 'web') return docs;
  return Promise.all(
    docs.map(async d => {
      if (!d.path.startsWith('file:')) return d;
      try {
        return { ...d, path: 'data:' + d.mime + ';base64,' + (await new File(d.path).base64()) };
      } catch {
        return d;
      }
    }),
  );
}

/** Restauration en mode local : documents « data: » -> fichiers sur le téléphone */
export async function materializeDocs(docs: Doc[], vehicleId: string): Promise<Doc[]> {
  if (Platform.OS === 'web') return docs;
  const out: Doc[] = [];
  for (const d of docs) {
    if (!d.path.startsWith('data:')) out.push(d);
    else
      try {
        out.push({ ...d, path: await keepLocal(d.path, d.mime, vehicleId) });
      } catch {
        // document illisible : ignoré
      }
  }
  return out;
}

/** Mode en ligne : documents restés sur le téléphone (ou venant d'une sauvegarde) -> envoyés dans le stockage */
export async function uploadLocalDocs(docs: Doc[], garageId: string, vehicleId: string): Promise<Doc[]> {
  const out: Doc[] = [];
  for (const d of docs) {
    if (!isLocalPath(d.path)) out.push(d);
    else if (d.path.startsWith('file:') && Platform.OS !== 'web' && !new File(d.path).exists) continue; // fichier disparu (autre téléphone)
    else {
      const up = await uploadBytes(d.path, d.mime, garageId, vehicleId);
      out.push({ ...d, path: up.path, size: up.size });
    }
  }
  return out;
}
