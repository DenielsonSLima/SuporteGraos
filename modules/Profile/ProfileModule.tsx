
import React, { useState, useEffect } from 'react';
import { 
  User, 
  Shield, 
  History, 
  Mail, 
  Phone, 
  FileBadge, 
  Lock, 
  Save, 
  Camera,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Power,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { logService } from '../../services/logService';
import type { LogEntry } from '../../services/logService';
import { useToast } from '../../contexts/ToastContext';
import { useProfile, useUpdateProfile } from '../../hooks/useProfile';
import { useCurrentUser } from '../../hooks/useCurrentUser';

const ProfileModule: React.FC = () => {
  const { addToast } = useToast();
  const currentUser = useCurrentUser();

  // ── TanStack Query: dados reais do perfil (sem mock) ──────────────────
  const { data: profileRaw, isLoading: profileLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  const [activeTab, setActiveTab] = useState<'overview' | 'security' | 'activity'>('overview');
  const [userLogs, setUserLogs] = useState<LogEntry[]>([]);

  // Estado local dos campos editáveis — sincronizado quando o perfil carrega
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName:  '',
    email:     '',
    phone:     '',
    cpf:       '',
    role:      ''
  });

  // Atualiza o formulário sempre que os dados do banco chegam/mudam
  useEffect(() => {
    if (profileRaw) {
      setProfileData({
        firstName: profileRaw.firstName,
        lastName:  profileRaw.lastName,
        email:     profileRaw.email,
        phone:     profileRaw.phone,
        cpf:       profileRaw.cpf,
        role:      profileRaw.role === 'admin' ? 'Administrador do Sistema' : 'Consultor Comercial',
      });
    }
  }, [profileRaw]);

  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  useEffect(() => {
    if (currentUser) {
      const logs = logService.getAll().filter(l => l.userId === currentUser.id);
      setUserLogs(logs);
    }
  }, [currentUser]);

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileRaw) return;

    updateProfile.mutate(
      {
        ...profileRaw,
        firstName: profileData.firstName,
        lastName:  profileData.lastName,
        phone:     profileData.phone,
      },
      {
        onSuccess: () => addToast('success', 'Perfil Atualizado', 'Suas informações foram salvas com sucesso.'),
        onError:   (err: any) => addToast('error', 'Erro ao salvar', err?.message || 'Falha ao atualizar perfil.'),
      }
    );
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      addToast('error', 'Erro na Senha', 'As novas senhas não conferem.');
      return;
    }
    addToast('success', 'Segurança Atualizada', 'Sua senha foi alterada com sucesso.');
    setPasswords({ current: '', new: '', confirm: '' });
  };

  const labelClass = 'block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1';
  const inputClass = 'w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl bg-white text-slate-900 font-bold focus:border-primary-500 outline-none transition-all placeholder:text-slate-300';

  // Skeleton de carregamento inicial
  if (profileLoading) {
    return (
      <div className="animate-in fade-in duration-500 space-y-6">
        <div className="h-48 bg-slate-100 rounded-3xl animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 h-96 bg-slate-100 rounded-3xl animate-pulse" />
          <div className="lg:col-span-4 h-64 bg-slate-100 rounded-3xl animate-pulse" />
        </div>
        <div className="flex justify-center items-center gap-2 text-slate-400 py-4">
          <Loader2 className="animate-spin" size={18} />
          <span className="text-sm font-medium">Carregando perfil...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      
      {/* 1. PROFILE HEADER CARD */}
      <div className="relative bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Banner Decorative */}
        <div className="h-32 bg-gradient-to-r from-slate-900 to-primary-800" />
        
        <div className="px-8 pb-8 flex flex-col md:flex-row items-end gap-6 -mt-12 relative z-10">
          <div className="relative group">
            <div className="w-32 h-32 rounded-3xl bg-white p-1 shadow-2xl border-4 border-white overflow-hidden">
              <img 
                src={currentUser?.avatar || `https://ui-avatars.com/api/?name=${currentUser?.name}&background=0f172a&color=fff&size=200`} 
                alt="Avatar" 
                className="w-full h-full object-cover rounded-2xl"
              />
            </div>
            <button className="absolute bottom-2 right-2 p-2 bg-primary-600 text-white rounded-xl shadow-lg hover:bg-primary-700 transition-all active:scale-95">
              <Camera size={18} />
            </button>
          </div>

          <div className="flex-1 pb-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">{currentUser?.name}</h1>
              <span className="bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-primary-100 shadow-sm">
                 Status: Online
              </span>
            </div>
            <div className="flex flex-wrap gap-4 mt-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-tighter">
                <ShieldCheck size={14} className="text-blue-500" /> {profileData.role}
              </span>
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-tighter">
                <Mail size={14} className="text-slate-400" /> {currentUser?.email}
              </span>
            </div>
          </div>
        </div>

        {/* Custom Tabs */}
        <div className="px-6 flex border-t border-slate-100 bg-slate-50/50">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-4 text-xs font-black uppercase tracking-widest flex items-center gap-2 border-b-4 transition-all ${activeTab === 'overview' ? 'border-primary-600 text-primary-800' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            <User size={16} /> Meus Dados
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={`px-6 py-4 text-xs font-black uppercase tracking-widest flex items-center gap-2 border-b-4 transition-all ${activeTab === 'security' ? 'border-blue-600 text-blue-800' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            <Lock size={16} /> Segurança
          </button>
          <button 
            onClick={() => setActiveTab('activity')}
            className={`px-6 py-4 text-xs font-black uppercase tracking-widest flex items-center gap-2 border-b-4 transition-all ${activeTab === 'activity' ? 'border-indigo-600 text-indigo-800' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            <History size={16} /> Minha Atividade
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* TAB CONTENT */}
        <div className="lg:col-span-8 space-y-6">
            
            {activeTab === 'overview' && (
                <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm animate-in slide-in-from-left-4">
                  <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-6 flex items-center gap-3">
                    <FileBadge size={22} className="text-primary-500" /> Informações Pessoais
                  </h2>
                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className={labelClass}>Nome</label>
                        <input className={inputClass} value={profileData.firstName} onChange={e => setProfileData({...profileData, firstName: e.target.value})} />
                      </div>
                      <div>
                        <label className={labelClass}>Sobrenome</label>
                        <input className={inputClass} value={profileData.lastName} onChange={e => setProfileData({...profileData, lastName: e.target.value})} />
                      </div>
                      <div>
                        <label className={labelClass}>Documento (CPF)</label>
                        <div className="relative">
                          <FileBadge className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                          <input className={`${inputClass} pl-10`} value={profileData.cpf} readOnly />
                        </div>
                      </div>
                      <div>
                        <label className={labelClass}>Celular / WhatsApp</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                          <input className={`${inputClass} pl-10`} value={profileData.phone} onChange={e => setProfileData({...profileData, phone: e.target.value})} />
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <label className={labelClass}>E-mail Principal</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                          <input className={`${inputClass} pl-10`} type="email" value={profileData.email} onChange={e => setProfileData({...profileData, email: e.target.value})} />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end pt-4">
                        <button type="submit" disabled={updateProfile.isPending} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg flex items-center gap-2 disabled:opacity-60">
                            {updateProfile.isPending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Salvar Alterações
                        </button>
                    </div>
                  </form>
                </div>
            )}

            {activeTab === 'security' && (
                <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm animate-in slide-in-from-left-4">
                  <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-2">Alterar Senha de Acesso</h2>
                  <p className="text-sm text-slate-500 mb-8 font-medium">Sua senha deve conter pelo menos 8 caracteres, incluindo números e letras.</p>
                  
                  <form onSubmit={handleChangePassword} className="space-y-6 max-w-md">
                    <div>
                      <label className={labelClass}>Senha Atual</label>
                      <input className={inputClass} type="password" value={passwords.current} onChange={e => setPasswords({...passwords, current: e.target.value})} placeholder="••••••••" required />
                    </div>
                    <div className="h-px bg-slate-100 my-2" />
                    <div>
                      <label className={labelClass}>Nova Senha</label>
                      <input className={inputClass} type="password" value={passwords.new} onChange={e => setPasswords({...passwords, new: e.target.value})} placeholder="Mínimo 8 caracteres" required />
                    </div>
                    <div>
                      <label className={labelClass}>Confirmar Nova Senha</label>
                      <input className={inputClass} type="password" value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})} placeholder="Repita a nova senha" required />
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/10">
                        Redefinir Credenciais
                    </button>
                  </form>
                </div>
            )}

            {activeTab === 'activity' && (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-left-4">
                  <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest italic">Logs de Auditoria do Meu Usuário</h2>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{userLogs.length} eventos registrados</span>
                  </div>
                  <div className="max-h-[500px] overflow-y-auto">
                    <table className="w-full text-left text-[11px] border-collapse">
                        <thead className="bg-white sticky top-0 border-b border-slate-50">
                            <tr className="text-slate-400 font-black uppercase tracking-tighter">
                                <th className="px-6 py-3">Data e Hora</th>
                                <th className="px-4 py-3">Módulo</th>
                                <th className="px-4 py-3">Ação</th>
                                <th className="px-6 py-3">Descrição da Atividade</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-bold text-slate-700">
                            {userLogs.map(log => (
                                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-3">
                                        <div className="flex items-center gap-2 whitespace-nowrap">
                                            <Clock size={12} className="text-slate-300" />
                                            {new Date(log.timestamp).toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="bg-slate-100 px-2 py-0.5 rounded uppercase tracking-tighter">{log.module}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-1.5 py-0.5 rounded border ${
                                            log.action === 'create' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                            log.action === 'delete' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                            'bg-blue-50 text-blue-700 border-blue-100'
                                        }`}>
                                            {log.action.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-slate-500 italic font-medium leading-relaxed">{log.description}</td>
                                </tr>
                            ))}
                            {userLogs.length === 0 && (
                                <tr><td colSpan={4} className="p-10 text-center text-slate-300 font-black uppercase italic tracking-widest">Nenhuma atividade registrada.</td></tr>
                            )}
                        </tbody>
                    </table>
                  </div>
                </div>
            )}
        </div>

        {/* SIDEBAR DO PERFIL: PERMISSÕES E STATUS */}
        <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden group">
                <div className="absolute right-0 top-0 opacity-10 group-hover:rotate-12 transition-transform duration-700"><Shield size={120}/></div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-primary-400 mb-6 border-b border-white/10 pb-2">Status de Acesso</h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase">Nível de Conta:</span>
                        <span className="font-black text-white uppercase italic">{currentUser?.role}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase">Status Global:</span>
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                           <span className="font-black text-emerald-400 uppercase tracking-tighter">Ativo e Autenticado</span>
                        </div>
                    </div>
                    <div className="pt-4 border-t border-white/10">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Módulos Habilitados</p>
                        <div className="flex flex-wrap gap-1.5">
                            {['Financeiro', 'Vendas', 'Logística', 'Performance', 'Patrimônio'].map(mod => (
                                <span key={mod} className="bg-white/5 border border-white/10 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase">{mod}</span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Power size={18} className="text-rose-500" /> Ações do Sistema
                </h3>
                <div className="space-y-3">
                    <button className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all group">
                        <span className="text-xs font-black text-slate-600 uppercase tracking-tight">Encerrar Todas Sessões</span>
                        <ChevronRight size={14} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button className="w-full flex items-center justify-between px-4 py-3 bg-rose-50 hover:bg-rose-100 rounded-2xl transition-all group">
                        <span className="text-xs font-black text-rose-600 uppercase tracking-tight">Desativar Perfil</span>
                        <ChevronRight size={14} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
                <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                   <p className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">Suporte Grãos ERP Enterprise v1.8</p>
                   <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">Sessão ID: {Math.random().toString(36).substr(2, 12)}</p>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default ProfileModule;
