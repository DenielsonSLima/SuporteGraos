
import React from 'react';
import { Users, TrendingUp, Award } from 'lucide-react';

interface RankingItem {
  name: string;
  total: number;
  count: number;
}

const ShareholderRanking: React.FC<{ ranking: RankingItem[] }> = ({ ranking }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);
  const maxTotal = Math.max(...ranking.map(r => r.total), 1); // Avoid div by 0

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
          <Users size={24} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-800">Ranking de Compras por Sócio</h3>
          <p className="text-sm text-slate-500">Volume financeiro negociado no período</p>
        </div>
      </div>

      <div className="space-y-5">
        {ranking.length === 0 ? (
          <p className="text-center text-slate-400 py-4">Nenhum dado disponível.</p>
        ) : (
          ranking.map((item, index) => (
            <div key={item.name} className="relative">
              <div className="flex justify-between items-end mb-1">
                <div className="flex items-center gap-2">
                  {index === 0 && <Award size={16} className="text-amber-500" />}
                  <span className={`font-bold text-sm ${index === 0 ? 'text-slate-800' : 'text-slate-600'}`}>
                    {index + 1}. {item.name}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-sm text-indigo-700">{currency(item.total)}</span>
                  <span className="text-xs text-slate-400 ml-2">({item.count} pedidos)</span>
                </div>
              </div>
              
              {/* Bar */}
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${
                    index === 0 ? 'bg-indigo-600' : 'bg-indigo-400'
                  }`}
                  style={{ width: `${(item.total / maxTotal) * 100}%` }}
                ></div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ShareholderRanking;
