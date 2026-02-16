
import React from 'react';
import { ArrowRight, MoreHorizontal, FileText, CheckCircle2, Clock, MapPin, Truck, CheckSquare, PackageCheck, FileDigit } from 'lucide-react';
import { Freight, FreightStatus } from '../types';

interface Props {
  freights: Freight[];
  onFreightClick: (freight: Freight) => void;
}

const FreightTable: React.FC<Props> = ({ freights, onFreightClick }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);
  
  // CORREÇÃO DE FUSO HORÁRIO
  const date = (val: string) => {
    if (!val) return '-';
    if (val.includes('T')) return new Date(val).toLocaleDateString('pt-BR');
    const [year, month, day] = val.split('-');
    return `${day}/${month}/${year}`;
  };

  // Status Helpers
  const isPaid = (f: Freight) => f.financialStatus === 'paid';
  const isUnloaded = (f: Freight) => f.status === 'completed';

  if (freights.length === 0) {
    return (
      <div className="text-center py-10 text-slate-500 bg-white rounded-xl border border-slate-200">
        Nenhum registro de frete encontrado.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Data / Pedido / NF</th>
              <th className="px-6 py-4">Transportadora / Veículo</th>
              <th className="px-6 py-4">Rota (Origem {' -> '} Destino)</th>
              <th className="px-6 py-4 text-center">Status Op.</th>
              <th className="px-6 py-4 text-center">Status Fin.</th>
              <th className="px-6 py-4 text-right">Financeiro (Frete)</th>
              <th className="px-6 py-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {freights.map((freight) => {
              const invoiceNum = (freight as any).invoiceNumber;

              return (
                <tr 
                  key={freight.id} 
                  className="hover:bg-slate-50 transition-colors group cursor-pointer"
                  onClick={() => onFreightClick(freight)}
                >
                  {/* DATA & PEDIDO & NF */}
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800">{date(freight.date)}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <div className="flex items-center gap-1 text-xs text-slate-500 bg-slate-100 w-fit px-1.5 py-0.5 rounded">
                        <FileText size={10} />
                        {freight.orderNumber}
                      </div>
                      {invoiceNum && (
                        <div className="flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 w-fit px-1.5 py-0.5 rounded border border-indigo-100" title="Nota Fiscal">
                          <FileDigit size={10} />
                          NF {invoiceNum}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* TRANSPORTADORA / MOTORISTA / PLACA */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-slate-800 text-sm">{freight.carrierName}</span>
                      <span className="text-xs text-slate-600">{freight.driverName}</span>
                      <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded w-fit mt-0.5 border border-slate-200">
                        {freight.vehiclePlate}
                      </span>
                    </div>
                  </td>

                  {/* ROTA (PARCEIRO ORIGEM -> DESTINO) */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2 relative pl-3 border-l-2 border-slate-200">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 leading-none mb-0.5">Origem</p>
                        <p className="text-sm font-medium text-slate-800 leading-tight">{freight.supplierName}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 leading-none mb-0.5">Destino</p>
                        <p className="text-sm font-medium text-slate-600 leading-tight">{freight.destinationCity}</p>
                      </div>
                    </div>
                  </td>

                  {/* STATUS OPERACIONAL (DESCARREGADO) */}
                  <td className="px-6 py-4 text-center">
                    {isUnloaded(freight) ? (
                      <div className="flex flex-col items-center gap-1 text-emerald-600">
                        <div className="bg-emerald-100 p-1.5 rounded-full">
                          <PackageCheck size={18} />
                        </div>
                        <span className="text-[10px] font-bold uppercase">Descarregado</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-blue-600">
                        <div className="bg-blue-100 p-1.5 rounded-full">
                          <Truck size={18} />
                        </div>
                        <span className="text-[10px] font-bold uppercase">Em Trânsito</span>
                      </div>
                    )}
                  </td>

                  {/* STATUS FINANCEIRO (PAGO) */}
                  <td className="px-6 py-4 text-center">
                    {isPaid(freight) ? (
                      <div className="flex flex-col items-center gap-1 text-emerald-600">
                        <div className="bg-emerald-100 p-1.5 rounded-full">
                          <CheckCircle2 size={18} />
                        </div>
                        <span className="text-[10px] font-bold uppercase">Pago</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-amber-600">
                        <div className="bg-amber-100 p-1.5 rounded-full">
                          <Clock size={18} />
                        </div>
                        <span className="text-[10px] font-bold uppercase">Pendente</span>
                      </div>
                    )}
                  </td>

                  {/* VALORES */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-col gap-1 items-end">
                      <span className="text-xs text-slate-400 font-medium">Total</span>
                      <span className="font-bold text-slate-800 text-sm">{currency(freight.totalFreight)}</span>
                      
                      {freight.paidValue > 0 && (
                        <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 rounded mt-1">
                          Pago: {currency(freight.paidValue)}
                        </span>
                      )}
                      
                      {freight.balanceValue > 0 && (
                        <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 rounded">
                          Falta: {currency(freight.balanceValue)}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* AÇÕES */}
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onFreightClick(freight); }}
                      className="rounded p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      title="Gerenciar Carga"
                    >
                      <MoreHorizontal size={20} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FreightTable;
