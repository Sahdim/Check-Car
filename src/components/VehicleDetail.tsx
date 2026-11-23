// Fiche d'un véhicule. Utilisée par le garagiste (modifiable) et par le client (lecture seule).
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Linking, Modal, Platform, Pressable, Share, Text, View } from 'react-native';
import { alerts } from '@/lib/alerts';
import { findFiche } from '@/lib/fiches';
import { itemParts } from '@/lib/parts';
import { sharePdf } from '@/lib/pdf';
import { C, R } from '@/lib/theme';
import type { Garage, Vehicle } from '@/lib/types';
import { BODIES, byDate, fmtDateShort, fmtEur, fmtKm, mkCode, vSub, vTitle } from '@/lib/utils';
import { Btn, Card, Fact, HeroCard, IconBtn, Plate, PrioBadge, Row, SectionTitle, Sep, StatusPill, T, tap } from './ui';

type Props = {
  v: Vehicle;
  garage: Garage;
  readOnly?: boolean;
  onSave?: (v: Vehicle) => Promise<unknown>;
  onDelete?: () => void;
};

const notify = (title: string, msg?: string) => {
  if (Platform.OS === 'web') window.alert(msg ? title + '\n' + msg : title);
  else Alert.alert(title, msg);
};

export function VehicleDetail({ v, garage, readOnly, onSave, onDelete }: Props) {
  const its = v.items.slice().sort(byDate);
  const total = its.reduce((s, i) => s + (+i.price || 0), 0);
  const body = v.body ? (BODIES.find(b => b[0] === v.body) || ['', ''])[1] : '';
  const [pdfBusy, setPdfBusy] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);

  const pdf = async () => {
    setPdfBusy(true);
    try {
      await sharePdf(v, garage);
    } catch (e: any) {
      notify('PDF impossible', e?.message);
    } finally {
      setPdfBusy(false);
    }
  };

  const shareMsg = 'Voici le code de ton carnet d’entretien Check & Car : ' + v.code;
  const copyCode = async () => {
    await Clipboard.setStringAsync(v.code);
    tap('success');
    notify('Code copié', v.code);
  };
  const shareCode = () => Share.share({ message: shareMsg }).catch(() => {});
  const regen = () => {
    const go = () => onSave?.({ ...v, code: mkCode() }).then(() => tap('success'));
    const msg = 'L’ancien code ne marchera plus. Le client devra entrer le nouveau.';
    if (Platform.OS === 'web') {
      if (window.confirm('Régénérer le code ?\n' + msg)) go();
    } else Alert.alert('Régénérer le code ?', msg, [{ text: 'Annuler', style: 'cancel' }, { text: 'Régénérer', onPress: go }]);
  };

  return (
    <>
      <HeroCard>
        <Row style={{ alignItems: 'flex-start' }}>
          <View style={{ flex: 1, gap: 4 }}>
            {v.example ? <PrioBadge label="EXEMPLE" /> : null}
            <Text style={{ color: C.text, fontSize: 28, fontWeight: '800', letterSpacing: 0.2 }}>{vTitle(v)}</Text>
            {vSub(v) ? <Text style={[T.sub, { fontSize: 16 }]}>{vSub(v)}</Text> : null}
            {body ? <Text style={T.tiny}>{body}</Text> : null}
          </View>
          <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,159,10,0.18)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="car-sport" size={24} color={C.orange} />
          </View>
        </Row>
        <View style={{ marginTop: 14 }}>
          <Plate plate={v.plate} big />
        </View>
        <Row style={{ marginTop: 16, flexWrap: 'wrap' }}>
          <Fact label="Kilométrage" value={fmtKm(v.km)} />
          <Fact label="Année" value={v.year ? String(v.year) : '—'} />
          {v.vin ? <Fact label="VIN" value={v.vin} mono /> : null}
        </Row>
        {!readOnly && (v.owner || v.phone) ? (
          <>
            <Sep />
            <Row>
              <Ionicons name="person-circle" size={34} color={C.text3} />
              <View style={{ flex: 1 }}>
                <Text style={[T.body, { fontWeight: '600' }]}>{v.owner || 'Client'}</Text>
                {v.phone ? <Text style={T.sub}>{v.phone}</Text> : null}
              </View>
              {v.phone ? <IconBtn icon="call" color={C.green} label="Appeler" onPress={() => Linking.openURL('tel:' + v.phone.replace(/\s/g, ''))} /> : null}
              {v.phone ? <IconBtn icon="chatbubble" color={C.blue} label="SMS" onPress={() => Linking.openURL('sms:' + v.phone.replace(/\s/g, ''))} /> : null}
            </Row>
          </>
        ) : null}
      </HeroCard>

      <SectionTitle>Rappels</SectionTitle>
      <Card style={{ gap: 10 }}>
        {alerts(v).map(a => (
          <View key={a.kind} style={{ gap: 4 }}>
            <StatusPill level={a.level} text={a.txt} />
            {a.detail ? <Text style={[T.tiny, { marginLeft: 4 }]}>{a.detail}</Text> : null}
          </View>
        ))}
        {!v.ct ? <Text style={T.tiny}>Contrôle technique : date non renseignée.</Text> : null}
      </Card>

      {!readOnly ? (
        <View style={{ gap: 10, marginTop: 6 }}>
          <Btn title="Ajouter une intervention" icon="add-circle" onPress={() => router.push({ pathname: '/intervention', params: { vid: v.id } })} />
          <Row gap={10}>
            <Btn kind="secondary" title="Modifier" icon="create-outline" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/vehicule-form', params: { id: v.id } })} />
            <Btn kind="secondary" title="Kilométrage" icon="speedometer-outline" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/vehicule-form', params: { id: v.id, km: '1' } })} />
          </Row>
        </View>
      ) : null}
      <Btn kind="secondary" title="Carnet pour la revente (PDF)" icon="document-text-outline" loading={pdfBusy} onPress={pdf} />

      <FicheTechnique v={v} />

      {!readOnly && v.photoCg ? (
        <>
          <SectionTitle>Carte grise</SectionTitle>
          <Pressable onPress={() => setPhotoOpen(true)}>
            <Image source={{ uri: v.photoCg }} style={{ width: '100%', aspectRatio: 1.45, borderRadius: R.card, backgroundColor: C.card }} contentFit="cover" />
          </Pressable>
          <Modal visible={photoOpen} transparent animationType="fade" onRequestClose={() => setPhotoOpen(false)}>
            <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', padding: 12 }} onPress={() => setPhotoOpen(false)}>
              <Image source={{ uri: v.photoCg }} style={{ width: '100%', height: '80%' }} contentFit="contain" />
              <Text style={[T.sub, { textAlign: 'center', marginTop: 12 }]}>Touchez pour fermer</Text>
            </Pressable>
          </Modal>
        </>
      ) : null}

      <SectionTitle right={its.length ? <Text style={T.sub}>{its.length} intervention{its.length > 1 ? 's' : ''}</Text> : null}>Historique</SectionTitle>
      <Card style={{ paddingVertical: 8 }}>
        {!its.length ? (
          <Text style={[T.sub, { paddingVertical: 16, textAlign: 'center' }]}>Aucune intervention notée.</Text>
        ) : (
          its.map((i, idx) => {
            const d = fmtDateShort(i.date);
            const last = idx === its.length - 1;
            const content = (
              <Row style={{ alignItems: 'stretch' }} gap={10}>
                <View style={{ width: 54, paddingTop: 10 }}>
                  <Text style={{ color: C.text, fontWeight: '700', fontSize: 14 }}>{d.day}</Text>
                  <Text style={T.tiny}>{d.year}</Text>
                </View>
                <View style={{ width: 14, alignItems: 'center' }}>
                  <View style={{ width: 2, height: 14, backgroundColor: idx === 0 ? 'transparent' : C.sep }} />
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: idx === 0 ? C.orange : C.text3 }} />
                  <View style={{ width: 2, flex: 1, backgroundColor: last ? 'transparent' : C.sep }} />
                </View>
                <View style={{ flex: 1, paddingVertical: 10, gap: 6 }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {itemParts(i).map(p => (
                      <View key={p} style={{ backgroundColor: C.card2, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                        <Text style={{ color: C.text, fontSize: 13, fontWeight: '600' }}>{p}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={T.sub}>
                    {fmtKm(i.km)}
                    {i.price ? ' · ' + fmtEur(i.price) : ''}
                  </Text>
                  {i.note ? <Text style={[T.body, { fontSize: 15, color: C.text2 }]}>{i.note}</Text> : null}
                </View>
                {!readOnly ? <Ionicons name="chevron-forward" size={18} color={C.text3} style={{ alignSelf: 'center' }} /> : null}
              </Row>
            );
            return readOnly ? (
              <View key={i.id}>{content}</View>
            ) : (
              <Pressable key={i.id} onPress={() => router.push({ pathname: '/intervention', params: { vid: v.id, iid: i.id } })} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
                {content}
              </Pressable>
            );
          })
        )}
        {total > 0 ? (
          <>
            <Sep />
            <Row style={{ justifyContent: 'space-between', paddingBottom: 6 }}>
              <Text style={T.sub}>Total</Text>
              <Text style={{ color: C.text, fontSize: 18, fontWeight: '700' }}>{fmtEur(total)}</Text>
            </Row>
          </>
        ) : null}
      </Card>

      {!readOnly ? (
        <>
          <SectionTitle>Code client</SectionTitle>
          <Card style={{ gap: 12 }}>
            <Text style={T.sub}>Donne ce code au client : avec l’appli, il voit son véhicule (sans pouvoir le modifier).</Text>
            <Text selectable style={{ color: C.text, fontSize: 32, fontWeight: '800', letterSpacing: 4, textAlign: 'center', fontVariant: ['tabular-nums'] }}>
              {v.code}
            </Text>
            <Row gap={10}>
              <Btn kind="secondary" small title="Copier" icon="copy-outline" style={{ flex: 1 }} onPress={copyCode} />
              <Btn kind="secondary" small title="Partager" icon="share-outline" style={{ flex: 1 }} onPress={shareCode} />
            </Row>
            <Btn kind="ghost" small title="Régénérer le code" icon="refresh" onPress={regen} />
          </Card>
          <Btn kind="danger" title="Supprimer le véhicule" icon="trash-outline" style={{ marginTop: 18 }} onPress={onDelete} />
        </>
      ) : null}
    </>
  );
}

function FicheTechnique({ v }: { v: Vehicle }) {
  const f = findFiche(v);
  return (
    <>
      <SectionTitle>Fiche technique</SectionTitle>
      <Card style={{ gap: 12 }}>
        {!f ? (
          <Row>
            <Ionicons name="construct-outline" size={22} color={C.text3} />
            <Text style={[T.sub, { flex: 1 }]}>Pas encore de fiche pour ce modèle et ce moteur. Elle s’affichera ici automatiquement quand elle sera disponible.</Text>
          </Row>
        ) : (
          <>
            {f.exemple ? (
              <Row gap={8}>
                <PrioBadge label="EXEMPLE" />
                <Text style={[T.sub, { color: C.yellow }]}>Exemple, données à venir</Text>
              </Row>
            ) : null}
            {f.huile ? <Line icon="water" color={C.orange} label="Huile moteur" value={[f.huile.viscosite, f.huile.norme, f.huile.quantite].filter(Boolean).join(' · ')} /> : null}
            {f.pneus ? <Line icon="ellipse-outline" color={C.text2} label="Pneus d’origine" value={f.pneus} /> : null}
            {f.pression ? <Line icon="speedometer" color={C.sky} label="Pression" value={f.pression} /> : null}
            {f.distribution ? <Line icon="cog" color={C.blue} label="Distribution" value={[f.distribution.type, f.distribution.intervalle].filter(Boolean).join(' · ')} /> : null}
            {f.couple_roues ? <Line icon="build" color={C.green} label="Serrage des roues" value={f.couple_roues} /> : null}
            {f.batterie ? <Line icon="battery-half" color={C.yellow} label="Batterie" value={f.batterie} /> : null}
          </>
        )}
      </Card>
    </>
  );
}

function Line({ icon, color, label, value }: { icon: keyof typeof Ionicons.glyphMap; color: string; label: string; value: string }) {
  return (
    <Row>
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: C.card2, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={T.tiny}>{label}</Text>
        <Text style={[T.body, { fontWeight: '600' }]}>{value}</Text>
      </View>
    </Row>
  );
}
