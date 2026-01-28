import React, { useState, useEffect } from 'react';
import { 
  Eye, 
  FileText, 
  Users, 
  TrendingUp,
  BarChart3,
  Download,
  Calendar,
  Activity
} from 'lucide-react';
import { reportAuditService } from '../../../services/reportAuditService';

interface ReportStats {
  totalAccess: number;
  pdfExports: number;
  uniqueReports: number;
  uniqueUsers: number;
  mostAccessedReport: { report: string; count: number };
  topUsers: { userId: string; count: number }[];
}

const ReportsAnalytics: React.FC = () => {
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [accessLogs, setAccessLogs] = useState<any[]>([]);

  useEffect(() => {
    // Carregar stats
    const newStats = reportAuditService.getStats();
    setStats(newStats);

    // Subscribe para atualizações em tempo real
    const unsubscribe = reportAuditService.subscribe((logs) => {
      const updatedStats = reportAuditService.getStats();
      setStats(updatedStats);
      setAccessLogs(logs.slice(0, 20)); // Últimos 20 acessos
    });

    // Carregar logs iniciais
    const logs = reportAuditService.getAccessLogs().slice(0, 20);
    setAccessLogs(logs);

    return unsubscribe;
  }, []);

  if (!stats) {
    return <div className="text-center py-8 text-slate-400">Carregando...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total de Acessos */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-blue-600">Total de Acessos</h3>
            <Eye size={20} className="text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-blue-900">{stats.totalAccess}</div>
          <p className="text-xs text-blue-600 mt-1">relatórios consultados</p>
        </div>

        {/* Exportações em PDF */}
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 rounded-xl border border-emerald-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-emerald-600">PDFs Exportados</h3>
            <Download size={20} className="text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-emerald-900">{stats.pdfExports}</div>
          <p className="text-xs text-emerald-600 mt-1">downloads realizados</p>
        </div>

        {/* Relatórios Únicos */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-purple-600">Relatórios Acessados</h3>
            <FileText size={20} className="text-purple-400" />
          </div>
          <div className="text-3xl font-bold text-purple-900">{stats.uniqueReports}</div>
          <p className="text-xs text-purple-600 mt-1">tipos diferentes</p>
        </div>

        {/* Usuários Ativos */}
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-6 rounded-xl border border-amber-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-amber-600">Usuários Ativos</h3>
            <Users size={20} className="text-amber-400" />
          </div>
          <div className="text-3xl font-bold text-amber-900">{stats.uniqueUsers}</div>
          <p className="text-xs text-amber-600 mt-1">acessaram relatórios</p>
        </div>

      </div>

      {/* Most Accessed Report */}
      {stats.mostAccessedReport.report && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={20} className="text-emerald-600" />
            <h2 className="text-lg font-bold text-slate-800">Relatório Mais Consultado</h2>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-2">Relatório</p>
              <p className="text-xl font-semibold text-slate-900">{stats.mostAccessedReport.report}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-600 mb-2">Acessos</p>
              <p className="text-4xl font-bold text-emerald-600">{stats.mostAccessedReport.count}</p>
            </div>
          </div>
        </div>
      )}

      {/* Top Users */}
      {stats.topUsers.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={20} className="text-blue-600" />
            <h2 className="text-lg font-bold text-slate-800">Usuários Mais Ativos</h2>
          </div>
          <div className="space-y-3">
            {stats.topUsers.map((user, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{user.userId}</p>
                    <p className="text-xs text-slate-500">Usuário</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-slate-900">{user.count}</p>
                  <p className="text-xs text-slate-500">acessos</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Access Log */}
      {accessLogs.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={20} className="text-slate-600" />
            <h2 className="text-lg font-bold text-slate-800">Últimos Acessos</h2>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {accessLogs.map((log) => {
              const date = new Date(log.accessTime);
              const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
              const dateStr = date.toLocaleDateString('pt-BR');
              
              return (
                <div key={log.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm hover:bg-slate-100 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{log.reportTitle}</p>
                    <p className="text-xs text-slate-500">
                      {log.userId} • {dateStr} às {timeStr}
                      {log.exportedToPdf && ' • PDF exportado'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-600">{log.recordsCount}</p>
                    <p className="text-[10px] text-slate-400">registros</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};

export default ReportsAnalytics;
