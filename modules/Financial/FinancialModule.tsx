
import React, { useState } from 'react';
import { 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Landmark, 
  Briefcase, 
  Users, 
  ArrowRightLeft,
  History,
  HandCoins,
  TrendingUp
} from 'lucide-react';

// Import Tabs
import PayablesTab from './Payables/PayablesTab';
import ReceivablesTab from './Receivables/ReceivablesTab';
import LoansTab from './Loans/LoansTab';
import AdminExpensesTab from './AdminExpenses/AdminExpensesTab';
import ShareholdersTab from './Shareholders/ShareholdersTab';
import TransfersTab from './Transfers/TransfersTab';
import HistoryTab from './History/HistoryTab';
import AdvancesTab from './Advances/AdvancesTab';
import CreditsTab from './Credits/CreditsTab';

// --- CONFIGURATION ---
const FINANCIAL_MODULES = [
  {
    id: 'payables',
    label: 'Contas a Pagar',
    icon: ArrowDownCircle,
    component: PayablesTab,
    color: 'bg-rose-100 text-rose-600 border-rose-200',
    activeBorder: 'border-rose-500',
    description: 'Gestão de saídas'
  },
  {
    id: 'receivables',
    label: 'Contas a Receber',
    icon: ArrowUpCircle,
    component: ReceivablesTab,
    color: 'bg-emerald-100 text-emerald-600 border-emerald-200',
    activeBorder: 'border-emerald-500',
    description: 'Gestão de entradas'
  },
  {
    id: 'advances',
    label: 'Adiantamentos',
    icon: HandCoins,
    component: AdvancesTab,
    color: 'bg-cyan-100 text-cyan-600 border-cyan-200',
    activeBorder: 'border-cyan-500',
    description: 'Saldos de parceiros'
  },
  {
    id: 'credits',
    label: 'Créditos',
    icon: TrendingUp,
    component: CreditsTab,
    color: 'bg-emerald-100 text-emerald-600 border-emerald-200',
    activeBorder: 'border-emerald-500',
    description: 'Outros créditos somente'
  },
  {
    id: 'transfers',
    label: 'Transferências',
    icon: ArrowRightLeft,
    component: TransfersTab,
    color: 'bg-violet-100 text-violet-600 border-violet-200',
    activeBorder: 'border-violet-500',
    description: 'Movimentação interna'
  },
  {
    id: 'loans',
    label: 'Empréstimos',
    icon: Landmark,
    component: LoansTab,
    color: 'bg-blue-100 text-blue-600 border-blue-200',
    activeBorder: 'border-blue-500',
    description: 'Contratos bancários'
  },
  {
    id: 'admin',
    label: 'Despesas', // Changed from 'Despesas Adm.'
    icon: Briefcase,
    component: AdminExpensesTab,
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    activeBorder: 'border-slate-500',
    description: 'Fixas, Variáveis e Adm.' // Updated description
  },
  {
    id: 'shareholders',
    label: 'Sócios',
    icon: Users,
    component: ShareholdersTab,
    color: 'bg-indigo-100 text-indigo-600 border-indigo-200',
    activeBorder: 'border-indigo-500',
    description: 'Aportes e retiradas'
  },
  {
    id: 'history',
    label: 'Histórico Geral',
    icon: History,
    component: HistoryTab,
    color: 'bg-orange-100 text-orange-600 border-orange-200',
    activeBorder: 'border-orange-500',
    description: 'Extrato completo'
  }
];

const FinancialModule: React.FC = () => {
  const [activeTabId, setActiveTabId] = useState<string>(FINANCIAL_MODULES[0].id);

  // Find the active component based on state
  const activeModule = FINANCIAL_MODULES.find(m => m.id === activeTabId) || FINANCIAL_MODULES[0];
  const ActiveComponent = activeModule.component;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Financeiro</h2>
          <p className="text-slate-500">Gestão completa de fluxo de caixa e obrigações.</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-slate-600 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>

      {/* Grid Navigation (2 Rows) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {FINANCIAL_MODULES.map((module) => (
          <button
            key={module.id}
            onClick={() => setActiveTabId(module.id)}
            className={`
              relative flex flex-col items-start p-4 rounded-xl border transition-all duration-200
              ${activeTabId === module.id 
                ? `bg-white shadow-md ring-1 ring-inset ring-opacity-50 ${module.activeBorder} border-transparent` 
                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'}
            `}
          >
            <div className={`p-2 rounded-lg mb-3 ${module.color}`}>
              <module.icon size={20} />
            </div>
            <div className="text-left">
              <span className={`block font-bold text-sm ${activeTabId === module.id ? 'text-slate-800' : 'text-slate-600'}`}>
                {module.label}
              </span>
              <span className="text-xs text-slate-400 font-medium line-clamp-1">
                {module.description}
              </span>
            </div>
            
            {/* Active Indicator Bar */}
            {activeTabId === module.id && (
              <div className={`absolute bottom-0 left-4 right-4 h-1 rounded-t-full ${module.color.split(' ')[0].replace('bg-', 'bg-')}`} />
            )}
          </button>
        ))}
      </div>

      {/* Active Tab Content */}
      <div className="min-h-[500px] animate-in slide-in-from-bottom-2 duration-300">
        <ActiveComponent />
      </div>

    </div>
  );
};

export default FinancialModule;
