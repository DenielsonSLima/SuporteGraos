
import React, { useState, useEffect, useMemo } from 'react';
import { Search, Truck, ArrowRightLeft, DollarSign, Loader2 } from 'lucide-react';
import { Loading } from '../Loadings/types';
import OpenFreights from './tabs/OpenFreights';
import AllFreights from './tabs/AllFreights';
import FreightFinancials from './tabs/FreightFinancials';
import LogisticsKPIs from './components/LogisticsKPIs';
import LoadingManagement from '../Loadings/components/LoadingManagement';
import { useLoadings } from '../../hooks/useLoadings';
import { useFreights } from '../../hooks/useFreights';
import { useCarriers } from '../../hooks/useCarriers';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../hooks/queryKeys';

const LogisticsModule: React.FC = () => {
  const queryClient = useQueryClient();
  // useFreights: cálculos (balance, financial_status, breakage) vêm da VIEW do banco
  const { data: freights = [], isLoading: freightsLoading } = useFreights();
  // useLoadings: necessário apenas para findLoadingById (LoadingManagement requer Loading completo)
  const { data: rawLoadings = [] } = useLoadings();
  const { data: carriers = [], isLoading: carriersLoading } = useCarriers();
  const [activeTab, setActiveTab] = useState<'open' | 'all' | 'financial'>('open');
  const [searchTerm, setSearchTerm] = useState('');
  const [carrierFilter, setCarrierFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedLoading, setSelectedLoading] = useState<Loading | null>(null);

  const selectedLoadingRef = React.useRef<Loading | null>(null);
  selectedLoadingRef.current = selectedLoading;

  useEffect(() => {
    const handleGlobalNav = (e: any) => {
        if (e.detail?.moduleId === 'logistics' && e.detail?.loadingId) {
          const l = rawLoadings.find((x: any) => x.id === e.detail.loadingId);
            if (l) setSelectedLoading(l);
        }
    };
    
    window.addEventListener('app:navigate', handleGlobalNav);

    return () => {
      window.removeEventListener('app:navigate', handleGlobalNav);
    };
  }, [rawLoadings]);

  // Freights filtrados SEM filtro de aba — usado pelos KPIs superiores
  const kpiFreights = useMemo(() => {
    return freights.filter(f => {
      const search = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || f.carrierName.toLowerCase().includes(search) || f.driverName.toLowerCase().includes(search) || f.vehiclePlate.toLowerCase().includes(search) || f.orderNumber.toLowerCase().includes(search);
      const matchesCarrier = !carrierFilter || f.carrierName === carrierFilter;
      const matchesDate = (!startDate || f.date >= startDate) && (!endDate || f.date <= endDate);
      return matchesSearch && matchesCarrier && matchesDate;
    });
  }, [freights, searchTerm, carrierFilter, startDate, endDate]);

  // Freights filtrados COM filtro de aba — usado pelas tabelas
  const filteredFreights = useMemo(() => {
    return kpiFreights.filter(f => {
      if (activeTab === 'open') return f.status !== 'completed' || f.balanceValue > 0.05;
      return true;
    });
  }, [kpiFreights, activeTab]);

  const loading = freightsLoading || carriersLoading;

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Carregando logística...</p>
        </div>
      </div>
    );
  }

  const findLoadingById = (id: string) => rawLoadings.find((l: any) => l.id === id) || null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <LogisticsKPIs filters={{ carrierName: carrierFilter, startDate, endDate, searchTerm }} freights={kpiFreights} />

      <div className="flex flex-col gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por placa, motorista ou pedido..." className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 py-3 pl-10 pr-4 text-sm font-bold focus:bg-white transition-all outline-none" />
            </div>
            { (searchTerm || carrierFilter || startDate || endDate) && <button onClick={() => { setSearchTerm(''); setCarrierFilter(''); setStartDate(''); setEndDate(''); }} className="text-xs font-black text-rose-600 uppercase bg-rose-50 px-4 py-2 rounded-xl">Limpar Filtros</button> }
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-50">
            <div className="relative"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Data Inicial</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full rounded-xl border-2 border-slate-100 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-blue-500" /></div>
            <div className="relative"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Data Final</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full rounded-xl border-2 border-slate-100 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-blue-500" /></div>
            <div className="relative sm:col-span-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Transportadora</label><select value={carrierFilter} onChange={e => setCarrierFilter(e.target.value)} className="w-full rounded-xl border-2 border-slate-100 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-blue-500 appearance-none"><option value="">Todas</option>{carriers.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
        </div>
      </div>

      <div className="border-b border-slate-200 overflow-x-auto">
        <nav className="-mb-px flex space-x-8">
          <button onClick={() => setActiveTab('open')} className={`whitespace-nowrap border-b-4 py-4 px-1 text-sm font-black uppercase tracking-tighter transition-all flex items-center gap-2 ${activeTab === 'open' ? 'border-amber-500 text-amber-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}><Truck size={18}/> Em Aberto</button>
          <button onClick={() => setActiveTab('financial')} className={`whitespace-nowrap border-b-4 py-4 px-1 text-sm font-black uppercase tracking-tighter transition-all flex items-center gap-2 ${activeTab === 'financial' ? 'border-blue-600 text-blue-800' : 'border-transparent text-slate-400 hover:text-slate-600'}`}><DollarSign size={18}/> Financeiro</button>
          <button onClick={() => setActiveTab('all')} className={`whitespace-nowrap border-b-4 py-4 px-1 text-sm font-black uppercase tracking-tighter transition-all flex items-center gap-2 ${activeTab === 'all' ? 'border-slate-800 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}><ArrowRightLeft size={18}/> Histórico</button>
        </nav>
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'open' && <OpenFreights freights={filteredFreights} onFreightClick={(f) => setSelectedLoading(findLoadingById(f.id))} />}
        {activeTab === 'all' && <AllFreights freights={filteredFreights} onFreightClick={(f) => setSelectedLoading(findLoadingById(f.id))} />}
        {activeTab === 'financial' && <FreightFinancials freights={filteredFreights} onManageFinancials={(f) => setSelectedLoading(findLoadingById(f.id))} />}
      </div>

      {selectedLoading && <LoadingManagement loading={selectedLoading} onClose={() => setSelectedLoading(null)} onUpdate={() => { queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LOADINGS }); }} originContext="logistics" />}
    </div>
  );
};

export default LogisticsModule;
