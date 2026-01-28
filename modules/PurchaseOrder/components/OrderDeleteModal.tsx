
import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { PurchaseOrder } from '../types';
import { LoadingCache } from '../../../services/loadingCache';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  order: PurchaseOrder | null;
}

const OrderDeleteModal: React.FC<Props> = ({ isOpen, onClose, onConfirm, order }) => {
  if (!isOpen || !order) return null;

  const linkedLoadings = LoadingCache.getByPurchaseOrder(order.id);
  const financialCount = (order.transactions || []).length;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95">
        <div className="bg-rose-50 px-6 py-6 flex flex-col items-center text-center border-b border-rose-100">
          <div className="h-16 w-16 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-4 shadow-inner">
            <AlertTriangle size={32} />
          </div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Excluir Pedido #{order.number}?</h3>
          <p className="text-sm text-slate-500 mt-1 font-medium">{order.partnerName}</p>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-4">
             <p className="text-sm text-slate-600 leading-relaxed text-center">
               Esta ação é <strong>irreversível</strong>. Ao confirmar, o sistema realizará a limpeza total dos dados vinculados:
             </p>
             
             <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                    <p className="text-xl font-black text-rose-600">{linkedLoadings.length}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Romaneios</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                    <p className="text-xl font-black text-rose-600">{financialCount}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lançamentos</p>
                </div>
             </div>

             <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl">
                <p className="text-[11px] text-rose-800 font-bold leading-tight">
                  Atenção: Os romaneios excluídos deixarão de constar no estoque e os pagamentos serão removidos do fluxo de caixa e histórico de auditoria.
                </p>
             </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-white border-2 border-slate-200 text-slate-600 font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-slate-50 transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={() => { onConfirm(); onClose(); }}
              className="flex-1 px-4 py-3 bg-rose-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all flex items-center justify-center gap-2"
            >
              <Trash2 size={16} /> Excluir Tudo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDeleteModal;
