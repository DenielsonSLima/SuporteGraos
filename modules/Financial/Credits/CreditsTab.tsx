import React, { useState, useMemo } from 'react';
import { Plus, Search, CreditCard, TrendingUp, DollarSign, Trash2, Edit } from 'lucide-react';
import { creditLinesService } from '../../../services/creditLinesService';
import type { CreditLine } from '../../../services/creditLinesService';
import { useCreditLines, useCreditLineTotals } from '../../../hooks/useCreditLines';
import ActionConfirmationModal from '../../../components/ui/ActionConfirmationModal';
import { useToast } from '../../../contexts/ToastContext';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../../hooks/queryKeys';

const CreditsTab: React.FC = () => {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CreditLine | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    total_limit: '',
    interest_rate: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
  });

  // TanStack Query: dados + realtime automático
  const { data: creditLines = [], isLoading } = useCreditLines();
  const { data: totalsData } = useCreditLineTotals();

  const filteredCredits = useMemo(() => {
    if (!searchTerm) return creditLines;
    const lower = searchTerm.toLowerCase();
    return creditLines.filter(c =>
      c.name.toLowerCase().includes(lower)
    );
  }, [creditLines, searchTerm]);

  const totals = totalsData ?? { totalLimit: 0, totalUsed: 0, totalAvailable: 0 };

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);

  const formatValueInput = (val: string) => {
    const numbers = val.replace(/\D/g, '');
    if (!numbers) return '';
    return (parseInt(numbers, 10) / 100).toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
  };
  const parseValue = (val: string) => parseFloat(val.replace(/\./g, '').replace(',', '.')) || 0;

  const handleCreate = async () => {
    try {
      await creditLinesService.add({
        name: formData.name,
        total_limit: parseValue(formData.total_limit),
        interest_rate: formData.interest_rate ? parseValue(formData.interest_rate) : undefined,
        is_active: true,
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CREDIT_LINES });
      addToast('success', 'Linha de Crédito criada!');
      setIsFormOpen(false);
      setFormData({ name: '', total_limit: '', interest_rate: '', start_date: new Date().toISOString().split('T')[0], end_date: '' });
    } catch (err: any) {
      addToast('error', 'Erro ao criar', err.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-slate-900">Linhas de Crédito</h3>
          <p className="text-sm text-slate-500">Gerenciamento de limites de crédito</p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95"
        >
          <Plus size={18} />
          Nova Linha de Crédito
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-blue-500">
          <p className="text-[10px] text-blue-600 uppercase font-black tracking-widest">Limite Total</p>
          <p className="text-xl font-black text-blue-600 mt-1">{currency(totals.totalLimit)}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-amber-500">
          <p className="text-[10px] text-amber-600 uppercase font-black tracking-widest">Utilizado</p>
          <p className="text-xl font-black text-amber-600 mt-1">{currency(totals.totalUsed)}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
          <p className="text-[10px] text-emerald-600 uppercase font-black tracking-widest">Disponível</p>
          <p className="text-xl font-black text-emerald-600 mt-1">{currency(totals.totalAvailable)}</p>
        </div>
      </div>

      {/* Busca */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="Buscar linha de crédito..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-slate-100 bg-slate-50 text-sm focus:bg-white focus:border-slate-800 focus:outline-none transition-all font-medium"
        />
      </div>

      {/* Lista */}
      {filteredCredits.length === 0 ? (
        <div className="text-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
          <CreditCard size={48} className="mx-auto mb-4 text-slate-300" />
          <p className="font-bold uppercase tracking-widest">Nenhuma linha de crédito cadastrada</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCredits.map(cl => {
            const usagePercent = cl.total_limit > 0 ? (cl.used_amount / cl.total_limit) * 100 : 0;
            return (
              <div key={cl.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <CreditCard size={22} />
                  </div>
                  <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter border ${cl.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-300'}`}>
                    {cl.is_active ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
                <h4 className="font-black text-slate-800 text-lg uppercase tracking-tight mb-4">{cl.name}</h4>
                
                {/* Progress bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    <span>Utilização</span>
                    <span>{usagePercent.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div className={`h-2.5 rounded-full transition-all ${usagePercent > 80 ? 'bg-rose-500' : usagePercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(usagePercent, 100)}%` }} />
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Limite:</span>
                    <span className="font-bold text-slate-800">{currency(cl.total_limit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Utilizado:</span>
                    <span className="font-bold text-amber-600">{currency(cl.used_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Disponível:</span>
                    <span className="font-bold text-emerald-600">{currency(cl.available_amount)}</span>
                  </div>
                  {cl.interest_rate != null && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Juros:</span>
                      <span className="font-bold text-slate-800">{cl.interest_rate}% a.m.</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Formulário Inline */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white">
              <h3 className="font-bold text-lg">Nova Linha de Crédito</h3>
              <button onClick={() => setIsFormOpen(false)} className="hover:bg-white/20 p-2 rounded-full transition-colors">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block mb-1 text-xs font-bold text-slate-500 uppercase">Nome da Linha</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm focus:border-primary-500 focus:outline-none" placeholder="Ex: Crédito Banco do Brasil" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-xs font-bold text-slate-500 uppercase">Limite (R$)</label>
                  <input type="text" inputMode="numeric" required value={formData.total_limit}
                    onChange={e => setFormData({ ...formData, total_limit: formatValueInput(e.target.value) })}
                    className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm focus:border-primary-500 focus:outline-none font-bold" placeholder="0,00" />
                </div>
                <div>
                  <label className="block mb-1 text-xs font-bold text-slate-500 uppercase">Juros (% a.m.)</label>
                  <input type="text" inputMode="decimal" value={formData.interest_rate}
                    onChange={e => setFormData({ ...formData, interest_rate: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm focus:border-primary-500 focus:outline-none" placeholder="0,00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-xs font-bold text-slate-500 uppercase">Data Início</label>
                  <input type="date" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm focus:border-primary-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block mb-1 text-xs font-bold text-slate-500 uppercase">Data Fim</label>
                  <input type="date" value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm focus:border-primary-500 focus:outline-none" />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium text-sm">Cancelar</button>
                <button type="button" onClick={handleCreate} className="px-6 py-2 rounded-lg bg-slate-800 text-white font-bold shadow-sm hover:bg-slate-900 text-sm">Confirmar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditsTab;
