import type { Vehicle } from './types';
import { mkCode, newVehicleId } from './utils';

// Véhicule vide avec les valeurs par défaut
export const mkVehicle = (): Vehicle => ({
  id: newVehicleId(),
  owner: '',
  phone: '',
  brand: '',
  model: '',
  engine: '',
  hp: 0,
  body: '',
  plate: '',
  dept: '',
  vin: '',
  year: 0,
  km: 0,
  interval: 15000,
  intervalMonths: 12,
  ct: '',
  code: mkCode(),
  items: [],
  docs: [],
  dtc: [],
});
