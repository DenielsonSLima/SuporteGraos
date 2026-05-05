
import React from 'react';
import { 
  ShoppingCart, 
  Truck, 
  Percent, 
  Briefcase, 
  Landmark, 
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  AlertCircle,
  Users,
  ChevronRight
} from 'lucide-react';
import { useCashierModularStats } from '../../../hooks/useCashier';
import { CategoryStats } from '../types';

interface Props {
  referenceDate?: string;
}

const CashierModularStats: React.FC<Props> = ({ referenceDate }) => {
  const { data: stats, isLoading, error } = useCashierModularStats(referenceDate);

  const currency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(val || 0);
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse mb-8">
        <div className="h-64 bg-slate-100 rounded-2xl border border-slate-200"></div>
        <div className="h-64 bg-slate-100 rounded-2xl border border-slate-200"></div>
      </div>
    );
  }

  if (error || !stats) return null;

  const StatRow = ({ title, data, icon: Icon, colorClass }: { title: string, data: CategoryStats, icon: any, colorClass: string }) => {
    const isPaidOut = data.total_mes > 0 && data.pago_mes >= data.total_mes;
    
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white hover:bg-slate-50 transition-all border-b border-slate-100 last:border-0 group">
        <div className="flex items-center gap-4 flex-1 mb-3 sm:mb-0">
          <div className={`p-2.5 rounded-xl ${colorClass} shadow-sm group-hover:shadow-md transition-all group-hover:scale-105`}>
            <Icon size={20} />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-black text-slate-700 uppercase tracking-tight truncate">{title}</h4>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lançado: <span className="text-slate-600">{currency(data.total_mes)}</span></span>
              {isPaidOut && <span className="text-[8px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-black uppercase">Liquidado</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-12">
          <div className="text-left sm:text-right">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Pago/Rec. no Mês</span>
            <span className="text-sm font-black text-emerald-600 tabular-nums">{currency(data.pago_mes)}</span>
          </div>
          
          <div className="text-right min-w-[110px]">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Pendente Global</span>
            <span className={`text-sm font-black tabular-nums ${data.pendente_global > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
              {currency(data.pendente_global)}
            </span>
          </div>
          
          <ChevronRight size={16} className="text-slate-200 group-hover:text-slate-400 transition-colors hidden sm:block" />
        </div>
      </div>
    );
  };

  const SectionHeader = ({ title, subtitle }: { title: string, subtitle: string }) => (
    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
      <div>
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">{title}</h3>
        <p className="text-[9px] text-slate-400 font-bold uppercase">{subtitle}</p>
      </div>
      <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest hidden sm:block">Valores em Reais (BRL)</div>
    </div>
  );

  return (
    <div className="space-y-8 mb-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <SectionHeader 
          title="Movimentações Operacionais" 
          subtitle="Ciclo principal de Compras, Fretes e Vendas Reais"
        />
        <div className="divide-y divide-slate-50">
          <StatRow 
            title="Compras de Grãos" 
            data={stats.compras} 
            icon={ShoppingCart} 
            colorClass="bg-rose-50 text-rose-600" 
          />
          <StatRow 
            title="Fretes & Logística" 
            data={stats.fretes} 
            icon={Truck} 
            colorClass="bg-orange-50 text-orange-600" 
          />
          <StatRow 
            title="Comissões Externas" 
            data={stats.comissoes} 
            icon={Percent} 
            colorClass="bg-purple-50 text-purple-600" 
          />
          <StatRow 
            title="Receitas de Vendas" 
            data={stats.receitas} 
            icon={TrendingUp} 
            colorClass="bg-emerald-50 text-emerald-600" 
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <SectionHeader 
          title="Gestão Financeira & Capital" 
          subtitle="Despesas administrativas e movimentações de crédito"
        />
        <div className="divide-y divide-slate-50">
          <StatRow 
            title="Despesas Fixas" 
            data={stats.despesas_fixas} 
            icon={Calendar} 
            colorClass="bg-blue-50 text-blue-600" 
          />
          <StatRow 
            title="Despesas Variáveis" 
            data={stats.despesas_variaveis} 
            icon={ArrowDownLeft} 
            colorClass="bg-amber-50 text-amber-600" 
          />
          <StatRow 
            title="Gastos Administrativos" 
            data={stats.despesas_administrativas} 
            icon={Briefcase} 
            colorClass="bg-slate-100 text-slate-700" 
          />
          <StatRow 
            title="Haveres com Sócios" 
            data={stats.socios} 
            icon={Users} 
            colorClass="bg-indigo-50 text-indigo-600" 
          />
          <StatRow 
            title="Empréstimos Cedidos" 
            data={stats.emprestimos_cedidos} 
            icon={ArrowUpRight} 
            colorClass="bg-emerald-50 text-emerald-600" 
          />
          <StatRow 
            title="Empréstimos Tomados" 
            data={stats.emprestimos_tomados} 
            icon={Landmark} 
            colorClass="bg-sky-50 text-sky-600" 
          />
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl p-6 text-white relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative z-10 flex items-start gap-4">
          <div className="p-2 bg-white/10 rounded-xl text-white/80 shrink-0 mt-1">
            <AlertCircle size={20} />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white/90 mb-1">Entenda o Fechamento Operacional</h4>
            <p className="text-[10px] text-white/60 font-medium leading-relaxed max-w-2xl">
              Os valores de <strong>Lançado</strong> representam obrigações criadas neste mês. 
              O <strong>Pago/Rec. no Mês</strong> reflete a movimentação real de caixa. 
              O <strong>Pendente Global</strong> monitora o saldo acumulado de todos os tempos.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default CashierModularStats;
