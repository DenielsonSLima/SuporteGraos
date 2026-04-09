import { Vehicle as _Vehicle } from './types';
import { vehicleStore } from './store';
import { vehicleLoader } from './loader';
import { vehicleActions } from './actions';
import { vehicleRealtime } from './realtime';

export type Vehicle = _Vehicle;

export const vehicleService = {
  getAll: () => vehicleStore.getAll(),
  getById: (id: string) => vehicleStore.getById(id),
  getActive: () => vehicleStore.find(v => v.active),
  getByType: (type: _Vehicle['type']) => vehicleStore.find(v => v.type === type && v.active),
  getByOwnerPartner: (partnerId: string) => vehicleStore.find(v => v.owner_type === 'third_party' && v.owner_partner_id === partnerId && v.active),
  getByOwnerTransporter: (transporterId: string) => vehicleStore.find(v => v.owner_type === 'own' && v.owner_transporter_id === transporterId && v.active),
  subscribe: (callback: (items: _Vehicle[]) => void) => vehicleStore.subscribe(callback),
  
  ...vehicleLoader,
  ...vehicleActions,
  ...vehicleRealtime,
};
