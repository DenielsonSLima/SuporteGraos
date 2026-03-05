
import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Calendar, DollarSign, Wallet, FileText, AlertTriangle } from 'lucide-react';
import { OrderTransaction } from '../../../PurchaseOrder/types';
import type { Account } from '../../../../services/accountsService';
import { useAccounts } from '../../../../hooks/useAccounts';
import ActionConfirmationModal from '../../../../components/ui/ActionConfirmationModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  transaction: OrderTransaction;
  onUpdate: (data: OrderTransaction) => void;
  onDelete: (id: string) => void;
  title?: string;
}

const TransactionManagementModal: React.FC<Props> = ({ isOpen, onClose, transaction, onUpdate, onDelete, title }) => {
  const { data: allBankAccounts = [] } = useAccounts();
  const bankAccounts = React.useMemo(() => allBankAccounts.sort((a, b) => a.account_name.localeCompare(b.account_name)), [allBankAccounts]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  
  const [formData, setFormData] = useState<OrderTransaction>({ ...transaction });

  useEffect(() => {
    if (isOpen) {
      setFormData({ ...transaction });
    }
  }, [isOpen, transaction]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const account = bankAccounts.find(a => a.id === formData.accountId);
    onUpdate({
      ...formData,
      accountName: account?.account_name || formData.accountName
    });
    onClose();
  };

  const inputClass = 'w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 font-bold text-slate-900 focus:border-blue-500 focus:outline-none transition-all';
  const labelClass = 'block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest ml-1';

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
        
        <div className="bg-slate-950 px-8 py-5 flex justify-between items-center text-white">
          <div>
            <h3 className="font-black text-lg uppercase tracking-tighter italic">{title || 'Gerenciar Lançamento'}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">ID Ref: {transaction.id}</p>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Data do Lançamento</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="date" required className={`${inputClass} pl-10`} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Valor (R$)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="number" step="0.01" required className={`${inputClass} pl-10 text-blue-700`} value={formData.value} onChange={e => setFormData({...formData, value: parseFloat(e.target.value)})} />
              </div>
            </div>
          </div>

          <div>
            <label className={labelClass}>Conta Bancária / Destino</label>
            <div className="relative">
              <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select 
                required 
                className={`${inputClass} pl-10 appearance-none`}
                value={formData.accountId}
                onChange={e => setFormData({...formData, accountId: e.target.value})}
              >
                <option value="">Selecione a conta...</option>
                {bankAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.account_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Histórico / Observação</label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 text-slate-400" size={18} />
              <textarea rows={2} className={`${inputClass} pl-10 font-medium text-xs`} value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Ex: Pagamento via PIX..." />
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-3 border-t border-slate-100">
            <button 
              type="button" 
              onClick={() => setIsDeleteConfirmOpen(true)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-rose-50 text-rose-600 font-black rounded-xl hover:bg-rose-100 transition-all uppercase text-xs tracking-widest order-3 sm:order-1"
            >
              <Trash2 size={18} /> Excluir Lançamento
            </button>
            <div className="flex-1 flex gap-3 order-1 sm:order-2">
                <button type="button" onClick={onClose} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 uppercase text-xs tracking-widest">Cancelar</button>
                <button type="submit" className="flex-1 px-6 py-3 bg-slate-900 text-white font-black rounded-xl hover:bg-slate-800 shadow-lg flex items-center justify-center gap-2 uppercase text-xs tracking-widest">
                  <Save size={18} /> Salvar
                </button>
            </div>
          </div>
        </form>
      </div>

      <ActionConfirmationModal 
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={() => { onDelete(transaction.id); onClose(); }}
        title="Estornar Lançamento?"
        description="Esta operação removerá o valor do fluxo de caixa e o saldo voltará a constar como aberto no pedido. Deseja continuar?"
        type="danger"
      />
    </div>
  );
};

export default TransactionManagementModal;
