import { Persistence } from '../persistence';
import { Vehicle } from './types';

const INITIAL_DATA: Vehicle[] = [];
export const vehicleStore = new Persistence<Vehicle>('vehicles', INITIAL_DATA);
