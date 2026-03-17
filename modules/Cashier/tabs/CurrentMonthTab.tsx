
import React from 'react';
import { useCashierCurrentMonth } from '../../../hooks/useCashier';
import { CashierReport } from '../types';
import CashierReportView from '../components/CashierReportView';
import { Loader2, Info } from 'lucide-react';


const CurrentMonthTab: React.FC = () => {
  const { data: report, isLoading, error, refetch } = useCashierCurrentMonth();

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-slate-500">Carregando fechamento atual...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center p-8 bg-rose-50 rounded-2xl border border-rose-100 max-w-md">
          <div className="bg-rose-100 text-rose-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
            <Info size={24} />
          </div>
          <h3 className="text-rose-900 font-bold mb-2">Erro ao carregar dados</h3>
          <p className="text-rose-700 text-sm mb-6">
            Não foi possível carregar as informações do caixa. Certifique-se de que as funções do banco de dados foram aplicadas.
          </p>
          <button 
            onClick={() => refetch()}
            className="bg-rose-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-rose-700 transition-colors shadow-sm"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  if (!report) return null;

  return (
    <CashierReportView 
      report={report as CashierReport} 
      title={`Mês Atual (${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })})`} 
    />
  );
};


export default CurrentMonthTab;
