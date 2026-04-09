
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Save, X, Calendar, User, Search, Package, TrendingUp, ChevronDown, CheckCircle2, Calculator, MapPin, FileText } from 'lucide-react';
import { SalesOrder } from '../types';
import { Partner } from '../../Partners/types';
import { PARTNER_CATEGORY_IDS } from '../../../constants';
import { usePartners } from '../../../hooks/useParceiros';
import { useShareholders } from '../../../hooks/useShareholders';

interface Props {
  initialData?: SalesOrder;
  onSave: (order: SalesOrder) => void;
  onCancel: () => void;
}

const SalesOrderForm: React.FC<Props> = ({ initialData, onSave, onCancel }) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState<Partial<SalesOrder>>({
    consultantName: '',
    productName: 'Milho em Grãos',
    quantity: 0,
    unitPrice: 0,
    totalValue: 0,
    status: 'pending',
    date: new Date().toISOString().split('T')[0],
    ...initialData,
    id: initialData?.id || crypto.randomUUID(),
    number: initialData?.number || `PV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    loadings: initialData?.loadings || [],
    transactions: initialData?.transactions || []
  });

  const [displayPrice, setDisplayPrice] = useState(initialData?.unitPrice ? String(initialData.unitPrice) : '');
  const { data: partnersData } = usePartners({ page: 1, pageSize: 2000, category: 'all' });
  const { data: shareholdersRaw = [] } = useShareholders();
  const [customerSearch, setCustomerSearch] = useState(initialData?.customerName || '');
  const [isSearching, setIsSearching] = useState(false);

  const partners = useMemo(() => {
    return (partnersData?.data || [])
      .filter(p =>
        p.categories.includes(PARTNER_CATEGORY_IDS.CUSTOMER) ||
        p.categories.includes(PARTNER_CATEGORY_IDS.INDUSTRY)
      )
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [partnersData]);

  const shareholders = useMemo(() => {
    return [...shareholdersRaw].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [shareholdersRaw]);

  const formatBRL = (val: number) => {
    const normalized = Math.abs(val) < 0.01 ? 0 : val;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(normalized);
  };

  useEffect(() => {
    if (initialData?.unitPrice) setDisplayPrice(formatBRL(initialData.unitPrice));

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSearching(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [initialData]);

  useEffect(() => {
    const qty = formData.quantity || 0;
    const price = formData.unitPrice || 0;
    setFormData(prev => ({ ...prev, totalValue: qty * price }));
  }, [formData.quantity, formData.unitPrice]);

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const num = Number(raw) / 100;
    setFormData({ ...formData, unitPrice: num });
    setDisplayPrice(formatBRL(num));
  };

  const handleSelectCustomer = (p: Partner) => {
    setFormData({
      ...formData,
      customerId: p.id,
      customerName: p.name,
      customerDocument: p.document,
      customerCity: p.address?.cityName || (p.address as any)?.city || '',
      customerState: p.address?.stateUf || (p.address as any)?.state || ''
    });
    setCustomerSearch(p.name);
    setIsSearching(false);
  };

  const filteredPartners = useMemo(() => {
    const term = customerSearch.toLowerCase();
    return partners.filter(p => 
      p.name.toLowerCase().includes(term) || 
      (p.document || '').toLowerCase().includes(term) || 
      (p.nickname && p.nickname.toLowerCase().includes(term))
    );
  }, [partners, customerSearch]);

  // Classes de fonte e estilo PADRONIZADAS com Pedido de Compra
  const labelClass = 'block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-widest ml-1';
  const inputClass = 'block w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-slate-900 font-bold focus:border-emerald-500 outline-none transition-all placeholder:text-slate-300 shadow-sm';

  return (
    <div className="mx-auto max-w-4xl rounded-[2.5rem] border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-8 py-6 text-white">
        <div className="flex items-center gap-4">
           <div className="p-3 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-500/20"><TrendingUp size={24} /></div>
           <div>
              <h2 className="text-xl font-black uppercase italic tracking-tighter">
                {initialData ? `Editar Venda ${initialData.number}` : 'Novo Pedido de Venda'}
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Negociação de Saída de Grãos</p>
           </div>
        </div>
        <button onClick={onCancel} className="hover:bg-white/10 p-2 rounded-full transition-colors text-slate-400 hover:text-white"><X size={28} /></button>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); if(!formData.customerId) return alert('Selecione um cliente.'); onSave(formData as SalesOrder); }} className="bg-slate-50/30 p-8 space-y-8">
          
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
            <h3 className="flex items-center gap-2 font-black text-slate-800 uppercase text-xs tracking-tighter border-b border-slate-50 pb-4 mb-2">
                <div className="w-1 h-4 bg-emerald-500 rounded-full"></div>
                1. Informações da Venda & Cliente
            </h3>
            
            <div className="grid gap-6 md:grid-cols-2">
                <div>
                    <label className={labelClass}>Data da Negociação</label>
                    <div className="relative">
                       <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                       <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className={`${inputClass} pl-12`} />
                    </div>
                </div>
                <div>
                    <label className={labelClass}>Vendedor Responsável (Sócio)</label>
                    <div className="relative">
                       <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                       <select required value={formData.consultantName} onChange={e => setFormData({...formData, consultantName: e.target.value})} className={`${inputClass} pl-12 appearance-none`}>
                           <option value="">Selecione o vendedor...</option>
                           {shareholders.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                       </select>
                       <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={18} />
                    </div>
                </div>

                {/* BUSCA DE CLIENTE DETALHADA - ORDEM ALFABÉTICA */}
                <div className="md:col-span-2 relative" ref={dropdownRef}>
                    <label className={labelClass}>Cliente (Comprador)</label>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            value={customerSearch} 
                            onFocus={() => setIsSearching(true)} 
                            onChange={e => { setCustomerSearch(e.target.value); setIsSearching(true); }} 
                            placeholder="Buscar por razão social, apelido ou CNPJ..." 
                            className={`${inputClass} pl-12 h-12 text-base`} 
                        />
                        {formData.customerId && !isSearching && (
                            <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500" size={22} />
                        )}
                    </div>

                    {isSearching && (
                        <div className="absolute z-50 mt-2 w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-2">
                            <div className="max-h-64 overflow-y-auto">
                                {filteredPartners.length === 0 ? (
                                    <div className="p-6 text-center text-slate-400 italic text-sm">Nenhum cliente encontrado.</div>
                                ) : (
                                    filteredPartners.map(p => (
                                        <div 
                                            key={p.id} 
                                            onClick={() => handleSelectCustomer(p)} 
                                            className="p-4 hover:bg-emerald-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors group"
                                        >
                                            <div className="font-black text-slate-900 uppercase text-sm group-hover:text-emerald-700 transition-colors">{p.name}</div>
                                            <div className="flex justify-between items-center mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                                <span className="flex items-center gap-1"><FileText size={10}/> {p.document}{p.nickname ? ` • ${p.nickname}` : ''}</span>
                                                <span className="flex items-center gap-1"><MapPin size={10}/> {p.address?.cityName || (p.address as any)?.city || 'N/D'}/{p.address?.stateUf || (p.address as any)?.state || '??'}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
             <h3 className="flex items-center gap-2 font-black text-slate-800 uppercase text-xs tracking-tighter border-b border-slate-50 pb-4 mb-6">
                <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                2. Produto e Valores Negociados
             </h3>
             <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-3">
                    <label className={labelClass}>Mercadoria</label>
                    <div className="relative">
                       <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                       <input type="text" value={formData.productName} onChange={e => setFormData({...formData, productName: e.target.value})} className={`${inputClass} pl-12`} />
                    </div>
                </div>
                <div>
                    <label className={labelClass}>Quantidade Estimada (Sacas)</label>
                    <input type="number" value={formData.quantity || ''} onChange={e => setFormData({...formData, quantity: parseFloat(e.target.value)})} className={inputClass} placeholder="0" />
                </div>
                <div>
                    <label className={labelClass}>Preço de Venda (R$/SC)</label>
                    <input type="text" value={displayPrice} onChange={handlePriceChange} className={`${inputClass} text-emerald-700 font-black text-lg`} placeholder="R$ 0,00" />
                </div>
                <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 flex flex-col justify-center shadow-inner">
                    <label className={labelClass}>Total Projetado do Pedido</label>
                    <div className="flex items-center gap-2">
                        <Calculator size={18} className="text-slate-400" />
                        <div className="text-xl font-black text-slate-900">{formatBRL(formData.totalValue || 0)}</div>
                    </div>
                </div>
             </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onCancel} className="px-8 py-4 border-2 border-slate-200 rounded-2xl text-slate-500 font-black uppercase text-xs tracking-widest hover:bg-slate-50 transition-all">Cancelar</button>
            <button type="submit" className="px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95">Salvar Pedido de Venda</button>
          </div>
      </form>
    </div>
  );
};

export default SalesOrderForm;
