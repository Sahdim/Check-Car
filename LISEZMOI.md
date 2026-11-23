# Check & Car (appli mobile iPhone + Android)

Appli faite avec Expo (React Native), compilée en vraie appli iPhone avec **Codemagic** (voir `codemagic.yaml`).

## Comment marche l’appli

- **Espace client** (à l’ouverture) : « Entre ton code ». Le client tape le code de 8 caractères donné par le garage.
  Il peut suivre **plusieurs véhicules** (un code par véhicule) : écran « Mes véhicules », tirer vers le bas pour
  rafraîchir, « Ajouter un véhicule », appui sur ⋯ pour retirer un véhicule de sa liste.
- **Espace pro** : petit lien « Espace pro » en bas de l’écran client → connexion avec l’e-mail et le mot de passe du
  compte garage (Supabase). Pas d’inscription dans l’appli. Une fois connecté, l’appli reste dans l’espace pro
  (même après l’avoir fermée) jusqu’à **Réglages → Se déconnecter**.
- Sans Supabase (pas de fichier `.env`), l’espace pro marche **en local** pour le développement (bouton
  « Entrer dans l’espace pro (local) »). Avec Supabase, la connexion est **obligatoire**.

## Où est quoi

- `src/app/` : les écrans (un fichier = un écran).
  - `client/` : espace client (`index` = Mes véhicules, `ajouter`, `[code]` = carnet d’un véhicule, `connexion` = Espace pro).
  - `(garage)/` : onglets Véhicules, Clients, **Codes**, Atelier, Réglages.
  - `vehicule/[id].tsx` = fiche ; `vehicule-form.tsx`, `intervention.tsx`, `code-releve.tsx` = formulaires.
  - `nouveau-mot-de-passe.tsx` = ouvert par le lien de l’e-mail « Mot de passe oublié ».
- `src/lib/store.tsx` : état de l’appli (connexion, véhicules, codes client).
- `src/lib/db.ts` : la base (Supabase en ligne, ou téléphone en développement).
- `src/lib/docs.ts` : documents (rapports de diagnostic).
- `src/lib/ocr.ts` + `src/lib/carteGrise.ts` : lecture de la carte grise.
- `src/lib/dtc.ts` + `src/lib/dtcData.ts` : codes défaut.
- `src/lib/parts.ts` : éléments à cocher dans une intervention.
- `src/components/PlaqueFR.tsx` : la plaque d’immatriculation.
- `supabase/schema.sql` (tout) et `supabase/migration-002.sql` (mise à jour).
- `tests/carteGrise.test.ts` : tests de la lecture de carte grise (`npm test`).

## Supabase (base en ligne)

Les variables sont dans `.env` (pour le PC) et dans `codemagic.yaml` (pour la compilation iPhone) :
```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```
C’est la clé **publique** : elle peut être dans l’appli. Ne mets JAMAIS la clé « secret / service_role ».

### Mise à jour de la base (à faire une fois)

1. Supabase → **SQL Editor** → **New query**.
2. Colle tout le fichier `supabase/migration-002.sql` → **Run**. (On peut le relancer sans risque.)
   Il ajoute : les colonnes `docs`, `dtc`, `dept`, le dossier de stockage **rapports** (public, 10 Mo, PDF/JPEG/PNG)
   et ses règles (seul le garage connecté peut envoyer ou supprimer dans SON dossier).
3. Pour le lien « Mot de passe oublié » : **Authentication → URL Configuration → Redirect URLs** → ajoute
   `checkandcar://**`. Sinon le lien de l’e-mail ne rouvre pas l’appli.

Projet neuf : coller `supabase/schema.sql` à la place (il contient tout).

### Sécurité

- Chaque garage ne voit que ses véhicules.
- Le client, avec son code, ne reçoit que son véhicule : jamais le téléphone, la photo de carte grise ni l’identifiant du garage.
- Les documents ont un nom tiré au hasard (impossible à deviner). Le dossier est public en lecture : quelqu’un qui
  a l’adresse exacte d’un document peut l’ouvrir (c’est ce qui permet au client de le voir sans compte).

## Rapports de diagnostic

Sur la fiche du véhicule → **Documents → Ajouter un rapport de diagnostic** (PDF ou photo, 10 Mo maximum).
Rapport reçu par e-mail ? Sur l’iPhone : ouvre la pièce jointe → partager → **Enregistrer dans Fichiers**,
puis dans l’appli « Choisir un PDF ». Pas besoin d’envoi par e-mail depuis l’appli.

## Lecture de la carte grise (gratuite, sur le téléphone)

Dans « Nouveau véhicule » → **Carte grise → Prendre / Choisir**. Le texte est lu sur le téléphone (rien n’est
envoyé sur internet) avec le module **expo-text-extractor** (Vision d’Apple sur iPhone, ML Kit sur Android).
L’écran « Voici ce que j’ai lu » permet de tout corriger avant de remplir le formulaire. Le nom du titulaire
n’est repris que si tu coches la case.

- Marche dans l’appli **compilée** (Codemagic). Dans Expo Go ou sur le web : « Lecture automatique indisponible ici ».
- Taper seulement la plaque ne remplit rien (pas d’API payante).

## Codes défaut (onglet Codes)

Recherche par code (`P0420`, `p0420`, `0420`) ou par mot (`turbo`, `FAP`). Base de codes **génériques** SAE
reprise de la version Windows. Pour un code absent (ou un code constructeur), l’appli explique seulement comment
il se lit, sans inventer de signification. « Ajouter aux codes relevés » range le code sur la fiche (date, km, note).
« Demander à Claude » copie un texte prêt à coller dans Claude (aucune IA dans l’appli, aucun abonnement).

## Compiler l’appli iPhone (Codemagic)

Pousse sur GitHub puis lance le workflow « Check & Car iPhone » sur Codemagic. Il fait `npx expo prebuild`,
`pod install`, `xcodebuild` et fournit `CheckAndCar.ipa`.

## Développer sur le PC

```
npm install
npx expo start          (Expo Go : sans lecture de carte grise)
npm test                (tests de la lecture de carte grise)
npx tsc --noEmit        (vérification du code)
```

## Limites connues

- **Carte grise** : la lecture dépend de la photo (à plat, nette, sans reflet). Toujours vérifier l’écran « Voici ce que j’ai lu ».
- **Hors connexion** : l’espace pro a besoin d’internet pour charger et enregistrer ; l’espace client affiche les dernières infos connues.
- **Grand titre qui rétrécit au défilement** et en-tête flouté : sur iPhone seulement.
- **Sauvegarde** : Réglages → Sauvegarde → Exporter (les documents restés sur le téléphone sont inclus dans le fichier).
