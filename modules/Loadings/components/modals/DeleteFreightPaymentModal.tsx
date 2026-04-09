import React, { useState } from 'react';
import { 
  X, 
  AlertTriangle, 
  Trash2, 
  ArrowLeft,
  Info,
  Calendar,
  Wallet,
  Receipt
} from 'lucide-react';
import { Loading } from '../../types';
import { freightService } from '../../../../services/loadings/freightService';
import { formatCurrency } from '../../../../utils/formatters';
import { useToast } from '../../../../contexts/ToastContext';

interface DeleteFreightPaymentModalProps {
  loading: Loading;
  transaction: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: Loading) => void;
}

export function DeleteFreightPaymentModal({ loading, transaction, isOpen, onClose, onSuccess }: DeleteFreightPaymentModalProps) {
  const { addToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await freightService.deleteFreightPayment(loading, transaction.id);
      
      addToast('success', 'Pagamento de frete estornado com sucesso!');
      
      // Simula atualização local para UX imediata
      const updatedLoading = {
        ...loading,
        transactions: (loading.transactions || []).filter(t => t.id !== transaction.id),
        freightPaid: Math.max(0, (loading.freightPaid || 0) - (transaction.value || 0))
      };
      
      onSuccess(updatedLoading);
      onClose();
    } catch (error: any) {
      addToast('error', 'Erro ao estornar pagamento', error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Warning Header */}
        <div className="px-6 py-6 border-b border-rose-50 flex flex-col items-center text-center bg-rose-50/30">
          <div className="p-3 bg-rose-100 text-rose-600 rounded-full mb-4 animate-bounce duration-1000">
            <AlertTriangle size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-800">Confirmar Estorno?</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-[280px]">
            Esta ação é irreversível e removerá o registro tanto do <strong>Carregamento</strong> quanto do <strong>Financeiro</strong>.
          </p>
        </div>

        {/* Transaction Summary Card */}
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
              <span className="text-xs font-bold text-slate-400 uppercase">Valor do Lançamento</span>
              <span className="text-lg font-bold text-rose-600 font-mono">{formatCurrency(transaction.value)}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-slate-400" />
                <span className="text-xs font-medium text-slate-600">{new Date(transaction.date).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Wallet size={14} className="text-slate-400" />
                <span className="text-xs font-medium text-slate-600 truncate">{transaction.accountName || 'Caixa'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Receipt size={14} className="text-slate-400" />
              <span className="text-[11px] text-slate-500 font-mono tracking-tight truncate">ID: {transaction.id}</span>
            </div>
          </div>

          {/* Sync Warning */}
          <div className="flex gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
            <Info size={18} className="text-indigo-500 shrink-0" />
            <p className="text-xs text-indigo-700 leading-relaxed font-medium">
              O sistema detectou o vínculo <strong>[REF]</strong>. O lançamento correspondente no financeiro será deletado automaticamente para manter a integridade do seu saldo.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft size={18} />
              Voltar
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-[1.5] flex items-center justify-center gap-2 px-6 py-3 bg-rose-600 text-white rounded-xl font-bold text-sm hover:bg-rose-700 shadow-lg shadow-rose-200 transition-all active:scale-95 disabled:opacity-50"
            >
              {isDeleting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Trash2 size={18} />
                  Confirmar Estorno
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
