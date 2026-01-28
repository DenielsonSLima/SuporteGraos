
import React from 'react';
import { DollarSign, Clock, CheckCircle2, Scale, Wallet } from 'lucide-react';

interface Props {
  totalLoaded: number;
  totalSettled: number;
  totalPending: number;
  totalAbatements: number;
  advanceBalance?: number; // Prop nova
}

const PurchaseOperationalKPIs: React.FC<Props> = ({ totalLoaded, totalSettled, totalPending, totalAbatements, advanceBalance = 0 }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* TOTAL CARREGADO */}
        <div className="bg-white p-5 rounded-2xl border-l-4 border-l-blue-600 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Carregado</span>
                <Scale size={16} className="text-blue-500" />
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tighter">{currency(totalLoaded)}</h3>
            <p className="text-[8px] text-slate-400 font-bold mt-1 uppercase italic">Dívida bruta gerada</p>
        </div>

        {/* VALOR PAGO PRODUTOR */}
        <div className="bg-white p-5 rounded-2xl border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest leading-none">Liquidado ao Produtor</span>
                <CheckCircle2 size={16} className="text-emerald-500" />
            </div>
            <h3 className="text-xl font-black text-emerald-700 tracking-tighter">{currency(totalSettled)}</h3>
            {totalAbatements > 0 ? (
                <p className="text-[8px] text-amber-600 font-bold mt-1 uppercase">Abatimentos Inclusos: {currency(totalAbatements)}</p>
            ) : (
                <p className="text-[8px] text-emerald-500 font-bold mt-1 uppercase">Pagamento em Dinheiro</p>
            )}
        </div>

        {/* SALDO EM ABERTO OU ADIANTAMENTO */}
        <div className={`p-5 rounded-2xl border-l-4 shadow-sm hover:shadow-md transition-shadow bg-white ${advanceBalance > 0 ? 'border-l-amber-500' : 'border-l-rose-500'}`}>
            <div className="flex justify-between items-start mb-2">
                <span className={`text-[9px] font-black uppercase tracking-widest leading-none ${advanceBalance > 0 ? 'text-amber-600' : 'text-rose-600'}`}>
                    {advanceBalance > 0 ? 'Crédito Adiantado' : 'Saldo Pendente'}
                </span>
                {advanceBalance > 0 ? <Wallet size={16} className="text-amber-500" /> : <Clock size={16} className="text-rose-500" />}
            </div>
            
            {advanceBalance > 0 ? (
                <h3 className="text-xl font-black tracking-tighter text-amber-600">{currency(advanceBalance)}</h3>
            ) : (
                <h3 className={`text-xl font-black tracking-tighter ${totalPending > 0.05 ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {totalPending > 0.05 ? currency(totalPending) : 'QUITADO'}
                </h3>
            )}
            
            <p className="text-[8px] text-slate-400 font-bold mt-1 uppercase italic">
                {advanceBalance > 0 ? 'Valor pago a maior que o carregado' : 'Valor a liquidar na origem'}
            </p>
        </div>
    </div>
  );
};

export default PurchaseOperationalKPIs;
