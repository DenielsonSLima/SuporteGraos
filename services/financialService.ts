
import { BankAccount } from '../modules/Financial/types';
import { purchaseService } from './purchaseService';
import { salesService } from './salesService';
import { loadingService } from './loadingService';
import { financialActionService } from './financialActionService';
import { transfersService } from './financial/transfersService';
import { bankAccountService } from './bankAccountService';
import { initialBalanceService } from './initialBalanceService';
import { expenseCategoryService } from './expenseCategoryService';
import { ledgerService } from './ledgerService';

// --- RE-EXPORT FROM SPECIALIZED SERVICES ---
export { bankAccountService } from './bankAccountService';
export { initialBalanceService } from './initialBalanceService';
export { expenseCategoryService, getCategoryIcon } from './expenseCategoryService';
export type { BankAccount } from '../modules/Financial/types';
export type { ExpenseCategory, ExpenseSubtype } from './expenseCategoryService';
export type { InitialBalanceRecord } from './initialBalanceService';

// --- INTERFACES ---
export interface BankAccountWithBalance extends BankAccount {
  currentBalance: number;
}

// Core service: agregador de cálculos e compatibilidade backward
export const financialService = {
  // --- CONTA BANCÁRIAS (compatibilidade via bankAccountService) ---
  getBankAccounts: () => bankAccountService.getBankAccounts(),

  addBankAccount: async (account: BankAccount) => bankAccountService.addBankAccount(account),

  updateBankAccount: async (account: BankAccount) => bankAccountService.updateBankAccount(account),

  deleteBankAccount: async (id: string) => bankAccountService.deleteBankAccount(id),

  isAccountInUse: (accountId: string) => bankAccountService.isAccountInUse(accountId),

  subscribeBankAccounts: (callback: (items: BankAccount[]) => void) => bankAccountService.subscribe(callback),

  // --- SALDOS INICIAIS (compatibilidade via initialBalanceService) ---
  getInitialBalances: () => initialBalanceService.getInitialBalances(),

  addInitialBalance: async (balance: any) => initialBalanceService.addInitialBalance(balance),

  removeInitialBalance: async (id: string) => initialBalanceService.removeInitialBalance(id),

  subscribeInitialBalances: (callback: (items: any[]) => void) => initialBalanceService.subscribe(callback),

  // --- CATEGORIAS DE DESPESA (compatibilidade via expenseCategoryService) ---
  getExpenseCategories: () => expenseCategoryService.getExpenseCategories(),

  addCategory: async (category: any) => expenseCategoryService.addCategory(category),

  updateCategory: async (category: any) => expenseCategoryService.updateCategory(category),

  deleteCategory: async (id: string) => expenseCategoryService.deleteCategory(id),

  isExpenseSubtypeInUse: (subtypeName: string) => expenseCategoryService.isExpenseSubtypeInUse(subtypeName),

  subscribeExpenseCategories: (callback: (items: any[]) => void) => expenseCategoryService.subscribe(callback),

  // --- IMPORTAÇÃO DE DADOS ---
  importData: (bankAccounts: BankAccount[], initialBalances: any[], expenseCategories?: any[]) => {
    if (bankAccounts && (bankAccountService as any).importData) (bankAccountService as any).importData(bankAccounts);
    if (initialBalances && (initialBalanceService as any).importData) (initialBalanceService as any).importData(initialBalances);
    if (expenseCategories && (expenseCategoryService as any).importData) (expenseCategoryService as any).importData(expenseCategories);
  },

  /**
   * Retorna todas as contas ativas com seus respectivos saldos reais.
   * Foundation V2: Agora extrai do LedgerService, que usa triggers no Supabase.
   */
  getBankAccountsWithBalances: (): BankAccountWithBalance[] => {
    const accounts = ledgerService?.getAll?.() || [];

    return (accounts || []).map((acc: any) => ({
      ...acc,
      currentBalance: acc?.currentBalance || 0
    }));
  }
};


