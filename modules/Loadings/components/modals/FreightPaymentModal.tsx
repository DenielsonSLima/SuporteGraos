import React, { useState } from 'react';
import { 
  X, 
  CreditCard, 
  Calendar, 
  Wallet, 
  FileText, 
  Save,
  Tag,
  AlertCircle
} from 'lucide-react';
import { Loading } from '../../types';
import { freightService } from '../../../../services/loadings/freightService';
import { loadingKpiService } from '../../../../services/loadings/loadingKpiService';
import { formatCurrency } from '../../../../utils/formatters';
import { useToast } from '../../../../contexts/ToastContext';
import { useAccounts } from '../../../../hooks/useAccounts';
import { accountsService } from '../../../../services/accountsService';

interface FreightPaymentModalProps {
  loading: Loading;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: Loading) => void;
  transaction?: any; // Para modo de edição
}

export function FreightPaymentModal({ loading, isOpen, onClose, onSuccess, transaction }: FreightPaymentModalProps) {
  const { addToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Resumo financeiro para sugestão de valores
  const summary = loadingKpiService.computeFreightSummary(loading);
  
  // Busca Contas Bancárias (Usando Hook Padrão)
  const { data: accounts = [] } = useAccounts();

  const [formData, setFormData] = useState({
    amount: transaction ? transaction.value : summary.balance,
    date: transaction ? new Date(transaction.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    accountId: transaction ? transaction.accountId : '',
    accountName: transaction ? transaction.accountName : '',
    discount: transaction ? transaction.discountValue : 0,
    notes: transaction ? (transaction.notes || '').replace(/\s*\[REF:.*\]$/, '') : ''
  });

  // Mascaramento de Moeda (Padrão Brasileiro 0.000,00)
  const formatCurrencyMask = (val: number | undefined) => {
    if (val === undefined || isNaN(val)) return '0,00';
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const handleCurrencyChange = (value: string, field: 'amount' | 'discount') => {
    // Remove tudo que não é dígito
    const digits = value.replace(/\D/g, '');
    // Transforma em centavos (ex: "123456" -> 1234.56)
    const numericValue = digits ? parseInt(digits) / 100 : 0;
    setFormData(prev => ({ ...prev, [field]: numericValue }));
  };

  const handleAccountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const account = accounts.find(a => a.id === e.target.value);
    setFormData(prev => ({ 
      ...prev, 
      accountId: e.target.value, 
      accountName: account?.account_name || '' 
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.accountId) {
      addToast('error', 'Selecione uma conta bancária');
      return;
    }

    try {
      setIsSubmitting(true);
      
      if (transaction) {
        // Modo Edição
        await freightService.updateFreightPayment(loading, transaction.id, formData);
        addToast('success', 'Lançamento atualizado com sucesso!');
      } else {
        // Modo Novo
        await freightService.addFreightPayment(loading, formData);
        addToast('success', 'Pagamento de frete registrado com sucesso!');
      }
      
      // Para fins de UX, como o onUpdate (onSuccess) recarrega os dados via mutação do componente pai,
      // passamos o loading atualizado (ou apenas sinalizamos sucesso)
      onSuccess(loading); 
      onClose();
    } catch (error: any) {
      addToast('error', 'Erro ao processar operação', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header Premium */}
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-blue-50/50">
          <div className="flex items-center gap-4">
            <div className={`p-3 ${transaction ? 'bg-amber-500' : 'bg-blue-600'} text-white rounded-2xl shadow-lg rotate-3 transition-transform`}>
              <CreditCard size={24} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 uppercase text-sm tracking-tighter leading-tight">
                {transaction ? 'Editar Lançamento de Frete' : 'Lançar Pagamento de Frete'}
              </h3>
              <p className="text-[10px] font-bold text-blue-600/70 uppercase tracking-widest mt-0.5">Logística: {loading.vehiclePlate}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl transition-all shadow-sm active:scale-90">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Valor do Lançamento */}
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor do Pagamento</label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs group-focus-within:text-blue-500 transition-colors">R$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={formatCurrencyMask(formData.amount)}
                  onChange={(e) => handleCurrencyChange(e.target.value, 'amount')}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-black text-slate-800 text-sm text-right"
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Desconto Aplicado</label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs group-focus-within:text-blue-500 transition-colors">R$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatCurrencyMask(formData.discount)}
                  onChange={(e) => handleCurrencyChange(e.target.value, 'discount')}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-black text-slate-800 text-sm text-right"
                  placeholder="0,00"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            {/* Data */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <div className="w-4 h-4 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Calendar size={10} />
                </div>
                Data Pagamento
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData(p => ({ ...p, date: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-xs font-black text-slate-700 uppercase"
              />
            </div>

            {/* Conta Bancária */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <div className="w-4 h-4 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Wallet size={10} />
                </div>
                Origem (Banco)
              </label>
              <select
                required
                value={formData.accountId}
                onChange={handleAccountChange}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-xs font-black text-slate-700 uppercase"
              >
                <option value="">Selecione a conta</option>
                {accounts.map((acc: any) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.account_name} - R$ {(acc.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <div className="w-4 h-4 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
                <FileText size={10} />
              </div>
              Observações
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
              rows={2}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-xs font-medium text-slate-600 placeholder:text-slate-300"
              placeholder="Detalhes adicionais sobre este pagamento..."
            />
          </div>

          {/* Summary Box */}
          <div className="p-5 bg-blue-50/50 rounded-[24px] border border-blue-100/50 flex items-start gap-4">
            <div className="p-2 bg-white text-blue-500 rounded-xl shadow-sm border border-blue-100 shrink-0">
              <Tag size={18} />
            </div>
            <div>
              <p className="text-[10px] text-blue-800 font-black uppercase tracking-widest">Sincronização Ativa</p>
              <p className="text-[10px] text-blue-600/70 font-medium leading-relaxed mt-1">
                As alterações realizadas aqui serão refletidas automaticamente no módulo financeiro e no saldo da carga.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 border border-slate-200 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 hover:text-slate-600 transition-all active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-[2] flex items-center justify-center gap-3 px-6 py-4 ${transaction ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'} text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl disabled:opacity-50 transition-all active:scale-95`}
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={18} />
                  {transaction ? 'Salvar Alterações' : 'Confirmar Pagamento'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
