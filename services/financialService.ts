
import { BankAccount } from '../modules/Financial/types';
import { purchaseService } from './purchaseService';
import { salesService } from './salesService';
import { loadingService } from './loadingService';
import { financialActionService } from './financialActionService';
import { transfersService } from './financial/transfersService';
import { bankAccountService } from './bankAccountService';
import { initialBalanceService } from './initialBalanceService';
import { expenseCategoryService } from './expenseCategoryService';

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
    if (bankAccounts && bankAccountService.importData) bankAccountService.importData(bankAccounts);
    if (initialBalances && initialBalanceService.importData) initialBalanceService.importData(initialBalances);
    if (expenseCategories && expenseCategoryService.importData) expenseCategoryService.importData(expenseCategories);
  },

  /**
   * Retorna todas as contas ativas com seus respectivos saldos reais
   * calculados a partir de todas as transações do ERP.
   * FONTE DE VERDADE: Standalone History (histórico consolidado)
   */
  getBankAccountsWithBalances: (): BankAccountWithBalance[] => {
    const accounts = bankAccountService.getBankAccounts();
    const initialBalances = initialBalanceService.getInitialBalances();
    const standaloneRecords = financialActionService.getStandaloneRecords();
    const transfers = transfersService.getAll();

    return accounts.map((account: BankAccount) => {
      // 1. Inicia com o Saldo de Implantação
      const initRecord = initialBalances.find((b: any) => b.accountId === account.id);
      let balance = initRecord ? initRecord.value : 0;

      // 2. Soma Créditos / Subtrai Débitos do Histórico Consolidado
      // Toda baixa de Compra, Venda ou Frete gera um registro aqui.
      standaloneRecords.forEach((r: any) => {
        if (r.status !== 'paid') return;
        if (r.bankAccount === account.id || r.bankAccount === account.bankName) {
           const isCredit = ['sales_order', 'receipt', 'loan_taken', 'Venda de Ativo'].includes(r.subType || '') || r.category === 'Venda de Ativo';
           if (isCredit) balance += r.paidValue;
           else balance -= r.paidValue;
        }
      });

      // 3. Processa Transferências
      transfers.forEach((tr: any) => {
        if (tr.fromAccountId === account.id) balance -= tr.amount;
        if (tr.toAccountId === account.id) balance += tr.amount;
      });

      return { ...account, currentBalance: balance };
    });
  }
};


