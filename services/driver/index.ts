import { Driver as _Driver } from './types';
import { driverStore } from './store';
import { driverLoader } from './loader';
import { driverActions } from './actions';
import { driverRealtime } from './realtime';

export type Driver = _Driver;

export const driverService = {
  getAll: () => driverStore.getAll(),
  getById: (id: string) => driverStore.getById(id),
  getActive: () => driverStore.find(d => d.active),
  getByCity: (cityId: string) => driverStore.find(d => d.city_id === cityId && d.active),
  getByState: (stateId: string) => driverStore.find(d => d.state_id === stateId && d.active),
  getByPartner: (partnerId: string) => driverStore.find(d => d.partner_id === partnerId && d.active).sort((a, b) => a.name.localeCompare(b.name)),
  subscribe: (callback: (items: _Driver[]) => void) => driverStore.subscribe(callback),
  
  ...driverLoader,
  ...driverActions,
  ...driverRealtime,
};
