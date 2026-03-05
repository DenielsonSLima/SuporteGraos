import React, { useState } from 'react';
import { X, AlertTriangle, Lock, ChevronDown } from 'lucide-react';
import { Partner } from '../../types';
import { useToast } from '../../../../contexts/ToastContext';
import { usePartnerDeleteModal } from '../../hooks/usePartnerDeleteModal';

interface Props {
  isOpen: boolean;
  partner: Partner | null;
  onClose: () => void;
  onConfirm: () => void;
}

const PartnerDeleteModal: React.FC<Props> = ({ isOpen, partner, onClose, onConfirm }) => {
  const { addToast } = useToast();
  const [expandedSection, setExpandedSection] = useState<'orders' | 'financial' | null>(null);
  const { linkedData, isDeactivating, handleDeactivate } = usePartnerDeleteModal({
    partner,
    onClose,
    addToast
  });

  const hasLinks = linkedData.purchases.length > 0 || 
                   linkedData.sales.length > 0 || 
                   linkedData.payables.length > 0 || 
                   linkedData.receivables.length > 0;

  if (!isOpen || !partner) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-6 py-5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-600/20 rounded-lg">
              <AlertTriangle size={20} className="text-red-400" />
            </div>
            <div>
              <h2 className="font-black text-lg">Remover Parceiro</h2>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">{partner.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* Warning Message */}
          {linkedData.hasPendingFinancial ? (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
              <p className="text-sm font-black text-red-900 leading-relaxed">
                Este parceiro possui dívida pendente de <span className="text-lg">R$ {(linkedData.totalDebt + linkedData.totalReceivable).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>. Liquide todos os registros financeiros antes de prosseguir.
              </p>
            </div>
          ) : linkedData.hasActiveOrders ? (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
              <p className="text-sm font-black text-amber-900 leading-relaxed">
                Este parceiro possui pedidos ativos vinculados. Feche ou cancele todos os pedidos antes de prosseguir.
              </p>
            </div>
          ) : linkedData.canDelete ? (
            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4">
              <p className="text-sm font-black text-emerald-900">
                Este parceiro não possui registros vinculados e pode ser removido com segurança.
              </p>
            </div>
          ) : null}

          {/* Linked Orders Section */}
          {(linkedData.purchases.length > 0 || linkedData.sales.length > 0) && (
            <div className="border-2 border-slate-200 rounded-2xl overflow-hidden">
              <button
                onClick={() => setExpandedSection(expandedSection === 'orders' ? null : 'orders')}
                className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-150 transition-colors flex items-center justify-between font-black text-slate-900 uppercase text-sm"
              >
                <span>Pedidos Vinculados (Zerados)</span>
                <ChevronDown size={18} className={`transition-transform ${expandedSection === 'orders' ? 'rotate-180' : ''}`} />
              </button>
              {expandedSection === 'orders' && (
                <div className="p-4 space-y-3 bg-white">
                  <p className="text-[11px] text-slate-600 italic border-l-4 border-amber-400 pl-3">
                    Os pedidos estão zerados, mas geraram dívida financeira ativa. Liquide os registros financeiros para remover o parceiro.
                  </p>
                  {linkedData.purchases.length > 0 && (
                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase mb-2">Pedidos de Compra ({linkedData.purchases.length})</p>
                      <div className="space-y-2">
                        {linkedData.purchases.map(p => {
                          const linkedPayables = linkedData.payables.filter(pay => pay.purchaseOrderId === p.id);
                          const debtAmount = linkedPayables.reduce((acc, pay) => acc + Math.max(0, (pay as any).remainingValue ?? (pay.amount - pay.paidAmount)), 0);
                          return (
                            <div key={p.id} className="bg-slate-50 px-3 py-2.5 rounded-lg border-l-4 border-red-400">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-sm font-black text-slate-900">#{p.number}</p>
                                  <p className="text-[11px] text-slate-600 mt-0.5">{p.date} • Valor: R$ {p.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                </div>
                                {debtAmount > 0 && (
                                  <div className="text-right">
                                    <p className="text-xs font-black text-red-700">Dívida Ativa</p>
                                    <p className="text-sm font-black text-red-600">R$ {debtAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {linkedData.sales.length > 0 && (
                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase mb-2">Pedidos de Venda ({linkedData.sales.length})</p>
                      <div className="space-y-2">
                        {linkedData.sales.map(s => {
                          const linkedReceivables = linkedData.receivables.filter(rec => rec.salesOrderId === s.id);
                          const receivableAmount = linkedReceivables.reduce((acc, rec) => acc + Math.max(0, (rec as any).remainingValue ?? (rec.amount - rec.receivedAmount)), 0);
                          return (
                            <div key={s.id} className="bg-slate-50 px-3 py-2.5 rounded-lg border-l-4 border-red-400">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-sm font-black text-slate-900">#{s.number}</p>
                                  <p className="text-[11px] text-slate-600 mt-0.5">{s.date} • Valor: R$ {s.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                </div>
                                {receivableAmount > 0 && (
                                  <div className="text-right">
                                    <p className="text-xs font-black text-red-700">A Receber</p>
                                    <p className="text-sm font-black text-red-600">R$ {receivableAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Financial Section */}
          {(linkedData.payables.length > 0 || linkedData.receivables.length > 0) && (
            <div className="border-2 border-slate-200 rounded-2xl overflow-hidden">
              <button
                onClick={() => setExpandedSection(expandedSection === 'financial' ? null : 'financial')}
                className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-150 transition-colors flex items-center justify-between font-black text-slate-900 uppercase text-sm"
              >
                <span>Registros Financeiros</span>
                <ChevronDown size={18} className={`transition-transform ${expandedSection === 'financial' ? 'rotate-180' : ''}`} />
              </button>
              {expandedSection === 'financial' && (
                <div className="p-4 space-y-3 bg-white">
                  {linkedData.payables.length > 0 && (
                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase mb-2">Contas a Pagar ({linkedData.payables.length})</p>
                      <div className="space-y-1">
                        {linkedData.payables.map(p => (
                          <div key={p.id} className="text-sm font-bold text-slate-700 bg-slate-50 px-3 py-2 rounded-lg">
                            {p.description} • Vencimento: {p.dueDate} • Saldo: R$ {((p as any).remainingValue ?? Math.max(0, p.amount - p.paidAmount)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {linkedData.receivables.length > 0 && (
                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase mb-2">Contas a Receber ({linkedData.receivables.length})</p>
                      <div className="space-y-1">
                        {linkedData.receivables.map(r => (
                          <div key={r.id} className="text-sm font-bold text-slate-700 bg-slate-50 px-3 py-2 rounded-lg">
                            {r.description} • Vencimento: {r.dueDate} • Saldo: R$ {((r as any).remainingValue ?? Math.max(0, r.amount - r.receivedAmount)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Options */}
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Opções disponíveis:</p>
            
            {linkedData.hasPendingFinancial && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-xs font-black text-red-900 uppercase tracking-tight mb-1">Saldo Pendente</p>
                <p className="text-[11px] text-red-800">R$ {(linkedData.totalDebt + linkedData.totalReceivable).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p className="text-[10px] text-red-700 mt-1.5">Acesse o módulo financeiro para liquidar os registros</p>
              </div>
            )}

            {linkedData.hasActiveOrders && !linkedData.hasPendingFinancial && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs font-black text-amber-900 uppercase tracking-tight mb-1">Pedidos Ativos</p>
                <p className="text-[11px] text-amber-800">
                  {linkedData.purchases.length > 0 && `${linkedData.purchases.length} compra(s)`}
                  {linkedData.purchases.length > 0 && linkedData.sales.length > 0 && ' + '}
                  {linkedData.sales.length > 0 && `${linkedData.sales.length} venda(s)`}
                </p>
                <p className="text-[10px] text-amber-700 mt-1.5">Feche ou cancele todos antes de continuar</p>
              </div>
            )}

            {linkedData.canDeactivate && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-xs font-black text-blue-900 uppercase tracking-tight mb-1">Inativar Parceiro</p>
                <p className="text-[11px] text-blue-800">Manter como arquivo histórico (sem deletar dados)</p>
              </div>
            )}

            {linkedData.canDelete && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <p className="text-xs font-black text-emerald-900 uppercase tracking-tight mb-1">Remover Permanentemente</p>
                <p className="text-[11px] text-emerald-800">Excluir todos os registros do parceiro</p>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex gap-3 justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-black text-sm text-slate-700 bg-white border-2 border-slate-200 hover:bg-slate-50 transition-all active:scale-95"
          >
            Cancelar
          </button>

          {linkedData.canDeactivate && !linkedData.hasPendingFinancial && !linkedData.hasActiveOrders && (
            <button
              onClick={handleDeactivate}
              disabled={isDeactivating}
              className="px-6 py-2.5 rounded-xl font-black text-sm text-white bg-amber-600 hover:bg-amber-700 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              <Lock size={16} />
              {isDeactivating ? 'Inativando...' : 'Inativar Parceiro'}
            </button>
          )}

          {linkedData.canDelete && (
            <button
              onClick={onConfirm}
              className="px-6 py-2.5 rounded-xl font-black text-sm text-white bg-red-600 hover:bg-red-700 transition-all active:scale-95"
            >
              Remover Permanentemente
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default PartnerDeleteModal;
