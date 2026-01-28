
import React, { useMemo, useState } from 'react';
import { Freight } from '../types';
import FreightTable from '../components/FreightTable';
import { Calendar, Truck, Layers, ChevronRight, BarChart3, Scale, DollarSign } from 'lucide-react';

interface Props {
  freights: Freight[];
  onFreightClick: (freight: Freight) => void;
}

type GroupMode = 'month' | 'carrier';

const AllFreights: React.FC<Props> = ({ freights, onFreightClick }) => {
  const [groupMode, setGroupMode] = useState<GroupMode>('month');
  
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Lógica de Agrupamento
  const groups = useMemo(() => {
    const grouped: Record<string, { title: string; totalValue: number; totalWeight: number; items: Freight[] }> = {};

    freights.forEach(f => {
      let key = '';
      let title = '';

      if (groupMode === 'month') {
        const date = new Date(f.date);
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        title = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      } else {
        key = f.carrierName;
        title = f.carrierName;
      }

      if (!grouped[key]) {
        grouped[key] = { title, totalValue: 0, totalWeight: 0, items: [] };
      }

      grouped[key].items.push(f);
      grouped[key].totalValue += f.totalFreight;
      grouped[key].totalWeight += f.weight;
    });

    // Ordenação
    return Object.entries(grouped).sort((a, b) => {
      if (groupMode === 'month') {
        return b[0].localeCompare(a[0]); // Mais recentes primeiro
      }
      return a[1].title.localeCompare(b[1].title); // Alfabético para transportadora
    });
  }, [freights, groupMode]);

  if (freights.length === 0) {
    return (
      <div className="text-center py-20 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm">
        <Layers size={48} className="mx-auto mb-4 opacity-20" />
        <p className="font-medium text-lg">Nenhum registro encontrado</p>
        <p className="text-sm">Ajuste os filtros de busca para localizar fretes no histórico.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Grouping Switcher */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 text-slate-700">
          <Layers size={18} className="text-primary-600" />
          <span className="text-sm font-bold uppercase tracking-wider">Agrupar Histórico por:</span>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-lg w-full sm:w-auto">
          <button
            onClick={() => setGroupMode('month')}
            className={`flex-1 sm:flex-none px-6 py-2 text-xs font-black uppercase tracking-widest rounded-md transition-all flex items-center justify-center gap-2 ${
              groupMode === 'month' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Calendar size={14} />
            Mês e Ano
          </button>
          <button
            onClick={() => setGroupMode('carrier')}
            className={`flex-1 sm:flex-none px-6 py-2 text-xs font-black uppercase tracking-widest rounded-md transition-all flex items-center justify-center gap-2 ${
              groupMode === 'carrier' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Truck size={14} />
            Transportadora
          </button>
        </div>
      </div>

      {/* Render Groups */}
      <div className="space-y-8">
        {groups.map(([key, group]) => (
          <div key={key} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            
            {/* Group Summary Header */}
            <div className={`
              flex flex-col md:flex-row items-center justify-between bg-white px-6 py-4 rounded-t-2xl border-x border-t border-slate-200 shadow-sm
              ${groupMode === 'month' ? 'border-l-4 border-l-blue-500' : 'border-l-4 border-l-indigo-600'}
            `}>
              <div className="flex items-center gap-4 mb-4 md:mb-0 w-full md:w-auto">
                <div className={`p-3 rounded-xl ${groupMode === 'month' ? 'bg-blue-50 text-blue-600' : 'bg-indigo-50 text-indigo-600'}`}>
                  {groupMode === 'month' ? <Calendar size={24} /> : <Truck size={24} />}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 capitalize tracking-tight">{group.title}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-black uppercase">
                      {group.items.length} Cargas Realizadas
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-4 sm:gap-10 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-slate-100 pt-4 md:pt-0">
                <div className="flex flex-col items-end">
                  <span className="flex items-center gap-1 text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">
                    <Scale size={10} /> Volume Total
                  </span>
                  <span className="font-black text-slate-700 text-base">{(group.totalWeight / 1000).toLocaleString('pt-BR')} <span className="text-xs font-medium">TON</span></span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="flex items-center gap-1 text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">
                    <DollarSign size={10} /> Total de Fretes
                  </span>
                  <span className="font-black text-primary-600 text-base">{currency(group.totalValue)}</span>
                </div>
              </div>
            </div>

            {/* Table Area (Rounded bottom) */}
            <div className="bg-white border-x border-b border-slate-200 rounded-b-2xl overflow-hidden shadow-sm">
              <FreightTable freights={group.items} onFreightClick={onFreightClick} />
            </div>
          </div>
        ))}
      </div>

      {/* Footer Summary - Bottom of view */}
      <div className="mt-10 bg-slate-900 rounded-2xl p-6 text-white flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl border border-slate-800">
         <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-xl">
               <BarChart3 size={32} className="text-emerald-400" />
            </div>
            <div>
               <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Consolidado da Visão Atual</p>
               <h4 className="text-lg font-bold">Resumo Analítico do Histórico</h4>
            </div>
         </div>
         
         <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-center md:text-right">
            <div>
               <p className="text-[10px] text-slate-400 font-black uppercase mb-1">Total Movimentado</p>
               <p className="text-xl font-black text-white">
                  {(freights.reduce((a,b) => a + b.weight, 0) / 1000).toLocaleString('pt-BR')} <span className="text-xs font-normal opacity-50">TON</span>
               </p>
            </div>
            <div>
               <p className="text-[10px] text-slate-400 font-black uppercase mb-1">Investimento em Fretes</p>
               <p className="text-xl font-black text-emerald-400">
                  {currency(freights.reduce((a,b) => a + b.totalFreight, 0))}
               </p>
            </div>
            <div className="col-span-2 sm:col-span-1 border-t sm:border-t-0 sm:border-l border-white/10 pt-4 sm:pt-0 sm:pl-8">
               <p className="text-[10px] text-slate-400 font-black uppercase mb-1">Total de Cargas</p>
               <p className="text-xl font-black text-blue-400">{freights.length}</p>
            </div>
         </div>
      </div>
    </div>
  );
};

export default AllFreights;
