import React, { useState } from 'react';
import { DollarSign, Plus, Calendar, CheckCircle2, Trash2, Landmark, Info, Pencil } from 'lucide-react';
import { SalesTransaction } from '../../types';
import { formatCurrency } from '../../../../utils/formatters';
import { formatDateBR } from '../../../../utils/dateUtils';
import { useAccounts } from '../../../../hooks/useAccounts';
import ReceiptFormModal from '../modals/ReceiptFormModal';
import DeleteReceiptModal from '../modals/DeleteReceiptModal';
import { receiptService } from '../../../../services/sales/receiptService';
import { useToast } from '../../../../contexts/ToastContext';

interface Props {
  orderId: string;
  customerName: string;
  transactions: SalesTransaction[];
  totalReceived: number;
  totalPending: number;
  totalBilled: number;
  receivedPercent: number;
  onRefresh: () => void;
  onReceiptSuccess?: () => void;
}

const SalesReceiptsCard: React.FC<Props> = ({ 
  orderId, 
  customerName,
  transactions, 
  totalReceived, 
  totalPending, 
  totalBilled,
  receivedPercent,
  onRefresh,
  onReceiptSuccess
}) => {
  const { addToast } = useToast();
  const { data: accounts = [] } = useAccounts();
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingTx, setEditingTx] = useState<SalesTransaction | null>(null);
  const [deletingTx, setDeletingTx] = useState<SalesTransaction | null>(null);

  const receipts = transactions.filter(t => t.type === 'receipt');

  const handleConfirmReceipt = async (data: any) => {
    try {
      if (editingTx) {
        await receiptService.updateReceipt(orderId, editingTx.id, {
          ...data,
          entityName: customerName
        });
        addToast('success', 'Recebimento atualizado com sucesso');
      } else {
        await receiptService.addReceipt(orderId, {
          ...data,
          entityName: customerName
        });
        addToast('success', 'Recebimento registrado com sucesso');
        
        // Dispara o callback para verificar fechamento do pedido apenas em NOVOS recebimentos
        if (onReceiptSuccess) {
          onReceiptSuccess();
        }
      }
      onRefresh();
      setEditingTx(null);
      setIsAdding(false);
    } catch (err) {
      addToast('error', `Falha ao ${editingTx ? 'atualizar' : 'registrar'} recebimento`);
      throw err;
    }
  };

  const handleDeleteReceipt = async () => {
    if (!deletingTx) return;
    try {
      await receiptService.deleteReceipt(orderId, deletingTx.id);
      addToast('success', 'Recebimento estornado com sucesso');
      onRefresh();
    } catch (err) {
      addToast('error', 'Falha ao estornar recebimento');
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden h-fit flex flex-col">
      <div className="bg-emerald-50 px-6 py-4 border-b border-emerald-100 flex justify-between items-center">
        <div className="flex items-center gap-3 text-emerald-800">
          <div className="bg-emerald-600 p-1.5 rounded-xl text-white shadow-lg shadow-emerald-200">
            <DollarSign size={18} />
          </div>
          <div>
            <h3 className="font-black uppercase text-[10px] tracking-tighter">Recebimentos</h3>
            <p className="text-[7px] font-bold text-emerald-600/70 uppercase tracking-widest">Contas a Receber</p>
          </div>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="text-[9px] bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-xl font-black uppercase transition-all flex items-center gap-1.5 shadow-xl shadow-emerald-100 active:scale-95"
        >
          <Plus size={14} /> Lançar Recebimento
        </button>
      </div>

      <div className="p-6">
        {/* Sumário de Recebimento */}
        <div className="mb-8 bg-slate-50/50 p-5 rounded-3xl border border-slate-100">
          <div className="flex justify-between items-end mb-3">
            <div>
              <span className="text-slate-400 block text-[8px] font-black uppercase tracking-widest mb-0.5 ml-1">Progresso Total</span>
              <span className="font-black text-emerald-600 text-lg tracking-tighter leading-none">{receivedPercent.toFixed(1)}%</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[8px] font-black uppercase tracking-widest mb-0.5 mr-1">Saldo Pendente</span>
              <span className="font-black text-slate-800 text-base tracking-tighter leading-none">{formatCurrency(totalPending)}</span>
            </div>
          </div>
          
          <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out shadow-lg" 
              style={{ width: `${receivedPercent}%` }}
            ></div>
          </div>
          
          <div className="mt-3 flex items-center gap-2 px-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              Total Faturado: <span className="text-slate-700">{formatCurrency(totalBilled || 0)}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-5 px-1">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Histórico de Entradas</h4>
          <div className="h-px flex-1 bg-slate-100"></div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {receipts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/30">
              <Info className="text-slate-200 mb-3" size={40} />
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest text-center leading-relaxed">
                Nenhum recebimento registrado<br/>para este contrato ainda.
              </p>
            </div>
          ) : (
            receipts.map(t => {
              const account = accounts.find(a => a.id === t.accountId);
              const accountLabel = account
                ? `${account.account_name}${account.owner ? ` - ${account.owner}` : ''}`
                : t.accountName || 'CONTA NÃO IDENTIFICADA';

              return (
                <div key={t.id} className="group relative flex flex-col p-4 rounded-3xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-2xl hover:shadow-emerald-100/40 transition-all duration-300">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm border border-emerald-100 group-hover:rotate-12 transition-transform">
                        <CheckCircle2 size={20} />
                      </div>
                      <div>
                        <p className="font-black text-slate-900 text-[11px] uppercase tracking-tighter leading-tight">Recebimento</p>
                        <p className="text-[9px] font-bold text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <Calendar size={10} className="text-emerald-500" /> {formatDateBR(t.date)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-lg text-emerald-700 tracking-tighter">{formatCurrency(t.value)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-50">
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-2.5 py-1.5 rounded-xl max-w-[60%]">
                      <Landmark size={12} className="text-slate-400 shrink-0" />
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter truncate leading-none">
                        {accountLabel}
                      </span>
                    </div>

                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setEditingTx(t)}
                        className="p-2 bg-slate-50 text-slate-400 border border-slate-100 rounded-xl hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all active:scale-90 shadow-sm"
                        title="Editar Lançamento"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDeletingTx(t)}
                        className="p-2 bg-red-50 text-red-500 border border-red-100 rounded-xl hover:bg-red-600 hover:text-white transition-all active:scale-90 shadow-sm"
                        title="Estornar Recebimento"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {(() => {
                    const cleanNote = t.notes?.replace(/\[REF:[^\]]+\]/g, '').trim() || '';
                    const isSystemNote = cleanNote.toLowerCase() === 'recebimento venda';
                    
                    if (!cleanNote || isSystemNote) return null;

                    return (
                      <div className="mt-3 bg-amber-50/40 p-2.5 rounded-2xl border border-amber-100/50">
                        <p className="text-[9px] text-amber-700 leading-normal">
                          <span className="font-black uppercase text-[7px] opacity-50 block mb-0.5 tracking-widest">Observação:</span>
                          "{cleanNote}"
                        </p>
                      </div>
                    );
                  })()}
                </div>
              );
            })
          )}
        </div>
      </div>

      <ReceiptFormModal 
        isOpen={isAdding || !!editingTx}
        onClose={() => {
          setIsAdding(false);
          setEditingTx(null);
        }}
        onConfirm={handleConfirmReceipt}
        totalPending={totalPending}
        customerName={customerName}
        initialData={editingTx}
      />

      <DeleteReceiptModal 
        isOpen={!!deletingTx}
        onClose={() => setDeletingTx(null)}
        onConfirm={handleDeleteReceipt}
        receiptData={deletingTx ? {
          date: deletingTx.date,
          amount: deletingTx.value,
          accountName: deletingTx.accountName || 'Não informada'
        } : undefined}
      />
    </div>
  );
};

export default SalesReceiptsCard;
