
import React, { useState, useEffect, Suspense, useMemo, useCallback } from 'react';
import { queryClient } from './lib/queryClient';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Sidebar from './components/layout/Sidebar';
import HeaderSimple from './components/layout/HeaderSimple';
import { ModuleId, User } from './types';
import { MENU_ITEMS } from './constants';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { Loader2 } from 'lucide-react';
import FloatingAssistant from './components/ai/FloatingAssistant';
import { useRealtimeResilience } from './hooks/useRealtimeResilience';
import { usePrefetchModules } from './hooks/usePrefetchModules';
import { useAppSessionServices } from './hooks/useAppSessionServices';
import { loadingService } from './services/loadingService';

// Lazy Load Modules
const preloadDashboardModule = () => import('./modules/Dashboard/Dashboard');
const Dashboard = React.lazy(preloadDashboardModule);
const PartnersModule = React.lazy(() => import('./modules/Partners/PartnersModule'));
const PurchaseOrderModule = React.lazy(() => import('./modules/PurchaseOrder/PurchaseOrderModule'));
const SalesOrderModule = React.lazy(() => import('./modules/SalesOrder/SalesOrderModule'));
const LogisticsModule = React.lazy(() => import('./modules/Logistics/LogisticsModule'));
const CashierModule = React.lazy(() => import('./modules/Cashier/CashierModule'));
const FinancialModule = React.lazy(() => import('./modules/Financial/FinancialModule'));
const PerformanceModule = React.lazy(() => import('./modules/Performance/PerformanceModule'));
const ReportsModule = React.lazy(() => import('./modules/Reports/ReportsModule'));
const AssetsModule = React.lazy(() => import('./modules/Assets/AssetsModule'));
const Settings = React.lazy(() => import('./modules/Settings/Settings'));
const ProfileModule = React.lazy(() => import('./modules/Profile/ProfileModule'));
const HelpModule = React.lazy(() => import('./modules/Help/HelpModule'));
const LoginScreen = React.lazy(() => import('./modules/Auth/LoginScreen'));
const DevelopmentPlaceholder = React.lazy(() => import('./modules/Common/DevelopmentPlaceholder'));

const LoadingFallback = () => (
  <div className="flex h-full w-full items-center justify-center p-10 animate-in fade-in duration-500">
    <div className="flex flex-col items-center gap-3">
      <Loader2 size={32} className="animate-spin text-primary-600 opacity-20" />
    </div>
  </div>
);

const MigrationPanel = React.lazy(() => import('./components/MigrationPanel'));

