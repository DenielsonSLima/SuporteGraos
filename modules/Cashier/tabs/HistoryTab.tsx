
import React, { useState } from 'react';
import { cashierService } from '../services/cashierService';
import { CashierReport } from '../types';
import CashierReportView from '../components/CashierReportView';
import { Folder, Calendar, ArrowRight, ChevronLeft } from 'lucide-react';

const HistoryTab: React.FC = () => {
  const [history] = useState<CashierReport[]>(cashierService.getHistory());
  const [selectedReport, setSelectedReport] = useState<CashierReport | null>(null);

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  if (selectedReport) {
    return (
      <div className="animate-in slide-in-from-right-4">
        <button 
          onClick={() => setSelectedReport(null)}
          className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ChevronLeft size={16} /> Voltar para lista
        </button>
        <CashierReportView 
          report={selectedReport} 
          title={`Fechamento ${new Date(selectedReport.referenceDate).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`} 
        />
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-in fade-in">
      {history.map(report => {
        const date = new Date(report.referenceDate);
        return (
          <div 
            key={report.id}
            onClick={() => setSelectedReport(report)}
            className="group cursor-pointer bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:border-primary-300 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="bg-blue-50 p-3 rounded-lg text-blue-600 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                <Folder size={24} />
              </div>
              <div className="text-right">
                <p className="text-xs font-bold uppercase text-slate-400">Saldo Final</p>
                <p className={`font-bold text-lg ${report.netBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {currency(report.netBalance)}
                </p>
              </div>
            </div>
            
            <h3 className="text-lg font-bold text-slate-800 capitalize mb-1">
              {date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </h3>
            <p className="text-sm text-slate-500 flex items-center gap-2">
              <Calendar size={14} /> Fechado em {date.toLocaleDateString('pt-BR')}
            </p>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center text-sm font-medium text-primary-600 group-hover:translate-x-1 transition-transform">
              Visualizar Relatório
              <ArrowRight size={16} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default HistoryTab;
