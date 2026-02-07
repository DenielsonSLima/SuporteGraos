
import React, { useState, useEffect, Suspense, useMemo, useCallback } from 'react';
import Sidebar from './components/layout/Sidebar';
import HeaderSimple from './components/layout/HeaderSimple';
import { ModuleId, User } from './types';
import { MENU_ITEMS } from './constants';
import { authService } from './services/authService';
import { supabase } from './services/supabase';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { Loader2 } from 'lucide-react';
import { initializeSupabaseData, resetSupabaseInit, getInitDiagnostics } from './services/supabaseInitService';
import FloatingAssistant from './components/ai/FloatingAssistant';

// ============================================================================
// LOG GLOBAL DE INICIALIZAÇÃO
// ============================================================================
console.log('%c╔════════════════════════════════════════════════════════════════════════════╗', 'color: cyan; font-weight: bold; font-size: 16px;');
console.log('%c║  🚀 APP.TSX CARREGADO!                                                    ║', 'color: cyan; font-weight: bold; font-size: 16px;');
console.log('%c╚════════════════════════════════════════════════════════════════════════════╝', 'color: cyan; font-weight: bold; font-size: 16px;');
console.log('[APP] 📅 Data:', new Date().toISOString());
console.log('[APP] 🌐 URL:', window.location.href);
console.log('[APP] 📦 Módulos importados com sucesso');
console.log('[APP] ⏳ Aguardando montagem do React...\n');

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
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [activeModule, setActiveModule] = useState<ModuleId>(ModuleId.HOME);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { addToast } = useToast();
  
  // Check if we should show test page
  const showTestPage = new URLSearchParams(window.location.search).get('test') === 'supabase';

  const shouldDiagInit = new URLSearchParams(window.location.search).get('diag') === '1';
  
  // Check if we should show migration panel
  const showMigrationPanel = new URLSearchParams(window.location.search).get('migrate') === 'users';
  
  // Handler de navegação memoizado (sem transição para evitar travamentos)
  const handleNavigate = useCallback((id: ModuleId) => {
    console.log('[APP] Navegando para modulo:', id);
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
    console.log('[APP] 🎬 AppContent MONTANDO...');
    console.log('[APP] ⏰', new Date().toISOString());
    console.log('[APP] 📊 States inicializados');
  }, []); // Roda apenas UMA VEZ no mount

  useEffect(() => {
    console.log('%c[APP] 🚀 useEffect initAuth MONTADO!', 'background: #222; color: #bada55; font-size: 14px; font-weight: bold;');
    console.log('[APP] ⏰ Timestamp:', new Date().toISOString());
    
    const initAuth = async () => {
      console.log('[APP] 📂 initAuth() função iniciada');
      try {
        console.log('[APP] 🔍 Tentando restaurar sessão do Supabase...');
        // 1. Tentar restaurar sessão do Supabase
        const restoredUser = await authService.restoreSession();
        if (restoredUser) {
          console.log('[APP] ✅ Sessão encontrada!');
          console.log('[APP] 👤 Usuário restaurado:', restoredUser.email);
          setCurrentUser(restoredUser);
          console.log('✅ Sessão restaurada com sucesso:', restoredUser.email);

          // Carregar dados somente quando autenticado
          console.log('[APP] 📊 Usuário autenticado - iniciando carregamento de dados');
          setIsDataLoading(true);
          console.log('[APP] ⏳ isDataLoading = true');
          console.log('📊 Iniciando carregamento de dados do Supabase...');
          const initStartTime = performance.now();
          const initStats = await initializeSupabaseData();
          console.log('[APP] ⏱️  initializeSupabaseData() levou:', (performance.now() - initStartTime).toFixed(2) + 'ms');

          console.log('✅ Dados do Supabase carregados:', {
            tablesLoaded: initStats.tablesLoaded,
            totalTime: initStats.totalTime.toFixed(2) + 'ms',
            errors: initStats.errors.length
          });

          if (shouldDiagInit) {
            console.log('[APP] Init diagnostics:', getInitDiagnostics());
          }

          if (initStats.errors.length > 0) {
            console.warn('[APP] ⚠️ Erros durante inicialização:');
            initStats.errors.forEach(err => console.warn('[APP]   -', err));
          } else {
            console.log('[APP] ✅ Dados carregados sem erros');
          }
        } else {
          console.log('[APP] ℹ️ Nenhum usuário para restaurar - primeira vez');
        }
      } catch (error) {
        console.error('[APP] ❌ ERRO CRÍTICO ao restaurar sessão ou carregar dados:', error);
        console.error('[APP] Stack:', (error as any).stack);
      } finally {
        console.log('[APP] 🏁 initAuth() finalizando...');
        console.log('[APP] ⏳ setIsAuthLoading(false)');
        setIsAuthLoading(false);
        console.log('[APP] ⏳ setIsDataLoading(false)');
        setIsDataLoading(false);
        console.log('[APP] ✅ initAuth() concluído!');
      }
    };

    console.log('[APP] 🚀 Chamando initAuth()...');
    initAuth();
    console.log('[APP] ✅ useEffect concluído (initAuth em background)');
  }, []);

  // Handler de login memoizado para evitar remontagem desnecessária do LoginScreen
  const handleLoginSuccess = useCallback(async (user: User) => {
    console.log('%c[APP] ╔════════════════════════════════════════════════════════════════════════════╗', 'color: #00ff00; font-weight: bold;');
    console.log('%c[APP] ║  🔓 HANDLELOGINSUCCESS CHAMADO!                                           ║', 'color: #00ff00; font-weight: bold;');
    console.log('%c[APP] ╚════════════════════════════════════════════════════════════════════════════╝', 'color: #00ff00; font-weight: bold;');
    console.log('\n' + '='.repeat(80));
    console.log('🔐 HANDLELOGINSUCCESS INICIADO');
    console.log('='.repeat(80));
    console.log('👤 Usuário:', user.email);
    console.log('🕐 Timestamp:', new Date().toISOString());
    
    setCurrentUser(user);
    console.log('✅ State currentUser atualizado');

    // Mostrar notificação de boas-vindas
    addToast('success', 'Bem-vindo!', `${user.name || user.email.split('@')[0]}`);

    // Carregar dados do Supabase após login bem-sucedido
    console.log('🔄 Resetando supabaseInit...');
    resetSupabaseInit();
    
    console.log('⏳ Definindo isDataLoading = true');
    setIsDataLoading(true);
    
    console.log('📊 Iniciando initializeSupabaseData()...');
    console.log('⏱️  Tempo de início:', performance.now());
    
    // 🔥 LOG CRÍTICO: Verificar sessão ANTES de chamar initializeSupabaseData
    const { data: sessionCheck } = await supabase.auth.getSession();
    console.log('%c[APP] 🔍 SESSÃO ANTES DE initializeSupabaseData:', 'color: yellow; font-weight: bold;', {
      hasSession: !!sessionCheck.session,
      userId: sessionCheck.session?.user?.id || 'NENHUM',
      email: sessionCheck.session?.user?.email || 'NENHUM',
      expiresAt: sessionCheck.session?.expires_at || 'N/A'
    });
    
    try {
      const initStartTime = performance.now();
      
      // ⏱️ TIMEOUT de segurança - máximo 20 segundos
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('TIMEOUT: initializeSupabaseData demorou mais de 20 segundos')), 20000);
      });
      
      const initStats = await Promise.race([
        initializeSupabaseData(),
        timeoutPromise
      ]);
      const initEndTime = performance.now();
      
      console.log('\n✅ initializeSupabaseData() concluído!');
      console.log('⏱️  Tempo total:', (initEndTime - initStartTime).toFixed(2) + 'ms');
      
      // 🔥 LOG CRÍTICO: Se tablesLoaded = 0, algo deu errado!
      if (initStats.tablesLoaded === 0) {
        console.error('%c[APP] ❌❌❌ PROBLEMA DETECTADO: tablesLoaded = 0!', 'color: red; font-weight: bold; font-size: 16px;');
        console.error('[APP] Erros:', initStats.errors);
        console.error('[APP] Isso significa que a sessão NÃO foi detectada pelo supabaseInitService!');
      }
      
      console.log('📦 Dados carregados:', {
        tablesLoaded: initStats.tablesLoaded,
        totalTime: initStats.totalTime.toFixed(2) + 'ms',
        hasData: {
          ufs: !!initStats.data.ufs?.length,
          cities: !!initStats.data.cities?.length,
          partnerTypes: !!initStats.data.partnerTypes?.length,
          productTypes: !!initStats.data.productTypes?.length,
          bankAccounts: !!initStats.data.bankAccounts?.length,
          partners: !!initStats.data.partners?.length
        }
      });

      if (shouldDiagInit) {
        console.log('[APP] Init diagnostics:', getInitDiagnostics());
      }

      if (initStats.errors.length > 0) {
        console.warn('⚠️ Erros durante carregamento:');
        initStats.errors.forEach((err, i) => console.warn(`   ${i + 1}. ${err}`));
      } else {
        console.log('✅ Sem erros durante carregamento');
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados pós-login:', error);
      console.error('Stack:', (error as any).stack);
    } finally {
      console.log('⏳ Definindo isDataLoading = false');
      setIsDataLoading(false);
      console.log('🎉 handleLoginSuccess finalizado');
      console.log('='.repeat(80) + '\n');
    }
  }, []); // Nenhuma dependência = função estável

  const handleLogout = async () => {
    await authService.logout();
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
    console.log('[APP] 👤 currentUser = null → Exibindo LoginScreen');
    return (
      <Suspense fallback={<div className="min-h-screen bg-slate-900" />}>
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      </Suspense>
    );
  }
  
  if (isDataLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <Loader2 className="animate-spin text-primary-600" size={40} />
        <span className="text-slate-400 font-black uppercase tracking-widest animate-pulse">Sincronizando...</span>
      </div>
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

console.log('[APP] 📤 App component exportado - aguardando React montar...\n');

export default App;
