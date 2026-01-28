/**
 * SERVIÇO DE INICIALIZAÇÃO SUPABASE - FASE 1 + FASE 2
 * Carrega todos os dados da Fase 1 e Fase 2 em paralelo para máxima performance
 */

import { supabase } from './supabase';
import { transporterService } from './transporterService';
import { vehicleService } from './vehicleService';
import { driverService } from './driverService';

interface InitStats {
  totalTime: number;
  tablesLoaded: number;
  errors: string[];
  data: {
    ufs?: any[];
    cities?: any[];
    partnerTypes?: any[];
    productTypes?: any[];
    bankAccounts?: any[];
    initialBalances?: any[];
    expenseTypes?: any[];
    expenseCategories?: any[];
    costCenters?: any[];
    shareholders?: any[];
    shareholderTransactions?: any[];
    transporters?: any[];
    vehicles?: any[];
    drivers?: any[];
    partners?: any[];
  };
}

let _isInitialized = false;
let _initPromise: Promise<InitStats> | null = null;

/**
 * Carrega TODOS os dados da Fase 1 + Fase 2 em uma única chamada paralela
 * Muito mais rápido que carregar sequencialmente em cada serviço
 */
export const initializeSupabaseData = async (): Promise<InitStats> => {
  // Se já está inicializando, retorna a mesma promise
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const startTime = performance.now();

    const stats: InitStats = {
      totalTime: 0,
      tablesLoaded: 0,
      errors: [],
      data: {}
    };

    try {
      // CARREGAMENTO PARALELO - Todas as queries ao mesmo tempo!
      const [
        ufsResult,
        citiesResult,
        partnerTypesResult,
        productTypesResult,
        bankAccountsResult,
        initialBalancesResult,
        expenseTypesResult,
        expenseCategoriesResult,
        shareholdersResult,
        shareholderTransactionsResult,
        transportersResult,
        vehiclesResult,
        driversResult,
        partnersResult
      ] = await Promise.allSettled([
        supabase.from('ufs').select('id, uf, name, code').order('code'),
        supabase.from('cities').select('id, name, uf_id, code').order('name'),
        supabase.from('partner_types').select('id, name, description, is_system').order('name'),
        supabase.from('product_types').select('id, name, description, is_system').order('name'),
        supabase.from('contas_bancarias').select('id, bank_name, owner, agency, account_number, account_type, active').eq('active', true).order('bank_name'),
        supabase.from('initial_balances').select('*').order('date'),
        supabase.from('expense_types').select('*').order('id'),
        supabase.from('expense_categories').select('*').order('expense_type_id, name'),
        supabase.from('shareholders').select('*').order('name'),
        supabase.from('shareholder_transactions').select('*').order('date', { ascending: false }),
        supabase.from('transporters').select('*').order('name'),
        supabase.from('vehicles').select('*').order('plate'),
        supabase.from('drivers').select('*').order('name'),
        supabase.from('partners').select('*').order('name')
      ]);

      // Processar UFs
      if (ufsResult.status === 'fulfilled' && !ufsResult.value.error) {
        stats.data.ufs = ufsResult.value.data || [];
      } else {
        stats.errors.push('UFs: ' + (ufsResult.status === 'rejected' ? ufsResult.reason : (ufsResult.value as any).error?.message));
      }

      // Processar Cities
      if (citiesResult.status === 'fulfilled' && !citiesResult.value.error) {
        stats.data.cities = citiesResult.value.data || [];
        stats.tablesLoaded++;

      } else {
        stats.errors.push('Cities: ' + (citiesResult.status === 'rejected' ? citiesResult.reason : (citiesResult.value as any).error?.message));
      }

      // Processar Partner Types
      if (partnerTypesResult.status === 'fulfilled' && !partnerTypesResult.value.error) {
        stats.data.partnerTypes = partnerTypesResult.value.data || [];
        stats.tablesLoaded++;

      } else {
        stats.errors.push('PartnerTypes: ' + (partnerTypesResult.status === 'rejected' ? partnerTypesResult.reason : (partnerTypesResult.value as any).error?.message));
      }

      // Processar Product Types
      if (productTypesResult.status === 'fulfilled' && !productTypesResult.value.error) {
        stats.data.productTypes = productTypesResult.value.data || [];
        stats.tablesLoaded++;

      } else {
        stats.errors.push('ProductTypes: ' + (productTypesResult.status === 'rejected' ? productTypesResult.reason : (productTypesResult.value as any).error?.message));
      }

      // Processar Bank Accounts
      if (bankAccountsResult.status === 'fulfilled' && !bankAccountsResult.value.error) {
        stats.data.bankAccounts = bankAccountsResult.value.data || [];
        stats.tablesLoaded++;

      } else {
        stats.errors.push('BankAccounts: ' + (bankAccountsResult.status === 'rejected' ? bankAccountsResult.reason : (bankAccountsResult.value as any).error?.message));
      }

      // Processar Initial Balances
      if (initialBalancesResult.status === 'fulfilled' && !initialBalancesResult.value.error) {
        stats.data.initialBalances = initialBalancesResult.value.data || [];
        stats.tablesLoaded++;

      } else {
        stats.errors.push('InitialBalances: ' + (initialBalancesResult.status === 'rejected' ? initialBalancesResult.reason : (initialBalancesResult.value as any).error?.message));
      }

      // Processar Expense Types
      if (expenseTypesResult.status === 'fulfilled' && !expenseTypesResult.value.error) {
        stats.data.expenseTypes = expenseTypesResult.value.data || [];
        stats.tablesLoaded++;

      } else {
        stats.errors.push('ExpenseTypes: ' + (expenseTypesResult.status === 'rejected' ? expenseTypesResult.reason : (expenseTypesResult.value as any).error?.message));
      }

      // Processar Expense Categories
      if (expenseCategoriesResult.status === 'fulfilled' && !expenseCategoriesResult.value.error) {
        stats.data.expenseCategories = expenseCategoriesResult.value.data || [];
        stats.tablesLoaded++;

      } else {
        stats.errors.push('ExpenseCategories: ' + (expenseCategoriesResult.status === 'rejected' ? expenseCategoriesResult.reason : (expenseCategoriesResult.value as any).error?.message));
      }

      // Processar Shareholders
      if (shareholdersResult.status === 'fulfilled' && !shareholdersResult.value.error) {
        stats.data.shareholders = shareholdersResult.value.data || [];
        stats.tablesLoaded++;

      } else {
        stats.errors.push('Shareholders: ' + (shareholdersResult.status === 'rejected' ? shareholdersResult.reason : (shareholdersResult.value as any).error?.message));
      }

      // Processar Shareholder Transactions
      if (shareholderTransactionsResult.status === 'fulfilled' && !shareholderTransactionsResult.value.error) {
        stats.data.shareholderTransactions = shareholderTransactionsResult.value.data || [];
        stats.tablesLoaded++;

      } else {
        stats.errors.push('ShareholderTransactions: ' + (shareholderTransactionsResult.status === 'rejected' ? shareholderTransactionsResult.reason : (shareholderTransactionsResult.value as any).error?.message));
      }

      // ============= FASE 2: PARCEIROS =============

      // Processar Transporters
      if (transportersResult.status === 'fulfilled' && !transportersResult.value.error) {
        stats.data.transporters = transportersResult.value.data || [];
        stats.tablesLoaded++;

      } else {
        stats.errors.push('Transporters: ' + (transportersResult.status === 'rejected' ? transportersResult.reason : (transportersResult.value as any).error?.message));
      }

      // Processar Vehicles
      if (vehiclesResult.status === 'fulfilled' && !vehiclesResult.value.error) {
        stats.data.vehicles = vehiclesResult.value.data || [];
        stats.tablesLoaded++;

      } else {
        stats.errors.push('Vehicles: ' + (vehiclesResult.status === 'rejected' ? vehiclesResult.reason : (vehiclesResult.value as any).error?.message));
      }

      // Processar Drivers
      if (driversResult.status === 'fulfilled' && !driversResult.value.error) {
        stats.data.drivers = driversResult.value.data || [];
        stats.tablesLoaded++;

      } else {
        stats.errors.push('Drivers: ' + (driversResult.status === 'rejected' ? driversResult.reason : (driversResult.value as any).error?.message));
      }

      // Processar Partners
      if (partnersResult.status === 'fulfilled' && !partnersResult.value.error) {
        stats.data.partners = partnersResult.value.data || [];
        stats.tablesLoaded++;

      } else {
        stats.errors.push('Partners: ' + (partnersResult.status === 'rejected' ? partnersResult.reason : (partnersResult.value as any).error?.message));
      }

      const endTime = performance.now();
      stats.totalTime = endTime - startTime;

      _isInitialized = true;


      
      if (stats.errors.length > 0) {
        console.warn('⚠️ Erros durante carregamento:', stats.errors);
      }

    } catch (error) {
      console.error('❌ Erro crítico no carregamento:', error);
      stats.errors.push('Erro crítico: ' + (error as Error).message);
    }

    return stats;
  })();

  return _initPromise;
};

/**
 * Verifica se já foi inicializado
 */
export const isSupabaseInitialized = () => _isInitialized;

/**
 * Força reinicialização (útil para refresh)
 */
export const resetSupabaseInit = () => {
  _isInitialized = false;
  _initPromise = null;
};

/**
 * Aguarda inicialização se necessário
 */
export const waitForInit = async (): Promise<InitStats> => {
  if (_isInitialized && _initPromise) {
    return _initPromise;
  }
  return initializeSupabaseData();
};
