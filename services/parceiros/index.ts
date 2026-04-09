import { partnersActions } from './partners';
import { addressesActions } from './addresses';
import { driversActions } from './drivers';
import { vehiclesActions } from './vehicles';
import { partnersRealtime } from './realtime';

/**
 * PARCEIROS SERVICE (Modular)
 */

export const parceirosService = {
  // Parceiros
  mapDatabaseToPartner: (dbRow: any) => partnersActions.mapDatabaseToPartner(dbRow),
  getPartners: (params?: any) => partnersActions.getPartners(params),
  createPartner: (partner: any) => partnersActions.createPartner(partner),
  updatePartner: (id: string, partner: any) => partnersActions.updatePartner(id, partner),
  deletePartner: (id: string) => partnersActions.deletePartner(id),

  // Endereços
  mapDatabaseToAddress: (dbRow: any) => addressesActions.mapDatabaseToAddress(dbRow),
  getAddresses: (partnerId: string) => addressesActions.getAddresses(partnerId),
  createAddress: (address: any) => addressesActions.createAddress(address),
  updateAddress: (id: string, address: any) => addressesActions.updateAddress(id, address),
  deleteAddress: (id: string) => addressesActions.deleteAddress(id),
  savePartnerAddress: (partnerId: string, addressData: any) => addressesActions.savePartnerAddress(partnerId, addressData),

  // Motoristas
  mapDatabaseToDriver: (dbRow: any) => driversActions.mapDatabaseToDriver(dbRow),
  getDrivers: (partnerId: string) => driversActions.getDrivers(partnerId),
  createDriver: (driver: any) => driversActions.createDriver(driver),
  updateDriver: (id: string, driver: any) => driversActions.updateDriver(id, driver),
  deleteDriver: (id: string) => driversActions.deleteDriver(id),

  // Veículos
  mapDatabaseToVehicle: (dbRow: any) => vehiclesActions.mapDatabaseToVehicle(dbRow),
  getVehicles: (partnerId: string) => vehiclesActions.getVehicles(partnerId),
  createVehicle: (vehicle: any) => vehiclesActions.createVehicle(vehicle),
  updateVehicle: (id: string, vehicle: any) => vehiclesActions.updateVehicle(id, vehicle),
  deleteVehicle: (id: string) => vehiclesActions.deleteVehicle(id),

  // Realtime
  subscribeRealtime: (callback: () => void) => partnersRealtime.subscribe(callback),

  // Cache (Centralizado)
  clearCache: (partnerId?: string) => {
    driversActions.clearCache(partnerId);
  }
};

export * from './types';
