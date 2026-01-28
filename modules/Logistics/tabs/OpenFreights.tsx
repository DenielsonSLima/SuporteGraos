
import React, { useMemo, useState } from 'react';
import { Freight } from '../types';
// Add ArrowRight to the imports from lucide-react
import { Truck, DollarSign, Package, Scale, Calendar, FileText, User, MapPin, MoreHorizontal, AlertCircle, CheckCircle2, Calculator, ArrowRight } from 'lucide-react';

type ViewMode = 'all' | 'pending_unload' | 'pending_financial';

interface Props {
  freights: Freight[]; 
  onFreightClick: (freight: Freight) => void;
}

const OpenFreights: React.FC<Props> = ({ freights, onFreightClick }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const number = (val: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(val);
  const dateStr = (val: string) => new Date(val).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

  // 1. Filtragem Inicial: Apenas o que não está finalizado OU tem financeiro pendente
  const activeFreights = useMemo(() => 
    freights.filter(f => f.status !== 'completed' || f.balanceValue > 0.05),
  [freights]);

  // 2. Filtragem por Sub-modo
  const filteredData = useMemo(() => {
    switch (viewMode) {
      case 'pending_unload':
        return activeFreights.filter(f => f.status !== 'completed');
      case 'pending_financial':
        return activeFreights.filter(f => f.balanceValue > 0.05);
      default:
        return activeFreights;
    }
  }, [activeFreights, viewMode]);

  // Cálculos de Resumo
  const summary = useMemo(() => {
    const payable = filteredData.reduce((acc, f) => acc + f.balanceValue, 0);
    const count = filteredData.length;
    const mercVal = filteredData.reduce((acc, f) => acc + (f.merchandiseValue || 0), 0);
    const volumeTon = filteredData.reduce((acc, f) => acc + (f.weight / 1000), 0);

    return { payable, count, mercVal, volumeTon };
  }, [filteredData]);

  if (activeFreights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
        <Truck size={48} className="mb-4 opacity-50" />
        <p className="font-medium">Nenhum frete em aberto no momento.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-amber-600 uppercase mb-1">Saldo a Pagar</p>
            <p className="text-xl font-black text-amber-900">{currency(summary.payable)}</p>
          </div>
          <DollarSign size={20} className="text-amber-400" />
        </div>
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-blue-600 uppercase mb-1">Cargas na Lista</p>
            <p className="text-2xl font-black text-blue-900">{summary.count}</p>
          </div>
          <Truck size={20} className="text-blue-400" />
        </div>
        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Valor em Risco</p>
            <p className="text-xl font-black text-emerald-900">{currency(summary.mercVal)}</p>
          </div>
          <Package size={20} className="text-emerald-400" />
        </div>
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Volume (Ton)</p>
            <p className="text-2xl font-black text-slate-700">{number(summary.volumeTon)}</p>
          </div>
          <Scale size={20} className="text-slate-400" />
        </div>
      </div>

      {/* View Switcher */}
      <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm w-fit">
        <button 
          onClick={() => setViewMode('all')}
          className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === 'all' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Ambos (Geral)
        </button>
        <button 
          onClick={() => setViewMode('pending_unload')}
          className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === 'pending_unload' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Pendentes de Descarrego
        </button>
        <button 
          onClick={() => setViewMode('pending_financial')}
          className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === 'pending_financial' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Financeiro em Aberto
        </button>
      </div>

      {/* Detailed Analytics Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white uppercase font-black tracking-tighter">
                <th className="px-4 py-3 border-r border-slate-800">Data / Pedido</th>
                <th className="px-4 py-3 border-r border-slate-800">Transp. / Motorista</th>
                <th className="px-4 py-3 border-r border-slate-800">Rota (Origem {' -> '} Destino)</th>
                <th className="px-4 py-3 text-right border-r border-slate-800">Peso Car.</th>
                <th className="px-4 py-3 text-right border-r border-slate-800">Peso Desc.</th>
                <th className="px-4 py-3 text-right border-r border-slate-800 text-rose-300">Quebra</th>
                <th className="px-4 py-3 text-right border-r border-slate-800">Frete/T</th>
                <th className="px-4 py-3 text-right border-r border-slate-800">Total Bruto</th>
                <th className="px-4 py-3 text-right border-r border-slate-800 text-emerald-300">Total Pago</th>
                <th className="px-4 py-3 text-right border-r border-slate-800 text-rose-300">Pendente</th>
                <th className="px-4 py-3 text-center border-r border-slate-800">Base</th>
                <th className="px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredData.length === 0 ? (
                <tr><td colSpan={12} className="p-10 text-center text-slate-400 italic font-bold uppercase tracking-widest">Nenhum frete nesta visualização.</td></tr>
              ) : (
                filteredData.map(f => (
                  <tr key={f.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => onFreightClick(f)}>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900">{dateStr(f.date)}</span>
                        <span className="text-[10px] text-blue-600 font-bold">#{f.orderNumber}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col max-w-[120px]">
                        <span className="font-black text-slate-800 truncate uppercase tracking-tighter" title={f.carrierName}>{f.carrierName}</span>
                        <span className="text-[10px] text-slate-500 truncate">{f.driverName} • {f.vehiclePlate}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-slate-600">
                         <span className="font-bold">{f.supplierName.split(' ')[0]}</span>
                         <ArrowRight size={10} className="text-slate-300" />
                         <span className="font-bold">{f.destinationCity}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">{number(f.weight)}</td>
                      <td className="px-4 py-3 text-right font-bold text-blue-700">
                        {f.unloadWeightKg !== undefined ? number(f.unloadWeightKg) : <span className="text-slate-300 font-normal italic">Pendente</span>}
                      </td>
                      <td className={`px-4 py-3 text-right font-black ${f.breakageKg && f.breakageKg > 0 ? 'text-rose-600' : 'text-slate-300'}`}>
                        {f.breakageKg !== undefined ? number(f.breakageKg) : '-'}
                      </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-700">{currency(f.pricePerUnit)}</td>
                    <td className="px-4 py-3 text-right font-black text-slate-900">{currency(f.totalFreight)}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">{currency(f.paidValue)}</td>
                    <td className="px-4 py-3 text-right font-black text-rose-700">{currency(f.balanceValue)}</td>
                    <td className="px-4 py-3 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter border ${f.freightBase === 'Destino' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                          {f.freightBase || 'Origem'}
                       </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={(e) => { e.stopPropagation(); onFreightClick(f); }} className="p-1.5 rounded-lg text-slate-400 hover:bg-white hover:text-blue-600 hover:shadow-sm border border-transparent hover:border-slate-200">
                        <MoreHorizontal size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-start gap-3">
        <Calculator size={18} className="text-indigo-600 mt-0.5" />
        <div className="text-xs text-indigo-900 font-medium leading-relaxed">
           <p className="font-black uppercase tracking-wider mb-1">Regras de Exibição Analítica</p>
           <p>Esta tabela exibe apenas cargas com pendência operacional (em trânsito/descarrego) ou financeira (saldo devedor). Utilize a aba <strong>Histórico</strong> para consultar cargas totalmente finalizadas e quitadas.</p>
        </div>
      </div>
    </div>
  );
};

export default OpenFreights;
