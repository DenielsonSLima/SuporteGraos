
/**
 * Dashboard.tsx
 *
 * OTIMIZADO: Migrado para TanStack Query.
 * ✅ Cache compartilhado com todos os hooks do sistema
 * ✅ Um único canal Realtime (não 6 listeners + window events)
 * ✅ Deduplicação automática de requests
 * ✅ keepPreviousData — sem piscar a tela
 * ✅ staleTime 30s — dados do dashboard são voláteis
 */

import React from 'react';
import MarketTicker from './components/MarketTicker';
import FinancialSummary from './components/FinancialSummary';
import OperationalSummary from './components/OperationalSummary';
import DashboardChart from './components/DashboardChart';
import NetWorthChart from './components/NetWorthChart';
import { useDashboard } from '../../hooks/useDashboard';
import { AlertTriangle } from 'lucide-react';

const Dashboard = () => {
  const { data, isLoading, error } = useDashboard();

  const showError = !!error;

  // Skeleton enquanto carrega (nunca exibe zeros)
  if (isLoading || !data) {
    return (
      <div className="animate-in fade-in duration-500 pb-10">
        <MarketTicker />
        {showError && (
          <div className="mb-4">
            <span className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-700">
              <AlertTriangle size={12} />
              Falha ao carregar dados do dashboard.
            </span>
          </div>
        )}
        {/* Skeleton cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="rounded-2xl bg-slate-100 animate-pulse h-[140px]" />
          ))}
        </div>
        {/* Skeleton chart */}
        <div className="rounded-2xl bg-slate-100 animate-pulse h-[380px] mb-8" />
        {/* Skeleton KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="rounded-xl bg-slate-100 animate-pulse h-[120px]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 pb-10">
      {/* 1. Market Ticker */}
      <MarketTicker />

      {showError && (
        <div className="mb-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-700">
            <AlertTriangle size={12} />
            Falha ao carregar dados do dashboard.
          </span>
        </div>
      )}

      {/* 2. Main Financial Summary */}
      <div className="relative z-0">
        <FinancialSummary data={data.financial} />
      </div>

      {/* 3. Net Worth Evolution Chart */}
      {data.netWorth.history.length > 0 && (
        <NetWorthChart
          data={data.netWorth.history}
          growthPercent={data.netWorth.growthPercent}
        />
      )}

      {/* 4. Trend Analysis Chart */}
      {data.chart.length > 0 && <DashboardChart data={data.chart} />}

      {/* 5. Operational KPIs */}
      <OperationalSummary data={data.operational} />

    </div>
  );
};

export default Dashboard;
