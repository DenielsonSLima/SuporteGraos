
import React, { useEffect, useState } from 'react';
import { CashierCache } from '../../../services/cashierCache';
import { CashierReport } from '../types';
import CashierReportView from '../components/CashierReportView';
import { Loader2 } from 'lucide-react';

const CurrentMonthTab: React.FC = () => {
  const [report, setReport] = useState<CashierReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Carrega do cache (instantâneo se cache HIT)
    const fetchReport = async () => {
      setReport(CashierCache.getCurrentMonthReport());
      setLoading(false);
    };
    fetchReport();
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-slate-500">Calculando fechamento atual...</p>
        </div>
      </div>
    );
  }

  if (!report) return null;

  return (
    <CashierReportView 
      report={report} 
      title={`Mês Atual (${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })})`} 
    />
  );
};

export default CurrentMonthTab;
