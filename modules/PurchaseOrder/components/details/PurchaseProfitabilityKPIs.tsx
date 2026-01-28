
import React from 'react';
import { TrendingUp, Truck, Coins, DollarSign, Calculator, Package, AlertTriangle } from 'lucide-react';
import { OrderTransaction } from '../../types';

interface Props {
  totalPurchase: number;
  totalFreight: number;
  totalSales: number;
  avgSalesPrice: number;
  transactions: OrderTransaction[];
}

const PurchaseProfitabilityKPIs: React.FC<Props> = ({ totalPurchase, totalFreight, totalSales, avgSalesPrice, transactions }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Calcula Despesas Extras
  const expenseTxs = transactions.filter(t => t.type === 'expense');
  const deductedCost = expenseTxs.filter(t => t.deductFromPartner).reduce((acc, t) => acc + t.value, 0);
  const companyCost = expenseTxs.filter(t => !t.deductFromPartner).reduce((acc, t) => acc + t.value, 0);

  // Custo Total da Empresa = Grão + Frete + Despesas da Empresa (Não deduzidas do produtor)
  const totalInvestment = totalPurchase + totalFreight + companyCost;
  
  const netSpread = totalSales - totalInvestment;
  const marginPercent = totalSales > 0 ? (netSpread / totalSales) * 100 : 0;

  const labelClass = 'text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 mb-8">
      
      {/* CUSTO GRÃO */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-2 text-rose-600">
            <Package size={14} />
            <span className={labelClass}>Compra Grão</span>
        </div>
        <p className="text-base font-black text-slate-800">{currency(totalPurchase)}</p>
      </div>

      {/* CUSTO FRETE */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-2 text-amber-600">
            <Truck size={14} />
            <span className={labelClass}>Total Frete</span>
        </div>
        <p className="text-base font-black text-slate-800">{currency(totalFreight)}</p>
      </div>

      {/* CUSTOS EXTRAS (EMPRESA) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-2 text-slate-600">
            <AlertTriangle size={14} />
            <span className={labelClass}>Extras (Custo)</span>
        </div>
        <p className="text-base font-black text-slate-800">{currency(companyCost)}</p>
        <p className="text-[8px] text-rose-400 font-bold uppercase mt-1">Deduzido Prod.: {currency(deductedCost)}</p>
      </div>

      {/* SOMA CUSTOS REAIS */}
      <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100 shadow-sm">
        <div className="flex items-center gap-2 mb-2 text-rose-700">
            <Coins size={14} />
            <span className={labelClass}>Investimento</span>
        </div>
        <p className="text-base font-black text-rose-800">{currency(totalInvestment)}</p>
      </div>

      {/* VALOR TOTAL VENDA */}
      <div className="bg-emerald-50/30 p-4 rounded-xl border border-emerald-100 shadow-sm">
        <div className="flex items-center gap-2 mb-2 text-emerald-600">
            <TrendingUp size={14} />
            <span className={labelClass}>Valor Venda</span>
        </div>
        <p className="text-base font-black text-emerald-700">{currency(totalSales)}</p>
        <p className="text-[8px] text-emerald-600 font-bold mt-1">Média SC: {currency(avgSalesPrice)}</p>
      </div>

      {/* SOBRA REAL / RESULTADO (DESTAQUE) */}
      <div className={`col-span-1 lg:col-span-1 p-4 rounded-xl border-2 shadow-lg flex flex-col justify-center transition-all hover:scale-[1.02] ${netSpread >= 0 ? 'bg-slate-900 border-emerald-500 text-white' : 'bg-red-900 border-red-500 text-white'}`}>
        <div className="flex justify-between items-center mb-1">
            <span className="text-[9px] font-black uppercase tracking-tighter opacity-70 italic">Sobra Real</span>
            <Calculator size={18} className={netSpread >= 0 ? 'text-emerald-400' : 'text-red-400'} />
        </div>
        <div className="flex justify-between items-end">
            <h3 className="text-xl font-black">{currency(netSpread)}</h3>
        </div>
        <div className="text-right mt-1">
            <p className={`text-[10px] font-black leading-none ${netSpread >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {marginPercent.toFixed(1)}% MARGEM
            </p>
        </div>
      </div>

    </div>
  );
};

export default PurchaseProfitabilityKPIs;
