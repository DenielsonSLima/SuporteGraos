
import { Driver, Vehicle } from '../modules/Partners/types';
import { Persistence } from './persistence';
import { logService } from './logService';
import { authService } from './authService';

// Dados iniciais vazios
const INITIAL_DRIVERS: Driver[] = [];
const INITIAL_VEHICLES: Vehicle[] = [];

const driversDb = new Persistence<Driver>('fleet_drivers', INITIAL_DRIVERS);
const vehiclesDb = new Persistence<Vehicle>('fleet_vehicles', INITIAL_VEHICLES);

const getLogInfo = () => {
  const user = authService.getCurrentUser();
  return {
    userId: user?.id || 'system',
    userName: user?.name || 'Sistema'
  };
};

export const fleetService = {
  // --- DRIVERS ---
  getDrivers: (partnerId: string) => {
    return driversDb.getAll()
      .filter(d => d.partnerId === partnerId)
      .sort((a, b) => a.name.localeCompare(b.name)); // Ordenação Alfabética por Nome
  },

  // Novo método para o Backup pegar TUDO
  getAllDrivers: () => {
    return driversDb.getAll()
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  addDriver: (driver: Driver) => {
    driversDb.add(driver);
    
    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId,
      userName,
      action: 'create',
      module: 'Parceiros',
      description: `Cadastrou motorista: ${driver.name}`,
      entityId: driver.id
    });
  },

  updateDriver: (driver: Driver) => {
    driversDb.update(driver);
  },

  deleteDriver: (id: string) => {
    const driver = driversDb.getById(id);
    driversDb.delete(id);

    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId,
      userName,
      action: 'delete',
      module: 'Parceiros',
      description: `Excluiu motorista: ${driver?.name || 'Desconhecido'}`,
      entityId: id
    });
  },

  // --- VEHICLES ---
  getVehicles: (partnerId: string) => {
    return vehiclesDb.getAll()
      .filter(v => v.partnerId === partnerId)
      .sort((a, b) => a.plate.localeCompare(b.plate)); // Ordenação Alfabética por Placa
  },

  // Novo método para o Backup pegar TUDO
  getAllVehicles: () => {
    return vehiclesDb.getAll()
      .sort((a, b) => a.plate.localeCompare(b.plate));
  },

  addVehicle: (vehicle: Vehicle) => {
    vehiclesDb.add(vehicle);

    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId,
      userName,
      action: 'create',
      module: 'Parceiros',
      description: `Cadastrou veículo: ${vehicle.plate}`,
      entityId: vehicle.id
    });
  },

  updateVehicle: (vehicle: Vehicle) => {
    vehiclesDb.update(vehicle);
  },

  deleteVehicle: (id: string) => {
    const vehicle = vehiclesDb.getById(id);
    vehiclesDb.delete(id);

    // Também remover o vínculo dos motoristas que usavam este veículo
    const drivers = driversDb.getAll().filter(d => d.linkedVehicleId === id);
    drivers.forEach(d => {
      driversDb.update({ ...d, linkedVehicleId: undefined });
    });

    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId,
      userName,
      action: 'delete',
      module: 'Parceiros',
      description: `Excluiu veículo: ${vehicle?.plate || 'Desconhecido'}`,
      entityId: id
    });
  },

  // --- RESTORE ---
  importData: (drivers: Driver[], vehicles: Vehicle[]) => {
    if (drivers) driversDb.setAll(drivers);
    if (vehicles) vehiclesDb.setAll(vehicles);
  }
};
