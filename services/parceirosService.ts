/**
 * PARCEIROS SERVICE (Barrel Export)
 * Este arquivo atua como uma fachada para o novo Parceiros Service modularizado.
 * Mantém total retrocompatibilidade com as importações existentes.
 */

export { parceirosService } from './parceiros/index';
export type { 
  Partner, PartnerAddress, Driver, Vehicle, SavePartnerAddressData 
} from './parceiros/types';
