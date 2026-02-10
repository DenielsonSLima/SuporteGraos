import React, { useMemo } from 'react';
import { SalesOrder } from '../types';
import { Loading } from '../../Loadings/types';
import { settingsService } from '../../../services/settingsService';
import { 
  Sprout, User, Landmark, MapPin, 
  Truck, Scale, TrendingUp, CheckCircle2, 
  FileText, Calendar, Hash, ShoppingBag,
  DollarSign, PackageCheck, ArrowUpRight,
  AlertTriangle
} from 'lucide-react';

interface Props {
  order: SalesOrder;
  loadings: Loading[];
}

const CustomerSalesTemplate: React.FC<Props> = ({ order, loadings }) => {
  const company = settingsService.getCompanyData();
  const watermark = settingsService.getWatermark();

  // Formatadores
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  const num = (val: number, dec = 2) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(val || 0);
  const dateStr = (val: string) => {
    if (!val) return '-';
    if (val.includes('T')) return new Date(val).toLocaleDateString('pt-BR');
    const [year, month, day] = val.split('-');
    return `${day}/${month}/${year}`;
  };
    const cleanNotes = (val?: string) => val ? val.replace(/\s*\[ORIGIN:[^\]]+\]\s*/g, ' ').trim() : '';
    const receiptAccountLabel = (accountName?: string, notes?: string) => {
        if (accountName) return accountName;
        const cleaned = cleanNotes(notes);
        return cleaned || 'Conta nao informada';
    };

  // --- CÁLCULOS CONSOLIDADOS PARA O CLIENTE ---
  const stats = useMemo(() => {
    const activeLoadings = loadings.filter(l => l.status !== 'canceled');
    
    // Volume Contratado (Original do Pedido)
    const contractQtySc = order.quantity || 0;
    
    // Volume Entregue (Baseado no Peso de Destino / Balança do Cliente)
    const totalDeliveredKg = activeLoadings.reduce((acc, l) => acc + (l.unloadWeightKg || 0), 0);
    const totalDeliveredSc = totalDeliveredKg / 60;

    // Total Quebra (Origem - Destino)
    const totalBreakageKg = activeLoadings.reduce((acc, l) => {
        if (l.unloadWeightKg && l.unloadWeightKg > 0) {
            return acc + Math.max(0, l.weightKg - l.unloadWeightKg);
        }
        return acc;
    }, 0);
    
    // Volume em Trânsito (Cargas que saíram mas não chegaram)
    const inTransitLoadings = activeLoadings.filter(l => !l.unloadWeightKg || l.unloadWeightKg <= 0);
    const inTransitQtySc = inTransitLoadings.reduce((acc, l) => acc + l.weightSc, 0);

    // Faturamento Realizado (Sacas de Destino * Preço Venda)
    const totalInvoiced = activeLoadings
        .filter(l => l.unloadWeightKg && l.unloadWeightKg > 0)
        .reduce((acc, l) => acc + ((l.unloadWeightKg! / 60) * (l.salesPrice || order.unitPrice || 0)), 0);

    // Financeiro Recebido
    const receipts = (order.transactions || []).filter(t => t.type === 'receipt');
    const totalPaidByCustomer = receipts.reduce((acc, t) => acc + t.value + (t.discountValue || 0), 0);
    
    // Saldo Financeiro
    const financialBalance = totalInvoiced - totalPaidByCustomer;

    return {
        contractQtySc,
        totalDeliveredSc,
        totalBreakageKg,
        inTransitQtySc,
        totalInvoiced,
        totalPaidByCustomer,
        financialBalance,
        receipts,
        activeLoadings,
        executionPercent: contractQtySc > 0 ? (totalDeliveredSc / contractQtySc) * 100 : 0
    };
  }, [order, loadings]);

  return (
    <div id="print-content" className="relative w-full bg-white text-slate-900 p-12 text-[9px] leading-tight font-sans min-h-[210mm] flex flex-col box-border overflow-hidden">
      
      {/* MARCA D'ÁGUA PROFISSIONAL */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
        {watermark.imageUrl ? (
          <img src={watermark.imageUrl} className="w-[45%] object-contain opacity-[0.03]" />
        ) : (
          <TrendingUp size={400} className="text-slate-100 opacity-10" />
        )}
      </div>

      <div className="relative z-10 flex-1 flex flex-col">
        
        {/* HEADER EXECUTIVO */}
        <div className="flex justify-between items-stretch mb-10 border-b-2 border-slate-100 pb-6">
          <div className="flex items-center gap-6">
            <div className="h-20 w-20 bg-emerald-50 flex items-center justify-center rounded-2xl border border-emerald-100 overflow-hidden shadow-sm">
               {company.logoUrl ? (
                 <img src={company.logoUrl} className="max-w-[80%] max-h-[80%] object-contain" alt="Logo" />
               ) : (
                 <Sprout size={40} className="text-emerald-600" />
               )}
            </div>
            <div className="h-full flex flex-col justify-center">
              <h1 className="text-xl font-black uppercase tracking-tighter text-slate-900 leading-none">{company.nomeFantasia}</h1>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">{company.razaoSocial}</p>
              <div className="flex items-center gap-3 mt-3 text-[8px] font-bold text-slate-500 uppercase">
                <span className="flex items-center gap-1"><Landmark size={10} /> CNPJ: {company.cnpj}</span>
                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                <span className="flex items-center gap-1"><MapPin size={10} /> {company.cidade}/{company.uf}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between items-end">
            <div className="bg-slate-900 text-white px-8 py-4 rounded-3xl flex flex-col items-end shadow-xl border-b-4 border-emerald-500">
                <div className="flex items-center gap-2 mb-1">
                   <ArrowUpRight size={14} className="text-emerald-400" />
                   <span className="text-[7px] font-black uppercase tracking-widest text-emerald-400">Extrato de Comercialização</span>
                </div>
                <h2 className="text-lg font-black italic tracking-tighter">CONFIRMAÇÃO DE VENDA</h2>
                <div className="text-white font-mono text-base font-black mt-1 tracking-widest">PV #{order.number}</div>
            </div>
            <div className="text-right mt-2">
                <p className="text-[8px] font-black text-slate-400 uppercase">Data do Relatório: <span className="text-slate-900">{new Date().toLocaleDateString('pt-BR')}</span></p>
            </div>
          </div>
        </div>

        {/* DASHBOARD DE CUMPRIMENTO DE CONTRATO (KPIs) */}
        <div className="grid grid-cols-4 gap-4 mb-10">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity"><ShoppingBag size={48}/></div>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Contratado</span>
                <p className="text-lg font-black text-slate-900 leading-none">{num(stats.contractQtySc, 0)} <span className="text-xs font-bold text-slate-400">SC</span></p>
                <div className="h-1 w-full bg-slate-100 rounded-full mt-3 overflow-hidden">
                    <div className="h-full bg-blue-500" style={{width: `${Math.min(stats.executionPercent, 100)}%`}}></div>
                </div>
            </div>
            
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity"><PackageCheck size={48}/></div>
                <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest block mb-1">Total Entregue</span>
                <p className="text-lg font-black text-emerald-700 leading-none">{num(stats.totalDeliveredSc, 2)} <span className="text-xs font-bold text-emerald-400">SC</span></p>
                <p className="text-[7px] font-bold text-slate-400 uppercase mt-2 italic">Confirmado em Balança</p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity"><Truck size={48}/></div>
                <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest block mb-1">Em Trânsito</span>
                <p className="text-lg font-black text-blue-700 leading-none">{num(stats.inTransitQtySc, 2)} <span className="text-xs font-bold text-blue-400">SC</span></p>
                <p className="text-[7px] font-bold text-slate-400 uppercase mt-2 italic">A caminho da descarga</p>
            </div>

            <div className={`p-5 rounded-3xl shadow-xl flex flex-col justify-center border-2 ${stats.financialBalance <= 0.05 ? 'bg-emerald-600 border-emerald-500' : 'bg-slate-950 border-indigo-500'} text-white relative overflow-hidden`}>
                <div className="absolute right-0 top-0 p-3 opacity-20"><DollarSign size={48}/></div>
                <span className="text-[8px] font-black uppercase tracking-widest opacity-80 block mb-1">Saldo Financeiro</span>
                {/* Fonte diminuída para evitar overflow e adicionado truncate */}
                <p className="text-xl font-black leading-none truncate">{currency(stats.financialBalance)}</p>
                <p className="text-[7px] font-bold uppercase mt-2 opacity-70 italic">
                    {stats.financialBalance <= 0.05 ? 'Faturas Liquidadas' : 'Aguardando Pagamento'}
                </p>
            </div>
        </div>

        {/* INFORMAÇÕES DO CLIENTE E CONTRATO */}
        <div className="grid grid-cols-2 gap-8 mb-10">
            <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-2">
                    <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-sm"><User size={14}/></div>
                    <h3 className="font-black uppercase text-[9px] tracking-widest text-slate-800">Identificação do Comprador</h3>
                </div>
                <div className="pl-2 space-y-2">
                    <div>
                        <span className="text-[7px] font-black text-slate-400 uppercase">Razão Social</span>
                        <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{order.customerName}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="text-[7px] font-black text-slate-400 uppercase">CNPJ / CPF</span>
                            <p className="font-bold text-slate-700 font-mono">{order.customerDocument}</p>
                        </div>
                        <div>
                            <span className="text-[7px] font-black text-slate-400 uppercase">Cidade / UF</span>
                            <p className="font-bold text-slate-700 uppercase">{order.customerCity} / {order.customerState}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-2">
                    <div className="p-2 bg-slate-900 text-white rounded-xl shadow-sm"><FileText size={14}/></div>
                    <h3 className="font-black uppercase text-[9px] tracking-widest text-slate-800">Detalhes do Contrato</h3>
                </div>
                <div className="pl-2 space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="text-[7px] font-black text-slate-400 uppercase">Produto</span>
                            <p className="font-black text-slate-900 uppercase italic">{order.productName}</p>
                        </div>
                        <div>
                            <span className="text-[7px] font-black text-slate-400 uppercase">Preço Unitário (SC)</span>
                            <p className="font-black text-emerald-700 text-sm">{currency(order.unitPrice || 0)}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="text-[7px] font-black text-slate-400 uppercase">Vendedor Responsável</span>
                            <p className="font-bold text-slate-700 uppercase">{order.consultantName}</p>
                        </div>
                        <div>
                            <span className="text-[7px] font-black text-slate-400 uppercase">Data Venda</span>
                            <p className="font-bold text-slate-700 uppercase">{dateStr(order.date)}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* TABELA DE CARGAS (AUDITORIA LOGÍSTICA DE DESTINO) */}
        <div className="mb-8 flex-1">
            <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="font-black text-[10px] uppercase text-slate-900 flex items-center gap-2">
                    <Truck size={14} className="text-emerald-600" /> Relatório Analítico de Entregas Realizadas
                </h3>
            </div>
            
            <table className="w-full border-collapse">
                <thead>
                    <tr className="bg-slate-900 text-white font-black uppercase text-[7px] tracking-widest">
                        <th className="py-3 px-3 text-left rounded-tl-xl">Chegada Balança</th>
                        <th className="py-3 px-3 text-left">NF / Doc.</th>
                        <th className="py-3 px-3 text-left">Transportadora / Motorista</th>
                        <th className="py-3 px-3 text-right">Peso Orig.</th>
                        <th className="py-3 px-3 text-right bg-emerald-800">Peso Dest.</th>
                        <th className="py-3 px-3 text-right text-rose-300">Quebra (KG)</th>
                        <th className="py-3 px-3 text-right">Volume (SC)</th>
                        <th className="py-3 px-3 text-right rounded-tr-xl">Total Faturado</th>
                    </tr>
                </thead>
                <tbody className="text-[8px] font-bold">
                    {stats.activeLoadings.map((l, idx) => {
                        const isDelivered = l.unloadWeightKg && l.unloadWeightKg > 0;
                        const weight = isDelivered ? l.unloadWeightKg! : l.weightKg;
                        // ✅ Corrigido: evita -0 com threshold
                        const breakageRaw = isDelivered ? l.weightKg - l.unloadWeightKg! : 0;
                        const breakage = breakageRaw > 0.01 ? breakageRaw : 0;
                        const totalLine = (weight / 60) * (l.salesPrice || order.unitPrice || 0);

                        return (
                            <tr key={idx} className={`border-b border-slate-100 transition-colors hover:bg-emerald-50/30 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                                <td className="py-3 px-3">
                                    <div className="flex items-center gap-2">
                                        <Calendar size={10} className="text-slate-300" />
                                        <span className="text-slate-900">{dateStr(l.date)}</span>
                                    </div>
                                </td>
                                <td className="py-3 px-3 font-mono text-slate-600 uppercase">NF-{l.invoiceNumber || '---'}</td>
                                <td className="py-3 px-3">
                                    <p className="text-slate-800 uppercase truncate max-w-[150px] leading-tight">{l.carrierName}</p>
                                    <div className="flex items-center gap-1 mt-1 text-slate-400 font-medium">
                                        <User size={8} />
                                        <span>{l.driverName}</span>
                                    </div>
                                </td>
                                <td className="py-3 px-3 text-right text-slate-400 italic font-medium">{num(l.weightKg, 0)}</td>
                                <td className={`py-3 px-3 text-right text-emerald-800 text-[10px] font-black italic ${!isDelivered ? 'opacity-20' : ''}`}>
                                    {isDelivered ? num(l.unloadWeightKg!, 0) : 'TRÂNSITO'}
                                </td>
                                <td className={`py-3 px-3 text-right font-black ${breakage > 0 ? 'text-rose-600' : 'text-blue-500'}`}>
                                    {isDelivered ? (
                                        breakage > 0 ? num(breakage, 0) : <span className="text-blue-500">0</span>
                                    ) : '-'}
                                </td>
                                <td className="py-3 px-3 text-right text-slate-900 text-[10px] font-black">{num(weight / 60, 2)}</td>
                                <td className="py-3 px-3 text-right text-slate-900 font-black text-[10px] tracking-tighter">{currency(totalLine)}</td>
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot>
                    <tr className="bg-slate-100 border-t-2 border-slate-900 font-black text-slate-900 text-[9px] uppercase italic">
                        <td colSpan={5} className="py-4 px-3 text-right">Totais Consolidados Confirmados:</td>
                        <td className="py-4 px-3 text-right text-rose-700">{num(stats.totalBreakageKg, 0)} KG</td>
                        <td className="py-4 px-3 text-right">{num(stats.totalDeliveredSc, 2)} SC</td>
                        <td className="py-4 px-3 text-right text-base tracking-tighter text-emerald-900">{currency(stats.totalInvoiced)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>

        {/* EXTRATO DE RECEBIMENTOS (ABAIXO DA DOBRA) */}
        <div className="grid grid-cols-1 md:grid-cols-1 gap-8 mb-10 break-inside-avoid">
            <div className="space-y-3">
                <h3 className="font-black text-[9px] uppercase text-emerald-800 flex items-center gap-2 border-b-2 border-emerald-600 pb-1">
                    <CheckCircle2 size={12} /> Histórico de Recebimentos e Conciliação
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {stats.receipts.length === 0 ? (
                        <p className="text-slate-400 italic py-2 col-span-full text-center">Aguardando confirmação de recebimentos bancários.</p>
                    ) : (
                        stats.receipts.map((r, i) => (
                            <div key={i} className="flex justify-between items-center p-4 bg-white border border-slate-200 rounded-3xl shadow-sm hover:border-emerald-300 transition-all group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform"><DollarSign size={20}/></div>
                                    <div>
                                        <p className="font-black text-slate-900 uppercase text-[9px]">{dateStr(r.date)}</p>
                                        <p className="text-[7px] font-bold text-slate-400 uppercase italic truncate max-w-[120px]">CONTA: {receiptAccountLabel(r.accountName, r.notes)}</p>
                                    </div>
                                </div>
                                <span className="font-black text-emerald-700 text-base">{currency(r.value + (r.discountValue || 0))}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>

        {/* TERMOS E ASSINATURAS */}
        <div className="mt-auto pt-8 border-t-2 border-slate-900 break-inside-avoid">
            <div className="grid grid-cols-2 gap-24 mb-10">
                <div className="text-center">
                    <div className="h-14 border-b border-slate-300 mb-2"></div>
                    <p className="font-black text-slate-900 uppercase text-[10px]">{company.razaoSocial}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">Vendedor / Emitente</p>
                </div>
                <div className="text-center">
                    <div className="h-14 border-b border-slate-300 mb-2"></div>
                    <p className="font-black text-slate-900 uppercase text-[10px]">{order.customerName}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">Comprador / Aceite Financeiro</p>
                </div>
            </div>

            <div className="bg-slate-900 text-slate-500 p-4 rounded-3xl flex justify-between items-center text-[7px] font-black uppercase tracking-[0.1em]">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1"><Sprout size={12} className="text-emerald-500" /> Suporte Grãos Intelligence v1.8</span>
                    <span className="opacity-40">|</span>
                    <span className="text-emerald-400">Este extrato é um comprovante oficial de transação comercial</span>
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

export default CustomerSalesTemplate;