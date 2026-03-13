
import React, { useMemo } from 'react';
import { DollarSign, Truck, Clock, CheckCircle2 } from 'lucide-react';
import { PurchaseOrder } from '../types';
import { loadingService } from '../../../services/loadingService';

interface Props {
  orders: PurchaseOrder[];
}

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { 
  style: 'currency', 
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}).format(Math.abs(val) < 0.005 ? 0 : val);

const KPIs: React.FC<Props> = ({ orders }) => {
  
  const stats = useMemo(() => {
    // 1. Total Ativo (Valor Contratual)
    const activeOrders = orders.filter(o => ['pending', 'approved', 'transport'].includes(o.status));
    const totalActiveValue = activeOrders.reduce((acc, curr) => acc + curr.totalValue, 0);
    
    // 2. Total Pago (Realizado)
    const totalPaid = orders.reduce((acc, curr) => {
      const txPaid = (curr.transactions || [])
        .filter(t => t.type === 'payment' || t.type === 'advance')
        .reduce((s, t) => s + (t.value || 0), 0);
      return acc + Math.max(txPaid, curr.paidValue);
    }, 0);
    
    // 3. Financeiro Pendente (A Pagar)
    // Lógica ajustada PEDIDO DE COMPRA: Valor do que foi CARREGADO (Peso Origem) - Valor Pago.
    // Ignora o peso de chegada. Se carregou, deve.
    const allLoadings = loadingService.getAll();
    
    // Filtra cargas vinculadas a pedidos de compra (exclui cancelados)
    const purchaseLoadings = allLoadings.filter(l => 
        l.purchaseOrderId && l.status !== 'canceled'
    );

    const totalLoadedValue = purchaseLoadings.reduce((acc, l) => {
        // Usa o valor total calculado no carregamento (sc origem * preco origem)
        return acc + (l.totalPurchaseValue || 0);
    }, 0);

    // Se pagamos mais do que carregamos (adiantamentos), o saldo pendente é 0 (não devemos nada imediato).
    const totalPendingPayment = Math.max(0, totalLoadedValue - totalPaid);
    
    // 4. Em Trânsito (Cargas rodando)
    // Considera valor da mercadoria em trânsito
    const inTransitLoadings = allLoadings.filter(l => l.purchaseOrderId && ['in_transit', 'waiting_unload'].includes(l.status));
    const totalInTransitValue = inTransitLoadings.reduce((acc, l) => acc + (l.totalPurchaseValue || 0), 0);

    return {
        totalActiveValue,
        totalPaid,
        totalPendingPayment,
        totalInTransitValue,
        activeCount: activeOrders.length
    };
  }, [orders]);

  const StatCard = ({ label, value, icon: Icon, color, subtext }: any) => (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
      <div>
        <p className="text-sm text-slate-500 font-medium mb-1">{label}</p>
        <h3 className="text-xl font-bold text-slate-800">{formatCurrency(value)}</h3>
        {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
      </div>
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
    </div>
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6 animate-in slide-in-from-top-4">
      <StatCard 
        label="Total em Contratos" 
        value={stats.totalActiveValue} 
        icon={DollarSign} 
        color="bg-blue-500"
        subtext={`${stats.activeCount} pedidos ativos`}
      />
      <StatCard 
        label="Valor Pago" 
        value={stats.totalPaid} 
        icon={CheckCircle2} 
        color="bg-emerald-500"
        subtext="Total liquidado"
      />
      <StatCard 
        label="Saldo a Pagar (Carregado)" 
        value={stats.totalPendingPayment} 
        icon={Clock} 
        color="bg-amber-500"
        subtext="Dívida sobre carga retirada"
      />
      <StatCard 
        label="Mercadoria em Trânsito" 
        value={stats.totalInTransitValue} 
        icon={Truck} 
        color="bg-indigo-500"
        subtext="Valor carga a caminho"
      />
    </div>
  );
};

export default KPIs;