const AppContent: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [activeModule, setActiveModule] = useState<ModuleId>(ModuleId.HOME);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { addToast } = useToast();
  const appSessionServices = useAppSessionServices();

  // Inicializar callbacks de serviço
  React.useEffect(() => {
    loadingService.setToastCallback(addToast);
  }, [addToast]);

  // Resiliência: invalida cache ao reconectar (online/offline + tab visibility)
  useRealtimeResilience();

  // Prefetching: pré-carrega dados de módulos adjacentes em background
  usePrefetchModules(activeModule);

  const prefetchDashboard = useCallback(() => {
    void preloadDashboardModule();
    appSessionServices.prefetchDashboard();
  }, [appSessionServices]);
  
  // Check if we should show test page
  const showTestPage = new URLSearchParams(window.location.search).get('test') === 'supabase';

  // Check if we should show migration panel
  const showMigrationPanel = new URLSearchParams(window.location.search).get('migrate') === 'users';
  
  // Handler de navegação memoizado (sem transição para evitar travamentos)
  const handleNavigate = useCallback((id: ModuleId) => {
    setActiveModule(id);
  }, []);

  useEffect(() => {
    const handleGlobalNav = (e: any) => {
      if (e.detail && e.detail.moduleId) {
        handleNavigate(e.detail.moduleId);
      }
    };
    window.addEventListener('app:navigate', handleGlobalNav);
    return () => window.removeEventListener('app:navigate', handleGlobalNav);
  }, [handleNavigate]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // 1. Tentar restaurar sessão do Supabase
        const restoredUser = await appSessionServices.restoreSession();
        if (restoredUser) {
          setCurrentUser(restoredUser);
          setIsAuthLoading(false);
          prefetchDashboard();

          // Carregar dados em background (não bloqueia renderização da aplicação)
          setIsDataLoading(true);
          void appSessionServices.initializeDataInBackground()
            .finally(() => {
              setIsDataLoading(false);
            });

          return;
        }
      } catch (error) {
        console.error('[APP] Erro ao restaurar sessão:', error);
      } finally {
        setIsAuthLoading(false);
      }
    };

    initAuth();
  }, [appSessionServices, prefetchDashboard]);

  // Handler de login memoizado para evitar remontagem desnecessária do LoginScreen
  const handleLoginSuccess = useCallback(async (user: User) => {
    setCurrentUser(user);
    prefetchDashboard();

    // Mostrar notificação de boas-vindas
    addToast('success', 'Bem-vindo!', `${user.name || user.email.split('@')[0]}`);

    // Carregar dados do Supabase após login bem-sucedido
    appSessionServices.resetInit();
    setIsDataLoading(true);
    
    try {
      await appSessionServices.initializeDataAfterLogin();
    } catch (error) {
      console.error('[APP] Erro ao carregar dados pós-login:', error);
    } finally {
      setIsDataLoading(false);
    }
  }, [addToast, appSessionServices, prefetchDashboard]); // Nenhuma dependência = função estável

  const handleLogout = useCallback(async () => {
    await appSessionServices.logout();
    setCurrentUser(null);
    setActiveModule(ModuleId.HOME);
  }, [appSessionServices]);

  useEffect(() => {
    if (!currentUser) return;

    const INACTIVITY_LIMIT_MS = 30 * 60 * 1000; // 30 minutos
    const WARNING_BEFORE_MS = 3 * 60 * 1000; // 3 minutos antes
    const REFRESH_PING_KEY = 'sg_refresh_ping';
    const ACTIVITY_KEY = 'sg_last_activity';
    const REFRESH_GRACE_MS = 2000;
    const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;
    const CHECK_INTERVAL_MS = 30 * 1000; // Checar a cada 30s
    
    const activityEvents: Array<keyof WindowEventMap> = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart'
    ];

    let checkIntervalId: number | null = null;
    let heartbeatId: number | null = null;
    let lastHeartbeatAt = 0;
    let hasWarned = false;

    const updateActivity = () => {
      localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
      hasWarned = false; // Permite novo aviso se a inatividade voltar
    };

    const checkInactivity = () => {
      const lastActivity = Number(localStorage.getItem(ACTIVITY_KEY) || Date.now());
      const now = Date.now();
      const elapsed = now - lastActivity;

      // 1. Logout
      if (elapsed >= INACTIVITY_LIMIT_MS) {
        console.warn('[APP] Inatividade detectada (Resilient Check): encerrando sessao.');
        void handleLogout();
        return;
      }

      // 2. Aviso (Apenas uma vez por ciclo de inatividade)
      if (elapsed >= (INACTIVITY_LIMIT_MS - WARNING_BEFORE_MS) && !hasWarned) {
        addToast('warning', 'Sessão vai expirar', 'O sistema será encerrado em instantes por inatividade.');
        hasWarned = true;
      }
    };

    const sendHeartbeat = () => {
      const sessionId = appSessionServices.getCurrentSessionId();
      if (!sessionId) return;
      const now = Date.now();
      if (now - lastHeartbeatAt < HEARTBEAT_INTERVAL_MS) return;
      lastHeartbeatAt = now;
      void appSessionServices.heartbeatSession(sessionId);
    };

    const handleActivity = () => {
      updateActivity();
      sendHeartbeat();
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === ACTIVITY_KEY) {
        hasWarned = false; // Atividade em outra aba reseta o aviso nesta
      }
    };

    const handlePageExit = () => {
      const unloadAt = Date.now();
      window.setTimeout(() => {
        const ping = localStorage.getItem(REFRESH_PING_KEY);
        const pingTime = ping ? Number(ping) : 0;
        if (pingTime && pingTime >= unloadAt) return;
        void appSessionServices.logout();
      }, REFRESH_GRACE_MS);
    };

    // Listeners
    activityEvents.forEach((eventName) =>
      window.addEventListener(eventName, handleActivity, { passive: true })
    );
    window.addEventListener('pagehide', handlePageExit);
    window.addEventListener('storage', handleStorageChange);

    // Inicialização
    updateActivity();
    checkIntervalId = window.setInterval(checkInactivity, CHECK_INTERVAL_MS);
    heartbeatId = window.setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    
    void appSessionServices.closeStaleSessions(30); // Limpar no banco sessões com +30min idle
    sendHeartbeat();

    return () => {
      if (checkIntervalId) window.clearInterval(checkIntervalId);
      if (heartbeatId) window.clearInterval(heartbeatId);
      activityEvents.forEach((eventName) =>
        window.removeEventListener(eventName, handleActivity)
      );
      window.removeEventListener('pagehide', handlePageExit);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [addToast, appSessionServices, currentUser, handleLogout]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const currentModuleLabel = useMemo(() => 
    MENU_ITEMS.find(m => m.id === activeModule)?.label || 'ERP'
  , [activeModule]);

  // Renderização memoizada para evitar recriação do componente ao abrir/fechar sidebar
  const moduleContent = useMemo(() => {
    switch (activeModule) {
      case ModuleId.HOME: return <Dashboard />;
      case ModuleId.PARTNERS: return <PartnersModule />;
      case ModuleId.PURCHASE_ORDER: return <PurchaseOrderModule />;
      case ModuleId.SALES_ORDER: return <SalesOrderModule />;
      case ModuleId.LOGISTICS: return <LogisticsModule />;
      case ModuleId.ASSETS: return <AssetsModule />;
      case ModuleId.CASHIER: return <CashierModule />;
      case ModuleId.FINANCIAL: return <FinancialModule />;
      case ModuleId.PERFORMANCE: return <PerformanceModule />;
      case ModuleId.REPORTS: return <ReportsModule />;
      case ModuleId.SETTINGS: return <Settings />;
      case ModuleId.PROFILE: return <ProfileModule />;
      case ModuleId.HELP: return <HelpModule />; 
      default: return <DevelopmentPlaceholder moduleName={currentModuleLabel} />;
    }
  }, [activeModule, currentModuleLabel]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <Loader2 className="animate-spin text-primary-600" size={40} />
        <span className="text-slate-400 font-black uppercase tracking-widest animate-pulse">Sincronizando...</span>
      </div>
    );
  }

  // Show migration panel if requested via URL
  if (showMigrationPanel) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12">
        <Suspense fallback={<LoadingFallback />}>
          <MigrationPanel />
        </Suspense>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-slate-900" />}>
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      </Suspense>
    );
  }
  
  return (
    <div className="flex min-h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-x-hidden">
      <Sidebar 
        activeModule={activeModule} 
        onNavigate={handleNavigate} 
        isOpen={isSidebarOpen}
        currentUser={currentUser}
        onLogout={handleLogout}
      />
      <div 
        className={`
          flex flex-1 flex-col transition-all duration-300 ease-in-out min-w-0
          ${isSidebarOpen ? 'ml-64' : 'ml-20'}
        `}
      >
        <HeaderSimple 
          toggleSidebar={toggleSidebar} 
          title={activeModule === ModuleId.PROFILE ? 'Meu Perfil' : currentModuleLabel} 
          onNavigate={handleNavigate}
        />
        <main className="flex-1 p-6 md:p-8 overflow-x-hidden transition-opacity duration-300">
          <div className="mx-auto max-w-7xl h-full">
            <Suspense fallback={<LoadingFallback />}>
              {moduleContent}
            </Suspense>
          </div>
        </main>
      </div>

      {/* ASSISTENTE FLUTUANTE GLOBAL */}
      <FloatingAssistant />

      {isDataLoading && (
        <div className="fixed bottom-4 right-20 z-50 flex items-center gap-2 rounded-full bg-slate-900/90 px-3 py-2 text-xs font-bold text-white shadow-lg">
          <Loader2 size={14} className="animate-spin" />
          Sincronizando em segundo plano
        </div>
      )}
      
    </div>
  );
};


const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <WebSocketProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </WebSocketProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
};

export default App;
