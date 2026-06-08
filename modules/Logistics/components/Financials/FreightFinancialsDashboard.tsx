
import React, { useMemo } from 'react';
import { Freight } from '../../types';
import { DollarSign } from 'lucide-react';
import CarrierCard from './CarrierCard';
import { useAdvanceSummaries } from '../../../../hooks/useAdvances';
import { useCarriers } from '../../../../hooks/useCarriers';

interface Props {
  freights: Freight[];
  carrierFilter?: string;
  onSelectCarrier: (carrierName: string) => void;
}

interface CarrierGroup {
  name: string;
  totalBalance: number;
  totalAdvances: number;
  globalCredit: number;
  count: number;
}

const FreightFinancialsDashboard: React.FC<Props> = ({ freights, carrierFilter, onSelectCarrier }) => {
  
  const { data: advanceSummaries = [] } = useAdvanceSummaries();
  const { data: carriers = [] } = useCarriers();
  
  const carrierGroups = useMemo(() => {
    const groups: Record<string, CarrierGroup> = {};
    
    // 1. Processar fretes (carregamentos)
    freights.forEach(f => {
      if (f.balanceValue > 0.05 || f.advanceValue > 0 || f.financialStatus !== 'paid') {
        if (!groups[f.carrierName]) {
          const partnerAdvance = advanceSummaries.find(a => a.partnerName === f.carrierName);
          const globalCredit = partnerAdvance && partnerAdvance.netBalance > 0 ? partnerAdvance.netBalance : 0;

          groups[f.carrierName] = {
            name: f.carrierName,
            totalBalance: 0,
            totalAdvances: 0,
            globalCredit: globalCredit,
            count: 0
          };
        }
        groups[f.carrierName].totalBalance += f.balanceValue;
        groups[f.carrierName].totalAdvances += f.advanceValue;
        groups[f.carrierName].count += 1;
      }
    });

    // 2. Adicionar parceiros que têm adiantamento (crédito) mas NÃO têm fretes ativos na lista
    advanceSummaries.forEach(a => {
      // Se tiver saldo positivo e (não tem filtro ou bate no filtro) e não está no grupo ainda
      // E o parceiro é de fato uma transportadora
      const matchesFilter = !carrierFilter || a.partnerName === carrierFilter;
      const isCarrier = carriers.includes(a.partnerName);
      
      if (a.netBalance > 0 && matchesFilter && !groups[a.partnerName] && isCarrier) {
        groups[a.partnerName] = {
          name: a.partnerName,
          totalBalance: 0,
          totalAdvances: 0,
          globalCredit: a.netBalance,
          count: 0
        };
      }
    });

    return Object.values(groups).sort((a, b) => (b.totalBalance + b.globalCredit) - (a.totalBalance + a.globalCredit));
  }, [freights, advanceSummaries, carrierFilter, carriers]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3 text-blue-800 text-sm shadow-sm">
        <DollarSign className="shrink-0" />
        <div>
          <p className="font-bold">Central de Pagamentos de Frete</p>
          <p>
            Selecione uma transportadora abaixo para acessar o <strong>Painel de Rastro</strong>. Adiantamentos lançados no financeiro aparecerão como "Crédito em Conta".
          </p>
        </div>
      </div>

      {carrierGroups.length === 0 ? (
        <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-slate-200 border-dashed">
          {carrierFilter 
            ? `Nenhuma pendência ou crédito encontrado para ${carrierFilter}.`
            : "Nenhuma pendência financeira encontrada para fretes."
          }
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {carrierGroups.map(group => (
            <CarrierCard 
              key={group.name}
              name={group.name}
              count={group.count}
              totalAdvances={group.totalAdvances}
              totalBalance={group.totalBalance}
              globalCredit={group.globalCredit}
              onClick={() => onSelectCarrier(group.name)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FreightFinancialsDashboard;
