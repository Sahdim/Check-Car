// Couleurs et mesures de l'appli (même thème sombre que « Mon Job Méca »).
export const C = {
  bg: '#000000',
  card: '#1C1C1E',
  card2: '#2C2C2E',
  text: '#FFFFFF',
  text2: 'rgba(235,235,245,0.72)',
  text3: 'rgba(235,235,245,0.45)',
  sep: 'rgba(84,84,88,0.45)',
  orange: '#FF9F0A',
  blue: '#0A84FF',
  green: '#30D158',
  yellow: '#FFD60A',
  red: '#FF453A',
  sky: '#64D2FF',
};

export const R = { card: 20, btn: 13, chip: 999 };

export type Level = 'ok' | 'warn' | 'bad';
export const levelColor = (l: Level) => (l === 'bad' ? C.red : l === 'warn' ? C.orange : C.green);
