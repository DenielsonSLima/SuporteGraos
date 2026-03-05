/**
 * Tipos e utilitários locais do submódulo Logs.
 */
import {
  CheckCircle2,
  FileEdit,
  Trash2,
  ShieldAlert,
  LogIn,
  LogOut,
  Download,
  History,
  AlertCircle,
  Clock,
  AlertTriangle,
  Activity,
} from 'lucide-react';

export type ActiveTab = 'audit' | 'sessions' | 'logins';

export interface ActionStyle {
  icon: React.FC<any>;
  color: string;
  bg: string;
  label: string;
}

export interface StatusStyle {
  color: string;
  bg: string;
  label: string;
}

export const getActionStyle = (action: string): ActionStyle => {
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

export const getLoginTypeStyle = (type: string): ActionStyle => {
  switch (type) {
    case 'success': return { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Sucesso' };
    case 'failed': return { icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50', label: 'Falha' };
    case 'timeout': return { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Timeout' };
    case 'locked': return { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', label: 'Bloqueado' };
    default: return { icon: Activity, color: 'text-slate-500', bg: 'bg-slate-50', label: 'Desconhecido' };
  }
};

export const getSessionStatus = (status: string): StatusStyle => {
  switch (status) {
    case 'active': return { color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Ativa' };
    case 'closed': return { color: 'text-slate-600', bg: 'bg-slate-100', label: 'Fechada' };
    case 'timeout': return { color: 'text-amber-600', bg: 'bg-amber-50', label: 'Expirada' };
    default: return { color: 'text-slate-500', bg: 'bg-slate-50', label: 'Desconhecido' };
  }
};

export const formatDate = (isoString: string) => {
  const d = new Date(isoString);
  return {
    date: d.toLocaleDateString('pt-BR'),
    time: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  };
};
