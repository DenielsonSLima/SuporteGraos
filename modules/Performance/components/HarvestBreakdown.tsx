
import React from 'react';
import { MapPin, ArrowRightLeft } from 'lucide-react';
import { HarvestData } from '../types';
import { formatMoney, formatInteger } from '../../../utils/formatters';

interface Props {
  harvests: HarvestData[];
}

const HarvestBreakdown: React.FC<Props> = ({ harvests }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white">
        <div className="flex items-center gap-2">
            <MapPin size={20} className="text-emerald-400" />
            <h3 className="font-black uppercase text-xs tracking-widest">Performance Geográfica por Safra (UF Origem)</h3>
        </div>
        <span className="text-[10px] font-black uppercase text-slate-400">Dados consolidados por contrato</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-400 font-black">
            <tr>
              <th className="px-6 py-4">Estado (UF)</th>
              <th className="px-6 py-4 text-right">Vol. (SC)</th>
              <th className="px-6 py-4 text-right">Vol. (TON)</th>
              <th className="px-6 py-4 text-right">Média Compra (SC)</th>
              <th className="px-6 py-4 text-right">Média Venda (SC)</th>
              <th className="px-6 py-4 text-right">Frete Médio (TON)</th>
              <th className="px-6 py-4 text-right text-emerald-600">Total Venda</th>
              <th className="px-6 py-4 text-right text-rose-600">Total Compra</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-bold">
            {harvests.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-10 text-slate-400 italic">Sem movimentação registrada no período.</td></tr>
            ) : (
              harvests.map((h) => (
                <tr key={h.uf} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-900 font-black">{h.uf}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-slate-900">{formatInteger(h.volumeSc)}</td>
                  <td className="px-6 py-4 text-right text-slate-500">{formatInteger(h.volumeTon)}</td>
                  <td className="px-6 py-4 text-right text-rose-700">{formatMoney(h.avgPurchasePrice)}</td>
                  <td className="px-6 py-4 text-right text-emerald-700">{formatMoney(h.avgSalesPrice)}</td>
                  <td className="px-6 py-4 text-right text-amber-600">{formatMoney(h.avgFreightPrice)}</td>
                  <td className="px-6 py-4 text-right text-emerald-600">{formatMoney(h.totalSales)}</td>
                  <td className="px-6 py-4 text-right text-rose-600">{formatMoney(h.totalPurchase)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default React.memo(HarvestBreakdown);
