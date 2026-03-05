import React from 'react';
import { Activity } from 'lucide-react';
import type { UserSession } from '../../../../hooks/useAudit';
import { getSessionStatus, formatDate } from '../logs.types';

interface Props {
  sessions: UserSession[];
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
}

const SessionList: React.FC<Props> = ({ sessions, hasMore, loading, onLoadMore }) => {
  if (sessions.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
        <Activity size={32} className="mx-auto mb-2 opacity-50" />
        <p>Nenhuma sessão encontrada.</p>
        <p className="text-xs mt-2 text-slate-400">Sessões de usuários apareçerão aqui.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {sessions.map((session) => {
          const statusStyle = getSessionStatus(session.status);
          const { date: sDate, time: sTime } = formatDate(session.sessionStart);
          const endFormatted = session.sessionEnd ? formatDate(session.sessionEnd) : null;

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
                  <div className="font-mono text-slate-900">{sDate} {sTime}</div>
                </div>
                {session.sessionEnd && (
                  <div className="bg-slate-50 p-2 rounded">
                    <div className="text-slate-600 mb-1">Fim</div>
                    <div className="font-mono text-slate-900">{endFormatted?.date} {endFormatted?.time}</div>
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

export default SessionList;
