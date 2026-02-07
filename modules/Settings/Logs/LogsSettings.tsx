
// Added React, useState, and useEffect imports
import React, { useState, useEffect } from 'react';
import { 
  ScrollText, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileEdit, 
  Trash2, 
  Download,
  ShieldAlert,
  History,
  LogIn,
  LogOut,
  Zap,
  AlertTriangle,
  Activity
} from 'lucide-react';
import SettingsSubPage from '../components/SettingsSubPage';
import { logService, LogEntry } from '../../../services/logService';
import { auditService, AuditLog, UserSession, LoginHistory } from '../../../services/auditService';

interface Props {
  onBack: () => void;
}

const LogsSettings: React.FC<Props> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'audit' | 'sessions' | 'logins'>('audit');
  
  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [filteredAuditLogs, setFilteredAuditLogs] = useState<AuditLog[]>([]);
  
  // Sessions State
  const [userSessions, setUserSessions] = useState<UserSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<UserSession[]>([]);
  
  // Login History State
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [filteredLogins, setFilteredLogins] = useState<LoginHistory[]>([]);
  
  // Old Logs State (fallback)
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statsData, setStatsData] = useState({ totalAuditLogs: 0, activeSessions: 0, totalLogins: 0, failedLogins: 0 });

  // Load Data
  useEffect(() => {
    // Subscribe to audit logs realtime
    const unsubAudit = auditService.subscribeAuditLogs((logs) => {
      setAuditLogs(logs);
      applyFilters('audit', logs, [], []);
    });

    // Subscribe to user sessions realtime
    const unsubSessions = auditService.subscribeUserSessions((sessions) => {
      setUserSessions(sessions);
      applyFilters('sessions', [], sessions, []);
    });

    // Subscribe to login history realtime
    const unsubLogins = auditService.subscribeLoginHistory((logins) => {
      setLoginHistory(logins);
      applyFilters('logins', [], [], logins);
    });

    // Load old logs as fallback
    setLogs(logService.getFiltered({}));
    const unsubLegacy = logService.subscribe((legacy) => {
      setLogs(legacy);
    });

    // Load stats
    updateStats();

    // Start realtime
    auditService.startRealtime();

    return () => {
      unsubAudit?.();
      unsubSessions?.();
      unsubLogins?.();
      unsubLegacy?.();
    };
  }, []);

  useEffect(() => {
    applyFilters(activeTab, auditLogs, userSessions, loginHistory);
    updateStats();
  }, [searchTerm, selectedModule, startDate, endDate, activeTab, auditLogs, userSessions, loginHistory]);

  const mapLegacyToAudit = (entry: LogEntry): AuditLog => ({
    id: entry.id,
    userId: entry.userId || 'system',
    userName: entry.userName || 'Sistema',
    userEmail: 'system@system.com',
    action: entry.action,
    module: entry.module,
    description: entry.description,
    entityId: entry.entityId,
    createdAt: entry.timestamp,
    metadata: entry.metadata
  });

  const applyFilters = (tab: string, audit: AuditLog[], sessions: UserSession[], logins: LoginHistory[]) => {
    if (tab === 'audit') {
      const legacyMapped = logs.map(mapLegacyToAudit);
      const merged = [...audit, ...legacyMapped]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      let filtered = merged;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(l => 
          l.description.toLowerCase().includes(term) || 
          l.userName.toLowerCase().includes(term)
        );
      }

      if (selectedModule && selectedModule !== 'all') {
        filtered = filtered.filter(l => l.module === selectedModule);
      }

      if (startDate || endDate) {
        filtered = filtered.filter(l => {
          const logDate = new Date(l.createdAt);
          if (startDate && logDate < new Date(startDate)) return false;
          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (logDate > end) return false;
          }
          return true;
        });
      }

      setFilteredAuditLogs(filtered);
    } else if (tab === 'sessions') {
      let filtered = sessions;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(s => 
          s.userName.toLowerCase().includes(term) || 
          s.userEmail.toLowerCase().includes(term)
        );
      }

      setFilteredSessions(filtered);
    } else if (tab === 'logins') {
      let filtered = logins;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(l => 
          l.userEmail.toLowerCase().includes(term) || 
          (l.userName && l.userName.toLowerCase().includes(term))
        );
      }

      setFilteredLogins(filtered);
    }
  };

  const updateStats = () => {
    const stats = auditService.getStats();
    const legacyCount = logs.length;
    setStatsData({
      ...stats,
      totalAuditLogs: stats.totalAuditLogs + legacyCount
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedModule('all');
    setStartDate('');
    setEndDate('');
  };

  // Helper for Icon and Color based on Action
  const getActionStyle = (action: string) => {
    switch (action) {
      case 'create': return { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Criação' };
      case 'update': return { icon: FileEdit, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Edição' };
      case 'delete': return { icon: Trash2, color: 'text-rose-600', bg: 'bg-rose-50', label: 'Exclusão' };
      case 'approve': return { icon: ShieldAlert, color: 'text-indigo-600', bg: 'bg-indigo-50', label: 'Aprovação' };
      case 'login': return { icon: LogIn, color: 'text-slate-600', bg: 'bg-slate-100', label: 'Acesso' };
      case 'logout': return { icon: LogOut, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Saída' };
      case 'export': return { icon: Download, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Exportação' };
      default: return { icon: History, color: 'text-slate-500', bg: 'bg-slate-50', label: 'Evento' };
    }
  };

  const getLoginTypeStyle = (type: string) => {
    switch (type) {
      case 'success': return { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Sucesso' };
      case 'failed': return { icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50', label: 'Falha' };
      case 'timeout': return { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Timeout' };
      case 'locked': return { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', label: 'Bloqueado' };
      default: return { icon: Activity, color: 'text-slate-500', bg: 'bg-slate-50', label: 'Desconhecido' };
    }
  };

  const getSessionStatus = (status: string) => {
    switch (status) {
      case 'active': return { color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Ativa' };
      case 'closed': return { color: 'text-slate-600', bg: 'bg-slate-100', label: 'Fechada' };
      case 'timeout': return { color: 'text-amber-600', bg: 'bg-amber-50', label: 'Expirada' };
      default: return { color: 'text-slate-500', bg: 'bg-slate-50', label: 'Desconhecido' };
    }
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return {
      date: d.toLocaleDateString('pt-BR'),
      time: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };
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
            <div className="text-[10px] text-slate-400 mt-1">registros do sistema</div>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-3 rounded-lg border border-emerald-200">
            <div className="text-xs text-emerald-600 mb-1">Sessões Ativas</div>
            <div className="text-2xl font-bold text-emerald-900">{statsData.activeSessions}</div>
            <div className="text-[10px] text-emerald-600 mt-1">usuários conectados</div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg border border-blue-200">
            <div className="text-xs text-blue-600 mb-1">Logins</div>
            <div className="text-2xl font-bold text-blue-900">{statsData.totalLogins}</div>
            <div className="text-[10px] text-blue-600 mt-1">total de acessos</div>
          </div>
          <div className="bg-gradient-to-br from-rose-50 to-rose-100 p-3 rounded-lg border border-rose-200">
            <div className="text-xs text-rose-600 mb-1">Falhas</div>
            <div className="text-2xl font-bold text-rose-900">{statsData.failedLogins}</div>
            <div className="text-[10px] text-rose-600 mt-1">tentativas falhadas</div>
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
          {/* AUDIT LOGS TAB */}
          {activeTab === 'audit' && (
            filteredAuditLogs.length === 0 ? (
              <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                <Search size={32} className="mx-auto mb-2 opacity-50" />
                <p>Nenhum registro de auditoria encontrado.</p>
                <p className="text-xs mt-2 text-slate-400">As ações realizadas no sistema aparecerão aqui.</p>
              </div>
            ) : (
              filteredAuditLogs.map((log) => {
                const style = getActionStyle(log.action);
                const ActionIcon = style.icon;
                const { date: logDate, time: logTime } = formatDate(log.createdAt);

                return (
                  <div key={log.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`rounded-full p-2 shrink-0 ${style.bg} ${style.color}`}>
                          <ActionIcon size={16} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${style.bg} ${style.color}`}>
                              {style.label}
                            </span>
                            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                              {log.module}
                            </span>
                          </div>
                          <p className="text-slate-800 text-sm leading-relaxed mb-2">{log.description}</p>
                          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                            <div className="flex items-center gap-1">
                              <User size={12} />
                              <span>{log.userName}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock size={12} />
                              <span>{logDate} às {logTime}</span>
                            </div>
                            {log.ipAddress && (
                              <div className="flex items-center gap-1">
                                <Zap size={12} />
                                <span>{log.ipAddress}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )
          )}

          {/* SESSIONS TAB */}
          {activeTab === 'sessions' && (
            filteredSessions.length === 0 ? (
              <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                <Activity size={32} className="mx-auto mb-2 opacity-50" />
                <p>Nenhuma sessão encontrada.</p>
                <p className="text-xs mt-2 text-slate-400">Sessões de usuários apareçerão aqui.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSessions.map((session) => {
                  const statusStyle = getSessionStatus(session.status);
                  const { date: startDate, time: startTime } = formatDate(session.sessionStart);
                  const endDate = session.sessionEnd ? formatDate(session.sessionEnd) : null;

                  return (
                    <div key={session.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="font-semibold text-slate-900">{session.userName}</div>
                          <div className="text-xs text-slate-500">{session.userEmail}</div>
                        </div>
                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${statusStyle.bg} ${statusStyle.color}`}>
                          {statusStyle.label}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div className="bg-slate-50 p-2 rounded">
                          <div className="text-slate-600 mb-1">Início</div>
                          <div className="font-mono text-slate-900">{startDate} {startTime}</div>
                        </div>
                        {session.sessionEnd && (
                          <div className="bg-slate-50 p-2 rounded">
                            <div className="text-slate-600 mb-1">Fim</div>
                            <div className="font-mono text-slate-900">{endDate?.date} {endDate?.time}</div>
                          </div>
                        )}
                        {session.durationMinutes && (
                          <div className="bg-slate-50 p-2 rounded">
                            <div className="text-slate-600 mb-1">Duração</div>
                            <div className="font-mono text-slate-900">{session.durationMinutes} min</div>
                          </div>
                        )}
                        {session.browserInfo && (
                          <div className="bg-slate-50 p-2 rounded">
                            <div className="text-slate-600 mb-1">Navegador</div>
                            <div className="font-mono text-slate-900">{session.browserInfo}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* LOGIN HISTORY TAB */}
          {activeTab === 'logins' && (
            filteredLogins.length === 0 ? (
              <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                <LogIn size={32} className="mx-auto mb-2 opacity-50" />
                <p>Nenhum login registrado.</p>
                <p className="text-xs mt-2 text-slate-400">Histórico de login de usuários aparecerá aqui.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLogins.map((login) => {
                  const typeStyle = getLoginTypeStyle(login.loginType);
                  const TypeIcon = typeStyle.icon;
                  const { date: loginDate, time: loginTime } = formatDate(login.createdAt);

                  return (
                    <div key={login.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`rounded-full p-2 shrink-0 ${typeStyle.bg} ${typeStyle.color}`}>
                          <TypeIcon size={16} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${typeStyle.bg} ${typeStyle.color}`}>
                              {typeStyle.label}
                            </span>
                            {login.twoFactorUsed && (
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
                                2FA
                              </span>
                            )}
                          </div>
                          <div className="text-slate-900 font-medium">{login.userEmail}</div>
                          {login.failureReason && (
                            <div className="text-sm text-rose-600 mt-1">Motivo: {login.failureReason}</div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <Clock size={12} />
                          <span>{loginDate} às {loginTime}</span>
                        </div>
                        {login.ipAddress && (
                          <div className="flex items-center gap-1">
                            <Zap size={12} />
                            <span>{login.ipAddress}</span>
                          </div>
                        )}
                        {login.browserInfo && (
                          <div className="flex items-center gap-1">
                            <Activity size={12} />
                            <span>{login.browserInfo} • {login.deviceInfo}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
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
