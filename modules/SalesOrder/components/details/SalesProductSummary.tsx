import React from 'react';
import { Package, TrendingUp, Scale, Truck, ShoppingBag, Info, Coins, ArrowRight } from 'lucide-react';
import { Loading } from '../../../Loadings/types';
import { SalesOrder } from '../../types';
import { useSalesPerformanceStats } from '../../hooks/useSalesPerformanceStats';

/**
 * COMPONENTE DE LAYOUT TRAVADO - V1.5
 * Cálculos de performance delegados ao hook useSalesPerformanceStats (SKILL).
 */

interface Props {
  order: SalesOrder;
  loadings: Loading[];
}

const SalesProductSummary: React.FC<Props> = ({ order, loadings }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(!val || Math.abs(val) < 0.005 ? 0 : val);
  const num = (val: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(val || 0);

  // --- CÁLCULOS DELEGADOS AO HOOK (SKILL: zero lógica financeira no componente) ---
  const {
    contractQty, totalLoadedSc, totalDeliveredSc, pendingQty,
    totalGrainCost, totalFreightCost, totalDirectInvestment,
    totalRevenueRealized, grossProfit, marginPercent,
  } = useSalesPerformanceStats(order, loadings);

  const labelClass = 'text-[10px] font-black text-slate-400 uppercase tracking-widest';
  const valueClass = 'text-lg font-black text-slate-900';

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden mb-8">
      {/* Header com identificação de Layout Travado */}
      <div className="bg-slate-900 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-500 rounded-lg text-white">
            <Package size={16} />
          </div>
          <h3 className="font-black uppercase text-[11px] tracking-widest text-white">Performance do Produto: {order.productName}</h3>
        </div>
        <div className="flex items-center gap-2">
           <span className="text-[9px] font-black text-slate-400 bg-slate-800 border border-slate-700 px-2 py-1 rounded uppercase">Safra {order.harvest}</span>
           <span className="text-[9px] font-black text-blue-400 bg-blue-900/30 border border-blue-800/50 px-2 py-1 rounded uppercase tracking-tighter">Layout Auditado</span>
        </div>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* BLOCO ESQUERDO: CONTROLE FÍSICO (VOLUMES) */}
          <div className="lg:col-span-4 grid grid-cols-2 gap-6 border-r border-slate-100 pr-8">
            <div className="space-y-1">
              <span className={labelClass}>Qtd. Contrato</span>
              <p className={valueClass}>{num(contractQty)} SC</p>
            </div>
            <div className="space-y-1">
              <span className={labelClass}>Qtd. Carregada</span>
              <p className={valueClass}>{num(totalLoadedSc)} SC</p>
            </div>
            <div className="space-y-1">
              <span className={labelClass}>Qtd. Entregue</span>
              <p className="text-lg font-black text-emerald-600">{num(totalDeliveredSc)} SC</p>
            </div>
            <div className="space-y-1">
              <span className={labelClass}>Saldo a Carregar</span>
              <p className="text-lg font-black text-amber-600">{num(pendingQty)} SC</p>
            </div>
          </div>

          {/* BLOCO DIREITO: CONTROLE FINANCEIRO (RESULTADO) */}
          <div className="lg:col-span-8">
            <div className="flex flex-col xl:flex-row gap-4 h-full">
              
              {/* GRID 2X2 PARA CUSTOS E FATURAMENTO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 min-w-0">
                
                {/* CUSTO DO GRÃO */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-1.5">
                    <ShoppingBag size={14} className="text-rose-500" />
                    <span className={labelClass}>Custo Grão</span>
                  </div>
                  <p className="text-xl font-black text-slate-800 tracking-tighter truncate">{currency(totalGrainCost)}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase italic mt-1">Total Romaneios</p>
                </div>

                {/* CUSTO DO FRETE */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Truck size={14} className="text-amber-500" />
                    <span className={labelClass}>Custo Frete</span>
                  </div>
                  <p className="text-xl font-black text-slate-800 tracking-tighter truncate">{currency(totalFreightCost)}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase italic mt-1">Logística Geral</p>
                </div>

                {/* SOMA DOS CUSTOS */}
                <div className="bg-rose-50/30 p-4 rounded-2xl border border-rose-100/50 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Coins size={14} className="text-rose-600" />
                    <span className={labelClass}>Total Custos</span>
                  </div>
                  <p className="text-xl font-black text-rose-700 tracking-tighter truncate">{currency(totalDirectInvestment)}</p>
                  <p className="text-[9px] text-rose-400 font-black uppercase mt-1">(Grão + Frete)</p>
                </div>

                {/* FATURAMENTO REALIZADO */}
                <div className="bg-emerald-50/20 p-4 rounded-2xl border border-emerald-100/50 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-1.5">
                    <TrendingUp size={14} className="text-emerald-600" />
                    <span className={labelClass}>Faturamento</span>
                  </div>
                  <p className="text-xl font-black text-emerald-700 tracking-tighter truncate">{currency(totalRevenueRealized)}</p>
                  <p className="text-[9px] text-emerald-500 font-black uppercase mt-1">Receita Real</p>
                </div>

              </div>

              {/* LUCRO BRUTO FINAL (DESTAQUE GRANDE) */}
               <div className={`p-6 rounded-3xl flex flex-col justify-center shadow-lg border-2 transition-all hover:scale-[1.02] xl:w-[280px] min-w-[240px] ${grossProfit >= 0 ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-rose-600 border-rose-500 text-white'}`}>
                <div className="flex items-center justify-between mb-2">
                   <span className="text-[10px] font-black uppercase tracking-widest opacity-80 italic">Lucro Bruto</span>
                </div>
                <p className="text-2xl font-black leading-none tracking-tighter break-words antialiased">
                  {currency(grossProfit)}
                </p>
                <div className="mt-4 flex justify-between items-center border-t border-white/20 pt-3">
                   <span className="text-[11px] font-black opacity-90 uppercase tracking-tight">{marginPercent.toFixed(1)}% de Margem</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Rodapé Informativo para Blindagem de Lógica */}
      <div className="bg-slate-50 px-6 py-2 flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest border-t border-slate-100">
         <div className="flex gap-4">
            <span className="flex items-center gap-1"><Info size={10} className="text-blue-500" /> Cálculos processados a cada atualização de romaneio</span>
            <span className="flex items-center gap-1"><Scale size={10} className="text-emerald-500" /> Faturamento apurado por peso de destino confirmado</span>
         </div>
         <div className="flex items-center gap-2">
            <span>Investimento Operacional Total:</span>
            <span className="text-slate-700">{currency(totalDirectInvestment)}</span>
         </div>
      </div>
    </div>
  );
};

export default SalesProductSummary;
