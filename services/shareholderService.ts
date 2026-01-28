import { logService } from './logService';
import { authService } from './authService';
import { financialActionService } from './financialActionService';
import { supabase } from './supabase';
import { waitForInit } from './supabaseInitService';
import { Persistence } from './persistence';
import { Shareholder, ShareholderTransaction, ShareholderRecurrence } from './shareholder/types';
import { formatCurrency } from './shareholder/utils';
import { shareholderSupabaseSync } from './shareholder/supabaseSyncService';

// Re-export types
export type { Shareholder, ShareholderTransaction, ShareholderRecurrence } from './shareholder/types';

// Initial Mock Data
let _shareholders: Shareholder[] = [];
let _isSupabaseLoaded = false;
const _shareholdersDb = new Persistence<Shareholder>('shareholders', []);

// Load from Supabase
const loadFromSupabase = async () => {
  try {
    const stats = await waitForInit();

    if (!stats.data.shareholders || !stats.data.shareholderTransactions) {
      throw new Error('Shareholders ou Transactions não carregadas');
    }

    // Map shareholders with their transactions
    const mapped: Shareholder[] = stats.data.shareholders.map((s: any) => {
      const transactions: ShareholderTransaction[] = (stats.data.shareholderTransactions || [])
        .filter((t: any) => t.shareholder_id === s.id)
        .map((t: any) => ({
          id: t.id,
          date: t.date,
          type: t.type,
          value: parseFloat(t.value),
          description: t.description,
          accountId: t.account_name || undefined
        }));

      return {
        id: s.id,
        name: s.name,
        cpf: s.cpf || '',
        email: s.email || '',
        phone: s.phone || '',
        address: {
          street: s.address_street || '',
          number: s.address_number || '',
          neighborhood: s.address_neighborhood || '',
          city: s.address_city || '',
          state: s.address_state || '',
          zip: s.address_zip || ''
        },
        financial: {
          proLaboreValue: parseFloat(s.pro_labore_value) || 0,
          currentBalance: parseFloat(s.current_balance) || 0,
          lastProLaboreDate: s.last_pro_labore_date || undefined,
          recurrence: {
            active: s.recurrence_active || false,
            amount: parseFloat(s.recurrence_amount) || 0,
            day: s.recurrence_day || 1,
            lastGeneratedMonth: s.recurrence_last_generated_month || undefined
          },
          history: transactions
        }
      };
    });

    _shareholdersDb.setAll(mapped);
    _shareholders = mapped;
    _isSupabaseLoaded = true;

  } catch (error) {
    console.warn('⚠️ ShareholderService: Usando fallback:', error);
    _shareholders = [];
    _isSupabaseLoaded = false;
  }
};

// Initialize on module load
loadFromSupabase();

const getLogInfo = () => {
  const user = authService.getCurrentUser();
  return {
    userId: user?.id || 'system',
    userName: user?.name || 'Sistema'
  };
};

