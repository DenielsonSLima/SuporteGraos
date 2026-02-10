
import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, DollarSign, FileText, User, Wallet, ArrowRight, CheckCircle2, TrendingDown, TrendingUp, ArrowDown } from 'lucide-react';
import { Shareholder } from '../../../../services/shareholderService';
import { financialService, BankAccountWithBalance } from '../../../../services/financialService';
import { getLocalDateString } from '../../../../utils/dateUtils';
import { useToast } from '../../../../contexts/ToastContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  shareholders: Shareholder[];
  onProcessTransaction: (type: 'credit' | 'payment', data: { shareholderId: string, date: string, value: number, description: string, accountId?: string, accountName?: string }) => void;
}

const ShareholderBulkCreditModal: React.FC<Props> = ({ isOpen, onClose, shareholders, onProcessTransaction }) => {
  const { addToast } = useToast();
  
  const [globalDate, setGlobalDate] = useState(getLocalDateString());
  const [globalDescription, setGlobalDescription] = useState('Pro-labore Mensal');
  const [values, setValues] = useState<Record<string, string>>({});
  const [payingShareholderId, setPayingShareholderId] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [bankAccounts, setBankAccounts] = useState<BankAccountWithBalance[]>([]);
  const [processedIds, setProcessedIds] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
        const accounts = financialService.getBankAccountsWithBalances()
            .filter(acc => acc.active !== false)
            .sort((a, b) => a.bankName.localeCompare(b.bankName));
        setBankAccounts(accounts);
        setProcessedIds([]);
        setValues({});
        setGlobalDate(getLocalDateString());
        setGlobalDescription('Pro-labore Mensal');
    }
  }, [isOpen]);

  const handleValueChange = (id: string, rawValue: string) => {
    const digits = rawValue.replace(/\D/g, '');
    const numberValue = Number(digits) / 100;
    setValues(prev => ({ ...prev, [id]: numberValue.toFixed(2) }));
    if (processedIds.includes(id)) setProcessedIds(prev => prev.filter(pid => pid !== id));
  };

  const formatDisplayValue = (val: string | undefined) => {
    if (!val) return '';
    const num = parseFloat(val);
    if (isNaN(num)) return '';
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  };

  const handleCredit = (shareholderId: string) => {
    const val = parseFloat(values[shareholderId]);
    if (!val || val <= 0) return addToast('warning', 'Valor Inválido');
    onProcessTransaction('credit', { shareholderId, date: globalDate, value: val, description: globalDescription });
    setProcessedIds(prev => [...prev, shareholderId]);
  };

  const initiatePayment = (shareholderId: string) => {
    const val = parseFloat(values[shareholderId]);
    if (!val || val <= 0) return addToast('warning', 'Valor Inválido');
    setPayingShareholderId(shareholderId);
    setSelectedAccountId('');
  };

  const confirmPayment = () => {
    if (!payingShareholderId || !selectedAccountId) return;
    const account = bankAccounts.find(a => a.id === selectedAccountId);
    const val = parseFloat(values[payingShareholderId]);
    onProcessTransaction('payment', { shareholderId: payingShareholderId, date: globalDate, value: val, description: globalDescription, accountId: selectedAccountId, accountName: account?.bankName });
    setProcessedIds(prev => [...prev, payingShareholderId]);
    setPayingShareholderId(null);
    setSelectedAccountId('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
        <div className="bg-slate-900 px-6 py-5 flex justify-between items-center text-white shrink-0">
          <div className="flex items-center gap-3"><div className="p-2 bg-emerald-600 rounded-lg text-white shadow-lg"><User size={24} /></div><div><h3 className="font-bold text-xl uppercase tracking-tight italic">Painel de Lançamentos</h3><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Distribuição Individual de Créditos e Pagamentos</p></div></div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors"><X size={24} /></button>
        </div>
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
            <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Data de Referência</label><div className="relative"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="date" value={globalDate} onChange={e => setGlobalDate(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm font-bold bg-white" /></div></div>
            <div className="md:col-span-2"><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Histórico Padrão</label><div className="relative"><FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" value={globalDescription} onChange={e => setGlobalDescription(e.target.value)} placeholder="Pro-labore..." className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm font-bold bg-white" /></div></div>
        </div>
        <div className="flex-1 overflow-y-auto p-0 bg-white">
           <table className="w-full text-left border-collapse"><thead className="bg-slate-100 text-slate-500 text-[10px] font-black uppercase sticky top-0 z-10 shadow-sm"><tr><th className="px-6 py-3 border-b border-slate-200">Sócio</th><th className="px-4 py-3 border-b border-slate-200 w-48">Valor Individual</th><th className="px-4 py-3 border-b border-slate-200 text-center">Lançar Saldo</th><th className="px-4 py-3 border-b border-slate-200 text-center">Pagar (Baixa)</th></tr></thead><tbody className="divide-y divide-slate-100">{shareholders.map(s => { const isProcessed = processedIds.includes(s.id); return (<tr key={s.id} className={`transition-colors ${isProcessed ? 'bg-emerald-50/50' : 'hover:bg-slate-50'}`}><td className="px-6 py-4"><p className="font-bold text-slate-800 text-sm">{s.name}</p><p className="text-[10px] text-slate-400 font-mono">{s.cpf}</p></td><td className="px-4 py-4"><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span><input type="text" inputMode="numeric" value={formatDisplayValue(values[s.id])} onChange={e => handleValueChange(s.id, e.target.value)} placeholder="0,00" className={`w-full pl-9 pr-3 py-2.5 border-2 rounded-xl text-sm font-black focus:outline-none transition-all ${isProcessed ? 'border-emerald-200 bg-white text-emerald-700' : 'border-slate-200 bg-white text-slate-800 focus:border-blue-500'}`} /></div></td><td className="px-4 py-4 text-center">{isProcessed ? (<div className="flex items-center justify-center gap-1 text-emerald-600 font-bold text-xs uppercase animate-in zoom-in"><CheckCircle2 size={16} /> Lançado</div>) : (<button onClick={() => handleCredit(s.id)} className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-xs uppercase hover:bg-indigo-100 transition-all active:scale-95"><TrendingUp size={16} /> Saldo</button>)}</td><td className="px-4 py-4 text-center">{isProcessed ? (<button onClick={() => setProcessedIds(prev => prev.filter(pid => pid !== s.id))} className="text-[10px] text-slate-400 hover:text-blue-600 underline">Novo Lançamento</button>) : (<button onClick={() => initiatePayment(s.id)} className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs uppercase hover:bg-rose-100 transition-all active:scale-95"><TrendingDown size={16} /> Pagar</button>)}</td></tr>);})}</tbody></table>
        </div>
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-between items-center text-xs text-slate-500 shrink-0"><span>* Lançamentos de saldo ficam pendentes para retirada futura.</span><button onClick={onClose} className="font-bold hover:text-slate-800 uppercase tracking-widest">Fechar Painel</button></div>
        {payingShareholderId && (
            <div className="absolute inset-0 z-20 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in p-4">
                <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                    <div className="bg-rose-600 px-5 py-4 text-white flex justify-between items-center"><span className="font-bold text-sm uppercase tracking-widest">Confirmar Pagamento</span><button onClick={() => setPayingShareholderId(null)}><X size={18}/></button></div>
                    <div className="p-6 space-y-4"><div className="text-center"><p className="text-xs text-slate-500 uppercase font-bold">Valor a Pagar</p><p className="text-3xl font-black text-rose-600 mt-1">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(values[payingShareholderId] || '0'))}</p><p className="text-sm font-bold text-slate-800 mt-2">Para: {shareholders.find(s => s.id === payingShareholderId)?.name}</p></div><div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Selecione a Conta de Saída (Saldo Real)</label><div className="relative"><Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><select value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)} className="w-full pl-10 pr-4 py-3 border-2 border-rose-100 rounded-xl bg-white text-slate-800 font-bold focus:border-rose-500 outline-none appearance-none"><option value="">Escolha o Banco...</option>{bankAccounts.map(acc => (<option key={acc.id} value={acc.id}>{acc.bankName} - {acc.owner} (Saldo: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(acc.currentBalance)})</option>))}</select><ArrowDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} /></div></div><button onClick={confirmPayment} disabled={!selectedAccountId} className="w-full py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl font-black text-sm uppercase shadow-lg transition-all active:scale-95">Efetivar Pagamento</button></div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default ShareholderBulkCreditModal;
