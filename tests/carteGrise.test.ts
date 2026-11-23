// Tests de l'analyseur de carte grise. Lancer : npm test   (node, sans internet)
import { analyserCarteGrise } from '../src/lib/carteGrise.ts';

// petite fonction de comparaison (pas besoin de bibliothèque)
const assert = {
  equal(actual: unknown, expected: unknown) {
    if (actual !== expected) throw new Error('attendu ' + JSON.stringify(expected) + ', obtenu ' + JSON.stringify(actual));
  },
};

let ok = 0;
const test = (name: string, fn: () => void) => {
  try {
    fn();
    ok++;
    console.log('OK   ' + name);
  } catch (e) {
    console.error('ÉCHEC ' + name + ' : ' + (e as Error).message);
    throw e;
  }
};

// 1. Carte grise récente (SIV), lecture propre, rubrique et valeur sur la même ligne
test('Clio IV diesel, lecture propre', () => {
  const txt = [
    'CERTIFICAT D\'IMMATRICULATION',
    'RÉPUBLIQUE FRANÇAISE',
    'A AB-123-CD B 15/03/2016',
    'C.1 DUPONT JEAN',
    'C.3 12 RUE DES LILAS 33140 VILLENAVE D ORNON',
    'D.1 RENAULT',
    'D.2 5RA1A6 D.2.1 M10RENVP000A123',
    'D.3 CLIO',
    'E VF15R400A55123456',
    'F.1 1611 F.2 1611 F.3 2111',
    'G 1271 G.1 1146',
    'I 02/09/2021',
    'J VP J.1 VP J.2 AA J.3 CI',
    'P.1 1461 P.2 66 P.3 GO P.6 5',
    'X.1 14/03/2024',
  ];
  const r = analyserCarteGrise(txt);
  assert.equal(r.plate, 'AB-123-CD');
  assert.equal(r.firstReg, '2016-03-15');
  assert.equal(r.year, 2016);
  assert.equal(r.owner, 'Dupont Jean');
  assert.equal(r.brand, 'Renault');
  assert.equal(r.version, '5RA1A6');
  assert.equal(r.model, 'Clio');
  assert.equal(r.vin, 'VF15R400A55123456');
  assert.equal(r.cc, 1461);
  assert.equal(r.kw, 66);
  assert.equal(r.hp, 90); // 66 × 1,36 = 89,8
  assert.equal(r.energy, 'GO');
  assert.equal(r.energyLabel, 'Diesel');
  assert.equal(r.genre, 'VP');
  assert.equal(r.engine, '1.5 Diesel');
  assert.equal(r.dept, '');
});

// 2. Lecture « à la Vision » : rubriques seules sur leur ligne, deux-points, erreurs O/0 dans le VIN, kW à virgule
test('Golf 7 essence, rubriques séparées et erreurs de lecture', () => {
  const lignes = [
    'CERTIFICAT D IMMATRICULATION',
    'A:',
    'GH 456 JK',
    'B:',
    '04.07.2019',
    'C.1:',
    'MARTIN-LEROY SOPHIE',
    'D.1:',
    'VOLKSWAGEN',
    'D.2:',
    'AUCZEX/CHZJ',
    'D.3:',
    'GOLF',
    'E:',
    'WVWZZZAUZKW0O1234',
    'P.1: 999',
    'P.2: 81,0',
    'P.3: ES',
    'J.1: VP',
    'I: 05/07/2019',
  ];
  const r = analyserCarteGrise(lignes);
  assert.equal(r.plate, 'GH-456-JK');
  assert.equal(r.firstReg, '2019-07-04');
  assert.equal(r.owner, 'Martin-Leroy Sophie');
  assert.equal(r.brand, 'Volkswagen');
  assert.equal(r.model, 'Golf');
  assert.equal(r.vin, 'WVWZZZAUZKW001234');
  assert.equal(r.cc, 999);
  assert.equal(r.kw, 81);
  assert.equal(r.hp, 110);
  assert.equal(r.energyLabel, 'Essence');
  assert.equal(r.engine, '1.0 Essence');
});

// 3. Ancienne plaque (FNI) avec département, rubriques sans points (P1, D1), bruit autour, utilitaire
test('Peugeot Partner ancienne plaque 33, texte bruité', () => {
  const txt =
    'PREFECTURE DE LA GIRONDE\n' +
    'A 1234 AB 33   B 21/11/2005\n' +
    'C1 SARL GARAGE DU CENTRE\n' +
    'D1 PEUGEOT\n' +
    'D2 5FKFWC\n' +
    'D3 PARTNER\n' +
    'E VF35FKFWC12345678\n' +
    'J1 CTTE  J3 FOURGON\n' +
    'P1 1 360  P2 55  P3 ES\n' +
    'Numero de formule 2005AB12345';
  const r = analyserCarteGrise(txt);
  assert.equal(r.plate, '1234 AB 33');
  assert.equal(r.dept, '33');
  assert.equal(r.year, 2005);
  assert.equal(r.brand, 'Peugeot');
  assert.equal(r.model, 'Partner');
  assert.equal(r.vin, 'VF35FKFWC12345678');
  assert.equal(r.cc, 1360);
  assert.equal(r.hp, 75); // 55 × 1,36 = 74,8
  assert.equal(r.genre, 'CTTE');
  assert.equal(r.body, 'utilitaire');
  assert.equal(r.owner, 'Sarl Garage Du Centre');
});

test('Texte vide : rien inventé', () => {
  const r = analyserCarteGrise(['photo floue', '']);
  assert.equal(r.found, 0);
  assert.equal(r.plate, '');
  assert.equal(r.vin, '');
});

console.log('\n' + ok + ' tests réussis');
