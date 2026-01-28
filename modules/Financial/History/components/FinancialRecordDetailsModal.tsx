
import React, { useState, useMemo } from 'react';
import { X, Calendar, DollarSign, User, FileText, Landmark, Tag, Pencil, Trash2, ShieldAlert, CheckCircle2, History, ArrowRight } from 'lucide-react';
import { FinancialRecord } from '../../types';
import ActionConfirmationModal from '../../../../components/ui/ActionConfirmationModal';
import TransactionManagementModal from '../../components/modals/TransactionManagementModal';
import { financialActionService } from '../../../../services/financialActionService';
import { purchaseService } from '../../../../services/purchaseService';
import { salesService } from '../../../../services/salesService';
import { useToast } from '../../../../contexts/ToastContext';
import { ModuleId } from '../../../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  record: FinancialRecord;
  onRefresh: () => void;
}

const FinancialRecordDetailsModal: React.FC<Props> = ({ isOpen, onClose, record, onRefresh }) => {
  const { addToast } = useToast();
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<any>(null);

  if (!isOpen) return null;

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const date = (val: string) => new Date(val).toLocaleDateString('pt-BR');

  const isManual = record.subType === 'admin';
  const isSystem = !isManual;

  // Se for sistema, buscamos as transações reais vinculadas ao pedido para permitir edição granular
  const systemicTransactions = useMemo(() => {
    if (!isSystem) return [];
    if (record.subType === 'purchase_order') {
        const orderId = record.id.replace('po-grain-', '');
        return purchaseService.getById(orderId)?.transactions || [];
    }
    if (record.subType === 'sales_order') {
        const orderId = record.id.replace('so-', '');
        return salesService.getById(orderId)?.transactions || [];
    }
    return [];
  }, [record, isSystem]);

  const handleDelete = () => {
    if (isSystem) {
      addToast('warning', 'Registro Bloqueado', 'Para excluir um saldo de pedido, você deve estornar os pagamentos individuais ou excluir o pedido na origem.');
      return;
    }
    (financialActionService as any).deleteStandaloneRecord?.(record.id);
    addToast('success', 'Registro Excluído');
    onRefresh();
    onClose();
  };

  const handleUpdateTx = (updated: any) => {
    if (record.subType === 'purchase_order') {
        purchaseService.updateTransaction(record.id.replace('po-grain-', ''), updated);
    } else if (record.subType === 'sales_order') {
        salesService.updateTransaction(record.id.replace('so-', ''), updated);
    }
    onRefresh();
    setSelectedTx(null);
    addToast('success', 'Pagamento Atualizado');
  };

  const handleDeleteTx = (id: string) => {
    if (record.subType === 'purchase_order') {
        purchaseService.deleteTransaction(record.id.replace('po-grain-', ''), id);
    } else if (record.subType === 'sales_order') {
        salesService.deleteTransaction(record.id.replace('so-', ''), id);
    }
    onRefresh();
    setSelectedTx(null);
    addToast('success', 'Pagamento Estornado');
  };

  const handleNavigateToOrigin = () => {
    const moduleId = record.subType === 'purchase_order' ? ModuleId.PURCHASE_ORDER : ModuleId.SALES_ORDER;
    const orderId = record.id.replace('po-grain-', '').replace('so-', '');
    window.dispatchEvent(new CustomEvent('app:navigate', { detail: { moduleId, orderId } }));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 border border-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white shrink-0">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-slate-800 rounded-lg text-primary-400 shadow-inner"><History size={20}/></div>
             <div>
                <h3 className="font-black text-lg leading-tight uppercase tracking-tighter italic">Visão Geral de Conta</h3>
                <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Controle de Fluxo Operacional</p>
             </div>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Content Scrollable */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 bg-slate-50">
          
          {/* Status e Totais */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-4 pb-2 border-b border-slate-50">
               <div>
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Título / Descrição</h4>
                  <p className="text-sm font-black text-slate-800 uppercase tracking-tight leading-none">{record.description}</p>
               </div>
               <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase shadow-sm border ${record.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                  {record.status === 'paid' ? 'Liquidado' : 'Saldo em Aberto'}
               </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 shadow-inner">
                 <h4 className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Valor do Compromisso</h4>
                 <p className="text-xl font-black text-slate-900">{currency(record.originalValue)}</p>
              </div>
              <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                 <h4 className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total Já Pago</h4>
                 <p className="text-xl font-black text-emerald-700">{currency(record.paidValue)}</p>
              </div>
            </div>
          </div>

          {/* Seção de Pagamentos Sistêmicos (Granular) */}
          {isSystem && systemicTransactions.length > 0 && (
            <div className="space-y-3 animate-in slide-in-from-bottom-2">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 px-2">
                    <DollarSign size={14} className="text-emerald-500" /> 
                    Pagamentos Vinculados (Granular)
                </h3>
                <div className="space-y-2">
                    {systemicTransactions.map((tx: any) => (
                        <div key={tx.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl group hover:border-blue-300 transition-all shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><Calendar size={14}/></div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-900 uppercase leading-none">{date(tx.date)}</p>
                                    <p className="text-[9px] font-bold text-indigo-600 mt-1 uppercase tracking-tighter italic">{tx.accountName}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="font-black text-slate-800 text-sm">{currency(tx.value)}</span>
                                <button onClick={() => setSelectedTx(tx)} className="p-2 bg-slate-50 hover:bg-blue-600 hover:text-white rounded-lg transition-all opacity-0 group-hover:opacity-100 text-slate-400">
                                    <Pencil size={14}/>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          )}

          {/* Informações Auxiliares */}
          <div className="grid grid-cols-2 gap-4 px-2">
            <div className="flex items-center gap-3">
              <User size={18} className="text-slate-400" />
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">Parceiro Envolvido</p>
                <p className="text-xs font-black text-slate-700 uppercase">{record.entityName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Tag size={18} className="text-slate-400" />
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">Natureza Financeira</p>
                <p className="text-xs font-black text-slate-700 uppercase">{record.category}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar size={18} className="text-slate-400" />
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">Data de Lançamento</p>
                <p className="text-xs font-black text-slate-700">{date(record.issueDate)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Landmark size={18} className="text-slate-400" />
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">Última Movimentação</p>
                <p className="text-xs font-black text-indigo-600 uppercase">{record.bankAccount || 'Vínculo Pendente'}</p>
              </div>
            </div>
          </div>

          {isSystem && (
            <div className="flex flex-col gap-3 p-4 bg-slate-900 border border-slate-700 rounded-2xl text-white shadow-xl">
               <div className="flex items-center gap-3">
                 <ShieldAlert size={20} className="text-blue-400 shrink-0" />
                 <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">
                   Este é um saldo consolidado originado em Pedido. <br/>
                   <span className="text-blue-400 font-bold">Gerencie os pagamentos individuais na lista acima ou acesse a ficha do pedido.</span>
                 </p>
               </div>
               <button onClick={handleNavigateToOrigin} className="w-full mt-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[9px] rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-900/50">
                   Acessar Ficha Completa do Pedido <ArrowRight size={14} />
               </button>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-6 border-t border-slate-200 flex justify-between items-center shrink-0">
            <button onClick={onClose} className="px-6 py-2.5 bg-white border-2 border-slate-200 text-slate-600 font-black rounded-xl hover:bg-slate-50 transition-all uppercase text-[10px] tracking-widest">Fechar</button>
            {!isSystem && (
               <div className="flex gap-2">
                   <button onClick={() => addToast('info', 'Edição em breve')} className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white font-black rounded-xl hover:bg-slate-800 transition-all uppercase text-[10px] tracking-widest shadow-lg">
                       <Pencil size={16} /> Editar Dados
                   </button>
                   <button onClick={() => setIsDeleteConfirmOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 border border-rose-200 text-rose-600 font-black rounded-xl hover:bg-rose-100 transition-all uppercase text-[10px] tracking-widest">
                       <Trash2 size={16} />
                   </button>
               </div>
            )}
          </div>
        </div>
      </div>

      <ActionConfirmationModal 
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Remover Lançamento?"
        description="Tem certeza que deseja apagar este registro manual do histórico? Pagamentos sistêmicos devem ser estornados individualmente."
        type="danger"
      />

      {selectedTx && (
        <TransactionManagementModal 
            isOpen={!!selectedTx}
            onClose={() => setSelectedTx(null)}
            transaction={selectedTx}
            onUpdate={handleUpdateTx}
            onDelete={handleDeleteTx}
        />
      )}
    </div>
  );
};

export default FinancialRecordDetailsModal;
