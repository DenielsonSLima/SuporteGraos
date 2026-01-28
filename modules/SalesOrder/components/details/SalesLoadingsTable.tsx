
import React from 'react';
import { Truck, ExternalLink, Scale, AlertCircle, TrendingDown } from 'lucide-react';
import { Loading } from '../../../Loadings/types';
import { ModuleId } from '../../../../types';

interface Props {
  loadings: Loading[];
  onNavigateToPurchase: (orderId: string) => void;
  onViewLoading: (loading: Loading) => void;
}

const SalesLoadingsTable: React.FC<Props> = ({ loadings, onNavigateToPurchase, onViewLoading }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  
  // CORREÇÃO DE FUSO HORÁRIO
  const dateStr = (val: string) => {
    if (!val) return '-';
    if (val.includes('T')) return new Date(val).toLocaleDateString('pt-BR');
    const [year, month, day] = val.split('-');
    return `${day}/${month}/${year}`;
  };

  const num = (val: number, dec = 1) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(val || 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-emerald-600 px-6 py-5 flex items-center justify-between text-white shadow-md">
        <div className="flex items-center gap-3">
          <Truck size={22} />
          <h3 className="font-black tracking-tight uppercase text-xs">Auditoria Logística de Saídas</h3>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest opacity-80">{loadings.length} Cargas Registradas</span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
              <th className="px-6 py-4 border-r border-slate-100 w-24 text-center">Data Carga</th>
              <th className="px-6 py-4 border-r border-slate-100">Logística (Empresa / Motorista)</th>
              <th className="px-6 py-4 border-r border-slate-100 text-center">Peso Carregado</th>
              <th className="px-6 py-4 border-r border-slate-100 text-center">Peso Descarregado</th>
              <th className="px-6 py-4 border-r border-slate-100 text-center">Quebra / Ganho</th>
              <th className="px-6 py-4 border-r border-slate-100 text-right">Valor Total</th>
              <th className="px-6 py-4 border-r border-slate-100 text-center">Pedido Entrada</th>
              <th className="px-6 py-4 text-right">SC Compra</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loadings.length === 0 ? (
              <tr><td colSpan={8} className="p-20 text-center text-slate-400 italic font-medium uppercase tracking-widest">Nenhuma carga vinculada.</td></tr>
            ) : (
              loadings.map((l) => {
                // Cálculo dinâmico do valor da carga: usa peso de destino se houver, senão usa o de origem
                const effectiveSc = (l.unloadWeightKg && l.unloadWeightKg > 0) ? (l.unloadWeightKg / 60) : l.weightSc;
                const totalCargaVenda = effectiveSc * (l.salesPrice || 0);

                const isDelivered = l.unloadWeightKg && l.unloadWeightKg > 0;

                // Lógica de Diferença (Origem - Destino)
                // Se diff > 0 = Quebra (Perda). Se diff < 0 = Ganho.
                const weightDiffRaw = isDelivered ? (l.weightKg - l.unloadWeightKg!) : 0;
                // Corrige -0 quando os pesos são iguais
                const weightDiff = Math.abs(weightDiffRaw) < 0.01 ? 0 : weightDiffRaw;
                const isGain = weightDiff < 0;
                const absDiffKg = Math.abs(weightDiff);
                const absDiffSc = absDiffKg / 60;

                return (
                  <tr key={l.id} className="hover:bg-slate-50/50 cursor-pointer group" onClick={() => onViewLoading(l)}>
                    {/* DATA */}
                    <td className="px-6 py-4 text-center">
                        <p className="font-black text-slate-800 leading-none">{dateStr(l.date)}</p>
                    </td>

                    {/* LOGÍSTICA CONSOLIDADA (Transportadora + Motorista + Placa) */}
                    <td className="px-6 py-4">
                       <p className="text-[11px] text-slate-900 font-black uppercase truncate max-w-[200px]">{l.carrierName}</p>
                       <p className="text-[10px] text-slate-500 font-bold uppercase truncate max-w-[200px] mt-0.5">{l.driverName}</p>
                       <span className="font-mono text-[9px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 mt-1 inline-block">
                         {l.vehiclePlate}
                       </span>
                    </td>

                    {/* PESO CARREGADO (KG e SC) */}
                    <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center">
                            <span className="font-black text-slate-900">{num(l.weightKg)} KG</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{num(l.weightSc)} SC</span>
                        </div>
                    </td>

                    {/* PESO DESCARREGADO */}
                    <td className="px-6 py-4 text-center">
                        {isDelivered ? (
                            weightDiff === 0 ? (
                              <div className="flex flex-col items-center">
                                <span className="font-black text-blue-700">{num(l.unloadWeightKg!)} KG</span>
                                <span className="text-[10px] font-bold text-blue-400 uppercase">{num(l.unloadWeightKg! / 60)} SC</span>
                              </div>
                            ) : isGain ? (
                              <div className="flex flex-col items-center">
                                <span className="font-black text-emerald-700">{num(l.unloadWeightKg!)} KG</span>
                                <span className="text-[10px] font-bold text-emerald-400 uppercase">{num(l.unloadWeightKg! / 60)} SC</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center">
                                <span className="font-black text-slate-500">{num(l.unloadWeightKg!)} KG</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">{num(l.unloadWeightKg! / 60)} SC</span>
                              </div>
                            )
                        ) : (
                            <div className="flex flex-col items-center opacity-40 italic">
                                <AlertCircle size={14} className="text-amber-500 mb-1" />
                                <span className="text-[10px] font-black text-amber-600 uppercase">Em Trânsito</span>
                            </div>
                        )}
                    </td>

                    {/* QUEBRA / GANHO */}
                    <td className="px-6 py-4 text-center border-x border-slate-50">
                        {isDelivered ? (
                            weightDiff === 0 ? (
                              <div className="flex flex-col items-center">
                                <span className="text-[8px] font-black uppercase mb-0.5 text-blue-500">OK</span>
                                <span className="font-black text-blue-600">0 <span className="text-[9px]">KG</span></span>
                                <span className="text-[10px] font-bold text-blue-400">0,00 SC</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center">
                                <span className={`text-[8px] font-black uppercase mb-0.5 ${isGain ? 'text-emerald-500' : 'text-rose-500'}`}>
                                  {isGain ? 'Ganho' : 'Quebra'}
                                </span>
                                <span className={`font-black ${isGain ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {isGain ? '+' : '-'}{num(absDiffKg, 0)} <span className="text-[9px]">KG</span>
                                </span>
                                <span className={`text-[10px] font-bold ${isGain ? 'text-emerald-500' : 'text-rose-400'}`}>
                                  {num(absDiffSc, 2)} SC
                                </span>
                              </div>
                            )
                        ) : (
                            <span className="text-slate-300 italic text-[10px]">---</span>
                        )}
                    </td>

                    {/* VALOR TOTAL (Dinâmico) */}
                    <td className="px-6 py-4 text-right">
                        <p className="font-black text-emerald-700 text-sm tracking-tighter">{currency(totalCargaVenda)}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">Preço Venda: {currency(l.salesPrice)}</p>
                    </td>

                    {/* ORIGEM (Link de Pedido de Entrada) */}
                    <td className="px-6 py-4 text-center">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onNavigateToPurchase(l.purchaseOrderId); }}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 font-black text-[10px] uppercase hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                        >
                            #{l.purchaseOrderNumber}
                            <ExternalLink size={10} />
                        </button>
                    </td>

                    {/* VALOR SC COMPRA (Custo) */}
                    <td className="px-6 py-4 text-right">
                        <p className="font-black text-rose-700">{currency(l.purchasePricePerSc)}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Custo Saca</p>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SalesLoadingsTable;
