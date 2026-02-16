
import React from 'react';
import { Wheat, Scale, Box, DollarSign, Calculator } from 'lucide-react';

interface Props {
  productName: string;
  totalKg: number;
  totalSc: number;
  avgPurchasePrice: number;
  totalPurchaseValue: number;
}

const OrderProductCard: React.FC<Props> = ({ 
  productName, 
  totalKg, 
  totalSc, 
  avgPurchasePrice, 
  totalPurchaseValue 
}) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);
  const number = (val: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(val);

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden mb-8 animate-in slide-in-from-bottom-2">
      <div className="bg-slate-900 px-6 py-3 flex items-center gap-3">
        <div className="p-1.5 bg-blue-500 rounded-lg text-white">
          <Wheat size={18} />
        </div>
        <h3 className="font-black uppercase text-[11px] tracking-widest text-white">
          Resumo do Produto: <span className="text-blue-400">{productName}</span>
        </h3>
      </div>
      
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-50 rounded-xl text-slate-400">
            <Scale size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Qtd Total Carregada</p>
            <p className="text-xl font-black text-slate-900">{number(totalKg)} <span className="text-xs font-bold text-slate-400">KG</span></p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-50 rounded-xl text-slate-400">
            <Box size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Volume em Sacas</p>
            <p className="text-xl font-black text-slate-900">{number(totalSc)} <span className="text-xs font-bold text-slate-400">SC</span></p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-50 rounded-xl text-slate-400">
            <Calculator size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Valor Médio Compra</p>
            <p className="text-xl font-black text-slate-900">{currency(avgPurchasePrice)}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none mb-1">Valor Total do Grão</p>
            <p className="text-xl font-black text-blue-700">{currency(totalPurchaseValue)}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-slate-50 px-6 py-2 border-t border-slate-100">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">
          * Valores baseados exclusivamente no custo da mercadoria (sem fretes ou taxas)
        </p>
      </div>
    </div>
  );
};

export default OrderProductCard;