export const shareholderService = {
  getAll: () => {
    // Simula verificação de recorrência ao ler dados (Trigger)
    shareholderService.checkAndGenerateRecurring();
    return _shareholders;
  },

  subscribe: (callback: (items: Shareholder[]) => void) => _shareholdersDb.subscribe(callback),

  add: async (shareholder: Shareholder) => {
    if (!shareholder.financial) {
      shareholder.financial = { proLaboreValue: 0, currentBalance: 0, history: [] };
    }
    // Inicializa recorrência vazia
    shareholder.financial.recurrence = { active: false, amount: 0, day: 1 };
    
    _shareholders = [..._shareholders, shareholder];
    _shareholdersDb.setAll(_shareholders);

    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId, userName, action: 'create', module: 'Financeiro',
      description: `Cadastrou novo sócio: ${shareholder.name}`,
      entityId: shareholder.id
    });

    // Save to Supabase (background)
    if (_isSupabaseLoaded) {
      Promise.resolve().then(() => shareholderSupabaseSync.syncInsertShareholder(shareholder));
    }
  },

  update: async (updated: Shareholder) => {
    _shareholders = _shareholders.map(s => s.id === updated.id ? updated : s);
    _shareholdersDb.setAll(_shareholders);
    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId, userName, action: 'update', module: 'Financeiro',
      description: `Atualizou dados do sócio: ${updated.name}`,
      entityId: updated.id
    });

    // Update in Supabase (background)
    if (_isSupabaseLoaded) {
      Promise.resolve().then(() => shareholderSupabaseSync.syncUpdateShareholder(updated));
    }
  },

  delete: async (id: string) => {
    const s = _shareholders.find(s => s.id === id);
    _shareholders = _shareholders.filter(s => s.id !== id);
    _shareholdersDb.setAll(_shareholders);
    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId, userName, action: 'delete', module: 'Financeiro',
      description: `Removeu sócio: ${s?.name || 'Desconhecido'}`,
      entityId: id
    });

    // Delete from Supabase (background)
    if (_isSupabaseLoaded) {
      Promise.resolve().then(() => shareholderSupabaseSync.syncDeleteShareholder(id));
    }
  },

  // --- Financial Methods ---

  // Agora suporta payImmediately para criar o par Crédito + Débito
  addTransaction: async (shareholderId: string, transaction: Omit<ShareholderTransaction, 'id'>, payImmediatelyData?: { accountId: string, accountName: string }) => {
    const shareholder = _shareholders.find(s => s.id === shareholderId);
    if (!shareholder) return;

    // 1. Cria a transação original (ex: Crédito de Pro-Labore)
    const newTx: ShareholderTransaction = {
      ...transaction,
      id: Math.random().toString(36).substr(2, 9)
    };
    
    shareholder.financial.currentBalance += transaction.value;
    shareholder.financial.history = [newTx, ...shareholder.financial.history];

    // Save transaction to Supabase (background)
    if (_isSupabaseLoaded) {
      Promise.resolve().then(() => 
        shareholderSupabaseSync.syncInsertTransaction(shareholderId, newTx)
      );
    }

    // 2. Se for "Lançar e Baixar", cria o débito imediatamente
    if (transaction.type === 'credit' && payImmediatelyData) {
        const withdrawalTx: ShareholderTransaction = {
            id: Math.random().toString(36).substr(2, 9),
            date: transaction.date,
            type: 'debit',
            value: transaction.value,
            description: `Retirada Imediata (Ref: ${transaction.description})`,
            accountId: payImmediatelyData.accountName
        };

        shareholder.financial.currentBalance -= transaction.value;
        shareholder.financial.history = [withdrawalTx, ...shareholder.financial.history];

        // Save withdrawal to Supabase (background)
        if (_isSupabaseLoaded) {
          Promise.resolve().then(() => 
            shareholderSupabaseSync.syncInsertTransaction(shareholderId, withdrawalTx)
          );
        }

        // Lança no financeiro global
        financialActionService.processRecord(`imm-${withdrawalTx.id}`, {
            date: transaction.date,
            amount: transaction.value,
            discount: 0,
            accountId: payImmediatelyData.accountId,
            accountName: payImmediatelyData.accountName,
            notes: `Pagamento Sócio: ${shareholder.name} - ${transaction.description}`,
            isAsset: false,
            entityName: shareholder.name
        }, 'shareholder');
    }

    _shareholders = _shareholders.map(s => s.id === shareholderId ? shareholder : s);
    _shareholdersDb.setAll(_shareholders);

    // Update balance in Supabase (background)
    if (_isSupabaseLoaded) {
      Promise.resolve().then(() => 
        shareholderSupabaseSync.syncUpdateBalance(shareholderId, shareholder.financial.currentBalance)
      );
    }

    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId, userName, action: transaction.type === 'credit' ? 'create' : 'approve', module: 'Financeiro',
      description: `Lançamento ${transaction.type === 'credit' ? 'Crédito' : 'Débito'} para ${shareholder.name}: ${formatCurrency(transaction.value)}`,
      entityId: shareholder.id
    });
  },

  updateTransaction: async (shareholderId: string, updatedTx: ShareholderTransaction) => {
    const shareholder = _shareholders.find(s => s.id === shareholderId);
    if (!shareholder) return;

    shareholder.financial.history = shareholder.financial.history.map(t => 
      t.id === updatedTx.id ? updatedTx : t
    );

    // Recalcula Saldo
    const totalCredits = shareholder.financial.history.filter(t => t.type === 'credit').reduce((acc, t) => acc + t.value, 0);
    const totalDebits = shareholder.financial.history.filter(t => t.type === 'debit').reduce((acc, t) => acc + t.value, 0);
    shareholder.financial.currentBalance = totalCredits - totalDebits;

    _shareholders = _shareholders.map(s => s.id === shareholderId ? shareholder : s);
    _shareholdersDb.setAll(_shareholders);

    // Sync to Supabase (background)
    if (_isSupabaseLoaded) {
      Promise.resolve().then(() => {
        shareholderSupabaseSync.syncUpdateTransaction(shareholderId, updatedTx);
        shareholderSupabaseSync.syncUpdateBalance(shareholderId, shareholder.financial.currentBalance);
      });
    }
  },

  deleteTransaction: async (shareholderId: string, txId: string) => {
    const shareholder = _shareholders.find(s => s.id === shareholderId);
    if (!shareholder) return;

    shareholder.financial.history = shareholder.financial.history.filter(t => t.id !== txId);
    
    // Recalcula Saldo
    const totalCredits = shareholder.financial.history.filter(t => t.type === 'credit').reduce((acc, t) => acc + t.value, 0);
    const totalDebits = shareholder.financial.history.filter(t => t.type === 'debit').reduce((acc, t) => acc + t.value, 0);
    shareholder.financial.currentBalance = totalCredits - totalDebits;

    _shareholders = _shareholders.map(s => s.id === shareholderId ? shareholder : s);
    _shareholdersDb.setAll(_shareholders);

    // Sync to Supabase (background)
    if (_isSupabaseLoaded) {
      Promise.resolve().then(() => {
        shareholderSupabaseSync.syncDeleteTransaction(txId);
        shareholderSupabaseSync.syncUpdateBalance(shareholderId, shareholder.financial.currentBalance);
      });
    }
  },

  // --- Recorrência ---

  updateRecurrence: (shareholderId: string, config: ShareholderRecurrence) => {
    const shareholder = _shareholders.find(s => s.id === shareholderId);
    if (!shareholder) return;
    
    // Preserva o histórico de geração se não for passado
    const lastGen = shareholder.financial.recurrence?.lastGeneratedMonth;
    shareholder.financial.recurrence = { ...config, lastGeneratedMonth: lastGen };
    
    _shareholders = _shareholders.map(s => s.id === shareholderId ? shareholder : s);
    _shareholdersDb.setAll(_shareholders);
    
    const { userId, userName } = getLogInfo();
    logService.addLog({
        userId, userName, action: 'update', module: 'Financeiro',
        description: `Configurou recorrência para ${shareholder.name}: ${formatCurrency(config.amount)}`,
        entityId: shareholderId
    });
  },

  checkAndGenerateRecurring: () => {
    const today = new Date();
    const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const dayOfMonth = today.getDate();

    _shareholders.forEach(s => {
        const rec = s.financial.recurrence;
        if (rec && rec.active && rec.amount > 0) {
            // Se ainda não gerou este mês E hoje é >= dia agendado
            if (rec.lastGeneratedMonth !== currentMonthKey && dayOfMonth >= rec.day) {
                // Gera o crédito automático
                const tx: ShareholderTransaction = {
                    id: Math.random().toString(36).substr(2, 9),
                    date: new Date().toISOString().split('T')[0],
                    type: 'credit',
                    value: rec.amount,
                    description: `Crédito Recorrente Automático - ${new Date().toLocaleDateString('pt-BR', { month: 'long' })}`
                };
                
                s.financial.history = [tx, ...s.financial.history];
                s.financial.currentBalance += rec.amount;
                s.financial.recurrence!.lastGeneratedMonth = currentMonthKey;

                // Log silencioso (sistema)
                console.log(`[Auto] Crédito gerado para ${s.name}`);
            }
        }
    });
  },

  updateProLabore: (shareholderId: string, value: number) => {
    // Mantido para compatibilidade, mas agora updateRecurrence é preferível
    const shareholder = _shareholders.find(s => s.id === shareholderId);
    if (!shareholder) return;
    shareholder.financial.proLaboreValue = value;
    _shareholders = [..._shareholders];
    _shareholdersDb.setAll(_shareholders);
  },

  importData: (data: Shareholder[]) => {
    _shareholders = data;
    _shareholdersDb.setAll(data);
  }
};
