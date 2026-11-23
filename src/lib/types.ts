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
  vin: string;
  year: number;
  km: number;
  interval: number; // km entre deux vidanges
  intervalMonths: number; // mois entre deux vidanges
  ct: string; // date du prochain contrôle technique (AAAA-MM-JJ) ou ''
  code: string; // code d'accès client XXXX-XXXX
  items: Item[];
  photoCg?: string; // photo de la carte grise (adresse du fichier ou image en base64)
  example?: boolean; // véhicule d'exemple
  name?: string; // ancien champ (version 1)
};

export type Garage = { name: string; phone: string; address: string };

export type Mode = 'garage' | 'client' | null;
