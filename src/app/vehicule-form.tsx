// Ajout / modification d'un véhicule (et mise à jour rapide du kilométrage).
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { CarteGriseReview, type CgValues } from '@/components/CarteGriseReview';
import { Btn, Card, Chip, Field, notify, Row, Screen, T, tap } from '@/components/ui';
import { PlaqueFR } from '@/components/PlaqueFR';
import { mkVehicle } from '@/lib/newVehicle';
import { lireCarteGrise, type CarteGriseLue } from '@/lib/ocr';
import { deletePhoto, keepPhoto } from '@/lib/photos';
import { useStore, useVehicle } from '@/lib/store';
import { C, R } from '@/lib/theme';
import type { Vehicle } from '@/lib/types';
import { BODIES, fmtKm, fmtPlate, fromFr, guessBrand, maskDate, maskPlate, MARQUES, newVehicleId, norm, normBrand, toFr } from '@/lib/utils';

const num = (s: string) => s.replace(/[^\d]/g, '');

export default function VehiculeForm() {
  const { id, km: kmOnly } = useLocalSearchParams<{ id?: string; km?: string }>();
  const old = useVehicle(id);
  const { saveVehicle } = useStore();
  const e: Partial<Vehicle> = old || {};
  const quick = !!old && kmOnly === '1';

  const [brand, setBrand] = useState(e.brand || '');
  const [model, setModel] = useState(e.model || '');
  const [engine, setEngine] = useState(e.engine || '');
  const [hp, setHp] = useState(e.hp ? String(e.hp) : '');
  const [body, setBody] = useState(e.body || '');
  const [plate, setPlate] = useState(e.plate || '');
  const [dept, setDept] = useState(e.dept || '');
  const [year, setYear] = useState(e.year ? String(e.year) : '');
  const [km, setKm] = useState(e.km != null ? String(e.km) : '');
  const [vin, setVin] = useState(e.vin || '');
  const [owner, setOwner] = useState(e.owner || '');
  const [phone, setPhone] = useState(e.phone || '');
  const [interval, setIntervalKm] = useState(String(e.interval || 15000));
  const [months, setMonths] = useState(String(e.intervalMonths || 12));
  const [ct, setCt] = useState(toFr(e.ct || ''));
  const [photo, setPhoto] = useState(e.photoCg || '');
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [ocrMsg, setOcrMsg] = useState('');
  const [lu, setLu] = useState<CarteGriseLue | null>(null);
  const [err, setErr] = useState('');

  const brandSuggestions = useMemo(() => {
    const n = norm(brand);
    if (MARQUES.some(m => norm(m) === n)) return [];
    return MARQUES.filter(m => !n || norm(m).startsWith(n)).slice(0, n ? 6 : 12);
  }, [brand]);

  const onModel = (t: string) => {
    setModel(t);
    if (!brand.trim()) {
      const g = guessBrand(t); // devine la marque à partir du modèle
      if (g) setBrand(g);
    }
  };

  const pickPhoto = async (camera: boolean) => {
    try {
      if (camera) {
        const p = await ImagePicker.requestCameraPermissionsAsync();
        if (!p.granted) return notify('Appareil photo refusé', 'Autorise l’appareil photo dans les réglages du téléphone.');
      }
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6 };
      const r = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (r.canceled || !r.assets?.length) return;
      const uri = r.assets[0].uri;
      setPhoto(uri);
      tap('success');
      // Lecture automatique sur le téléphone (null = indisponible ici : Expo Go ou web)
      setOcrMsg('');
      setReading(true);
      try {
        const cg = await lireCarteGrise(uri);
        if (!cg) setOcrMsg('Lecture automatique indisponible ici. Remplis les champs en regardant la photo.');
        else setLu(cg);
      } catch {
        setOcrMsg('Lecture impossible sur cette photo. Remplis les champs en regardant la photo.');
      } finally {
        setReading(false);
      }
    } catch (x: any) {
      notify('Photo impossible', x?.message);
    }
  };

  // le garagiste a validé ce qui a été lu : on remplit le formulaire
  const applyCg = (x: CgValues) => {
    if (x.plate) setPlate(x.plate);
    if (x.dept) setDept(x.dept);
    if (x.brand) setBrand(x.brand);
    if (x.model) setModel(x.model);
    if (x.engine) setEngine(x.engine);
    if (x.hp) setHp(x.hp);
    if (x.year) setYear(x.year);
    if (x.vin) setVin(x.vin);
    if (x.body) setBody(x.body);
    if (x.owner) setOwner(x.owner);
    setLu(null);
    setOcrMsg('Formulaire rempli avec la carte grise : vérifie avant d’enregistrer.');
    tap('success');
  };

  const save = async () => {
    setErr('');
    const ctIso = ct.trim() ? fromFr(ct) : '';
    if (!quick) {
      if (!brand.trim() || !model.trim()) return setErr('Indique la marque et le modèle.');
      if (!plate.trim()) return setErr('Indique la plaque.');
      if (year && (+year < 1950 || +year > 2100)) return setErr('Année incorrecte.');
    }
    if (ct.trim() && !ctIso) return setErr('Date du contrôle technique incorrecte (JJ/MM/AAAA).');
    setBusy(true);
    try {
      const vid = old?.id || newVehicleId();
      let photoCg = photo || undefined;
      if (photo && photo !== old?.photoCg) {
        photoCg = await keepPhoto(photo, vid);
        if (old?.photoCg) deletePhoto(old.photoCg);
      } else if (!photo && old?.photoCg) deletePhoto(old.photoCg);
      const v: Vehicle = quick
        ? { ...old!, km: +km || 0, ct: ctIso }
        : {
            ...(old || mkVehicle()),
            id: vid,
            brand: normBrand(brand),
            model: model.trim(),
            engine: engine.trim(),
            hp: +hp || 0,
            body,
            plate: fmtPlate(plate),
            dept: dept.trim().toUpperCase(),
            year: +year || 0,
            km: +km || 0,
            vin: vin.trim().toUpperCase(),
            owner: owner.trim(),
            phone: phone.trim(),
            interval: Math.max(1000, +interval || 15000),
            intervalMonths: Math.min(60, Math.max(1, +months || 12)),
            ct: ctIso,
            photoCg,
          };
      const saved = await saveVehicle(v);
      tap('success');
      if (old) router.back();
      else router.replace({ pathname: '/vehicule/[id]', params: { id: saved.id } });
    } catch (x: any) {
      setErr(x?.message || 'Enregistrement impossible');
    } finally {
      setBusy(false);
    }
  };

  const title = quick ? 'Kilométrage' : old ? 'Modifier le véhicule' : 'Nouveau véhicule';

  return (
    <>
      <Stack.Screen
        options={{
          title,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={10} style={{ paddingHorizontal: Platform.OS === 'ios' ? 0 : 8 }}>
              <Text style={{ color: C.orange, fontSize: 17 }}>Annuler</Text>
            </Pressable>
          ),
        }}
      />
      <Screen>
        {quick ? (
          <Card style={{ gap: 14 }}>
            <Text style={T.sub}>Actuel : {fmtKm(old!.km)}</Text>
            <Field label="Nouveau kilométrage" value={km} onChangeText={t => setKm(num(t))} keyboardType="number-pad" autoFocus placeholder="128400" />
            <Field label="Prochain contrôle technique" value={ct} onChangeText={t => setCt(maskDate(t))} keyboardType="number-pad" placeholder="JJ/MM/AAAA" />
          </Card>
        ) : (
          <>
            <Card style={{ gap: 12 }}>
              <Text style={T.label}>Carte grise</Text>
              {photo ? (
                <View>
                  <Image source={{ uri: photo }} style={{ width: '100%', aspectRatio: 1.45, borderRadius: 14, backgroundColor: C.card2 }} contentFit="cover" />
                  <Pressable
                    accessibilityLabel="Retirer la photo"
                    onPress={() => setPhoto('')}
                    style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 16, padding: 4 }}>
                    <Ionicons name="close" size={22} color="#fff" />
                  </Pressable>
                </View>
              ) : (
                <View style={{ borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.sep, padding: 18, alignItems: 'center', gap: 6 }}>
                  <Ionicons name="document-text-outline" size={30} color={C.text3} />
                  <Text style={[T.tiny, { textAlign: 'center' }]}>Prends la carte grise en photo : les champs se remplissent tout seuls (tu vérifies avant).</Text>
                </View>
              )}
              {reading ? (
                <Row gap={8} style={{ justifyContent: 'center' }}>
                  <ActivityIndicator color={C.text2} />
                  <Text style={T.sub}>Lecture de la carte grise…</Text>
                </Row>
              ) : null}
              {ocrMsg ? <Text style={[T.tiny, { color: C.text2, textAlign: 'center' }]}>{ocrMsg}</Text> : null}
              <Row gap={10}>
                <Btn kind="secondary" small title="Prendre" icon="camera-outline" style={{ flex: 1 }} onPress={() => pickPhoto(true)} />
                <Btn kind="secondary" small title="Choisir" icon="images-outline" style={{ flex: 1 }} onPress={() => pickPhoto(false)} />
              </Row>
            </Card>

            <Card style={{ gap: 14 }}>
              <Field label="Modèle et génération" value={model} onChangeText={onModel} placeholder="Clio IV, 308 II, Golf 7…" autoCapitalize="words" />
              <Field label="Marque" value={brand} onChangeText={setBrand} placeholder="Renault" autoCapitalize="words" autoCorrect={false} />
              {brandSuggestions.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8 }}>
                  {brandSuggestions.map(m => (
                    <Chip key={m} label={m} onPress={() => setBrand(m)} />
                  ))}
                </ScrollView>
              ) : null}
              <Row gap={10}>
                <Field label="Motorisation" value={engine} onChangeText={setEngine} placeholder="1.5 dCi" style={{ flex: 2 }} />
                <Field label="Chevaux" value={hp} onChangeText={t => setHp(num(t).slice(0, 4))} keyboardType="number-pad" placeholder="90" style={{ flex: 1 }} />
              </Row>
              <Text style={T.label}>Carrosserie</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {BODIES.filter(b => b[0]).map(b => (
                  <Chip key={b[0]} label={b[1].replace('Citadine / compacte ', '')} active={body === b[0]} onPress={() => setBody(body === b[0] ? '' : b[0])} />
                ))}
              </View>
            </Card>

            <Card style={{ gap: 14 }}>
              <Row gap={10}>
                <Field
                  label="Plaque"
                  value={plate}
                  onChangeText={t => setPlate(maskPlate(t))}
                  placeholder="AB-123-CD"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  style={{ flex: 3 }}
                  inputStyle={{ fontWeight: '700', letterSpacing: 1.2 }}
                />
                <Field
                  label="Dépt"
                  value={dept}
                  onChangeText={t => setDept(t.toUpperCase().replace(/[^0-9AB]/g, '').slice(0, 3))}
                  placeholder="33"
                  autoCapitalize="characters"
                  style={{ flex: 1 }}
                />
              </Row>
              {plate.trim() && !old && !photo ? <Text style={T.tiny}>Pour remplir tout seul, prends la carte grise en photo.</Text> : null}
              {plate.trim() ? <PlaqueFR plate={fmtPlate(plate)} dept={dept} size="md" /> : null}
              <Field label="Année" value={year} onChangeText={t => setYear(num(t).slice(0, 4))} keyboardType="number-pad" placeholder="2016" />
              <Field label="Kilométrage" value={km} onChangeText={t => setKm(num(t))} keyboardType="number-pad" placeholder="128400" />
              <Field label="VIN (facultatif)" value={vin} onChangeText={t => setVin(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 17))} placeholder="VF1…" autoCapitalize="characters" autoCorrect={false} />
            </Card>

            <Card style={{ gap: 14 }}>
              <Field label="Client" value={owner} onChangeText={setOwner} placeholder="Prénom Nom" autoCapitalize="words" textContentType="name" />
              <Field label="Téléphone" value={phone} onChangeText={setPhone} placeholder="06 12 34 56 78" keyboardType="phone-pad" textContentType="telephoneNumber" />
            </Card>

            <Card style={{ gap: 14 }}>
              <Text style={T.label}>Rappels</Text>
              <Text style={T.tiny}>Vidange tous les X km ou tous les X mois (le premier des deux).</Text>
              <Row gap={10}>
                <Field label="Vidange (km)" value={interval} onChangeText={t => setIntervalKm(num(t))} keyboardType="number-pad" style={{ flex: 1 }} />
                <Field label="ou (mois)" value={months} onChangeText={t => setMonths(num(t).slice(0, 2))} keyboardType="number-pad" style={{ flex: 1 }} />
              </Row>
              <Field label="Prochain contrôle technique" value={ct} onChangeText={t => setCt(maskDate(t))} keyboardType="number-pad" placeholder="JJ/MM/AAAA (facultatif)" />
            </Card>

          </>
        )}

        {err ? <Text style={{ color: C.red, fontSize: 15, textAlign: 'center' }}>{err}</Text> : null}
        <CarteGriseReview data={lu} onCancel={() => setLu(null)} onApply={applyCg} />
        <Btn title={old ? 'Enregistrer' : 'Ajouter le véhicule'} icon="checkmark" loading={busy} onPress={save} style={{ marginTop: 4, borderRadius: R.btn }} />
      </Screen>
    </>
  );
}
