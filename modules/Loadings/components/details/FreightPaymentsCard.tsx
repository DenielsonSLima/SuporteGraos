import React, { useState, useMemo } from 'react';
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  Receipt, 
  ArrowUpRight, 
  ArrowDownRight,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Wallet,
  Pencil
} from 'lucide-react';
import { Loading } from '../../types';
import { loadingKpiService } from '../../../../services/loadings/loadingKpiService';
import { formatCurrency } from '../../../../utils/formatters';
import { FreightPaymentModal } from '../modals/FreightPaymentModal';
import { DeleteFreightPaymentModal } from '../modals/DeleteFreightPaymentModal';

interface FreightPaymentsCardProps {
  loading: Loading;
  onUpdate: (updated: Loading) => void;
}

export function FreightPaymentsCard({ loading, onUpdate }: FreightPaymentsCardProps) {
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [deleteTx, setDeleteTx] = useState<any | null>(null);
  const [editingTx, setEditingTx] = useState<any | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  // KPIs Financeiros via Serviço Centralizado
  const summary = useMemo(() => loadingKpiService.computeFreightSummary(loading), [loading]);

  const transactions = useMemo(() => {
    return (loading.transactions || []).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [loading.transactions]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
      {/* Header */}
      <div 
        className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50 cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
            <CreditCard size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">Pagamento de Frete</h3>
            <p className="text-xs text-slate-500">Gestão financeira do transporte</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditingTx(null);
              setIsPaymentModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus size={16} />
            Pagar
          </button>
          <ChevronDown 
            size={20} 
            className={`text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
          />
        </div>
      </div>

      {isExpanded && (
        <div className="p-5 space-y-6">
          {/* Progress Bar & Summary Cards */}
          <div className="space-y-4">
            <div className="flex justify-between items-end mb-1">
              <span className="text-sm font-medium text-slate-600">Progresso do Pagamento</span>
              <span className="text-lg font-bold text-indigo-600">{summary.progress.toFixed(0)}%</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
              <div 
                className={`h-full transition-all duration-1000 ease-out rounded-full ${
                  summary.progress >= 100 ? 'bg-emerald-50 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-indigo-500'
                }`}
                style={{ width: `${summary.progress}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Total Líquido</p>
                <p className="text-sm font-bold text-slate-700">{formatCurrency(summary.netFreightTotal)}</p>
              </div>
              <div className={`p-3 rounded-xl border ${
                summary.balance > 0 ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100'
              }`}>
                <p className={`text-[10px] uppercase tracking-wider font-bold mb-1 ${
                  summary.balance > 0 ? 'text-amber-600' : 'text-emerald-600'
                }`}>Saldo Devedor</p>
                <div className="flex items-center gap-1.5">
                  <p className={`text-sm font-bold ${
                    summary.balance > 0 ? 'text-amber-700' : 'text-emerald-700'
                  }`}>
                    {summary.balance > 0.05 ? formatCurrency(summary.balance) : 'Quitado'}
                  </p>
                  {summary.balance <= 0.05 && <CheckCircle2 size={14} className="text-emerald-500" />}
                </div>
              </div>
            </div>
          </div>

          {/* Transaction History */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Receipt size={14} />
              Histórico de Lançamentos
            </h4>
            
            {transactions.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-xl">
                <AlertCircle size={24} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-400">Nenhum pagamento registrado</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {transactions.map((tx: any) => (
                  <div 
                    key={tx.id} 
                    className="group p-3 bg-white border border-slate-100 rounded-xl hover:border-indigo-200 hover:bg-slate-50/50 transition-all"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-lg ${
                          tx.value >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                        }`}>
                          {tx.value >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-700">{tx.accountName || 'Caixa'}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                              <Calendar size={10} />
                              {new Date(tx.date).toLocaleDateString()}
                            </span>
                            <span className="w-1 h-1 bg-slate-300 rounded-full" />
                            <span className="text-[10px] text-slate-400 font-mono tracking-tight">
                              ID: {tx.id.substring(0, 8)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <div className="mr-2">
                          <p className={`text-sm font-bold ${
                            tx.value >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                            {formatCurrency(tx.value)}
                          </p>
                          {tx.discountValue > 0 && (
                            <p className="text-[10px] text-amber-500 font-medium font-mono text-right">
                              Desc: {formatCurrency(tx.discountValue)}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setEditingTx(tx);
                              setIsPaymentModalOpen(true);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all"
                            title="Editar lançamento"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteTx(tx)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                            title="Estornar lançamento"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                    {tx.notes && (
                      <p className="text-[11px] text-slate-500 pl-9 line-clamp-1 italic border-l-2 border-slate-100 ml-1.5 py-0.5">
                        {tx.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer Info */}
      {isExpanded && (
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Wallet size={12} />
            <span>Total Pago: {formatCurrency(summary.totalPaid)}</span>
          </div>
          {summary.totalDiscount > 0 && (
            <div className="text-xs text-amber-600 font-medium">
              Descontos: {formatCurrency(summary.totalDiscount)}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {isPaymentModalOpen && (
        <FreightPaymentModal 
          loading={loading}
          transaction={editingTx}
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setEditingTx(null);
          }}
          onSuccess={onUpdate}
        />
      )}

      {deleteTx && (
        <DeleteFreightPaymentModal 
          loading={loading}
          transaction={deleteTx}
          isOpen={!!deleteTx}
          onClose={() => setDeleteTx(null)}
          onSuccess={onUpdate}
        />
      )}
    </div>
  );
}
