
import React, { useEffect, useState } from 'react';
import MarketTicker from './components/MarketTicker';
import FinancialSummary from './components/FinancialSummary';
import OperationalSummary from './components/OperationalSummary';
import DashboardChart from './components/DashboardChart';
import NetWorthChart from './components/NetWorthChart';
import { dashboardService } from './services/dashboardService';
import { DashboardCache } from '../../services/dashboardCache';
import { waitForInit } from '../../services/supabaseInitService';
import { Loader2 } from 'lucide-react';

const Dashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<{
    operational: any;
    financialPending: any;
    financial: any;
    chart: any[];
    netWorth: { history: any[]; growthPercent: number };
  } | null>(null);

  useEffect(() => {
    // 📦 OTIMIZAÇÃO: Carrega cache uma vez e distribui para todos os componentes
    const loadDashboard = async () => {
        try {
            await waitForInit();
            const cache = DashboardCache.load();
            const dashboardData = {
                operational: dashboardService.getOperationalKPIs(),
                financialPending: dashboardService.getFinancialPending(),
                financial: cache.cashierReport, // ← Dados já carregados no cache!
                chart: dashboardService.getChartData(),
                netWorth: dashboardService.getNetWorthHistory()
            };
            setData(dashboardData);
        } finally {
            setIsLoading(false);
        }
    };

    loadDashboard();

    // Listener para atualizar em tempo real quando dados mudam
    const handleDataUpdate = () => {
      loadDashboard();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('data:updated', handleDataUpdate);
      return () => {
        window.removeEventListener('data:updated', handleDataUpdate);
      };
    }
  }, []);

  if (isLoading || !data) {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <Loader2 className="animate-spin text-primary-600" size={48} />
            <p className="text-slate-400 font-black uppercase tracking-widest animate-pulse">Sincronizando Dashboard...</p>
        </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 pb-10">
      
      {/* 1. Market Ticker */}
      <MarketTicker />

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
