// Lecture automatique de la carte grise (OCR).
//
// IMPORTANT : la reconnaissance de texte sur une photo demande un module natif
// (par exemple ML Kit de Google ou Vision d'Apple). Ces modules NE SONT PAS dans Expo Go.
// Pour l'instant cette fonction renvoie donc toujours `null` et le garagiste remplit
// le formulaire à la main en regardant la photo.
//
// Plus tard, dans une version compilée (eas build), on pourra brancher ici un module
// d'OCR et renvoyer les champs trouvés. Le formulaire véhicule appelle déjà cette
// fonction après chaque photo et remplit les champs vides avec ce qu'elle renvoie.

export type CarteGrise = {
  plate?: string; // A : immatriculation
  brand?: string; // D.1 : marque
  model?: string; // D.3 : dénomination commerciale
  vin?: string; // E : numéro VIN
  year?: number; // B : date de 1re immatriculation (année)
  owner?: string; // C.1 : titulaire
};

export async function lireCarteGrise(_uri: string): Promise<CarteGrise | null> {
  return null; // pas d'OCR dans Expo Go (voir le commentaire ci-dessus)
}
