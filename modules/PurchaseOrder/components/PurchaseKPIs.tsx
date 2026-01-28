
import React, { useMemo } from 'react';
import { DollarSign, Truck, Clock, CheckCircle2, Scale } from 'lucide-react';
import { PurchaseOrder } from '../types';
import { LoadingCache } from '../../../services/loadingCache';
import { formatMoney } from '../../../utils/formatters';

interface Props {
  orders: PurchaseOrder[];
}

const PurchaseKPIs: React.FC<Props> = React.memo(({ orders }) => {
  
  const stats = useMemo(() => {
    // 1. IDs dos pedidos visíveis para filtrar os romaneios correspondentes
    const visibleOrderIds = orders.map(o => o.id);
    
    // 2. Busca todos os romaneios e filtra apenas os vinculados aos pedidos atuais
    const allLoadings = LoadingCache.getAll();
    const relatedLoadings = allLoadings.filter(l => 
        l.purchaseOrderId && 
        visibleOrderIds.includes(l.purchaseOrderId) && 
        l.status !== 'canceled'
    );

    // --- CÁLCULO DE TOTAL EM CONTRATOS (PEDIDOS) ---
    // Soma o valor total dos pedidos que estão na lista
    const totalContractValue = orders.reduce((acc, curr) => acc + curr.totalValue, 0);
    
    // --- CÁLCULO DE TOTAL PAGO (PEDIDOS) ---
    // Soma o que já foi liquidado (Dinheiro + Descontos)
    const totalSettled = orders.reduce((acc, curr) => acc + (curr.paidValue || 0) + (curr.discountValue || 0), 0);
    
    // --- CÁLCULO DE SALDO PENDENTE (BASEADO NO CARREGADO) ---
    // Dívida Real = (Valor de tudo que carregou nesses pedidos) - (O que paguei nesses pedidos)
    const totalLoadedValue = relatedLoadings.reduce((acc, l) => acc + (l.totalPurchaseValue || 0), 0);
    const totalPendingPayment = Math.max(0, totalLoadedValue - totalSettled);
    
    // --- CÁLCULO DE MERCADORIA EM TRÂNSITO ---
    // Apenas romaneios desses pedidos que estão rodando
    const inTransitLoadings = relatedLoadings.filter(l => ['in_transit', 'waiting_unload'].includes(l.status));
    const totalInTransitValue = inTransitLoadings.reduce((acc, l) => acc + (l.totalPurchaseValue || 0), 0);

    return {
        totalContractValue,
        totalSettled,
        totalPendingPayment,
        totalInTransitValue,
        count: orders.length,
        loadedCount: relatedLoadings.length
    };
  }, [orders]);

  const StatCard = ({ label, value, icon: Icon, color, subtext, bgClass }: any) => (
    <div className={`p-5 rounded-2xl border shadow-sm flex items-start justify-between hover:shadow-md transition-shadow ${bgClass || 'bg-white border-slate-200'}`}>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <h3 className="text-xl font-black text-slate-800 tracking-tighter">{formatMoney(value)}</h3>
        {subtext && <p className="text-[9px] text-slate-500 font-bold uppercase mt-1 italic">{subtext}</p>}
      </div>
      <div className={`p-2.5 rounded-xl ${color} shadow-sm`}>
        <Icon size={20} className="text-white" />
      </div>
    </div>
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6 animate-in slide-in-from-top-4">
      <StatCard 
        label="Total Comprado (Contratos)" 
        value={stats.totalContractValue} 
        icon={DollarSign} 
        color="bg-slate-700"
        subtext={`${stats.count} pedidos listados`}
      />
      <StatCard 
        label="Valor Total Pago" 
        value={stats.totalSettled} 
        icon={CheckCircle2} 
        color="bg-emerald-500"
        subtext="Liquidado aos Fornecedores"
      />
      <StatCard 
        label="Valor Pendente (Dívida)" 
        value={stats.totalPendingPayment} 
        icon={Clock} 
        color="bg-rose-600"
        subtext="Sobre Carga Retirada"
        bgClass="bg-white border-rose-100"
      />
      <StatCard 
        label="Mercadoria em Trânsito" 
        value={stats.totalInTransitValue} 
        icon={Truck} 
        color="bg-blue-600"
        subtext="Valor em transporte"
        bgClass="bg-blue-50 border-blue-100"
      />
    </div>
  );
});

export default PurchaseKPIs;
