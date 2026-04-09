/**
 * SALES SERVICE (Barrel Export)
 * Este arquivo atua como uma fachada para o novo Sales Service modularizado.
 * Mantém total retrocompatibilidade com as importações existentes.
 */

export { salesService } from './sales/index';
export type { SalesOrder, SalesTransaction, SalesStatus } from '../modules/SalesOrder/types';
