
import React, { useState } from 'react';
import { Wallet, History } from 'lucide-react';
import CurrentMonthTab from './tabs/CurrentMonthTab';
import HistoryTab from './tabs/HistoryTab';

const CashierModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');

  return (
    <div className="space-y-6">
      
      {/* Tabs Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-1 flex">
        <button
          onClick={() => setActiveTab('current')}
          className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
            activeTab === 'current' 
              ? 'bg-slate-800 text-white shadow-md' 
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
          }`}
        >
          <Wallet size={18} />
          Fechamento Atual (Mês Vigente)
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
            activeTab === 'history' 
              ? 'bg-slate-800 text-white shadow-md' 
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
          }`}
        >
          <History size={18} />
          Histórico de Meses Anteriores
        </button>
      </div>

      {/* Content Area */}
      <div className="min-h-[600px]">
        {activeTab === 'current' ? <CurrentMonthTab /> : <HistoryTab />}
      </div>

    </div>
  );
};

export default CashierModule;
