// Réglages : infos du garage (PDF), compte en ligne, sauvegarde, changer de mode.
import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, Text, View } from 'react-native';
import { Btn, Card, Field, Row, Screen, SectionTitle, StatusPill, T, tap } from '@/components/ui';
import { exportBackup, pickBackup } from '@/lib/backup';
import { useStore } from '@/lib/store';
import { supabaseEnabled } from '@/lib/supabase';
import { C } from '@/lib/theme';

const ask = (title: string, msg: string, ok: string, go: () => void, destructive = false) => {
  if (Platform.OS === 'web') {
    if (window.confirm(title + '\n' + msg)) go();
  } else Alert.alert(title, msg, [{ text: 'Annuler', style: 'cancel' }, { text: ok, style: destructive ? 'destructive' : 'default', onPress: go }]);
};
const notify = (title: string, msg?: string) => {
  if (Platform.OS === 'web') window.alert(msg ? title + '\n' + msg : title);
  else Alert.alert(title, msg);
};

export default function Reglages() {
  const store = useStore();
  const { settings, setGarage, vehicles, online, userEmail } = store;
  const [g, setG] = useState(settings.garage);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState('');
  useEffect(() => setG(settings.garage), [settings.garage]);
  const dirty = g.name !== settings.garage.name || g.phone !== settings.garage.phone || g.address !== settings.garage.address;

  const saveGarage = async () => {
    await setGarage({ name: g.name.trim(), phone: g.phone.trim(), address: g.address.trim() });
    tap('success');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const doExport = async () => {
    setBusy('export');
    try {
      await exportBackup(vehicles, settings.garage);
    } catch (e: any) {
      notify('Sauvegarde impossible', e?.message);
    } finally {
      setBusy('');
    }
  };
  const doImport = async () => {
    try {
      const b = await pickBackup();
      if (!b) return;
      ask(
        'Restaurer cette sauvegarde ?',
        b.vehicles.length + ' véhicule(s) dans le fichier. Ils REMPLACENT les véhicules actuels' + (online ? ' (ajoutés à ton compte en ligne).' : '.'),
        'Restaurer',
        async () => {
          setBusy('import');
          try {
            await store.replaceAll(b.vehicles);
            if (b.garage && !settings.garage.name) await setGarage({ ...settings.garage, ...b.garage });
            tap('success');
            notify('Sauvegarde restaurée', b.vehicles.length + ' véhicule(s).');
          } catch (e: any) {
            notify('Restauration impossible', e?.message);
          } finally {
            setBusy('');
          }
        },
        true,
      );
    } catch (e: any) {
      notify('Fichier illisible', e?.message);
    }
  };

  const push = () =>
    ask('Envoyer les véhicules du téléphone ?', 'Les véhicules enregistrés sur ce téléphone (sauf les exemples) seront copiés dans ton compte en ligne.', 'Envoyer', async () => {
      setBusy('push');
      try {
        const n = await store.pushLocalToOnline();
        tap('success');
        notify('Envoi terminé', n + ' véhicule(s) envoyé(s).');
      } catch (e: any) {
        notify('Envoi impossible', e?.message);
      } finally {
        setBusy('');
      }
    });

  const changeMode = () =>
    ask('Changer de mode ?', 'Tu reviens à l’écran de choix (garagiste ou code client). Tes données restent enregistrées.', 'Changer', async () => {
      await store.setMode(null);
      router.replace('/accueil');
    });

  return (
    <Screen>
      <SectionTitle>Mon garage</SectionTitle>
      <Card style={{ gap: 14 }}>
        <Text style={T.sub}>Affiché en haut du carnet PDF remis aux clients.</Text>
        <Field label="Nom du garage" value={g.name} onChangeText={t => setG({ ...g, name: t })} placeholder="Garage du Centre" autoCapitalize="words" />
        <Field label="Téléphone" value={g.phone} onChangeText={t => setG({ ...g, phone: t })} placeholder="05 56 00 00 00" keyboardType="phone-pad" />
        <Field label="Adresse" value={g.address} onChangeText={t => setG({ ...g, address: t })} placeholder="12 rue des Lilas, 33140 Villenave-d'Ornon" multiline />
        <Btn title={saved ? 'Enregistré' : 'Enregistrer'} icon={saved ? 'checkmark-circle' : 'save-outline'} disabled={!dirty && !saved} onPress={saveGarage} />
      </Card>

      <SectionTitle>Compte en ligne</SectionTitle>
      <Card style={{ gap: 12 }}>
        {!supabaseEnabled ? (
          <>
            <StatusPill level="warn" text="Mode local : données sur ce téléphone" />
            <Text style={T.sub}>
              Pour partager les carnets avec les clients sur leur propre téléphone, il faut brancher Supabase (voir le fichier LISEZMOI.md). En attendant, pense à faire des sauvegardes.
            </Text>
          </>
        ) : online ? (
          <>
            <StatusPill level="ok" text={'Connecté : ' + userEmail} />
            <Text style={T.sub}>Tes véhicules sont enregistrés en ligne. Les clients peuvent voir leur véhicule avec leur code.</Text>
            <Btn kind="secondary" title="Envoyer les véhicules du téléphone" icon="cloud-upload-outline" loading={busy === 'push'} onPress={push} />
            <Btn kind="ghost" title="Se déconnecter" icon="log-out-outline" onPress={() => store.signOut()} />
          </>
        ) : (
          <>
            <StatusPill level="warn" text="Non connecté : données sur ce téléphone" />
            <Btn title="Se connecter" icon="log-in-outline" onPress={() => router.push('/connexion')} />
          </>
        )}
      </Card>

      <SectionTitle>Sauvegarde</SectionTitle>
      <Card style={{ gap: 12 }}>
        <Text style={T.sub}>Crée un fichier avec tous tes véhicules (à garder dans Fichiers, Drive, mail…). Les sauvegardes de la version Windows sont aussi acceptées.</Text>
        <Row gap={10}>
          <Btn kind="secondary" small title="Exporter" icon="download-outline" style={{ flex: 1 }} loading={busy === 'export'} onPress={doExport} />
          <Btn kind="secondary" small title="Restaurer" icon="push-outline" style={{ flex: 1 }} loading={busy === 'import'} onPress={doImport} />
        </Row>
      </Card>

      <SectionTitle>Mode</SectionTitle>
      <Card style={{ gap: 12 }}>
        <Row>
          <Ionicons name="construct" size={22} color={C.orange} />
          <Text style={[T.body, { flex: 1 }]}>Mode garagiste</Text>
        </Row>
        <Btn kind="secondary" title="Changer de mode" icon="swap-horizontal" onPress={changeMode} />
      </Card>

      <View style={{ alignItems: 'center', marginTop: 10, gap: 2 }}>
        <Text style={T.tiny}>Carnet Garage {Constants.expoConfig?.version || ''}</Text>
        <Text style={T.tiny}>
          {vehicles.length} véhicule{vehicles.length > 1 ? 's' : ''} · {vehicles.reduce((n, v) => n + v.items.length, 0)} interventions
        </Text>
      </View>
    </Screen>
  );
}
