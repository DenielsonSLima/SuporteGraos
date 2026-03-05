
// Added React, useState, and useEffect imports
import React, { useState, useEffect } from 'react';
import { 
  ScrollText, 
  Search, 
  Filter, 
  History,
  LogIn,
  Activity
} from 'lucide-react';
import SettingsSubPage from '../components/SettingsSubPage';
import { useAudit } from '../../../hooks/useAudit';
import type { AuditLog, UserSession, LoginHistory } from '../../../hooks/useAudit';
import type { ActiveTab } from './logs.types';
import AuditLogList from './components/AuditLogList';
import SessionList from './components/SessionList';
import LoginHistoryList from './components/LoginHistoryList';

interface Props {
  onBack: () => void;
}

const LogsSettings: React.FC<Props> = ({ onBack }) => {
  const {
    fetchActiveSessionsCount,
    fetchFailedLoginsLast30,
    fetchRecentLoginsCount,
    fetchAuditLogsPage,
    fetchUserSessionsPage,
    fetchLoginHistoryPage,
  } = useAudit();

  const [activeTab, setActiveTab] = useState<ActiveTab>('audit');
  
  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditCursor, setAuditCursor] = useState<string | undefined>(undefined);
  const [auditHasMore, setAuditHasMore] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  
  // Sessions State
  const [userSessions, setUserSessions] = useState<UserSession[]>([]);
  const [sessionsCursor, setSessionsCursor] = useState<string | undefined>(undefined);
  const [sessionsHasMore, setSessionsHasMore] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  
  // Login History State
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [loginsCursor, setLoginsCursor] = useState<string | undefined>(undefined);
  const [loginsHasMore, setLoginsHasMore] = useState(false);
  const [loginsLoading, setLoginsLoading] = useState(false);
  
  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statsData, setStatsData] = useState({ totalAuditLogs: 0, activeSessions: 0, totalLogins: 0, failedLogins: 0 });
  const [activeSessionsCount, setActiveSessionsCount] = useState(0);
  const [failedLoginsLast30, setFailedLoginsLast30] = useState(0);

  const AUDIT_PAGE_SIZE = 30;
  const SESSIONS_PAGE_SIZE = 30;
  const LOGINS_PAGE_SIZE = 20;

  const refreshStats = async () => {
    try {
      const [activeCount, failedStats, recentLoginsCount] = await Promise.all([
        fetchActiveSessionsCount({ minutes: 60 }),
        fetchFailedLoginsLast30(),
        fetchRecentLoginsCount(LOGINS_PAGE_SIZE)
      ]);
      setActiveSessionsCount(activeCount);
      setFailedLoginsLast30(failedStats.failed);
      setStatsData((prev) => ({
        ...prev,
        totalLogins: recentLoginsCount
      }));
    } catch (error) {
    }
  };

  const loadAuditLogs = async (reset = false) => {
    if (auditLoading) return;
    setAuditLoading(true);
    try {
      const result = await fetchAuditLogsPage({
        limit: AUDIT_PAGE_SIZE,
        cursor: reset ? undefined : auditCursor,
        module: selectedModule,
        search: searchTerm,
        startDate,
        endDate
      });
      setAuditLogs(prev => reset ? result.items : [...prev, ...result.items]);
      setAuditCursor(result.nextCursor);
      setAuditHasMore(result.hasMore);
      void refreshStats();
    } finally {
      setAuditLoading(false);
    }
  };

  const loadSessions = async (reset = false) => {
    if (sessionsLoading) return;
    setSessionsLoading(true);
    try {
      const result = await fetchUserSessionsPage({
        limit: SESSIONS_PAGE_SIZE,
        cursor: reset ? undefined : sessionsCursor,
        search: searchTerm,
        startDate,
        endDate
      });
      setUserSessions(prev => reset ? result.items : [...prev, ...result.items]);
      setSessionsCursor(result.nextCursor);
      setSessionsHasMore(result.hasMore);
      void refreshStats();
    } finally {
      setSessionsLoading(false);
    }
  };

  const loadLogins = async (reset = false) => {
    if (loginsLoading) return;
    setLoginsLoading(true);
    try {
      const result = await fetchLoginHistoryPage({
        limit: LOGINS_PAGE_SIZE,
        cursor: reset ? undefined : loginsCursor,
        search: searchTerm,
        startDate,
        endDate
      });
      setLoginHistory(prev => reset ? result.items : [...prev, ...result.items]);
      setLoginsCursor(result.nextCursor);
      setLoginsHasMore(result.hasMore);
      void refreshStats();
    } finally {
      setLoginsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'audit') {
      setAuditCursor(undefined);
      void loadAuditLogs(true);
    }
    if (activeTab === 'sessions') {
      setSessionsCursor(undefined);
      void loadSessions(true);
    }
    if (activeTab === 'logins') {
      setLoginsCursor(undefined);
      void loadLogins(true);
    }
  }, [activeTab, searchTerm, selectedModule, startDate, endDate, fetchAuditLogsPage, fetchLoginHistoryPage, fetchUserSessionsPage]);

  useEffect(() => {
    setStatsData({
      totalAuditLogs: auditLogs.length,
      activeSessions: activeSessionsCount,
      totalLogins: loginHistory.length,
      failedLogins: failedLoginsLast30
    });
  }, [auditLogs, activeSessionsCount, loginHistory, failedLoginsLast30]);

  useEffect(() => {
    void refreshStats();
  }, [fetchActiveSessionsCount, fetchFailedLoginsLast30, fetchRecentLoginsCount]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedModule('all');
    setStartDate('');
    setEndDate('');
  };

  const modules = ['Vendas', 'Compras', 'Financeiro', 'Parceiros', 'Logística', 'Relatórios', 'Sistema'];

  return (
    <SettingsSubPage
      title="Logs e Eventos"
      description="Auditoria completa: ações, sessões de usuários, histórico de login, quem alterou o quê e quando."
      icon={ScrollText}
      color="bg-orange-500"
      onBack={onBack}
    >
      <div className="space-y-6">
        
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-3 rounded-lg border border-slate-200">
            <div className="text-xs text-slate-600 mb-1">Logs de Auditoria</div>
            <div className="text-2xl font-bold text-slate-900">{statsData.totalAuditLogs}</div>
            <div className="text-[10px] text-slate-400 mt-1">registros carregados</div>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-3 rounded-lg border border-emerald-200">
            <div className="text-xs text-emerald-600 mb-1">Sessões Ativas</div>
            <div className="text-2xl font-bold text-emerald-900">{statsData.activeSessions}</div>
            <div className="text-[10px] text-emerald-600 mt-1">contagem global</div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg border border-blue-200">
            <div className="text-xs text-blue-600 mb-1">Logins</div>
            <div className="text-2xl font-bold text-blue-900">{statsData.totalLogins}</div>
            <div className="text-[10px] text-blue-600 mt-1">ultimos 20 carregados</div>
          </div>
          <div className="bg-gradient-to-br from-rose-50 to-rose-100 p-3 rounded-lg border border-rose-200">
            <div className="text-xs text-rose-600 mb-1">Falhas</div>
            <div className="text-2xl font-bold text-rose-900">{statsData.failedLogins}</div>
            <div className="text-[10px] text-rose-600 mt-1">falhas nos ultimos 30 logins</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === 'audit'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <History size={16} />
              Auditoria
            </div>
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === 'sessions'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Activity size={16} />
              Sessões
            </div>
          </button>
          <button
            onClick={() => setActiveTab('logins')}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === 'logins'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <LogIn size={16} />
              Histórico de Login
            </div>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <Filter size={16} />
            Filtros de Busca
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder={activeTab === 'audit' ? 'Buscar por usuário ou ação...' : activeTab === 'sessions' ? 'Buscar por usuário...' : 'Buscar por email...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
            </div>

            {/* Module Select - Only for Audit Tab */}
            {activeTab === 'audit' && (
              <div className="relative">
                <select 
                  value={selectedModule}
                  onChange={(e) => setSelectedModule(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:border-orange-500"
                >
                  <option value="all">Todos os Módulos</option>
                  {modules.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            )}

            {/* Date Range */}
            <div className="flex gap-2">
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:border-orange-500"
              />
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {(searchTerm || (activeTab === 'audit' && selectedModule !== 'all') || startDate || endDate) && (
            <div className="flex justify-end">
              <button 
                onClick={clearFilters}
                className="text-xs text-slate-500 hover:text-red-500 underline decoration-dotted"
              >
                Limpar filtros
              </button>
            </div>
          )}
        </div>

        {/* Content by Tab */}
        <div className="space-y-4">
          {activeTab === 'audit' && (
            <AuditLogList
              logs={auditLogs}
              hasMore={auditHasMore}
              loading={auditLoading}
              onLoadMore={() => loadAuditLogs(false)}
            />
          )}

          {activeTab === 'sessions' && (
            <SessionList
              sessions={userSessions}
              hasMore={sessionsHasMore}
              loading={sessionsLoading}
              onLoadMore={() => loadSessions(false)}
            />
          )}

          {activeTab === 'logins' && (
            <LoginHistoryList
              history={loginHistory}
              hasMore={loginsHasMore}
              loading={loginsLoading}
              onLoadMore={() => loadLogins(false)}
            />
          )}
        </div>

        <div className="text-center pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-400">
            O sistema mantém histórico completo de auditoria. Dados sensíveis são armazenados com segurança.
          </p>
        </div>

      </div>
    </SettingsSubPage>
  );
};

export default LogsSettings;
