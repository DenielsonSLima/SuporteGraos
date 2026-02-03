import React, { useState, useEffect } from 'react';
import { Folder, Calendar, Lock, ChevronLeft, DollarSign, Activity } from 'lucide-react';
import { cashierService } from '../services/cashierService';
import { MonthlyReport } from '../services/cashier-history';
import { CashierReport } from '../types';
import CashierReportView from './CashierReportView';

interface Props {
  onCloseDetail?: () => void;
}

const HistoryViewComponent: React.FC<Props> = ({ onCloseDetail }) => {
  const [history, setHistory] = useState<CashierReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<CashierReport | null>(null);
  const [loading, setLoading] = useState(true);

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  }).format(val);

  useEffect(() => {
    setLoading(true);
    const reports = cashierService.getHistory();
    setHistory(reports);
    setLoading(false);
  }, []);

  // Retornar à lista ao fechar detalhe
  if (selectedReport) {
    return (
      <div className="animate-in slide-in-from-right-4">
        <button 
          onClick={() => {
            setSelectedReport(null);
            onCloseDetail?.();
          }}
          className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ChevronLeft size={16} /> Voltar para lista
        </button>
        <CashierReportView 
          report={selectedReport} 
          title={`Fechamento ${(selectedReport as any).monthLabel || new Date(selectedReport.referenceDate).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`} 
        />
      </div>
    );
  }

  // Carregando
  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 text-primary-600 mx-auto mb-4 border-4 border-slate-200 border-t-primary-600 rounded-full" />
          <p className="text-slate-500">Carregando histórico...</p>
        </div>
      </div>
    );
  }

  // Sem histórico
  if (history.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Folder size={48} className="mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500 font-medium">Nenhum fechamento anterior encontrado</p>
          <p className="text-slate-400 text-sm mt-1">O histórico aparecerá aqui após o fechamento de meses anteriores</p>
        </div>
      </div>
    );
  }

  // Grid de meses
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-in fade-in">
      {history.map((report) => {
        const date = new Date(report.referenceDate);
        const isSnapshot = report.isSnapshot;
        const monthLabel = (report as any).monthLabel || date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

        return (
          <div 
            key={report.id}
            onClick={() => setSelectedReport(report)}
            className="group cursor-pointer bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:border-primary-300 hover:shadow-md transition-all hover:scale-105"
          >
            {/* Header com badge */}
            <div className="flex items-start justify-between mb-4">
              <div className="bg-blue-50 p-3 rounded-lg text-blue-600 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                <Folder size={24} />
              </div>
              {isSnapshot && (
                <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-full text-amber-700">
                  <Lock size={12} className="text-amber-600" />
                  <span className="text-[10px] font-bold uppercase">Fechado</span>
                </div>
              )}
            </div>

            {/* Mês e data */}
            <h3 className="text-lg font-bold text-slate-800 capitalize mb-1">
              {monthLabel}
            </h3>
            
            {isSnapshot && report.snapshotClosedDate && (
              <p className="text-xs text-slate-500 flex items-center gap-2 mb-4">
                <Calendar size={12} /> 
                Fechado em {new Date(report.snapshotClosedDate).toLocaleDateString('pt-BR')}
                {report.snapshotClosedBy && ` por ${report.snapshotClosedBy}`}
              </p>
            )}

            {/* Saldo Final */}
            <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">Saldo Final</p>
                  <p className={`font-bold text-lg ${report.netBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {currency(report.netBalance)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold uppercase text-slate-400">Bancos</p>
                  <p className="font-bold text-lg text-blue-600">
                    {currency(report.totalBankBalance)}
                  </p>
                </div>
              </div>

              {/* Resumo: Ativos vs Passivos */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-emerald-50 p-2 rounded">
                  <p className="text-emerald-700 font-bold">ATIVO</p>
                  <p className="text-emerald-600 font-bold text-sm">{currency(report.totalAssets)}</p>
                </div>
                <div className="bg-rose-50 p-2 rounded">
                  <p className="text-rose-700 font-bold">PASSIVO</p>
                  <p className="text-rose-600 font-bold text-sm">{currency(report.totalLiabilities)}</p>
                </div>
              </div>
            </div>

            {/* Footer com CTA */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-sm font-medium text-primary-600 group-hover:translate-x-1 transition-transform">
              Visualizar Relatório
              <span className="text-lg">→</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default HistoryViewComponent;
