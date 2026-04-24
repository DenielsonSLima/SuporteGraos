
import React from 'react';
import { DollarSign, Clock, AlertCircle, Calendar } from 'lucide-react';
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
    queryKey: [...QUERY_KEYS.FINANCIAL_SUMMARY, currentUser?.companyId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rpc_get_financial_summary_v3', {
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

  return (
    <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-3 mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
      <StatCard 
        label={`Total a ${type === 'payable' ? 'Pagar' : 'Receber'}`}
        value={currentStats?.total || 0} 
        icon={DollarSign} 
        color={type === 'payable' ? 'bg-rose-600' : 'bg-emerald-600'}
        subtext="Saldo total pendente"
        loading={isLoading}
      />
      <StatCard 
        label="Vence Hoje" 
        value={currentStats?.today || 0} 
        icon={Calendar} 
        color="bg-amber-500"
        subtext="Compromissos do dia"
        loading={isLoading}
      />
      <StatCard 
        label="Atrasado" 
        value={currentStats?.overdue || 0} 
        icon={AlertCircle} 
        color="bg-rose-700"
        subtext="Títulos vencidos"
        bgClass={currentStats?.overdue > 0 ? 'bg-rose-50 border-rose-100' : 'bg-white border-slate-200'}
        loading={isLoading}
      />
    </div>
  );
};

export default FinancialKPIs;
