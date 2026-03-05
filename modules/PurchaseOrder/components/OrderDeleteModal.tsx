
import React from 'react';
import { X } from 'lucide-react';
import { PurchaseOrder } from '../types';
import { loadingService } from '../../../services/loadingService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  order: PurchaseOrder | null;
}

const OrderDeleteModal: React.FC<Props> = ({ isOpen, onClose, onConfirm, order }) => {
  if (!isOpen || !order) return null;

  const linkedLoadings = loadingService.getByPurchaseOrder(order.id);
  const financialCount = (order.transactions || []).length;
  const hasPaidValue = (order.paidValue || 0) > 0;
  
  // ⛔ Bloquear exclusão se houver carregamentos
  const hasLoadings = linkedLoadings.length > 0;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95">
        <div className={`px-8 py-8 border-b flex flex-col items-center text-center ${hasLoadings ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200'}`}>
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
            {hasLoadings ? 'Exclusão Bloqueada' : `Excluir Pedido ${order.number}?`}
          </h3>
          <p className="text-xs text-slate-500 mt-2 font-bold uppercase tracking-widest">{order.partnerName}</p>
        </div>

        <div className="p-8 space-y-6">
          {hasLoadings ? (
            // ⛔ BLOQUEIO: Mostrar mensagem de carregamentos vinculados
            <div className="space-y-5">
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
                <p className="text-sm font-bold text-slate-900 uppercase tracking-wide">Carregamentos Vinculados</p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  Este pedido possui <strong>{linkedLoadings.length} carregamento(s)</strong> associado(s).
                </p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  Para excluir este pedido, abra a aba <strong>Carregamentos</strong> dentro deste pedido e exclua os carregamentos lá.
                </p>
              </div>
              
              <button 
                onClick={onClose}
                className="w-full px-4 py-3 bg-slate-900 text-white font-black uppercase text-xs tracking-widest rounded-xl hover:bg-slate-800 transition-all"
              >
                Entendido
              </button>
            </div>
          ) : (
            // ✅ PERMITIR: Mostrar aviso de exclusão com informações
            <div className="space-y-5">
              <p className="text-sm text-slate-600 leading-relaxed">
                Esta ação é <strong>irreversível</strong>. Ao confirmar, o seguinte será permanentemente excluído:
              </p>
              
              <div className="space-y-3">
                {financialCount > 0 && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                    <p className="text-sm font-bold text-slate-900 uppercase tracking-wide">Pagamentos</p>
                    <p className="text-xs text-slate-700">
                      <strong>{financialCount} lançamento(s)</strong> financeiro(s) serão removidos.
                    </p>
                    {hasPaidValue && (
                      <p className="text-xs text-slate-700">
                        Valor pago: <strong>R$ {order.paidValue.toFixed(2)}</strong>
                      </p>
                    )}
                  </div>
                )}
                
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <p className="text-sm font-bold text-slate-900 uppercase tracking-wide">Contas a Pagar</p>
                  <p className="text-xs text-slate-700">
                    Todos os registros de <strong>contas a pagar</strong> vinculados serão removidos do sistema.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="text-xs text-slate-700 font-bold leading-relaxed">
                  Aviso: Os pagamentos serão removidos do fluxo de caixa e histórico de auditoria.
                </p>
              </div>

              <div className="flex gap-3 pt-3">
                <button 
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-white border-2 border-slate-300 text-slate-700 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => { onConfirm(); onClose(); }}
                  className="flex-1 px-4 py-3 bg-red-600 text-white font-black uppercase text-xs tracking-widest rounded-xl hover:bg-red-700 transition-all"
                >
                  Excluir Tudo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDeleteModal;
