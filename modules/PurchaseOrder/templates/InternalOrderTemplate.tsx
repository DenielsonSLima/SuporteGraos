
import React, { useMemo } from 'react';
import { PurchaseOrder } from '../types';
import { Loading } from '../../Loadings/types';
import { settingsService } from '../../../services/settingsService';
import { 
  Sprout, 
  ShieldCheck, 
  Truck, 
  TrendingUp, 
  Scale, 
  DollarSign, 
  AlertTriangle,
  FileText,
  Calculator,
  ArrowRightLeft,
  Navigation,
  Coins,
  // Added Wallet to fix 'Cannot find name' error on line 301
  Wallet
} from 'lucide-react';

interface Props {
  order: PurchaseOrder;
  loadings: Loading[];
}

const InternalOrderTemplate: React.FC<Props> = ({ order, loadings }) => {
  const company = settingsService.getCompanyData();
  const watermark = settingsService.getWatermark();
  
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(!val || Math.abs(val) < 0.005 ? 0 : val);
  const num = (val: number, dec = 2) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(val || 0);
  const dateStr = (val: string) => {
    if (!val) return '-';
    if (val.includes('T')) return new Date(val).toLocaleDateString('pt-BR');
    const [year, month, day] = val.split('-');
    return `${day}/${month}/${year}`;
  };

  // --- CÁLCULOS EXECUTIVOS (P&L do Contrato) ---
  const stats = useMemo(() => {
    const activeLoadings = loadings.filter(l => l.status !== 'canceled');
    
    const totalWeightKgOrig = activeLoadings.reduce((acc, l) => acc + l.weightKg, 0);
    const totalWeightKgDest = activeLoadings.reduce((acc, l) => acc + (l.unloadWeightKg || 0), 0);
    const totalWeightScOrig = totalWeightKgOrig / 60;
    
    const totalGrainCost = activeLoadings.reduce((acc, l) => acc + (l.totalPurchaseValue || 0), 0);
    const totalFreightCost = activeLoadings.reduce((acc, l) => acc + (l.totalFreightValue || 0), 0);
    const totalRevenue = activeLoadings.reduce((acc, l) => acc + (l.totalSalesValue || 0), 0);
    
    // Despesas Extras da Ordem (Comissões não deduzidas + Taxas Administrativas lançadas no pedido)
    const extraExpenses = (order.transactions || [])
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => acc + t.value, 0);

    const brokerCommission = (order.transactions || [])
      .filter(t => t.type === 'commission' && !t.deductFromPartner)
      .reduce((acc, t) => acc + t.value, 0);

    const totalInvestment = totalGrainCost + totalFreightCost + extraExpenses + brokerCommission;
    const netProfit = totalRevenue - totalInvestment;
    const marginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const profitPerSc = totalWeightScOrig > 0 ? netProfit / totalWeightScOrig : 0;
    
    const totalBreakageKg = Math.max(0, totalWeightKgOrig - totalWeightKgDest);
    const breakagePercent = totalWeightKgOrig > 0 ? (totalBreakageKg / totalWeightKgOrig) * 100 : 0;

    return {
      activeLoadings,
      totalWeightKgOrig,
      totalWeightKgDest,
      totalWeightScOrig,
      totalGrainCost,
      totalFreightCost,
      totalRevenue,
      extraExpenses,
      brokerCommission,
      totalInvestment,
      netProfit,
      marginPercent,
      profitPerSc,
      totalBreakageKg,
      breakagePercent
    };
  }, [order, loadings]);

  return (
    <div id="print-content" className="relative w-full bg-white text-slate-900 px-8 py-6 text-[9px] leading-relaxed font-sans flex flex-col box-border overflow-visible">
      
      {/* MARCA D'ÁGUA EXECUTIVA */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
        {watermark.imageUrl ? (
          <img src={watermark.imageUrl} className="w-[40%] object-contain opacity-[0.03]" alt="BG" />
        ) : (
          <ShieldCheck size={400} className="text-slate-100 opacity-10" />
        )}
      </div>

      <div className="relative z-10 flex-1 flex flex-col">
        
        {/* CABEÇALHO E IDENTIFICAÇÃO */}
        <div className="flex justify-between items-center border-b-4 border-slate-900 pb-6 mb-8">
          <div className="flex gap-6 items-center">
            {/* Logo */}
            <div className="h-16 flex items-center shrink-0">
               {company.logoUrl ? (
                 <img src={company.logoUrl} className="max-h-full w-auto object-contain" alt="Logo" />
               ) : (
                 <Sprout size={40} className="text-emerald-500" />
               )}
            </div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tighter text-slate-900 leading-none">{company.razaoSocial}</h1>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Auditoria Executiva de Performance Financeira</p>
              <div className="flex items-center gap-3 mt-3 text-[8px] font-bold text-slate-500 uppercase">
                <span>Contrato Compra: <strong className="text-slate-900">#{order.number}</strong></span>
                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                <span>Safra: <strong className="text-slate-900">{order.harvest}</strong></span>
                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                <span>Emissão: <strong className="text-slate-900">{new Date().toLocaleDateString('pt-BR')}</strong></span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl flex flex-col items-end shadow-xl">
             <div className="flex items-center gap-2 mb-1">
                <ShieldCheck size={16} className="text-emerald-400" />
                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400">Documento Confidencial</span>
             </div>
             <h2 className="text-lg font-black italic tracking-tighter">RELATÓRIO DE SPREAD REAL</h2>
             <p className="text-[7px] font-bold uppercase opacity-60">Uso exclusivo dos sócios e gerência</p>
          </div>
        </div>

        {/* DASHBOARD DE RESULTADOS (O PONTO DE DECISÃO) */}
        <div className="grid grid-cols-5 gap-4 mb-10">
            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 shadow-sm">
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-2">Custo Total da Operação</span>
                <p className="text-lg font-black text-slate-900 leading-none">{currency(stats.totalInvestment)}</p>
                <p className="text-[7px] text-slate-400 font-bold mt-2 uppercase italic">Grão + Frete + Taxas</p>
            </div>

            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 shadow-sm">
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-2">Faturamento Realizado</span>
                <p className="text-lg font-black text-slate-900 leading-none">{currency(stats.totalRevenue)}</p>
                <p className="text-[7px] text-slate-400 font-bold mt-2 uppercase italic">Base: Peso de Destino</p>
            </div>

            <div className={`p-5 rounded-3xl shadow-xl flex flex-col justify-center border-2 ${stats.netProfit >= 0 ? 'bg-slate-950 border-emerald-500' : 'bg-rose-950 border-rose-500'} text-white relative overflow-hidden`}>
                <div className="absolute right-0 top-0 p-3 opacity-20"><Calculator size={40}/></div>
                <span className="text-[7px] font-black uppercase tracking-widest opacity-80 block mb-1">Lucro Líquido Final</span>
                <p className={`text-2xl font-black leading-none ${stats.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{currency(stats.netProfit)}</p>
                <p className="text-[7px] font-bold uppercase mt-3 opacity-70 italic">Sobra real após custos</p>
            </div>

            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 shadow-sm">
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-2">Margem de Lucro</span>
                <p className={`text-lg font-black leading-none ${stats.marginPercent >= 10 ? 'text-emerald-600' : 'text-slate-800'}`}>{num(stats.marginPercent)}%</p>
                <div className={`h-1 w-full rounded-full mt-3 bg-slate-200 overflow-hidden`}>
                    <div className={`h-full ${stats.marginPercent >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{width: `${Math.min(Math.abs(stats.marginPercent) * 4, 100)}%`}}></div>
                </div>
            </div>

            <div className="bg-slate-900 p-5 rounded-3xl shadow-lg text-white">
                <span className="text-[7px] font-black text-blue-400 uppercase tracking-widest block mb-2">Lucro Médio por Saca</span>
                <p className="text-lg font-black text-white leading-none">{currency(stats.profitPerSc)} <span className="text-[8px] font-normal opacity-50">/ SC</span></p>
                <p className="text-[7px] text-blue-400 font-bold mt-2 uppercase italic">Eficiência Comercial</p>
            </div>
        </div>

        {/* MATRIZ DE AUDITORIA DE ROMANEIOS (VISÃO PAISAGEM DETALHADA) */}
        <div className="mb-8 flex-1">
            <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="font-black text-[10px] uppercase text-slate-900 flex items-center gap-2 italic">
                    <TrendingUp size={14} className="text-blue-600" /> Matriz Analítica de Lucratividade por Romaneio
                </h3>
                <div className="flex gap-4">
                    <div className="text-[8px] font-black text-slate-400 uppercase bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">
                        Custo Médio Compra: <span className="text-slate-900">{currency(stats.totalGrainCost / stats.totalWeightScOrig)}</span>
                    </div>
                    <div className="text-[8px] font-black text-slate-400 uppercase bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">
                        Frete Médio (T): <span className="text-slate-900">{currency(stats.totalFreightCost / (stats.totalWeightKgOrig / 1000))}</span>
                    </div>
                </div>
            </div>
            
            <table className="w-full border-collapse">
                <thead>
                    <tr className="bg-slate-900 text-white font-black uppercase text-[7px] tracking-widest">
                        <th className="py-3 px-2 text-left rounded-tl-xl">Dta/Placa</th>
                        <th className="py-3 px-2 text-left">Transportadora / Destino</th>
                        <th className="py-3 px-2 text-right">Peso Orig.</th>
                        <th className="py-3 px-2 text-right">Peso Dest.</th>
                        <th className="py-3 px-2 text-right text-rose-300">Quebra(kg)</th>
                        <th className="py-3 px-2 text-right">Custo SC</th>
                        <th className="py-3 px-2 text-right">Venda SC</th>
                        <th className="py-3 px-2 text-right">Frete Total</th>
                        <th className="py-3 px-2 text-right bg-blue-800">Lucro Carga</th>
                        <th className="py-3 px-2 text-center rounded-tr-xl">Status</th>
                    </tr>
                </thead>
                <tbody className="text-[8px] font-bold">
                    {stats.activeLoadings.map((l, idx) => {
                        const rowCost = (l.totalPurchaseValue || 0) + (l.totalFreightValue || 0);
                        const rowProfit = (l.totalSalesValue || 0) - rowCost;
                        // ✅ Corrigido: evita -0 garantindo que seja exatamente 0 ou positivo
                        const breakageRaw = l.unloadWeightKg ? l.weightKg - l.unloadWeightKg : 0;
                        const breakage = breakageRaw > 0.01 ? breakageRaw : 0; // Threshold para evitar -0 ou 0.0001
                        const breakagePerc = breakage > 0 ? (breakage / l.weightKg) * 100 : 0;

                        return (
                            <tr key={idx} className={`border-b border-slate-100 transition-colors hover:bg-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                                <td className="py-2 px-2">
                                    <div className="flex flex-col">
                                        <span className="text-slate-900 font-black">{l.vehiclePlate}</span>
                                        <span className="text-[7px] text-slate-400">{dateStr(l.date)}</span>
                                    </div>
                                </td>
                                <td className="py-2 px-2">
                                    <p className="text-slate-800 uppercase leading-none truncate max-w-[150px]">{l.carrierName}</p>
                                    <div className="flex items-center gap-1 mt-1 text-blue-600 text-[7px]">
                                        <Navigation size={8} />
                                        <span>{l.customerName}</span>
                                    </div>
                                </td>
                                <td className="py-2 px-2 text-right text-slate-900 font-black">{num(l.weightKg, 0)}</td>
                                <td className="py-2 px-2 text-right font-black">
                                    {l.unloadWeightKg ? num(l.unloadWeightKg, 0) : <span className="text-slate-300 italic font-normal">Pendente</span>}
                                </td>
                                <td className={`py-2 px-2 text-right font-black ${breakage > 0 ? 'text-rose-600' : 'text-blue-500'}`}>
                                    {l.unloadWeightKg ? (
                                        breakage > 0 ? (
                                            <div className="flex flex-col items-end">
                                                <span>{num(breakage, 0)}</span>
                                                <span className="text-[6px] opacity-60">({num(breakagePerc, 2)}%)</span>
                                            </div>
                                        ) : (
                                            <span className="text-blue-500">0</span>
                                        )
                                    ) : '-'}
                                </td>
                                <td className="py-2 px-2 text-right text-slate-600">{currency(l.purchasePricePerSc)}</td>
                                <td className="py-2 px-2 text-right text-emerald-700 font-black">{currency(l.salesPrice)}</td>
                                <td className="py-2 px-2 text-right text-slate-500 font-medium">
                                    {currency(l.totalFreightValue)}
                                    <p className="text-[6px] opacity-60 uppercase">T: {currency(l.freightPricePerTon)}</p>
                                </td>
                                <td className={`py-2 px-2 text-right font-black text-[10px] bg-blue-50/30 ${rowProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                    {currency(rowProfit)}
                                </td>
                                <td className="py-2 px-2 text-center uppercase text-[7px]">
                                    {l.status === 'completed' ? (
                                        <span className="text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100">Finalizado</span>
                                    ) : (
                                        <span className="text-blue-600 bg-blue-50 px-1 py-0.5 rounded border border-blue-100">Em Trânsito</span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot>
                    <tr className="bg-slate-200 border-t-2 border-slate-900 font-black text-slate-900 text-[9px] uppercase italic">
                        <td colSpan={2} className="py-4 px-4 text-right">Totais Consolidados:</td>
                        <td className="py-4 px-4 text-center">{num(stats.totalWeightKgOrig, 0)} KG</td>
                        <td className="py-4 px-4 text-center text-blue-700">{num(stats.totalWeightKgDest, 0)} KG</td>
                        <td className="py-4 px-4 text-right text-rose-700">{num(stats.totalBreakageKg, 0)} KG</td>
                        <td colSpan={3}></td>
                        <td className={`py-4 px-4 text-right text-base tracking-tighter ${stats.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {currency(stats.netProfit)}
                        </td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>
        </div>

        {/* ANÁLISE DE CUSTOS E FLUXO FINANCEIRO */}
        <div className="grid grid-cols-2 gap-8 mb-8 break-inside-avoid">
            {/* Detalhamento de Custos Invisíveis */}
            <div className="space-y-4">
                <h3 className="font-black text-[10px] uppercase text-slate-800 flex items-center gap-2 border-b-2 border-slate-200 pb-1">
                    <Coins size={14} className="text-amber-600" /> Detalhamento de Custos Diretos
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-3 border border-slate-200 rounded-2xl flex justify-between items-center shadow-sm">
                        <span className="text-[8px] font-black text-slate-400 uppercase">Custo Grão (Total)</span>
                        <span className="font-black text-slate-900">{currency(stats.totalGrainCost)}</span>
                    </div>
                    <div className="bg-white p-3 border border-slate-200 rounded-2xl flex justify-between items-center shadow-sm">
                        <span className="text-[8px] font-black text-slate-400 uppercase">Custo Fretes (Total)</span>
                        <span className="font-black text-slate-900">{currency(stats.totalFreightCost)}</span>
                    </div>
                    <div className="bg-white p-3 border border-slate-200 rounded-2xl flex justify-between items-center shadow-sm">
                        <span className="text-[8px] font-black text-slate-400 uppercase">Taxas Adm. / Extras</span>
                        <span className="font-black text-rose-600">{currency(stats.extraExpenses)}</span>
                    </div>
                    <div className="bg-white p-3 border border-slate-200 rounded-2xl flex justify-between items-center shadow-sm">
                        <span className="text-[8px] font-black text-slate-400 uppercase">Comissões Empresa</span>
                        <span className="font-black text-rose-600">{currency(stats.brokerCommission)}</span>
                    </div>
                </div>
            </div>

            {/* Resumo de Liquidez (O que já saiu de caixa) */}
            <div className="space-y-4">
                <h3 className="font-black text-[10px] uppercase text-slate-800 flex items-center gap-2 border-b-2 border-slate-200 pb-1">
                    <Wallet size={14} className="text-emerald-600" /> Fluxo de Saídas Efetivadas
                </h3>
                <div className="space-y-2">
                    {(order.transactions || []).filter(t => t.type === 'payment' || t.type === 'advance').slice(0, 4).map((t, i) => (
                        <div key={i} className="flex justify-between items-center p-2 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-[8px] font-bold text-slate-600">{dateStr(t.date)} - {t.notes || 'Pagamento'}</span>
                            <span className="font-black text-slate-900">{currency(t.value)}</span>
                        </div>
                    ))}
                    {(order.transactions || []).length > 4 && <p className="text-[7px] text-center text-slate-400 font-bold uppercase italic">Ver histórico completo no ERP</p>}
                </div>
            </div>
        </div>

        {/* NOTAS DE AUDITORIA E ASSINATURAS */}
        <div className="mt-auto pt-8 border-t-2 border-slate-900 break-inside-avoid">
            <div className="grid grid-cols-3 gap-8 items-end">
                <div className="col-span-2">
                    <h4 className="text-[9px] font-black uppercase text-slate-900 mb-2 flex items-center gap-2">
                        <AlertTriangle size={12} className="text-amber-500" /> Notas de Auditoria
                    </h4>
                    <p className="text-slate-500 text-[8px] leading-relaxed">
                        1. A rentabilidade aqui apresentada considera o peso líquido de destino confirmado pelo cliente.<br/>
                        2. Cargas 'Em Trânsito' utilizam o peso de origem para projeção de receita, podendo sofrer variações após o descarrego.<br/>
                        3. Quebras acima de 0.50% foram sinalizadas no relatório para investigação logística.
                    </p>
                </div>
                <div className="text-center">
                    <div className="h-10 border-b border-slate-300 mb-2"></div>
                    <p className="font-black text-slate-900 uppercase text-[9px]">Comitê Executivo / Sócios</p>
                    <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">Visto de Aprovação de Resultado</p>
                </div>
            </div>

            <div className="mt-8 bg-slate-900 text-slate-500 p-4 rounded-2xl flex justify-between items-center text-[7px] font-black uppercase tracking-[0.1em]">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1"><Sprout size={12} className="text-emerald-500" /> ERP Suporte Grãos Intelligence v1.8</span>
                    <span className="opacity-40">|</span>
                    <span>Relatório Emitido por: {order.consultantName}</span>
                </div>
                <div>
                   Ref: Pedido {order.number} • Página 1 de 1 • {new Date().toLocaleTimeString('pt-BR')}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default InternalOrderTemplate;
