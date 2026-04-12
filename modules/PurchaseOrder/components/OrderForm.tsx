
import React, { useState, useCallback, useMemo } from 'react';
import { Save, X, ShoppingCart, Calculator, Loader2 } from 'lucide-react';
import { PurchaseOrder } from '../types';

// Components
import OrderGeneralInfo from './form/OrderGeneralInfo';
import OrderPartnerSection from './form/OrderPartnerSection';
import OrderBrokerSection from './form/OrderBrokerSection';
import OrderItemsSection from './form/OrderItemsSection';

import { useShareholders } from '../../../hooks/useShareholders';
import { usePartners } from '../../../hooks/useParceiros';
import { Partner } from '../../Partners/types';

interface Props {
  initialData?: PurchaseOrder;
  onSave: (order: PurchaseOrder) => Promise<void> | void;
  onCancel: () => void;
}

const OrderForm: React.FC<Props> = ({ initialData, onSave, onCancel }) => {
  // TanStack Query hooks — cache + realtime automáticos (SKIL: zero service imports)
  const { data: partnersData } = usePartners({ page: 1, pageSize: 2000, category: 'all' });
  const { data: shareholdersRaw = [] } = useShareholders();
  const [isSaving, setIsSaving] = useState(false);

  const partners = useMemo(
    () => (partnersData?.data || []).sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [partnersData]
  );
  const shareholders = useMemo(
    () => [...shareholdersRaw].sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [shareholdersRaw]
  );
  
  const getLocalDate = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const localDate = new Date(now.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState<Partial<PurchaseOrder>>({
    number: `PC-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`,
    date: getLocalDate(),
    status: 'approved', 
    consultantName: '',
    items: [],
    transactions: [],
    totalValue: 0,
    paidValue: 0,
    transportValue: 0,
    useRegisteredLocation: true,
    hasBroker: false,
    notes: '',
    ...initialData
  });

  const updateField = (field: keyof PurchaseOrder, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateMultiple = (updates: Partial<PurchaseOrder>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return; // Proteção contra double-click
    if (!formData.partnerId) return alert('Selecione um parceiro/fornecedor.');
    if (!formData.consultantName) return alert('Informe o nome do consultor.');
    if (!formData.items || formData.items.length === 0) return alert('Adicione pelo menos um item ao pedido.');
    
    setIsSaving(true);
    try {
      await onSave(formData as PurchaseOrder);
    } catch (err) {
      console.error('Erro ao salvar pedido:', err);
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, formData, onSave]);

  return (
    <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-8 py-6 text-white">
        <div className="flex items-center gap-4">
           <div className="p-3 bg-blue-600 rounded-2xl shadow-lg">
             <ShoppingCart size={24} />
           </div>
           <div>
              <h2 className="text-xl font-black uppercase italic tracking-tighter">
                {initialData ? `Editar Pedido ${initialData.number}` : 'Novo Pedido de Compra'}
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Negociação de entrada de grãos</p>
           </div>
        </div>
        <button onClick={onCancel} className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors">
          <X size={28} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-slate-50/30">
        <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
          <OrderGeneralInfo data={formData} onChange={updateField} shareholders={shareholders} />
          <OrderPartnerSection data={formData} partners={partners} onChange={updateMultiple} />
          <OrderBrokerSection data={formData} partners={partners} onChange={updateMultiple} />
          <OrderItemsSection items={formData.items || []} onChange={(items, total) => updateMultiple({ items, totalValue: total })} />
        </div>

        <div className="sticky bottom-0 z-10 flex flex-col sm:flex-row items-center justify-between border-t border-slate-200 bg-white px-8 py-6 gap-4">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
                <Calculator size={20} />
             </div>
             <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Total Contratual Projetado</span>
                <span className="text-2xl font-black text-slate-900 tracking-tighter">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(formData.totalValue || 0)}
                </span>
             </div>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button type="button" onClick={onCancel} disabled={isSaving} className="flex-1 sm:flex-none rounded-2xl border-2 border-slate-200 bg-white px-8 py-3.5 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">Cancelar</button>
            <button type="submit" disabled={isSaving} className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-10 py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:bg-blue-600">
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {isSaving ? 'Salvando...' : 'Salvar Pedido'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default OrderForm;
