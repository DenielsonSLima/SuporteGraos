
import React, { useMemo } from 'react';
import { PurchaseOrder } from '../types';
import { Loading } from '../../Loadings/types';
import { settingsService } from '../../../services/settingsService';
import { 
  Sprout, User, Wallet, Truck, Scale, 
  AlertCircle, ShoppingBag, Landmark, 
  CheckCircle2, FileText, Calendar, Hash,
  MapPin, ShoppingCart
} from 'lucide-react';

interface Props {
  order: PurchaseOrder;
  loadings: Loading[];
}

const ProducerOrderTemplate: React.FC<Props> = ({ order, loadings }) => {
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

  // --- CÁLCULOS CONSOLIDADOS ---
  const stats = useMemo(() => {
    const activeLoadings = loadings.filter(l => l.status !== 'canceled');
    
    const totalWeightKg = activeLoadings.reduce((acc, l) => acc + l.weightKg, 0);
    const totalWeightSc = activeLoadings.reduce((acc, l) => acc + l.weightSc, 0);
    const totalLoadedValue = activeLoadings.reduce((acc, l) => acc + l.totalPurchaseValue, 0);
    
    const avgPricePerSc = totalWeightSc > 0 ? totalLoadedValue / totalWeightSc : 0;

    const payments = (order.transactions || []).filter(t => t.type === 'payment' || t.type === 'advance');
    const expenses = (order.transactions || []).filter(t => t.type === 'expense');
    const debitedExpenses = expenses.filter(t => t.deductFromPartner);

    const totalPaid = payments.reduce((acc, t) => acc + t.value + (t.discountValue || 0), 0);
    const totalDebited = debitedExpenses.reduce((acc, t) => acc + t.value, 0);
    
    // Saldo = Carregado - (Pago + Descontos) - Despesas Debitadas
    const balance = totalLoadedValue - totalPaid - totalDebited;

    return {
        totalWeightKg,
        totalWeightSc,
        totalLoadedValue,
        avgPricePerSc,
        payments,
        debitedExpenses,
        totalPaid,
        totalDebited,
        balance,
        activeLoadings
    };
  }, [order, loadings]);

  const formatDoc = (doc: string) => {
    if (!doc) return '';
    return doc.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
              .replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  };

  return (
    <div id="print-content" className="relative w-full bg-white text-slate-900 px-8 py-6 text-[9px] leading-relaxed font-sans flex flex-col box-border overflow-visible">
      
      {/* MARCA D'ÁGUA SUAVE */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
        {watermark.imageUrl ? (
          <img src={watermark.imageUrl} className="w-[60%] object-contain opacity-[0.03]" alt="Watermark" />
        ) : (
          <Sprout size={400} className="text-slate-100 opacity-10" />
        )}
      </div>

      <div className="relative z-10 flex-1 flex flex-col">
        
        {/* HEADER MODERNO */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3 mb-4">
          <div className="flex gap-6 items-start">
            <div className="h-24 w-auto flex items-center shrink-0 overflow-hidden">
               {company.logoUrl ? (
                 <img src={company.logoUrl} className="max-h-full w-auto object-contain" alt="Logo" />
               ) : (
                 <Sprout size={58} className="text-emerald-500" />
               )}
            </div>
            <div>
              <h1 className="text-lg font-black uppercase text-slate-900 leading-none">{company.nomeFantasia}</h1>
              <div className="text-slate-700 space-y-0.5 text-[9px] mt-1.5 font-bold">
                <p>Razão Social: {company.razaoSocial}</p>
                <p>CNPJ: {formatDoc(company.cnpj)}</p>
                <p>{company.endereco}, {company.numero} - {company.bairro}</p>
                <p>{company.cidade}/{company.uf} - CEP: {company.cep}</p>
                <p>Tel: {company.telefone}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <div className="bg-slate-900 text-white px-6 py-3 rounded-xl flex flex-col items-end shadow-lg">
                <span className="text-[7px] font-black uppercase tracking-widest opacity-60">Extrato Consolidado</span>
                <h2 className="text-sm font-black italic tracking-tight mt-1">ORDEM DE COMPRA</h2>
                <div className="text-emerald-400 font-mono text-base font-black mt-1">#{order.number}</div>
            </div>
            <div className="text-right mt-2">
                <p className="text-[8px] font-black text-slate-400 uppercase">Emissão: <span className="text-slate-900">{new Date().toLocaleDateString('pt-BR')}</span></p>
            </div>
          </div>
        </div>

        {/* DASHBOARD DE SALDOS (Tamanhos ajustados para não transbordar) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm relative overflow-visible group">
                <div className="absolute right-0 top-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity"><Scale size={40}/></div>
                <span className="text-[6px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Carregado</span>
                <p className="text-sm font-black text-slate-900 leading-tight break-words">{currency(stats.totalLoadedValue)}</p>
                <div className="h-0.5 w-8 bg-blue-500 rounded-full mt-1"></div>
            </div>
            
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm relative overflow-visible group">
                <div className="absolute right-0 top-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity"><CheckCircle2 size={40}/></div>
                <span className="text-[6px] font-black text-emerald-600 uppercase tracking-widest block mb-1">Total Liquidado</span>
                <p className="text-sm font-black text-emerald-700 leading-tight break-words">{currency(stats.totalPaid)}</p>
                <div className="h-0.5 w-8 bg-emerald-500 rounded-full mt-1"></div>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm relative overflow-visible group">
                <div className="absolute right-0 top-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity"><AlertCircle size={40}/></div>
                <span className="text-[6px] font-black text-amber-600 uppercase tracking-widest block mb-1">Retenções/Taxas</span>
                <p className="text-sm font-black text-amber-700 leading-tight break-words">{currency(stats.totalDebited)}</p>
                <div className="h-0.5 w-8 bg-amber-500 rounded-full mt-1"></div>
            </div>

            <div className={`p-4 rounded-2xl shadow-lg flex flex-col justify-center border-2 ${stats.balance <= 0.05 ? 'bg-emerald-600 border-emerald-500' : 'bg-rose-600 border-rose-500'} text-white relative overflow-visible`}>
                <div className="absolute right-0 top-0 p-2 opacity-20"><Wallet size={40}/></div>
                <span className="text-[7px] font-black uppercase tracking-widest opacity-90 block mb-2">Saldo Remanescente</span>
                <p className="text-base font-black leading-tight break-words">{currency(stats.balance)}</p>
                <p className="text-[6px] font-bold uppercase mt-1 opacity-70 italic">
                    {stats.balance <= 0.05 ? 'Contrato Quitado' : 'Valor a Liquidar'}
                </p>
            </div>
        </div>

        {/* INFORMAÇÕES DAS PARTES */}
        <div className="grid grid-cols-2 gap-5 mb-4">
            <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-2">
                    <div className="p-2 bg-slate-900 text-white rounded-xl shadow-sm"><User size={14}/></div>
                    <h3 className="font-black uppercase text-[9px] tracking-widest text-slate-800">Identificação do Produtor</h3>
                </div>
                <div className="pl-2 space-y-2">
                    <div>
                        <span className="text-[7px] font-black text-slate-400 uppercase">Razão Social / Nome</span>
                        <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{order.partnerName}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="text-[7px] font-black text-slate-400 uppercase">Documento</span>
                            <p className="font-bold text-slate-700 font-mono">{formatDoc(order.partnerDocument)}</p>
                        </div>
                        <div>
                            <span className="text-[7px] font-black text-slate-400 uppercase">Cidade / UF</span>
                            <p className="font-bold text-slate-700 uppercase">{order.partnerCity} / {order.partnerState}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-2">
                    <div className="p-2 bg-blue-600 text-white rounded-xl shadow-sm"><ShoppingCart size={14}/></div>
                    <h3 className="font-black uppercase text-[9px] tracking-widest text-slate-800">Detalhes da Negociação</h3>
                </div>
                <div className="pl-2 space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="text-[7px] font-black text-slate-400 uppercase">Safra Vinculada</span>
                            <p className="font-black text-slate-900 uppercase italic">{order.harvest}</p>
                        </div>
                        <div>
                            <span className="text-[7px] font-black text-slate-400 uppercase">Consultor Responsável</span>
                            <p className="font-bold text-slate-700 uppercase">{order.consultantName}</p>
                        </div>
                    </div>
                    <div>
                        <span className="text-[7px] font-black text-slate-400 uppercase">Produto Contratado</span>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="bg-slate-100 px-2 py-1 rounded text-xs font-black text-slate-800 border border-slate-200">{order.items[0]?.productName}</span>
                            <span className="text-[9px] font-bold text-slate-400 italic">Média: {currency(stats.avgPricePerSc)} /SC</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* TABELA DE ROMANEIOS (ESTILO TABELADO MODERNO) */}
        <div className="mb-4 flex-1">
            <div className="flex items-center justify-between mb-3 px-2">
                <h3 className="font-black text-[10px] uppercase text-slate-900 flex items-center gap-2">
                    <Truck size={14} className="text-blue-600" /> Histórico Analítico de Carregamentos
                </h3>
                <div className="text-[8px] font-black text-slate-400 uppercase bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
                    Total Volume: <span className="text-slate-900">{num(stats.totalWeightSc, 2)} SC</span>
                </div>
            </div>
            
            <table className="w-full border-collapse">
                <thead>
                    <tr className="bg-slate-900 text-white font-black uppercase text-[7px] tracking-widest">
                        <th className="py-3 px-4 text-left rounded-tl-xl">Data Carga</th>
                        <th className="py-3 px-4 text-left">Logística / Transporte</th>
                        <th className="py-3 px-4 text-center">Peso Bruto (KG)</th>
                        <th className="py-3 px-4 text-center">Volume (SC)</th>
                        <th className="py-3 px-4 text-right">Preço Unit.</th>
                        <th className="py-3 px-4 text-right rounded-tr-xl">Total Bruto</th>
                    </tr>
                </thead>
                <tbody className="text-[8px] font-bold">
                    {stats.activeLoadings.map((l, idx) => (
                        <tr key={idx} className={`border-b border-slate-100 transition-colors hover:bg-blue-50/30 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                            <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                    <Calendar size={10} className="text-slate-300" />
                                    <span className="text-slate-900">{dateStr(l.date)}</span>
                                </div>
                            </td>
                            <td className="py-3 px-4">
                                <p className="text-slate-800 uppercase leading-tight font-black text-[8px]">{l.carrierName}</p>
                                <div className="flex flex-col gap-1 mt-1">
                                    <span className="text-[7px] font-black bg-white px-2 py-1 rounded border border-slate-200 text-slate-600 inline-block">{l.vehiclePlate}</span>
                                    <span className="text-[7px] text-slate-600 font-bold leading-tight break-words">{l.driverName || 'Motorista não informado'}</span>
                                </div>
                            </td>
                            <td className="py-3 px-4 text-center text-slate-900 text-sm font-black italic">{num(l.weightKg, 0)}</td>
                            <td className="py-3 px-4 text-center text-blue-700 text-sm font-black">{num(l.weightSc, 2)}</td>
                            <td className="py-3 px-4 text-right text-slate-500">{currency(l.purchasePricePerSc)}</td>
                            <td className="py-3 px-4 text-right text-slate-900 font-black text-sm tracking-tighter">{currency(l.totalPurchaseValue)}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="bg-slate-100 border-t-2 border-slate-900 font-black text-slate-900 text-[9px] uppercase italic">
                        <td colSpan={2} className="py-4 px-4 text-right">Totais Consolidados:</td>
                        <td className="py-4 px-4 text-center">{num(stats.totalWeightKg, 0)} KG</td>
                        <td className="py-4 px-4 text-center text-blue-700">{num(stats.totalWeightSc, 2)} SC</td>
                        <td colSpan={2} className="py-4 px-4 text-right text-lg tracking-tighter">{currency(stats.totalLoadedValue)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>

        {/* FINANCEIRO DETALHADO (ABAIXO DA DOBRA) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 break-inside-avoid">
            {/* Pagamentos */}
            <div className="space-y-3">
                <h3 className="font-black text-[9px] uppercase text-emerald-800 flex items-center gap-2 border-b-2 border-emerald-600 pb-1">
                    <CheckCircle2 size={12} /> Liquidações Realizadas
                </h3>
                <div className="space-y-2">
                    {stats.payments.length === 0 ? (
                        <p className="text-slate-400 italic py-2">Sem registros de pagamento.</p>
                    ) : (
                        stats.payments.map((p, i) => (
                            <div key={i} className="flex justify-between items-center p-3 bg-white border border-slate-200 rounded-2xl shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><Wallet size={16}/></div>
                                    <div>
                                        <p className="font-black text-slate-900 uppercase text-[9px]">{dateStr(p.date)}</p>
                                        <p className="text-[7px] font-bold text-slate-400 uppercase italic">Ref: {p.notes || 'Pagamento via ' + p.accountName}</p>
                                    </div>
                                </div>
                                <span className="font-black text-emerald-700 text-sm">{currency(p.value + (p.discountValue || 0))}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Despesas/Retenções */}
            <div className="space-y-3">
                <h3 className="font-black text-[9px] uppercase text-rose-800 flex items-center gap-2 border-b-2 border-rose-600 pb-1">
                    <AlertCircle size={12} /> Retenções e Despesas Extras
                </h3>
                <div className="space-y-2">
                    {stats.debitedExpenses.length === 0 ? (
                        <p className="text-slate-400 italic py-2">Nenhuma retenção aplicada.</p>
                    ) : (
                        stats.debitedExpenses.map((e, i) => (
                            <div key={i} className="flex justify-between items-center p-3 bg-white border border-slate-200 rounded-2xl shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center"><Hash size={16}/></div>
                                    <div>
                                        <p className="font-black text-slate-900 uppercase text-[9px]">{dateStr(e.date)}</p>
                                        <p className="text-[7px] font-bold text-slate-400 uppercase italic">Motivo: {e.notes || 'Taxa Diversa'}</p>
                                    </div>
                                </div>
                                <span className="font-black text-rose-700 text-sm">-{currency(e.value)}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>

        {/* TERMOS E ASSINATURAS */}
        <div className="mt-auto pt-4 border-t-2 border-slate-900 break-inside-avoid">
            <div className="grid grid-cols-2 gap-12 mb-5">
                <div className="text-center">
                    <div className="h-14 border-b border-slate-300 mb-2"></div>
                    <p className="font-black text-slate-900 uppercase text-[10px]">{company.razaoSocial}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">Emitente / Comprador</p>
                </div>
                <div className="text-center">
                    <div className="h-14 border-b border-slate-300 mb-2"></div>
                    <p className="font-black text-slate-900 uppercase text-[10px]">{order.partnerName}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">Favorecido / Produtor</p>
                </div>
            </div>

            <div className="bg-slate-900 text-slate-500 p-4 rounded-2xl flex justify-between items-center text-[7px] font-black uppercase tracking-[0.1em]">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1"><Sprout size={12} className="text-emerald-500" /> ERP Suporte Grãos v1.8</span>
                    <span className="opacity-40">|</span>
                    <span>Documento Auditado Eletronicamente</span>
                </div>
                <div>
                   Página 1 de 1 • {new Date().toLocaleTimeString('pt-BR')}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default ProducerOrderTemplate;
