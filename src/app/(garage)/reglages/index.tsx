// Réglages : infos du garage (PDF), compte en ligne, sauvegarde, changer de mode.
import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { ask, Btn, Card, Field, notify, Row, Screen, SectionTitle, StatusPill, T, tap } from '@/components/ui';
import { exportBackup, pickBackup } from '@/lib/backup';
import { useStore } from '@/lib/store';
import { supabaseEnabled } from '@/lib/supabase';

export default function Reglages() {
  const store = useStore();
  const { settings, setGarage, vehicles, userEmail } = store;
  const [localN, setLocalN] = useState(0);
  useEffect(() => {
    if (supabaseEnabled) store.localCount().then(setLocalN).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
        b.vehicles.length + ' véhicule(s) dans le fichier. Ils REMPLACENT les véhicules actuels' + (supabaseEnabled ? ' (envoyés dans ta base en ligne ; ceux qui y sont déjà sont mis à jour).' : '.'),
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
        setLocalN(0);
      } catch (e: any) {
        notify('Envoi impossible', e?.message);
      } finally {
        setBusy('');
      }
    });

  const logout = () =>
    ask(
      supabaseEnabled ? 'Se déconnecter ?' : 'Quitter l’espace pro ?',
      supabaseEnabled ? 'Tes véhicules restent en ligne. Il faudra ton e-mail et ton mot de passe pour revenir.' : 'Tes véhicules restent sur ce téléphone.',
      supabaseEnabled ? 'Se déconnecter' : 'Quitter',
      () => store.signOut(), // l'appli revient toute seule à l'espace client
    );

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

      <SectionTitle>Compte</SectionTitle>
      <Card style={{ gap: 12 }}>
        {supabaseEnabled ? (
          <>
            <StatusPill level="ok" text={'Connecté : ' + userEmail} />
            <Text style={T.sub}>Tes véhicules sont enregistrés en ligne. Les clients voient leur véhicule avec leur code.</Text>
            {localN > 0 ? (
              <Btn kind="secondary" title={'Envoyer les ' + localN + ' véhicule(s) du téléphone'} icon="cloud-upload-outline" loading={busy === 'push'} onPress={push} />
            ) : null}
          </>
        ) : (
          <>
            <StatusPill level="warn" text="Mode local (développement) : données sur ce téléphone" />
            <Text style={T.sub}>La base en ligne n’est pas configurée dans cette version (voir LISEZMOI.md). Pense à faire des sauvegardes.</Text>
          </>
        )}
        <Btn kind="danger" title={supabaseEnabled ? 'Se déconnecter' : 'Quitter l’espace pro'} icon="log-out-outline" onPress={logout} />
      </Card>

      <SectionTitle>Sauvegarde</SectionTitle>
      <Card style={{ gap: 12 }}>
        <Text style={T.sub}>Crée un fichier avec tous tes véhicules (à garder dans Fichiers, Drive, mail…). Les sauvegardes de la version Windows sont aussi acceptées.</Text>
        <Row gap={10}>
          <Btn kind="secondary" small title="Exporter" icon="download-outline" style={{ flex: 1 }} loading={busy === 'export'} onPress={doExport} />
          <Btn kind="secondary" small title="Restaurer" icon="push-outline" style={{ flex: 1 }} loading={busy === 'import'} onPress={doImport} />
        </Row>
      </Card>

      <View style={{ alignItems: 'center', marginTop: 10, gap: 2 }}>
        <Text style={T.tiny}>Check & Car {Constants.expoConfig?.version || ''}</Text>
        <Text style={T.tiny}>
          {vehicles.length} véhicule{vehicles.length > 1 ? 's' : ''} · {vehicles.reduce((n, v) => n + v.items.length, 0)} interventions
        </Text>
      </View>
    </Screen>
  );
}
