
import React, { useMemo } from 'react';
import {
  ArrowLeft,
  ShoppingBag,
  DollarSign,
  ExternalLink
} from 'lucide-react';
import { Partner } from '../../types';
import { usePurchaseOrders } from '../../../../hooks/usePurchaseOrders';
import { ModuleId } from '../../../../types';
import { SkeletonTableRows } from '../../../../components/ui/SkeletonTable';

interface Props {
  broker: Partner;
  onBack: () => void;
}

const BrokerDetails: React.FC<Props> = ({ broker, onBack }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(!val || Math.abs(val) < 0.005 ? 0 : val);

  const { data: purchaseOrdersResult, isLoading } = usePurchaseOrders({ pageSize: 1000 });
  const purchaseOrders = purchaseOrdersResult?.data ?? [];

  // Busca pedidos vinculados a este corretor
  const relatedOrders = useMemo(() => {
    return purchaseOrders.filter(o =>
      o.brokerId === broker.id ||
      o.brokerName?.toLowerCase() === (broker.tradeName || broker.name || '').toLowerCase()
    );
  }, [purchaseOrders, broker.id, broker.name, broker.tradeName]);

  const totalCommissionOwed = useMemo(() => {
    return relatedOrders.reduce((acc, order) => {
      const qty = order.items.reduce((sum, i) => sum + i.quantity, 0);
      return acc + (qty * (order.brokerCommissionPerSc || 0));
    }, 0);
  }, [relatedOrders]);

  const navigateToOrder = (orderId: string) => {
    window.dispatchEvent(new CustomEvent('app:navigate', {
      detail: { moduleId: ModuleId.PURCHASE_ORDER, orderId }
    }));
  };

  return (
    <div className="animate-in slide-in-from-right-4 duration-300">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={onBack}
          className="rounded-full bg-white p-2 text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-800"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase italic tracking-tight">{broker.tradeName || broker.name}</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Painel de Corretagem e Comissões</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Contratos Vinculados</span>
          {isLoading ? (
            <div className="h-9 w-12 bg-slate-100 animate-pulse rounded mt-1" />
          ) : (
            <h3 className="text-3xl font-black text-slate-900">{relatedOrders.length}</h3>
          )}
        </div>
        <div className="bg-white p-6 rounded-2xl border-l-4 border-l-violet-600 shadow-sm">
          <span className="text-[10px] font-black text-violet-600 uppercase tracking-widest block mb-1">Total Comissões Contratuais</span>
          {isLoading ? (
            <div className="h-9 w-32 bg-slate-100 animate-pulse rounded mt-1" />
          ) : (
            <h3 className="text-3xl font-black text-slate-900">{currency(totalCommissionOwed)}</h3>
          )}
          <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase italic">Considerando volume integral dos pedidos</p>
        </div>
        <div className="bg-slate-900 p-6 rounded-2xl shadow-xl text-white">
          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-1">Status de Parceria</span>
          <h3 className="text-xl font-black italic">INTERMEDIÁRIO ATIVO</h3>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <ShoppingBag size={18} className="text-violet-600" />
          <h3 className="font-black uppercase text-xs tracking-widest text-slate-700">Histórico de Contratos de Compra</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white border-b border-slate-100 text-[10px] font-black uppercase text-slate-400">
              <tr>
                <th className="px-6 py-4">Data Emissão</th>
                <th className="px-6 py-4">Nº Pedido</th>
                <th className="px-6 py-4">Produtor / Vendedor</th>
                <th className="px-6 py-4 text-right">Volume (SC)</th>
                <th className="px-6 py-4 text-right">Comissão (R$/SC)</th>
                <th className="px-6 py-4 text-right">Previsão Comissão</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <SkeletonTableRows rows={5} cols={7} />
              ) : relatedOrders.length === 0 ? (
                <tr><td colSpan={7} className="p-20 text-center text-slate-400 italic font-black uppercase tracking-widest">Nenhum contrato encontrado vinculado a este corretor.</td></tr>
              ) : (
                relatedOrders.map(order => {
                  const qty = order.items.reduce((sum, i) => sum + i.quantity, 0);
                  const comm = qty * (order.brokerCommissionPerSc || 0);
                  return (
                    <tr key={order.id} className="hover:bg-slate-50 transition-all group">
                      <td className="px-6 py-4 text-slate-500 font-bold">{new Date(order.date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 font-black text-slate-900 tracking-tighter">#{order.number}</td>
                      <td className="px-6 py-4 uppercase font-black text-slate-700 text-[11px]">{order.partnerName}</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-600">{qty.toLocaleString()} SC</td>
                      <td className="px-6 py-4 text-right font-bold text-violet-600">{currency(order.brokerCommissionPerSc || 0)}</td>
                      <td className="px-6 py-4 text-right font-black text-slate-900 text-base">{currency(comm)}</td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => navigateToOrder(order.id)}
                          className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                          title="Ver detalhes do pedido"
                        >
                          <ExternalLink size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BrokerDetails;
