import { Persistence } from '../persistence';
import { Driver } from './types';

const INITIAL_DATA: Driver[] = [];
export const driverStore = new Persistence<Driver>('drivers', INITIAL_DATA);
