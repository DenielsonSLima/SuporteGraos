
import React from 'react';
import { useCashierCurrentMonth } from '../../../hooks/useCashier';
import { CashierReport } from '../types';
import CashierReportView from '../components/CashierReportView';
import { Loader2 } from 'lucide-react';

const CurrentMonthTab: React.FC = () => {
  const { data: report, isLoading } = useCashierCurrentMonth();

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

  if (!report) return null;

  return (
    <CashierReportView 
      report={report as CashierReport} 
      title={`Mês Atual (${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })})`} 
    />
  );
};

export default CurrentMonthTab;
