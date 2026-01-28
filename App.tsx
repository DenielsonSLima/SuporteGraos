
import React, { useState, useEffect, Suspense, useTransition, useMemo, useCallback } from 'react';
import Sidebar from './components/layout/Sidebar';
import HeaderSimple from './components/layout/HeaderSimple';
import { ModuleId, User } from './types';
import { MENU_ITEMS } from './constants';
import { authService } from './services/authService';
import { ToastProvider } from './contexts/ToastContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { Loader2 } from 'lucide-react';
import { initializeSupabaseData } from './services/supabaseInitService';
import FloatingAssistantSimple from './components/ai/FloatingAssistantSimple';

// Lazy Load Modules
const Dashboard = React.lazy(() => import('./modules/Dashboard/Dashboard'));
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

const TestSupabase = React.lazy(() => import('./TestSupabase'));
const MigrationPanel = React.lazy(() => import('./components/MigrationPanel'));

const AppContent: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [activeModule, setActiveModule] = useState<ModuleId>(ModuleId.HOME);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Check if we should show test page
  const showTestPage = new URLSearchParams(window.location.search).get('test') === 'supabase';
  
  // Check if we should show migration panel
  const showMigrationPanel = new URLSearchParams(window.location.search).get('migrate') === 'users';
  
  // Otimização Crítica: useTransition para navegação suave sem travar a UI
  const [isPending, startTransition] = useTransition();

  // Handler de navegação memoizado com transição
  const handleNavigate = useCallback((id: ModuleId) => {
    startTransition(() => {
      setActiveModule(id);
    });
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
    const user = authService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
    setIsAuthLoading(false);
    
    // Iniciar carregamento paralelo do Supabase imediatamente
    initializeSupabaseData();
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    setActiveModule(ModuleId.HOME);
  };

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

  // Show test page if requested via URL
  if (new URLSearchParams(window.location.search).get('test') === 'supabase') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <TestSupabase />
      </Suspense>
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
    <div className={`flex min-h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-x-hidden ${isPending ? 'cursor-wait' : ''}`}>
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
        <main className={`flex-1 p-6 md:p-8 overflow-x-hidden transition-opacity duration-300 ${isPending ? 'opacity-50' : 'opacity-100'}`}>
          <div className="mx-auto max-w-7xl h-full">
            <Suspense fallback={<LoadingFallback />}>
              {moduleContent}
            </Suspense>
          </div>
        </main>
      </div>

      {/* ASSISTENTE FLUTUANTE GLOBAL */}
      <FloatingAssistantSimple />
      
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ToastProvider>
      <WebSocketProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </WebSocketProvider>
    </ToastProvider>
  );
};

export default App;
