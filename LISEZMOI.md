# Check & Car (appli mobile iPhone + Android)

Appli faite avec Expo (React Native). Elle s’ouvre dans **Expo Go** sur iPhone et Android.

## Lancer l’appli sur ton téléphone

1. Installe **Expo Go** sur ton téléphone (App Store ou Play Store).
2. Sur le PC, dans ce dossier : `npm install` (une seule fois), puis `npx expo start`.
3. Un QR code s’affiche :
   - iPhone : ouvre l’appareil photo et vise le QR code.
   - Android : ouvre Expo Go → « Scan QR code ».
4. Le téléphone et le PC doivent être sur le même Wi-Fi. Si ça ne marche pas : `npx expo start --tunnel`.

Au premier lancement en mode garagiste, 2 véhicules « Exemple » sont créés. Tu peux les supprimer (bouton « Supprimer » en haut de la liste).

## Où est quoi

- `src/app/` : les écrans (un fichier = un écran). `(garage)/` = onglets Véhicules, Clients, Atelier, Réglages ; `client/` = mode client ; `vehicule/[id].tsx` = fiche ; `vehicule-form.tsx` et `intervention.tsx` = formulaires.
- `src/lib/db.ts` : la base de données (locale ou Supabase, même interface).
- `src/lib/parts.ts` : la liste des éléments à cocher dans une intervention.
- `src/lib/alerts.ts` : les rappels (vidange au km ou à la date, contrôle technique).
- `src/lib/pdf.ts` : le carnet PDF pour la revente.
- `src/lib/ocr.ts` : lecture de carte grise (vide pour l’instant, voir plus bas).
- `data/fiches.json` : fiches techniques (2 exemples marqués `"exemple": true`).
- `supabase/schema.sql` : la base en ligne.

## Brancher Supabase (base en ligne, pour que les clients voient leur carnet chez eux)

Sans Supabase, tout reste sur le téléphone du garagiste (le code client ne marche que sur ce téléphone).

1. Crée un projet gratuit sur supabase.com.
2. Dans le projet : **SQL Editor** → **New query** → colle tout le fichier `supabase/schema.sql` → **Run**.
3. Dans **Project Settings → API** : copie l’**URL** et la clé **anon public**.
4. Dans ce dossier, copie `.env.example` en `.env` et remplis :
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=ta_cle_anon
   ```
5. Relance `npx expo start --clear`.
6. Dans l’appli : **Réglages → Compte en ligne → Se connecter** (ou « Créer mon compte »).
   Puis **« Envoyer les véhicules du téléphone »** pour copier tes véhicules locaux en ligne.

Sécurité : chaque garagiste ne voit que ses véhicules. Le client, avec son code, ne reçoit que son
véhicule (sans téléphone ni photo de carte grise). Ne mets jamais la clé « service_role » dans l’appli.

Astuce : dans Supabase → Authentication → Providers → Email, tu peux désactiver « Confirm email »
pour te connecter tout de suite après la création du compte.

## Publier pour Expo Go (mise à jour à distance)

Il faut un compte gratuit sur expo.dev (une seule fois) :

```
npx eas-cli@latest login
npx eas-cli@latest update:configure
npx eas-cli@latest update --branch production --message "Nouvelle version"
```

Ensuite, l’appli publiée s’ouvre dans Expo Go depuis le lien ou le QR code affiché sur expo.dev.
Pour une vraie appli installable (App Store / Play Store) : `npx eas-cli@latest build`.

## Limites connues

- **Lecture automatique de la carte grise (OCR)** : impossible dans Expo Go (il faut un module natif).
  La photo est gardée avec le véhicule ; la fonction `lireCarteGrise()` dans `src/lib/ocr.ts`
  est prête à être branchée dans une version compilée (`eas build`).
- **Grand titre qui rétrécit au défilement** et en-tête flouté : sur iPhone seulement (Android affiche un titre normal).
- **Barre d’onglets floutée** sur iPhone ; sur Android elle est sombre presque opaque.
- **Fiches techniques** : seulement 2 exemples, à remplacer par des données vérifiées dans `data/fiches.json`.
- **Sauvegarde** : pense à faire « Réglages → Sauvegarde → Exporter » de temps en temps en mode local.
