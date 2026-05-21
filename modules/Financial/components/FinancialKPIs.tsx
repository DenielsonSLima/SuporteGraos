
import React from 'react';
import { DollarSign, CheckCircle2, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../services/supabase';
import { formatMoney } from '../../../utils/formatters';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
import { QUERY_KEYS } from '../../../hooks/queryKeys';

interface Props {
  type: 'payable' | 'receivable';
}

const FinancialKPIs: React.FC<Props> = ({ type }) => {
  const currentUser = useCurrentUser();

  const { data: stats, isLoading } = useQuery({
    queryKey: [...QUERY_KEYS.FINANCIAL_SUMMARY, currentUser?.companyId, 'v4'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rpc_get_financial_summary_v4', {
        p_company_id: currentUser?.companyId
      });
      if (error) throw error;
      return data;
    },
    enabled: !!currentUser?.companyId
  });

  const currentStats = stats ? stats[type] : null;

  const StatCard = ({ label, value, icon: Icon, color, subtext, bgClass, loading }: any) => (
    <div className={`p-6 rounded-3xl border shadow-sm flex items-start justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${bgClass || 'bg-white border-slate-200'}`}>
      <div className="flex-1">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 leading-none not-italic">{label}</p>
        {loading ? (
          <div className="h-6 w-24 bg-slate-100 animate-pulse rounded" />
        ) : (
          <h3 className="text-xl font-black text-slate-800 tracking-tighter leading-none">{formatMoney(value)}</h3>
        )}
        {subtext && <p className="text-[9px] text-slate-500 font-black uppercase mt-2 tracking-tight">{subtext}</p>}
      </div>
      <div className={`p-3 rounded-2xl ${color} shadow-lg shadow-current/20 shrink-0 ml-4`}>
        <Icon size={22} className="text-white" />
      </div>
    </div>
  );

  if (type === 'payable') {
    return (
      <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-3 mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
        <StatCard 
          label="Valor Total"
          value={currentStats?.total_amount || 0} 
          icon={DollarSign} 
          color="bg-rose-600"
          subtext="Soma de todas as contas"
          loading={isLoading}
        />
        <StatCard 
          label="Valor Pago" 
          value={currentStats?.paid_amount || 0} 
          icon={CheckCircle2} 
          color="bg-emerald-600"
          subtext="Total já quitado"
          loading={isLoading}
        />
        <StatCard 
          label="Valor em Aberto" 
          value={currentStats?.open_amount || 0} 
          icon={Clock} 
          color="bg-amber-500"
          subtext="Saldo pendente de pagamento"
          bgClass={currentStats?.open_amount > 0 ? 'bg-amber-50 border-amber-100' : 'bg-white border-slate-200'}
          loading={isLoading}
        />
      </div>
    );
  }

  // type === 'receivable'
  return (
    <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-3 mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
      <StatCard 
        label="Valor Total"
        value={currentStats?.total_amount || 0} 
        icon={DollarSign} 
        color="bg-emerald-600"
        subtext="Soma de todas as contas"
        loading={isLoading}
      />
      <StatCard 
        label="Valor Recebido" 
        value={currentStats?.paid_amount || 0} 
        icon={CheckCircle2} 
        color="bg-blue-600"
        subtext="Total já recebido"
        loading={isLoading}
      />
      <StatCard 
        label="Valor Pendente" 
        value={currentStats?.pending_amount || 0} 
        icon={Clock} 
        color="bg-amber-500"
        subtext="Saldo a receber"
        bgClass={currentStats?.pending_amount > 0 ? 'bg-amber-50 border-amber-100' : 'bg-white border-slate-200'}
        loading={isLoading}
      />
    </div>
  );
};

export default FinancialKPIs;
