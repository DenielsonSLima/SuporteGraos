
import React from 'react';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';

interface Props {
  revenue: number;
  debits: number;
  balance: number;
}

const FinancialKPIs: React.FC<Props> = ({ revenue, debits, balance }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="grid gap-6 md:grid-cols-3 mb-8">
      {/* Receita */}
      <div className="bg-white p-6 rounded-xl border-l-4 border-l-emerald-500 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Receita Total</p>
          <h3 className="text-2xl font-bold text-emerald-600 mt-1">{currency(revenue)}</h3>
        </div>
        <div className="p-3 bg-emerald-100 rounded-full text-emerald-600">
          <TrendingUp size={24} />
        </div>
      </div>

      {/* Débitos */}
      <div className="bg-white p-6 rounded-xl border-l-4 border-l-rose-500 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total Débitos</p>
          <h3 className="text-2xl font-bold text-rose-600 mt-1">{currency(debits)}</h3>
        </div>
        <div className="p-3 bg-rose-100 rounded-full text-rose-600">
          <TrendingDown size={24} />
        </div>
      </div>

      {/* Saldo */}
      <div className="bg-slate-900 p-6 rounded-xl shadow-lg flex items-center justify-between text-white">
        <div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Resultado (Saldo)</p>
          <h3 className={`text-3xl font-bold mt-1 ${balance >= 0 ? 'text-white' : 'text-rose-400'}`}>
            {currency(balance)}
          </h3>
        </div>
        <div className="p-3 bg-slate-800 rounded-full text-slate-300">
          <Wallet size={24} />
        </div>
      </div>
    </div>
  );
};

export default FinancialKPIs;
