// Section « Documents » de la fiche : rapports de diagnostic (PDF ou photo).
// Garagiste : ajouter, ouvrir, supprimer. Client : ouvrir seulement.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { fmtSize, openDoc, pickPdf, pickPhoto, removeDocFiles, storeDoc, type PickedFile } from '@/lib/docs';
import { C } from '@/lib/theme';
import type { Doc, Vehicle } from '@/lib/types';
import { fmtDate, fromFr, maskDate, toFr, today } from '@/lib/utils';
import { ask, Btn, Card, Field, IconBtn, Row, SectionTitle, Sheet, T, notify, tap } from './ui';

type Props = { v: Vehicle; readOnly?: boolean; onSave?: (v: Vehicle) => Promise<unknown> };

export function Documents({ v, readOnly, onSave }: Props) {
  const docs = v.docs.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const [open, setOpen] = useState(false);
  const [opening, setOpening] = useState('');

  if (readOnly && !docs.length) return null;

  const show = async (d: Doc) => {
    setOpening(d.id);
    try {
      await openDoc(d);
    } catch (e: any) {
      notify('Ouverture impossible', e?.message);
    } finally {
      setOpening('');
    }
  };

  const del = (d: Doc) =>
    ask('Supprimer ce document ?', d.title + ' sera effacé (le fichier aussi).', 'Supprimer', async () => {
      try {
        await onSave?.({ ...v, docs: v.docs.filter(x => x.id !== d.id) });
        await removeDocFiles([d]).catch(() => {});
        tap('success');
      } catch (e: any) {
        notify('Suppression impossible', e?.message);
      }
    }, true);

  return (
    <>
      <SectionTitle right={docs.length ? <Text style={T.sub}>{docs.length}</Text> : null}>Documents</SectionTitle>
      <Card style={{ gap: 4, paddingVertical: docs.length ? 8 : 16 }}>
        {!docs.length ? (
          <Text style={[T.sub, { textAlign: 'center' }]}>Aucun document. Ajoute ici le rapport de la valise de diagnostic (PDF ou photo).</Text>
        ) : (
          docs.map((d, i) => (
            <Pressable
              key={d.id}
              onPress={() => show(d)}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: i ? 0.5 : 0, borderTopColor: C.sep, opacity: pressed ? 0.6 : 1 })}>
              <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: d.type === 'pdf' ? 'rgba(255,69,58,0.18)' : 'rgba(10,132,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={d.type === 'pdf' ? 'document-text' : 'image'} size={20} color={d.type === 'pdf' ? C.red : C.blue} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[T.body, { fontWeight: '600' }]} numberOfLines={2}>
                  {d.title}
                </Text>
                <Text style={T.tiny}>
                  {fmtDate(d.date)} · {d.type === 'pdf' ? 'PDF' : 'Photo'}
                  {d.size ? ' · ' + fmtSize(d.size) : ''}
                  {opening === d.id ? ' · ouverture…' : ''}
                </Text>
              </View>
              {!readOnly ? <IconBtn icon="trash-outline" color={C.red} label={'Supprimer ' + d.title} onPress={() => del(d)} /> : <Ionicons name="open-outline" size={18} color={C.text3} />}
            </Pressable>
          ))
        )}
      </Card>
      {!readOnly ? <Btn kind="secondary" title="Ajouter un rapport de diagnostic" icon="attach" onPress={() => setOpen(true)} /> : null}
      {!readOnly ? <AddDocSheet visible={open} v={v} onClose={() => setOpen(false)} onSave={onSave} /> : null}
    </>
  );
}

function AddDocSheet({ visible, v, onClose, onSave }: { visible: boolean; v: Vehicle; onClose: () => void; onSave?: (v: Vehicle) => Promise<unknown> }) {
  const [title, setTitle] = useState('Rapport de diagnostic');
  const [date, setDate] = useState(toFr(today()));
  const [file, setFile] = useState<PickedFile | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const reset = () => {
    setTitle('Rapport de diagnostic');
    setDate(toFr(today()));
    setFile(null);
    setErr('');
  };
  const close = () => {
    if (busy) return;
    reset();
    onClose();
  };

  const pick = async (how: 'pdf' | 'camera' | 'library') => {
    setErr('');
    try {
      const f = how === 'pdf' ? await pickPdf() : await pickPhoto(how === 'camera');
      if (f) setFile(f);
    } catch (e: any) {
      setErr(e?.message || 'Fichier impossible à lire');
    }
  };

  const save = async () => {
    setErr('');
    const iso = fromFr(date);
    if (!iso) return setErr('Date incorrecte (JJ/MM/AAAA).');
    if (!file) return setErr('Choisis d’abord un PDF ou une photo.');
    setBusy(true);
    let doc: Doc | null = null;
    try {
      doc = await storeDoc(v.id, file, title, iso);
      await onSave?.({ ...v, docs: [doc, ...v.docs] });
      tap('success');
      reset();
      onClose();
    } catch (e: any) {
      if (doc) removeDocFiles([doc]).catch(() => {}); // envoi fait mais fiche non enregistrée : on nettoie
      const m = String(e?.message || '');
      setErr(/fetch|network/i.test(m) ? 'Pas de connexion internet. Réessaie quand le réseau revient.' : m || 'Envoi impossible');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} title="Ajouter un rapport" onClose={close}>
      <Card secondary style={{ gap: 14 }}>
        <Field label="Titre" value={title} onChangeText={setTitle} placeholder="Rapport de diagnostic" />
        <Field label="Date" value={date} onChangeText={t => setDate(maskDate(t))} keyboardType="number-pad" placeholder="JJ/MM/AAAA" />
      </Card>
      <Text style={T.label}>Fichier (10 Mo maximum)</Text>
      <Btn kind="secondary" title="Choisir un PDF" icon="document-outline" onPress={() => pick('pdf')} />
      <Row gap={10}>
        <Btn kind="secondary" small title="Prendre en photo" icon="camera-outline" style={{ flex: 1 }} onPress={() => pick('camera')} />
        <Btn kind="secondary" small title="Choisir une photo" icon="images-outline" style={{ flex: 1 }} onPress={() => pick('library')} />
      </Row>
      {file ? (
        <Card secondary style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons name={file.type === 'pdf' ? 'document-text' : 'image'} size={22} color={file.type === 'pdf' ? C.red : C.blue} />
          <View style={{ flex: 1 }}>
            <Text style={[T.body, { fontWeight: '600' }]} numberOfLines={1}>
              {file.name}
            </Text>
            <Text style={T.tiny}>{fmtSize(file.size)}</Text>
          </View>
        </Card>
      ) : null}
      <Text style={T.tiny}>Rapport reçu par e-mail ? Enregistre le PDF dans l’app Fichiers, puis « Choisir un PDF ».</Text>
      {err ? <Text style={{ color: C.red, textAlign: 'center' }}>{err}</Text> : null}
      <Btn title="Enregistrer le document" icon="checkmark" loading={busy} disabled={!file} onPress={save} />
    </Sheet>
  );
}
