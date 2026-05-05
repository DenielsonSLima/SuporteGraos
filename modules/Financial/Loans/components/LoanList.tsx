
import React from 'react';
import { Landmark } from 'lucide-react';
import { LoanRecord } from '../../types';
import LoanCard from './LoanCard';
import { useLoansActiveTotals } from '../../../../hooks/useLoans';

interface Props {
  loans: LoanRecord[];
  onSelect: (id: string) => void;
}

const LoanList: React.FC<Props> = ({ loans, onSelect }) => {
  // Ordenar empréstimos alfabeticamente por nome da entidade
  const sortedLoans = [...loans].sort((a, b) => 
    a.entityName.localeCompare(b.entityName, 'pt-BR')
  );

  const { data: totals } = useLoansActiveTotals();

  const takenLoans = sortedLoans.filter(l => l.type === 'taken');
  const grantedLoans = sortedLoans.filter(l => l.type === 'granted');

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);

  const Section = ({ title, items, color, stats }: { title: string, items: LoanRecord[], color: string, stats?: { principal: number, paid: number, remaining: number } }) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 border-slate-200 pl-6 py-2 bg-slate-50/50 rounded-r-3xl">
          <div className="flex items-center gap-3">
            <h2 className={`text-xl font-black text-slate-800 uppercase tracking-tighter not-italic`}>{title}</h2>
            <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest leading-none ${color.replace('border-', 'bg-').replace('-500', '-100')} ${color.replace('border-', 'text-')}`}>
              {items.length} contratos
            </span>
          </div>

          {stats && (
            <div className="flex flex-wrap items-center gap-6 pr-4">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Valor Total</span>
                <span className="text-sm font-black text-slate-700 tracking-tighter">{currency(stats.principal)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Já Liquidado</span>
                <span className="text-sm font-black text-blue-600 tracking-tighter">{currency(stats.paid)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Saldo Aberto</span>
                <span className={`text-sm font-black tracking-tighter ${color.replace('border-', 'text-')}`}>{currency(stats.remaining)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {items.map(loan => (
            <LoanCard 
              key={loan.id} 
              loan={loan} 
              onSelect={onSelect} 
            />
          ))}
        </div>
      </div>
    );
  };

  if (loans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
        <Landmark size={48} className="text-slate-300 mb-4" />
        <p className="font-black text-slate-400 uppercase tracking-widest">Nenhum contrato encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <Section 
        title="Empréstimos Tomados (Dívidas)" 
        items={takenLoans} 
        color="border-rose-500"
        stats={totals ? {
          principal: totals.takenPrincipal,
          paid: totals.takenPaid,
          remaining: totals.takenRemaining
        } : undefined}
      />
      
      <Section 
        title="Empréstimos Cedidos (Créditos)" 
        items={grantedLoans} 
        color="border-emerald-500"
        stats={totals ? {
          principal: totals.grantedPrincipal,
          paid: totals.grantedPaid,
          remaining: totals.grantedRemaining
        } : undefined}
      />
    </div>
  );
};

export default LoanList;
