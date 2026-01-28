
import React from 'react';
import { 
  Truck, 
  ExternalLink, 
  Scale, 
  DollarSign, 
  Plus, 
  ShoppingBag, 
  ArrowRight, 
  User, 
  Wallet, 
  Calculator, 
  AlertCircle, 
  TrendingUp, 
  Trash2,
  PackageCheck,
  TrendingDown,
  FileText,
  Navigation,
  Pencil,
  Info
} from 'lucide-react';
import { Loading } from '../../../Loadings/types';
import { ModuleId } from '../../../../types';

interface Props {
  loadings: Loading[];
  onViewLoading: (loading: Loading) => void;
  onAddNew: () => void;
  onDeleteLoading?: (id: string) => void;
}

const PurchaseLoadingsTable: React.FC<Props> = ({ loadings, onViewLoading, onAddNew, onDeleteLoading }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  
  // CORREÇÃO DE FUSO HORÁRIO: Parse manual da string YYYY-MM-DD
  const dateStr = (val: string) => {
    if (!val) return '-';
    // Se for timestamp completo (tem hora), usa o padrão. Se for só data (YYYY-MM-DD), faz split.
    if (val.includes('T')) return new Date(val).toLocaleDateString('pt-BR');
    const [year, month, day] = val.split('-');
    return `${day}/${month}/${year}`;
  };

  const num = (val: number, dec = 1) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(val || 0);

  const navigateToSales = (e: React.MouseEvent, salesId: string) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('app:navigate', { 
      detail: { moduleId: ModuleId.SALES_ORDER, orderId: salesId } 
    }));
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDeleteLoading) onDeleteLoading(id);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-slate-900 px-6 py-5 flex items-center justify-between text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
             <Calculator size={22} className="text-white" />
          </div>
          <div>
            <h3 className="font-black tracking-tight uppercase text-xs tracking-widest leading-none">Matriz de Romaneios e Auditoria</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Conferência de Pesos, Fretes e Spread de Venda</p>
          </div>
        </div>
        <button 
          onClick={onAddNew}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95"
        >
          <Plus size={18} /> Novo Romaneio
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse min-w-[1000px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
              <th className="px-6 py-3 border-r border-slate-100">Vínculos Operacionais</th>
              <th className="px-6 py-3 border-r border-slate-100 text-center">Controle Físico (Pesos)</th>
              <th className="px-6 py-3 border-r border-slate-100 text-right">Custo Grão / Frete</th>
              <th className="px-6 py-3 border-r border-slate-100 text-right">Receita / Spread</th>
              <th className="px-4 py-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loadings.length === 0 ? (
              <tr><td colSpan={5} className="p-20 text-center text-slate-400 italic font-medium uppercase tracking-widest">Nenhum romaneio vinculado a este pedido de compra.</td></tr>
            ) : (
              loadings.map((l, idx) => {
                const freightOpen = l.totalFreightValue - l.freightPaid;
                const profit = l.totalSalesValue - (l.totalPurchaseValue + l.totalFreightValue);
                const isDelivered = l.unloadWeightKg && l.unloadWeightKg > 0;
                
                // Cálculo de Diferença (Quebra ou Ganho)
                // ✅ Corrigido: evita -0 com threshold
                const weightDiffRaw = isDelivered ? (l.weightKg - l.unloadWeightKg!) : 0;
                const weightDiff = Math.abs(weightDiffRaw) < 0.01 ? 0 : weightDiffRaw; // Threshold para evitar -0
                const isGain = weightDiff < 0;
                const absDiff = Math.abs(weightDiff);
                const absDiffSc = absDiff / 60;
                
                // Lógica de zebra para o bloco inteiro (3 linhas)
                const rowBgColor = idx % 2 === 0 ? 'bg-white' : 'bg-slate-100/50';
                
                return (
                  <React.Fragment key={l.id}>
                    {/* BLOCO: LINHA 1 - COMPRA / ORIGEM */}
                    <tr className={`hover:bg-blue-50/40 cursor-pointer transition-colors border-t border-slate-100 ${rowBgColor}`} onClick={() => onViewLoading(l)}>
                      <td className="px-6 py-4 border-r border-slate-100">
                        <div className="flex items-center gap-3">
                           <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><ShoppingBag size={16}/></div>
                           <div>
                              <p className="text-[10px] font-black text-blue-600 uppercase leading-none">Origem / Compra</p>
                              <p className="font-black text-slate-800 text-sm mt-1">{dateStr(l.date)}</p>
                              <span className="text-[10px] font-mono font-bold text-slate-400">NF: {l.invoiceNumber || '---'}</span>
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center border-r border-slate-100">
                        <div className="flex flex-col items-center">
                           <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Peso Origem</span>
                           <span className="font-black text-slate-900 text-base leading-tight">{num(l.weightKg, 0)} KG</span>
                           <span className="text-[10px] font-bold text-blue-600">{num(l.weightSc)} SC</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right border-r border-slate-100">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Preço Compra</span>
                        <p className="text-sm font-black text-slate-900">{currency(l.purchasePricePerSc)} <span className="text-[9px] font-normal text-slate-400">/SC</span></p>
                        <p className="text-[11px] font-black text-blue-700 mt-0.5">{currency(l.totalPurchaseValue)}</p>
                      </td>
                      <td className="px-6 py-4 text-right border-r border-slate-100 bg-slate-50/20" rowSpan={3}>
                         <div className="flex flex-col justify-center h-full">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Resultado Líquido Carga</span>
                            <span className={`text-2xl font-black tracking-tighter ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{currency(profit)}</span>
                            <div className="mt-2 space-y-1">
                                <div className="flex justify-between text-[10px] font-bold">
                                    <span className="text-slate-400">Margem:</span>
                                    <span className={profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}>{num((profit / l.totalSalesValue) * 100)}%</span>
                                </div>
                                <div className="flex justify-between text-[10px] font-bold">
                                    <span className="text-slate-400">Venda/SC:</span>
                                    <span className="text-slate-800">{currency(l.salesPrice)}</span>
                                </div>
                            </div>
                         </div>
                      </td>
                      <td className="px-4 py-4 text-center" rowSpan={3}>
                        <div className="flex flex-col gap-2 items-center">
                            <button onClick={(e) => { e.stopPropagation(); onViewLoading(l); }} className="p-2 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm border border-blue-100 bg-white" title="Editar Detalhes">
                              <Pencil size={18} />
                            </button>
                            <button onClick={(e) => handleDelete(e, l.id)} className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" title="Excluir Romaneio">
                              <Trash2 size={18} />
                            </button>
                        </div>
                      </td>
                    </tr>

                    {/* BLOCO: LINHA 2 - LOGÍSTICA / TRANSPORTE */}
                    <tr className={`hover:bg-blue-50/40 cursor-pointer transition-colors ${rowBgColor}`} onClick={() => onViewLoading(l)}>
                      <td className="px-6 py-3 border-r border-slate-100">
                        <div className="flex items-center gap-3">
                           <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg"><Truck size={16}/></div>
                           <div className="max-w-[180px]">
                              <p className="text-[10px] font-black text-amber-600 uppercase leading-none">Logística / Transporte</p>
                              <p className="font-bold text-slate-800 text-xs mt-1 truncate uppercase">{l.carrierName}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                 <span className="text-[10px] font-black text-slate-400 bg-white border border-slate-200 px-1 rounded shadow-xs">{l.vehiclePlate}</span>
                                 <span className="text-[9px] font-bold text-slate-500 truncate">{l.driverName}</span>
                              </div>
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-center border-r border-slate-100">
                        <div className="flex items-center justify-around gap-2">
                           <div className="flex flex-col items-center">
                              <span className="text-[8px] font-black text-slate-400 uppercase">Peso Destino</span>
                              {isDelivered ? (
                                <>
                                  <span className={`font-black text-sm ${weightDiff === 0 ? 'text-blue-700' : (isGain ? 'text-emerald-600' : 'text-slate-700')}`}>
                                    {num(l.unloadWeightKg!, 0)} KG
                                  </span>
                                  <span className={`text-[9px] font-bold ${weightDiff === 0 ? 'text-blue-500' : (isGain ? 'text-emerald-500' : 'text-slate-500')}`}>
                                    {num(l.unloadWeightKg! / 60)} SC
                                  </span>
                                </>
                              ) : (
                                <span className="text-[10px] font-bold text-slate-300 italic">Pendente...</span>
                              )}
                           </div>
                           <div className="w-px h-6 bg-slate-200"></div>
                           <div className="flex flex-col items-center">
                              <span className={`text-[8px] font-black uppercase ${isGain ? 'text-emerald-500' : (weightDiff === 0 ? 'text-blue-500' : 'text-rose-400')}`}>
                                {isGain ? 'Ganho' : (weightDiff === 0 ? 'OK' : 'Quebra')}
                              </span>
                              {isDelivered ? (
                                weightDiff === 0 ? (
                                  <>
                                    <span className="font-black text-sm text-blue-500">0 KG</span>
                                    <span className="text-[9px] font-bold text-blue-400">0,00 SC</span>
                                  </>
                                ) : (
                                  <>
                                    <span className={`font-black text-sm ${isGain ? 'text-emerald-600' : 'text-rose-600'}`}>
                                      {isGain ? '+' : '-'}{num(absDiff, 0)} KG
                                    </span>
                                    <span className={`text-[9px] font-bold ${isGain ? 'text-emerald-500' : 'text-rose-400'}`}>
                                      {num(absDiffSc, 2)} SC
                                    </span>
                                  </>
                                )
                              ) : (
                                <span className="text-[10px] font-bold text-slate-300 italic">---</span>
                              )}
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right border-r border-slate-100">
                         <div className="flex flex-col items-end">
                            <span className="text-[9px] font-black text-slate-400 uppercase">Custo Frete</span>
                            <div className="flex items-center gap-1">
                                <span className="text-xs font-black text-slate-800">{currency(l.totalFreightValue)}</span>
                                <span className={`text-[8px] font-black uppercase px-1 rounded border ${ (l as any).freightBase === 'Destino' ? 'border-blue-200 text-blue-600 bg-blue-50' : 'border-slate-200 text-slate-500 bg-white'}`}>
                                    P. {(l as any).freightBase || 'Origem'}
                                </span>
                            </div>
                            <div className="flex gap-2 mt-1">
                                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded border border-emerald-100">Pago: {currency(l.freightPaid)}</span>
                                {freightOpen > 0 && <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1 rounded border border-rose-100">Dívida: {currency(freightOpen)}</span>}
                            </div>
                         </div>
                      </td>
                    </tr>

                    {/* BLOCO: LINHA 3 - VENDA / DESTINO */}
                    <tr className={`hover:bg-blue-50/40 cursor-pointer transition-colors border-b-[6px] border-slate-900 ${rowBgColor}`} onClick={() => onViewLoading(l)}>
                      <td className="px-6 py-3 border-r border-slate-100">
                        <div className="flex items-center gap-3">
                           <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg"><Navigation size={16}/></div>
                           <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-black text-emerald-600 uppercase leading-none">Destino / Venda</p>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="font-bold text-slate-800 text-xs truncate uppercase" title={l.customerName}>{l.customerName}</p>
                                <button 
                                    onClick={(e) => navigateToSales(e, l.salesOrderId)}
                                    className="flex items-center gap-1 bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm shrink-0"
                                >
                                    <span className="font-black text-[9px]">#{l.salesOrderNumber}</span> <ExternalLink size={10} />
                                </button>
                              </div>
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-center border-r border-slate-100">
                         <div className="flex flex-col items-center">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Faturamento Carga</span>
                            <span className="font-black text-emerald-700 text-base">{currency(l.totalSalesValue)}</span>
                            <p className="text-[9px] font-bold text-slate-400 uppercase italic">Ref: Peso {isDelivered ? 'Destino' : 'Origem'}</p>
                         </div>
                      </td>
                      <td className="px-6 py-3 text-right border-r border-slate-100">
                         <span className="text-[9px] font-black text-slate-400 uppercase">Preço Venda</span>
                         <p className="text-sm font-black text-emerald-800">{currency(l.salesPrice)} <span className="text-[9px] font-normal text-slate-400">/SC</span></p>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-[10px] font-black uppercase text-slate-500">
         <div className="flex gap-4">
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-blue-500"></div> Origem</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-amber-500"></div> Logística</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-emerald-500"></div> Venda</span>
         </div>
         <p className="flex items-center gap-1">
            <Info className="text-blue-500" size={14} /> Auditoria baseada nos romaneios ativos de carregamento
         </p>
      </div>
    </div>
  );
};

export default PurchaseLoadingsTable;
