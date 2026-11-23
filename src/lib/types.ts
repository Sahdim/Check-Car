// Modèle de données (repris de l'ancienne version Windows, compatible).

export type Item = {
  id: string;
  date: string; // AAAA-MM-JJ
  kind: string; // éléments cochés, joints par « , » (ancien format : un seul mot)
  parts?: string[]; // éléments cochés (nouveau)
  km: number;
  price: number;
  note: string;
};

/** Document lié au véhicule (rapport de diagnostic en PDF ou en photo) */
export type Doc = {
  id: string;
  title: string;
  date: string; // AAAA-MM-JJ
  /** En ligne : chemin dans le bucket « rapports » (garage/vehicule/xxx.pdf). Sur le téléphone : adresse file://. Dans une sauvegarde : data:… */
  path: string;
  type: 'pdf' | 'image';
  mime: string;
  size: number; // octets
};

/** Code défaut relevé sur le véhicule (onglet Codes) */
export type DtcEntry = {
  id: string;
  code: string; // P0420…
  date: string; // AAAA-MM-JJ
  km: number;
  note: string;
};

export type Vehicle = {
  id: string;
  owner: string;
  phone: string;
  brand: string;
  model: string;
  engine: string;
  hp: number;
  body: string;
  plate: string;
  dept: string; // numéro de département affiché à droite de la plaque (facultatif)
  vin: string;
  year: number;
  km: number;
  interval: number; // km entre deux vidanges
  intervalMonths: number; // mois entre deux vidanges
  ct: string; // date du prochain contrôle technique (AAAA-MM-JJ) ou ''
  code: string; // code d'accès client XXXX-XXXX
  items: Item[];
  docs: Doc[];
  dtc: DtcEntry[];
  photoCg?: string; // photo de la carte grise (adresse du fichier ou image en base64)
  example?: boolean; // véhicule d'exemple
  name?: string; // ancien champ (version 1)
};

export type Garage = { name: string; phone: string; address: string };

/** Mode local (sans Supabase, pour le développement) : 'garage' si on est entré dans l'espace pro */
export type Mode = 'garage' | 'client' | null;
