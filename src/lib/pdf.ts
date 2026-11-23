// PDF « Carnet pour la revente » : expo-print fabrique le PDF, expo-sharing l'envoie.
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { alerts } from './alerts';
import type { Garage, Vehicle } from './types';
import { BODIES, byDate, fmtDate, fmtEur, fmtKm, today, vName } from './utils';
import { itemParts } from './parts';
import { docUrl, fmtSize } from './docs';
import { findDtc, dtcStructure } from './dtc';

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function pdfHtml(v: Vehicle, g: Garage) {
  const its = v.items.slice().sort(byDate);
  const total = its.reduce((s, i) => s + (+i.price || 0), 0);
  const body = (BODIES.find(b => b[0] === v.body) || ['', ''])[1];
  const rows = its
    .map(
      i =>
        '<tr><td class="nw">' + fmtDate(i.date) + '</td><td class="n">' + fmtKm(i.km) + '</td><td><b>' + esc(itemParts(i).join(', ')) + '</b>' +
        (i.note ? '<div class="note">' + esc(i.note).replace(/\n/g, '<br>') + '</div>' : '') + '</td><td class="n">' + (i.price ? fmtEur(i.price) : '') + '</td></tr>',
    )
    .join('');
  const codes = v.dtc.slice().sort(byDate);
  const codesHtml = codes.length
    ? '<h2>Codes défaut relevés</h2><table><thead><tr><th>Date</th><th class="n">Kilométrage</th><th>Code</th><th>Signification</th></tr></thead><tbody>' +
      codes
        .map(d => {
          const lib = findDtc(d.code)?.label || (dtcStructure(d.code)?.kind === 'brand' ? 'Code constructeur' : '');
          return '<tr><td class="nw">' + fmtDate(d.date) + '</td><td class="n">' + (d.km ? fmtKm(d.km) : '') + '</td><td><b>' + esc(d.code) + '</b></td><td>' + esc(lib) +
            (d.note ? '<div class="note">' + esc(d.note) + '</div>' : '') + '</td></tr>';
        })
        .join('') + '</tbody></table>'
    : '';
  const docs = v.docs.slice().sort(byDate);
  const docsHtml = docs.length
    ? '<h2>Documents</h2><table><thead><tr><th>Date</th><th>Document</th><th class="n">Type</th></tr></thead><tbody>' +
      docs
        .map(d => {
          const url = docUrl(d);
          const t = esc(d.title);
          return '<tr><td class="nw">' + fmtDate(d.date) + '</td><td>' + (/^https?:/i.test(url) ? '<a href="' + esc(url) + '">' + t + '</a>' : t) + '</td><td class="n">' +
            (d.type === 'pdf' ? 'PDF' : 'Photo') + (d.size ? ' · ' + fmtSize(d.size) : '') + '</td></tr>';
        })
        .join('') + '</tbody></table>'
    : '';
  const next = alerts(v).map(a => esc(a.txt) + (a.detail ? ' — ' + esc(a.detail) : '')).join('<br>');
  const tenu = g.name || 'le garagiste';
  return (
    '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>' + esc(vName(v)) + '</title><style>' +
    '@page{size:A4;margin:14mm}body{font:10.5pt/1.45 -apple-system,Roboto,"Segoe UI",Arial,sans-serif;color:#16202b;margin:0}' +
    'header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #FF9F0A;padding-bottom:10px}' +
    'h1{font-size:19pt;margin:0;text-transform:uppercase;letter-spacing:.02em}.d{color:#5d6b7a}' +
    '.g{text-align:right;font-size:10pt;color:#5d6b7a}.g b{color:#16202b;font-size:12.5pt}' +
    '.veh{margin:16px 0;padding:12px 14px;border:1px solid #d7dce2;border-radius:10px}' +
    '.vn{font-size:16pt;font-weight:700}.plate{display:inline-flex;border:2px solid #16202b;border-radius:4px;font-weight:700;letter-spacing:.08em;margin-top:6px;overflow:hidden}' +
    '.plate i{background:#0a4aa8;color:#fff;font-style:normal;padding:1px 5px;font-size:8pt;display:flex;align-items:flex-end}.plate span{padding:1px 8px}' +
    '.facts{display:grid;grid-template-columns:1fr 1fr;gap:3px 22px;margin-top:8px;font-size:10pt}.facts span{color:#5d6b7a}' +
    'table{width:100%;border-collapse:collapse;margin-top:6px}th,td{text-align:left;padding:7px 8px;border-bottom:1px solid #d7dce2;vertical-align:top}' +
    'th{background:#f2f4f6;font-size:9pt;text-transform:uppercase;color:#5d6b7a}td.n,th.n{text-align:right;white-space:nowrap}.nw{white-space:nowrap}' +
    'tr{page-break-inside:avoid}.note{color:#5d6b7a;font-size:9.5pt}tfoot td{font-weight:700;border-bottom:0;font-size:11pt}' +
    'h2{font-size:12pt;margin:18px 0 0}a{color:#0a4aa8}.al{margin-top:14px;font-size:10pt}.sign{margin-top:22px;padding-top:10px;border-top:1px solid #d7dce2;font-size:10.5pt}footer{margin-top:10px;font-size:8.5pt;color:#5d6b7a}' +
    '</style></head><body>' +
    '<header><div><h1>Carnet d’entretien</h1><div class="d">Édité le ' + fmtDate(today()) + '</div></div><div class="g">' +
    (g.name ? '<b>' + esc(g.name) + '</b><br>' : '') + (g.address ? esc(g.address).replace(/\n/g, '<br>') + '<br>' : '') + (g.phone ? esc(g.phone) : '') + '</div></header>' +
    '<div class="veh"><div class="vn">' + esc(vName(v)) + (v.hp ? ' · ' + v.hp + ' ch' : '') + '</div>' +
    (v.plate ? '<div class="plate"><i>F</i><span>' + esc(v.plate) + '</span>' + (v.dept ? '<i>' + esc(v.dept) + '</i>' : '<i></i>') + '</div>' : '') +
    '<div class="facts"><div><span>Année :</span> ' + esc(v.year || '—') + '</div><div><span>Kilométrage :</span> <b>' + fmtKm(v.km) + '</b></div>' +
    (v.vin ? '<div><span>VIN :</span> ' + esc(v.vin) + '</div>' : '') + (body && v.body ? '<div><span>Carrosserie :</span> ' + esc(body) + '</div>' : '') +
    '<div><span>Interventions :</span> ' + its.length + '</div></div></div>' +
    (its.length
      ? '<table><thead><tr><th>Date</th><th class="n">Kilométrage</th><th>Intervention</th><th class="n">Prix</th></tr></thead><tbody>' + rows + '</tbody>' +
        '<tfoot><tr><td colspan="3">Total des interventions</td><td class="n">' + fmtEur(total) + '</td></tr></tfoot></table>'
      : '<p>Aucune intervention enregistrée.</p>') +
    codesHtml +
    docsHtml +
    (next ? '<div class="al"><b>Prochains entretiens</b><br>' + next + '</div>' : '') +
    '<div class="sign">Carnet tenu par <b>' + esc(tenu) + '</b>' + (g.phone ? ' · ' + esc(g.phone) : '') + '</div>' +
    '<footer>Document généré avec Check &amp; Car.</footer></body></html>'
  );
}

export async function sharePdf(v: Vehicle, g: Garage) {
  const html = pdfHtml(v, g);
  if (Platform.OS === 'web') {
    await Print.printAsync({ html }); // sur ordinateur : fenêtre d'impression (« Enregistrer en PDF »)
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  let shareUri = uri;
  try {
    // nom de fichier lisible
    const name = ('Carnet ' + vName(v) + ' ' + (v.plate || '')).replace(/[^\p{L}\p{N} _-]/gu, '').trim().replace(/\s+/g, ' ') + '.pdf';
    const dest = new File(Paths.cache, name);
    if (dest.exists) dest.delete();
    new File(uri).moveSync(dest);
    shareUri = dest.uri;
  } catch {
    // on garde le nom donné par le système
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(shareUri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Carnet pour la revente' });
  } else {
    await Print.printAsync({ uri: shareUri });
  }
}
