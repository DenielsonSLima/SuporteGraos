import React from 'react';
import { LogIn, Clock, Zap, Activity } from 'lucide-react';
import type { LoginHistory } from '../../../../hooks/useAudit';
import { getLoginTypeStyle, formatDate } from '../logs.types';

interface Props {
  history: LoginHistory[];
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
}

const LoginHistoryList: React.FC<Props> = ({ history, hasMore, loading, onLoadMore }) => {
  if (history.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
        <LogIn size={32} className="mx-auto mb-2 opacity-50" />
        <p>Nenhum login registrado.</p>
        <p className="text-xs mt-2 text-slate-400">Histórico de login de usuários aparecerá aqui.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {history.map((login) => {
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

export default LoginHistoryList;
