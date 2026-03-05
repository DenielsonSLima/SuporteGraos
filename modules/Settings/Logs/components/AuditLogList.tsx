import React from 'react';
import { Search, User, Clock, Zap } from 'lucide-react';
import type { AuditLog } from '../../../../hooks/useAudit';
import { getActionStyle, formatDate } from '../logs.types';

interface Props {
  logs: AuditLog[];
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
}

const AuditLogList: React.FC<Props> = ({ logs, hasMore, loading, onLoadMore }) => {
  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
        <Search size={32} className="mx-auto mb-2 opacity-50" />
        <p>Nenhum registro de auditoria encontrado.</p>
        <p className="text-xs mt-2 text-slate-400">As ações realizadas no sistema aparecerão aqui.</p>
      </div>
    );
  }

  return (
    <>
      {logs.map((log) => {
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
      })}

      {hasMore && (
        <div className="flex justify-center">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg border border-slate-200 text-slate-600 hover:text-slate-800 hover:border-slate-300 transition-all disabled:opacity-50"
          >
            {loading ? 'Carregando...' : 'Carregar mais'}
          </button>
        </div>
      )}
    </>
  );
};

export default AuditLogList;
