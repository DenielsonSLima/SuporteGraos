
import React from 'react';
import { Package, Calculator, TrendingUp, Scale, Truck, ShoppingBag, Info, Coins, ArrowRight } from 'lucide-react';
import { Loading } from '../../../Loadings/types';
import { SalesOrder } from '../../types';

/**
 * COMPONENTE DE LAYOUT TRAVADO - V1.5
 * Este componente contém a lógica mestre de performance do pedido de venda.
 * Cálculos baseados no fluxo físico (romaneios ativos).
 */

interface Props {
  order: SalesOrder;
  loadings: Loading[];
}

const SalesProductSummary: React.FC<Props> = ({ order, loadings }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  const num = (val: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(val || 0);

  // --- CÁLCULOS TOTAIS DA OPERAÇÃO ---
  const activeLoadings = loadings.filter(l => l.status !== 'canceled');
  
  // 1. Volumes (Sacas)
  const totalLoadedSc = activeLoadings.reduce((acc, l) => acc + l.weightSc, 0);
  const totalDeliveredSc = activeLoadings.reduce((acc, l) => acc + (l.unloadWeightKg ? l.unloadWeightKg / 60 : 0), 0);
  const contractQty = order.quantity || 0;
  const pendingQty = Math.max(0, contractQty - totalLoadedSc);

  // 2. Financeiro (Custos)
  const totalGrainCost = activeLoadings.reduce((acc, l) => acc + (l.totalPurchaseValue || 0), 0);
  const totalFreightCost = activeLoadings.reduce((acc, l) => acc + (l.totalFreightValue || 0), 0);
  
  // SOMA DOS CUSTOS DIRETOS (GRÃO + FRETE)
  const totalDirectInvestment = totalGrainCost + totalFreightCost;
  
  // 3. Financeiro (Receita/Faturamento)
  // Faturamento Realizado (Peso Destino se houver, senão Origem * Preço Venda)
  const totalRevenueRealized = activeLoadings.reduce((acc, l) => {
    const weightSc = l.unloadWeightKg ? l.unloadWeightKg / 60 : l.weightSc;
    return acc + (weightSc * (l.salesPrice || order.unitPrice || 0));
  }, 0);

  // 4. Resultado (Lucro Bruto)
  const grossProfit = totalRevenueRealized - totalDirectInvestment;
  const marginPercent = totalRevenueRealized > 0 ? (grossProfit / totalRevenueRealized) * 100 : 0;

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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              
              {/* CUSTO DO GRÃO */}
              <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex items-center gap-1.5 mb-1">
                  <ShoppingBag size={12} className="text-rose-500" />
                  <span className={labelClass}>Custo Grão</span>
                </div>
                <p className="text-base font-black text-slate-800">{currency(totalGrainCost)}</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase italic">Total Romaneios</p>
              </div>

              {/* CUSTO DO FRETE */}
              <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex items-center gap-1.5 mb-1">
                  <Truck size={12} className="text-amber-500" />
                  <span className={labelClass}>Custo Frete</span>
                </div>
                <p className="text-base font-black text-slate-800">{currency(totalFreightCost)}</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase italic">Logística Geral</p>
              </div>

              {/* SOMA DOS CUSTOS (SOLICITADO) */}
              <div className="space-y-1 bg-rose-50/30 p-3 rounded-xl border border-rose-100/50">
                <div className="flex items-center gap-1.5 mb-1">
                  <Coins size={12} className="text-rose-600" />
                  <span className={labelClass}>Total Custos</span>
                </div>
                <p className="text-base font-black text-rose-700">{currency(totalDirectInvestment)}</p>
                <p className="text-[8px] text-rose-400 font-black uppercase">(Grão + Frete)</p>
              </div>

              {/* FATURAMENTO REALIZADO */}
              <div className="space-y-1 bg-emerald-50/20 p-3 rounded-xl border border-emerald-100/50">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp size={12} className="text-emerald-600" />
                  <span className={labelClass}>Faturamento</span>
                </div>
                <p className="text-base font-black text-emerald-700">{currency(totalRevenueRealized)}</p>
                <p className="text-[8px] text-emerald-500 font-black uppercase">Receita Real</p>
              </div>

              {/* LUCRO BRUTO FINAL */}
              <div className={`p-3 rounded-2xl flex flex-col justify-center shadow-md border-2 transition-all hover:scale-105 ${grossProfit >= 0 ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-rose-600 border-rose-500 text-white'}`}>
                <div className="flex items-center justify-between mb-1">
                   <span className="text-[9px] font-black uppercase tracking-widest opacity-80">Lucro Bruto</span>
                   <Calculator size={14} className="opacity-60" />
                </div>
                <p className="text-lg font-black leading-none">{currency(grossProfit)}</p>
                <div className="mt-2 flex justify-between items-center border-t border-white/20 pt-1.5">
                   <span className="text-[9px] font-black opacity-90 uppercase">{marginPercent.toFixed(1)}% Margem</span>
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
