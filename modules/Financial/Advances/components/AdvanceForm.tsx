
import React, { useState, useMemo, useEffect } from 'react';
import { X, Save, Calendar, FileText, User, ArrowUpRight, ArrowDownLeft, Wallet, ArrowDown } from 'lucide-react';
import { AdvanceType } from '../types';
import { partnerService } from '../../../../services/partnerService';
import { financialService } from '../../../../services/financialService';
import { BankAccount } from '../../../Financial/types';
import { useToast } from '../../../../contexts/ToastContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
}

const AdvanceForm: React.FC<Props> = ({ isOpen, onClose, onSave }) => {
  const { addToast } = useToast();
  const [type, setType] = useState<AdvanceType>('given');
  const [partnerId, setPartnerId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  
  // Novos estados para Conta e Valor Formatado
  const [accountId, setAccountId] = useState('');
  const [displayValue, setDisplayValue] = useState(''); // Valor visual (R$ 1.000,00)
  const [numericValue, setNumericValue] = useState(0); // Valor real (1000.00)
  
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  // Carrega Parceiros e Contas Bancárias
  const sortedPartners = useMemo(() => {
    return partnerService.getAll().sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  useEffect(() => {
    if (isOpen) {
        const accounts = financialService.getBankAccounts()
            .filter(acc => acc.active !== false)
            .sort((a, b) => a.bankName.localeCompare(b.bankName));
        setBankAccounts(accounts);
        
        // Reset form
        setPartnerId('');
        setDisplayValue('');
        setNumericValue(0);
        setAccountId('');
        setDescription('');
        setDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Lógica da Máscara de Moeda
  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, ''); // Remove tudo que não é dígito
    const amount = Number(rawValue) / 100; // Divide por 100 para ter centavos
    
    setNumericValue(amount);
    setDisplayValue(new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(amount));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const partner = sortedPartners.find(p => p.id === partnerId);
    
    if (!partner) {
        addToast('warning', 'Atenção', 'Selecione um parceiro.');
        return;
    }
    if (numericValue <= 0) {
        addToast('warning', 'Valor Inválido', 'O valor deve ser maior que zero.');
        return;
    }
    if (!accountId) {
        addToast('warning', 'Conta Obrigatória', 'Selecione a conta bancária de movimentação.');
        return;
    }

    const selectedAccount = bankAccounts.find(a => a.id === accountId);

    onSave({
      partnerId,
      partnerName: partner.name,
      type,
      date,
      value: numericValue,
      description,
      accountId,
      accountName: selectedAccount?.bankName || 'Conta Bancária'
    });
    onClose();
  };

  const inputClass = 'block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-800 transition-colors font-medium';
  const labelClass = 'block mb-1 text-xs font-bold text-slate-500 uppercase tracking-wide';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95">
        
        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white">
          <h3 className="font-bold text-lg">Novo Adiantamento</h3>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setType('given')}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-md transition-all flex items-center justify-center gap-2 ${type === 'given' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <ArrowUpRight size={16} />
              Conceder (Pagar)
            </button>
            <button
              type="button"
              onClick={() => setType('taken')}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-md transition-all flex items-center justify-center gap-2 ${type === 'taken' ? 'bg-white shadow text-amber-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <ArrowDownLeft size={16} />
              Receber (Tomar)
            </button>
          </div>

          <div className={`p-3 rounded-lg text-xs font-medium border ${type === 'given' ? 'bg-indigo-50 text-indigo-800 border-indigo-100' : 'bg-amber-50 text-amber-800 border-amber-100'}`}>
            {type === 'given' 
              ? 'Sai dinheiro do caixa da empresa para o parceiro. Gera um direito (crédito) futuro.'
              : 'Entra dinheiro no caixa da empresa vindo do parceiro. Gera uma obrigação (débito) futura.'
            }
          </div>

          <div>
            <label className={labelClass}>Parceiro</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
              <select 
                required 
                className={`${inputClass} pl-10 appearance-none`}
                value={partnerId}
                onChange={e => setPartnerId(e.target.value)}
              >
                <option value="">Selecione...</option>
                {sortedPartners.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Valor (R$)</label>
              <input 
                type="text" 
                required
                className={`${inputClass} font-black text-lg ${type === 'given' ? 'text-indigo-600' : 'text-amber-600'}`}
                placeholder="R$ 0,00"
                value={displayValue}
                onChange={handleValueChange}
              />
            </div>
            <div>
              <label className={labelClass}>Data</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                <input 
                  type="date" 
                  required 
                  className={`${inputClass} pl-10`}
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <label className={labelClass}>{type === 'given' ? 'Conta de Saída (Origem)' : 'Conta de Entrada (Destino)'}</label>
            <div className="relative">
                <Wallet className={`absolute left-3 top-1/2 -translate-y-1/2 ${type === 'given' ? 'text-red-400' : 'text-emerald-400'}`} size={18} />
                <select 
                    required 
                    value={accountId} 
                    onChange={e => setAccountId(e.target.value)} 
                    className={`${inputClass} pl-10 appearance-none pr-8`}
                >
                    <option value="">Selecione a Conta...</option>
                    {bankAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.bankName} - {acc.owner}</option>
                    ))}
                </select>
                <ArrowDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Descrição</label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
              <input 
                type="text" 
                required
                className={`${inputClass} pl-10`}
                placeholder="Ex: Compra de Insumos, Adiantamento Safra..."
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <button 
              type="button" 
              onClick={onClose}
              className="px-6 py-2.5 border border-slate-300 rounded-lg text-slate-600 bg-white hover:bg-slate-50 font-bold text-xs uppercase tracking-widest transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className={`px-8 py-2.5 rounded-lg text-white font-black text-xs uppercase tracking-widest shadow-lg flex items-center gap-2 transition-all active:scale-95 ${type === 'given' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-amber-600 hover:bg-amber-700'}`}
            >
              <Save size={16} />
              Confirmar
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default AdvanceForm;
