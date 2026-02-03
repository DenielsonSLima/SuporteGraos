
import React from 'react';
import { Landmark, Trash2, Calendar, Coins } from 'lucide-react';
import { InitialBalanceRecord } from '../../../../services/financialService';
import { formatDateBR } from '../../../../utils/dateUtils';

interface Props {
  balances: InitialBalanceRecord[];
  onDelete: (id: string) => void;
}

const InitialBalanceList: React.FC<Props> = ({ balances, onDelete }) => {
  const currency = (val: number) => {
    const cleanValue = Math.abs(val) < 0.01 ? 0 : val;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cleanValue);
  };

  if (balances.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
        <div className="p-5 bg-white rounded-3xl shadow-sm mb-4">
           <Coins size={48} className="text-slate-300" />
        </div>
        <p className="font-black text-slate-400 uppercase tracking-widest text-sm">Nenhum marco zero configurado</p>
        <p className="text-xs text-slate-400 mt-1">Clique no botão para adicionar o saldo inicial de uma conta.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead className="bg-slate-900">
          <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
            <th className="px-6 py-5 border-r border-slate-800">Data Referência</th>
            <th className="px-6 py-5 border-r border-slate-800">Conta Bancária / Cofre</th>
            <th className="px-6 py-5 text-right border-r border-slate-800">Saldo de Abertura</th>
            <th className="px-6 py-5 text-center w-24">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-bold text-slate-700 uppercase text-xs">
          {balances.map((b) => (
            <tr key={b.id} className="hover:bg-slate-50 transition-colors group">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-slate-100 rounded-lg text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-all">
                      <Calendar size={14} />
                   </div>
                   <span className="text-slate-900">{formatDateBR(b.date)}</span>
                </div>
              </td>
              <td className="px-6 py-4">
                 <div className="flex items-center gap-2">
                    <Landmark size={14} className="text-slate-300" />
                    <span className="text-slate-800 font-black tracking-tight">{b.accountName}</span>
                 </div>
              </td>
              <td className="px-6 py-4 text-right">
                <span className="text-sm font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-100">
                  {currency(b.value)}
                </span>
              </td>
              <td className="px-6 py-4 text-center">
                <button 
                  onClick={() => onDelete(b.id)}
                  className="p-2.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all active:scale-90"
                  title="Excluir Registro"
                >
                  <Trash2 size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default InitialBalanceList;
