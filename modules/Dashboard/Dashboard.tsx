
import React, { useEffect, useState } from 'react';
import MarketTicker from './components/MarketTicker';
import FinancialSummary from './components/FinancialSummary';
import OperationalSummary from './components/OperationalSummary';
import DashboardChart from './components/DashboardChart';
import NetWorthChart from './components/NetWorthChart';
import { dashboardService } from './services/dashboardService';
import { DashboardCache } from '../../services/dashboardCache';
import { isSupabaseInitCompleted } from '../../services/supabaseInitService';
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
    const dashboardMountTime = performance.now();
    console.log('%c[DASHBOARD] 🎯 MONTOU!', 'color: cyan; font-weight: bold;');
    console.log('[DASHBOARD] isSupabaseInitCompleted() =', isSupabaseInitCompleted());
    console.log('[DASHBOARD] Timestamp:', new Date().toISOString());
    
    // Estado para evitar múltiplas chamadas
    let isMounted = true;
    
    // 📦 Carrega cache e retorna dados do dashboard
    const loadDashboard = async () => {
        if (!isMounted) return;
        
        try {
            console.log('[DASHBOARD] ⏳ Iniciando carregamento de dados...');
            setIsLoading(true);
            
            const cache = DashboardCache.load();
            console.log('[DASHBOARD] 📦 Cache carregado:', { hasData: !!cache.cashierReport });
            
            const dashboardData = {
                operational: dashboardService.getOperationalKPIs(),
                financialPending: dashboardService.getFinancialPending(),
                financial: cache.cashierReport,
                chart: dashboardService.getChartData(),
                netWorth: dashboardService.getNetWorthHistory()
            };
            
            console.log('[DASHBOARD] 📊 Dados carregados com sucesso');
            
            if (isMounted) {
                setData(dashboardData);
            }
        } catch (error) {
            console.error('[DASHBOARD] ❌ Erro ao carregar dashboard:', error);
        } finally {
            if (isMounted) {
                setIsLoading(false);
            }
        }
    };

    // Listener para atualizar em tempo real quando dados mudam
    const handleDataUpdate = () => {
      console.log('[DASHBOARD] 🔄 Evento data:updated recebido - recarregando dashboard');
      loadDashboard();
    };
    
    // Listener para quando supabaseInitService termina de carregar
    const handleSupabaseInitComplete = () => {
      console.log('[DASHBOARD] ✅ Evento supabase:init:complete RECEBIDO! Carregando dados...');
      clearTimeout(fallbackTimer);
      loadDashboard();
    };

    const handleSupabaseInitCritical = () => {
      console.log('[DASHBOARD] Evento supabase:init:critical recebido. Carregando dados...');
      clearTimeout(fallbackTimer);
      loadDashboard();
    };

    const fallbackTimer = setTimeout(() => {
      console.warn('[DASHBOARD] Fallback timer ativado. Carregando dados sem evento.');
      loadDashboard();
    }, 5000);

    // ✅ SE INIT JÁ COMPLETOU (ex: após F5), carregar dados IMEDIATAMENTE
    if (isSupabaseInitCompleted()) {
        console.log('%c[DASHBOARD] ⚡ Init JÁ COMPLETO (provavelmente F5) - carregando agora...', 'color: lime; font-weight: bold;');
        loadDashboard();
      clearTimeout(fallbackTimer);
    } else {
        console.log('%c[DASHBOARD] ⏳ Init NÃO completo (primeiro login?) - aguardando evento supabase:init:complete...', 'color: orange; font-weight: bold;');
        console.log('[DASHBOARD] O Dashboard vai ficar vazio até o evento disparar!');
    }

    // REGISTRAR LISTENERS para eventos futuros
    if (typeof window !== 'undefined') {
      console.log('[DASHBOARD] 📝 Registrando listeners...');
      window.addEventListener('data:updated', handleDataUpdate);
      window.addEventListener('supabase:init:complete', handleSupabaseInitComplete);
      window.addEventListener('supabase:init:critical', handleSupabaseInitCritical);
      console.log('[DASHBOARD] ✅ Listeners registrados');
    }

    return () => {
      console.log('[DASHBOARD] 🧹 Limpando resources');
      isMounted = false;
      clearTimeout(fallbackTimer);
      if (typeof window !== 'undefined') {
        window.removeEventListener('data:updated', handleDataUpdate);
        window.removeEventListener('supabase:init:complete', handleSupabaseInitComplete);
        window.removeEventListener('supabase:init:critical', handleSupabaseInitCritical);
      }
    };
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
