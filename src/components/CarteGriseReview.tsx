// « Voici ce que j'ai lu » : le garagiste vérifie et corrige ce qui a été lu sur la carte grise
// avant de remplir le formulaire. Le nom du titulaire n'est repris que s'il coche la case.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { CarteGriseLue } from '@/lib/carteGrise';
import { C } from '@/lib/theme';
import { fmtPlate, maskPlate, normBrand, toFr } from '@/lib/utils';
import { Btn, Card, Field, Row, Sheet, T } from './ui';

export type CgValues = { plate: string; dept: string; brand: string; model: string; engine: string; hp: string; year: string; vin: string; body: string; owner: string };

export function CarteGriseReview({ data, onCancel, onApply }: { data: CarteGriseLue | null; onCancel: () => void; onApply: (v: CgValues) => void }) {
  const [f, setF] = useState<CgValues>(blank());
  const [useOwner, setUseOwner] = useState(false);

  useEffect(() => {
    if (!data) return;
    setF({
      plate: data.plate ? fmtPlate(data.plate) : '',
      dept: data.dept,
      brand: data.brand ? normBrand(data.brand) : '',
      model: data.model,
      engine: data.engine,
      hp: data.hp ? String(data.hp) : '',
      year: data.year ? String(data.year) : '',
      vin: data.vin,
      body: data.body,
      owner: data.owner,
    });
    setUseOwner(false);
  }, [data]);

  const set = (k: keyof CgValues) => (t: string) => setF(o => ({ ...o, [k]: t }));
  const nothing = !!data && data.found === 0;

  return (
    <Sheet visible={!!data} title="Voici ce que j’ai lu" onClose={onCancel}>
      {nothing ? (
        <Card secondary style={{ gap: 8 }}>
          <Text style={[T.body, { fontWeight: '600' }]}>Je n’ai rien pu lire.</Text>
          <Text style={T.sub}>Reprends la photo : carte grise à plat, en entier, bien éclairée, sans reflet, téléphone dans le même sens que la carte.</Text>
        </Card>
      ) : (
        <>
          <Text style={T.sub}>Vérifie chaque champ et corrige si besoin. Les cases vides n’ont pas été lues.</Text>
          <Card secondary style={{ gap: 14 }}>
            <Row gap={10}>
              <Field label="Plaque (A)" value={f.plate} onChangeText={t => set('plate')(maskPlate(t))} autoCapitalize="characters" style={{ flex: 3 }} inputStyle={{ fontWeight: '700' }} />
              <Field label="Dépt" value={f.dept} onChangeText={t => set('dept')(t.toUpperCase().replace(/[^0-9AB]/g, '').slice(0, 3))} style={{ flex: 1 }} />
            </Row>
            <Field label="Marque (D.1)" value={f.brand} onChangeText={set('brand')} autoCapitalize="words" />
            <Field label="Modèle (D.3)" value={f.model} onChangeText={set('model')} autoCapitalize="words" hint={data?.version ? 'Version lue (D.2) : ' + data.version : undefined} />
            <Row gap={10}>
              <Field label="Motorisation (P.1, P.3)" value={f.engine} onChangeText={set('engine')} style={{ flex: 2 }} />
              <Field label="Chevaux (P.2)" value={f.hp} onChangeText={t => set('hp')(t.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" style={{ flex: 1 }} />
            </Row>
            <Field
              label="Année (B)"
              value={f.year}
              onChangeText={t => set('year')(t.replace(/\D/g, '').slice(0, 4))}
              keyboardType="number-pad"
              hint={data?.firstReg ? '1re immatriculation : ' + toFr(data.firstReg) : undefined}
            />
            <Field label="VIN (E)" value={f.vin} onChangeText={t => set('vin')(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 17))} autoCapitalize="characters" autoCorrect={false} />
            {data?.kw || data?.cc || data?.energyLabel || data?.genreLabel ? (
              <Text style={T.tiny}>
                {[data.cc ? data.cc + ' cm³' : '', data.kw ? data.kw + ' kW' : '', data.energyLabel, data.genreLabel].filter(Boolean).join(' · ')}
              </Text>
            ) : null}
          </Card>
          {f.owner ? (
            <Card secondary style={{ gap: 12 }}>
              <Field label="Titulaire (C.1)" value={f.owner} onChangeText={set('owner')} autoCapitalize="words" />
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: useOwner }} onPress={() => setUseOwner(u => !u)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name={useOwner ? 'checkbox' : 'square-outline'} size={24} color={useOwner ? C.text : C.text3} />
                <Text style={[T.body, { flex: 1, fontSize: 15 }]}>Mettre ce nom comme client</Text>
              </Pressable>
            </Card>
          ) : null}
        </>
      )}
      <View style={{ gap: 10, marginTop: 4 }}>
        {!nothing ? <Btn title="Remplir le formulaire" icon="checkmark" onPress={() => onApply({ ...f, owner: useOwner ? f.owner.trim() : '' })} /> : null}
        <Btn kind="secondary" title={nothing ? 'Fermer' : 'Annuler'} onPress={onCancel} />
      </View>
    </Sheet>
  );
}

const blank = (): CgValues => ({ plate: '', dept: '', brand: '', model: '', engine: '', hp: '', year: '', vin: '', body: '', owner: '' });
