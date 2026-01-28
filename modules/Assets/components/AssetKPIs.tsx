
import React, { useMemo } from 'react';
import { Tractor, DollarSign, Clock, TrendingUp, HandCoins } from 'lucide-react';
import { Asset } from '../types';
import { financialActionService } from '../../../services/financialActionService';

interface Props {
  assets: Asset[];
}

const AssetKPIs: React.FC<Props> = ({ assets }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const stats = useMemo(() => {
    // 1. Valor dos Bens Ativos (Imobilizado)
    const activeAssets = assets.filter(a => a.status === 'active');
    const totalFixedValue = activeAssets.reduce((acc, a) => acc + a.acquisitionValue, 0);

    const financialRecords = financialActionService.getStandaloneRecords();
    
    // 2. Valor Total das Vendas Realizadas que ainda tem parcelas pendentes
    const soldAssetsWithPending = assets.filter(a => {
        if (a.status !== 'sold') return false;
        return financialRecords.some(r => r.assetId === a.id && r.status !== 'paid');
    });
    const totalSoldOpen = soldAssetsWithPending.reduce((acc, a) => acc + (a.saleValue || 0), 0);
    
    // 3. Saldo Líquido que falta entrar no caixa (Recebíveis Reais)
    const totalPendingReceipt = financialRecords
        .filter(r => r.assetId && assets.some(a => a.id === r.assetId && a.status === 'sold'))
        .reduce((acc, r) => acc + (r.originalValue - r.paidValue), 0);

    return {
      totalFixedValue,
      totalSoldOpen,
      totalPendingReceipt,
      activeCount: activeAssets.length,
      soldCount: soldAssetsWithPending.length
    };
  }, [assets]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* KPI 1: Patrimônio Imobilizado */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
        <div className="absolute right-0 top-0 p-4 text-blue-50 opacity-10 group-hover:opacity-20 transition-opacity">
          <Tractor size={80} />
        </div>
        <div className="relative z-10">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Patrimônio Ativo</span>
          <h3 className="text-2xl font-black text-slate-900">{currency(stats.totalFixedValue)}</h3>
          <p className="text-[10px] text-blue-600 font-bold mt-2 uppercase">{stats.activeCount} itens em uso</p>
        </div>
      </div>

      {/* KPI 2: Valor Total das Vendas em Aberto */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
        <div className="absolute right-0 top-0 p-4 text-emerald-50 opacity-10 group-hover:opacity-20 transition-opacity">
          <TrendingUp size={80} />
        </div>
        <div className="relative z-10">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Vendas (Total Negociado)</span>
          <h3 className="text-2xl font-black text-slate-900">{currency(stats.totalSoldOpen)}</h3>
          <p className="text-[10px] text-emerald-600 font-bold mt-2 uppercase">{stats.soldCount} ativos em liquidação</p>
        </div>
      </div>

      {/* KPI 3: Saldo Real a Receber (Conta a Receber) */}
      <div className="bg-slate-900 p-6 rounded-2xl shadow-xl relative overflow-hidden group border border-slate-800">
        <div className="absolute right-0 top-0 p-4 text-emerald-500 opacity-5 group-hover:opacity-10 transition-opacity">
          <HandCoins size={80} />
        </div>
        <div className="relative z-10 text-white">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1 text-emerald-400">Saldo Real a Receber</span>
          <h3 className="text-3xl font-black text-white tracking-tighter">{currency(stats.totalPendingReceipt)}</h3>
          <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase">Expectativa de entrada no caixa</p>
        </div>
      </div>
    </div>
  );
};

export default AssetKPIs;
