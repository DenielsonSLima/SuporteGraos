
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Pencil, 
  Trash2, 
  Save, 
  Search, 
  Lock, 
  Shield, 
  User, 
  Mail, 
  Phone, 
  FileBadge,
  Key,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Unlock,
  Check,
  CheckSquare,
  Square,
  AlertCircle
} from 'lucide-react';
import SettingsSubPage from '../components/SettingsSubPage';
import { MENU_ITEMS, SUBMODULES } from '../../../constants';
import { ModuleId } from '../../../types';
import { userService, UserData } from '../../../services/userService';
import { useToast } from '../../../contexts/ToastContext';
import ActionConfirmationModal from '../../../components/ui/ActionConfirmationModal';
import { authService } from '../../../services/authService';
import { validatePasswordStrength, getStrengthColor, getStrengthLabel } from '../../../utils/passwordValidator';
import { supabase } from '../../../services/supabase';

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  width: string;
}

interface Props {
  onBack: () => void;
}

const UsersSettings: React.FC<Props> = ({ onBack }) => {
  const { addToast } = useToast();
  const currentUser = authService.getCurrentUser();
  const isAdmin = currentUser?.role === 'admin';

  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Password State
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [passwordMode, setPasswordMode] = useState<'auto' | 'manual'>('auto');
  const [expandedModules, setExpandedModules] = useState<string[]>([]);

  // Data
  const [users, setUsers] = useState<UserData[]>([]);
  
  // Token Modal
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [tokenUserName, setTokenUserName] = useState('');

  // Delete Confirmation Modal
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);

  // Generated Password Modal
  const [generatedPasswordData, setGeneratedPasswordData] = useState<{ name: string; email: string; password: string } | null>(null);

  useEffect(() => {
    const loadUsers = async () => {
      const data = await userService.getAll();
      setUsers(data);
    };
    loadUsers();

    // 🔴 REALTIME: Inscrever para mudanças na tabela app_users
    const subscription = supabase
      .channel('users_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'app_users'
        },
        async (payload) => {
          console.log('🔄 Mudança detectada na tabela app_users:', payload);
          
          // Recarregar lista automaticamente
          const updatedData = await userService.getAll();
          setUsers(updatedData);
          
          // Mostrar notificação
          if (payload.eventType === 'INSERT') {
            addToast('info', 'Novo usuário', 'Um usuário foi adicionado ao sistema.');
          } else if (payload.eventType === 'UPDATE') {
            addToast('info', 'Usuário atualizado', 'Um usuário foi modificado.');
          } else if (payload.eventType === 'DELETE') {
            addToast('info', 'Usuário removido', 'Um usuário foi excluído do sistema.');
          }
        }
      )
      .subscribe();

    // Cleanup: Cancelar inscrição quando componente desmontar
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const refreshList = async () => {
    const data = await userService.getAll();
    setUsers(data);
  };

  const initialFormState: Partial<UserData> = {
    firstName: '',
    lastName: '',
    cpf: '',
    email: '',
    phone: '',
    role: 'Usuário',
    active: true,
    allowRecovery: false,
    permissions: [ModuleId.HOME] // Permissão básica mínima
  };

  const [formData, setFormData] = useState<Partial<UserData>>(initialFormState);

  // Validação de senha usando o validador profissional
  const passwordValidation = validatePasswordStrength(password);
  const strength = {
    score: passwordValidation.score,
    label: getStrengthLabel(passwordValidation.strength),
    color: getStrengthColor(passwordValidation.strength),
    width: `${passwordValidation.score}%`
  };

  const handleAddNew = () => {
    setFormData(initialFormState);
    setPassword('');
    setConfirmPassword('');
    setShowPasswordFields(true);
    setEditingId(null);
    setViewMode('form');
  };

  const handleEdit = (user: UserData) => {
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      cpf: user.cpf,
      email: user.email,
      phone: user.phone,
      role: user.role,
      active: user.active,
      allowRecovery: user.allowRecovery,
      permissions: user.permissions
    });
    setPassword('');
    setConfirmPassword('');
    setShowPasswordFields(false);
    setEditingId(user.id);
    setViewMode('form');
  };

  const handleGenerateToken = (user: UserData) => {
    try {
      const token = userService.generateRecoveryToken(user.id);
      setTokenUserName(`${user.firstName} ${user.lastName}`);
      setGeneratedToken(token);
    } catch (error: any) {
      addToast('error', 'Erro', error.message);
    }
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await userService.delete(userToDelete.id);
      addToast('success', 'Usuário excluído', 'Usuário removido do sistema com sucesso.');
      await refreshList();
    } catch (error: any) {
      addToast('error', 'Erro ao excluir', error.message);
    } finally {
      setUserToDelete(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar senha apenas se for modo manual
    if (!editingId && passwordMode === 'manual') {
      if (password !== confirmPassword) {
        addToast('error', 'Senhas não conferem', 'As senhas digitadas não são iguais.');
        return;
      }
      
      // Validar força da senha
      if (!passwordValidation.isValid) {
        const errorMsg = passwordValidation.errors.join('. ');
        addToast('error', 'Senha fraca', errorMsg);
        return;
      }
    }

    try {
      if (editingId) {
        const updateData: any = { ...formData, id: editingId };
        if (showPasswordFields && password) {
            updateData.password = password;
        }
        userService.update(updateData);
      } else {
        const newUser: UserData = { 
          ...formData, 
          id: Math.random().toString(36).substr(2, 9),
          password: passwordMode === 'manual' ? password : ''
        } as UserData;
        
        const result = await userService.add(newUser, passwordMode === 'auto');
        
        // Se gerou senha automática, mostrar modal
        if (result.generatedPassword) {
          setGeneratedPasswordData({
            name: `${formData.firstName} ${formData.lastName}`,
            email: formData.email,
            password: result.generatedPassword
          });
        }
      }
      await refreshList();
      setViewMode('list');
      addToast('success', 'Usuário Salvo', passwordMode === 'auto' ? 'Usuário criado com senha automática gerada.' : 'Usuário criado com sucesso.');
    } catch (error: any) {
      addToast('error', 'Erro ao salvar', error.message);
    }
  };

  // Lógica de Permissões Hierárquicas
  const togglePermission = (permId: string) => {
    setFormData(prev => {
      const currentPerms = prev.permissions || [];
      const exists = currentPerms.includes(permId);
      
      let newPerms: string[];
      if (exists) {
        // Se remover um módulo pai, remove todos os filhos
        newPerms = currentPerms.filter(p => p !== permId && !p.startsWith(`${permId}.`));
      } else {
        newPerms = [...currentPerms, permId];
        // Se adicionar um filho, garante que o pai esteja presente
        if (permId.includes('.')) {
          const parentId = permId.split('.')[0];
          if (!newPerms.includes(parentId)) {
            newPerms.push(parentId);
          }
        } else {
          // Se adicionar um pai, seleciona todos os filhos automaticamente?
          // Comportamento: Ao marcar o pai, seleciona todos os filhos para facilitar
          const submodules = SUBMODULES[permId];
          if (submodules) {
             submodules.forEach(sub => {
                if (!newPerms.includes(sub.id)) newPerms.push(sub.id);
             });
          }
        }
      }
      return { ...prev, permissions: newPerms };
    });
  };

  const toggleAllPermissions = () => {
    const allModules = MENU_ITEMS.map(m => m.id);
    const allSubmodules = Object.values(SUBMODULES).flat().map(s => s.id);
    const allIds = [...allModules, ...allSubmodules];
    
    // Se já tem quase tudo, desmarca. Se falta algo, marca tudo.
    const isFull = allIds.every(id => formData.permissions?.includes(id));

    if (isFull) {
      setFormData(prev => ({ ...prev, permissions: [] }));
    } else {
      setFormData(prev => ({ ...prev, permissions: allIds }));
    }
  };

  const toggleModuleExpansion = (moduleId: string) => {
    setExpandedModules(prev => 
      prev.includes(moduleId) ? prev.filter(id => id !== moduleId) : [...prev, moduleId]
    );
  };

  const filteredUsers = users.filter(u => 
    u.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- RENDER FORM ---
  if (viewMode === 'form') {
    return (
      <SettingsSubPage
        title={editingId ? "Editar Usuário" : "Novo Usuário"}
        description="Preencha os dados pessoais, configure a segurança e defina as permissões."
        icon={Users}
        color="bg-indigo-500"
        onBack={() => setViewMode('list')}
      >
        <form onSubmit={handleSave} className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          
          {/* COLUNA ESQUERDA: DADOS E SEGURANÇA */}
          <div className="lg:col-span-7 space-y-6">
            
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 font-black text-slate-800 uppercase text-xs tracking-widest border-b border-slate-100 pb-2">
                <User size={16} className="text-indigo-500" />
                Dados Cadastrais
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500 uppercase">Nome</label>
                  <input type="text" required value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full rounded-lg border-2 border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none font-medium text-sm transition-all" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500 uppercase">Sobrenome</label>
                  <input type="text" required value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full rounded-lg border-2 border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none font-medium text-sm transition-all" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500 uppercase">CPF</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.cpf} 
                    onChange={e => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 11);
                      const formatted = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4').replace(/(\d{3})(\d{3})(\d{3})$/, '$1.$2.$3').replace(/(\d{3})(\d{3})$/, '$1.$2').replace(/(\d{3})$/, '$1');
                      setFormData({...formData, cpf: formatted});
                    }} 
                    placeholder="000.000.000-00"
                    className="w-full rounded-lg border-2 border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none font-medium text-sm transition-all" 
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500 uppercase">Telefone</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.phone} 
                    onChange={e => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 11);
                      const formatted = value.length <= 10 
                        ? value.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3').replace(/(\d{2})(\d{4})$/, '($1) $2').replace(/(\d{2})$/, '($1')
                        : value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3').replace(/(\d{2})(\d{5})$/, '($1) $2').replace(/(\d{2})$/, '($1');
                      setFormData({...formData, phone: formatted});
                    }} 
                    placeholder="(00) 00000-0000"
                    className="w-full rounded-lg border-2 border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none font-medium text-sm transition-all" 
                  />
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-bold text-slate-500 uppercase">E-mail (Login)</label>
                  <input type="text" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full rounded-lg border-2 border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none font-medium text-sm transition-all" />
                </div>
                <div>
                   <label className="mb-1 block text-xs font-bold text-slate-500 uppercase">Função</label>
                   <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full rounded-lg border-2 border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none font-medium text-sm transition-all appearance-none">
                      <option value="Usuário">Usuário Padrão</option>
                      <option value="Gerente">Gerente</option>
                      <option value="Administrador">Administrador</option>
                   </select>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                <h3 className="flex items-center gap-2 font-black text-slate-800 uppercase text-xs tracking-widest">
                  <Lock size={16} className="text-rose-500" />
                  Credenciais de Acesso
                </h3>
                {editingId && (
                  <button type="button" onClick={() => setShowPasswordFields(!showPasswordFields)} className="text-[10px] font-bold uppercase text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded transition-colors">
                    {showPasswordFields ? 'Cancelar alteração' : 'Redefinir senha'}
                  </button>
                )}
              </div>

              {/* OPÇÃO DE RECUPERAÇÃO VIA TOKEN */}
              <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${formData.allowRecovery ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                        {formData.allowRecovery ? <Unlock size={18} /> : <Lock size={18} />}
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-700 uppercase">Recuperação via Token</p>
                        <p className="text-[10px] text-slate-500">Permitir que este usuário resete a senha com código gerado pelo admin?</p>
                    </div>
                 </div>
                 <button 
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, allowRecovery: !prev.allowRecovery }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${formData.allowRecovery ? 'bg-emerald-500' : 'bg-slate-300'}`}
                 >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.allowRecovery ? 'translate-x-6' : 'translate-x-1'}`} />
                 </button>
              </div>

              {/* MODO DE SENHA (apenas ao criar) */}
              {!editingId && (
                <div className="mb-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                  <p className="text-xs font-bold text-slate-700 uppercase mb-3">Definição de Senha</p>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 cursor-pointer transition-all hover:border-indigo-300 {passwordMode === 'auto' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'}">
                      <input 
                        type="radio" 
                        name="passwordMode" 
                        value="auto"
                        checked={passwordMode === 'auto'}
                        onChange={() => setPasswordMode('auto')}
                        className="w-4 h-4 text-indigo-600"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-700">Gerar Automaticamente</p>
                        <p className="text-xs text-slate-500">Sistema cria senha forte aleatória</p>
                      </div>
                    </label>
                    
                    <label className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 cursor-pointer transition-all hover:border-indigo-300 {passwordMode === 'manual' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'}">
                      <input 
                        type="radio" 
                        name="passwordMode" 
                        value="manual"
                        checked={passwordMode === 'manual'}
                        onChange={() => setPasswordMode('manual')}
                        className="w-4 h-4 text-indigo-600"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-700">Definir Manualmente</p>
                        <p className="text-xs text-slate-500">Criar senha personalizada agora</p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {((passwordMode === 'manual' && !editingId) || (editingId && showPasswordFields)) && (
                <div className="space-y-5 animate-in fade-in slide-in-from-top-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-500 uppercase">Nova Senha</label>
                    <input 
                        type="password" 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        className="w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none transition-all"
                        placeholder="Mínimo 6 caracteres..."
                    />
                    
                    {/* MEDIDOR DE FORÇA DE SENHA AVANÇADO */}
                    {password && (
                      <div className="mt-3 space-y-2">
                        {/* Barra de Força */}
                        <div>
                          <div className="flex justify-between items-end mb-1.5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Segurança da Senha</span>
                            <span className={`text-[10px] font-black uppercase`} style={{ color: strength.color }}>
                              {strength.label}
                            </span>
                          </div>
                          <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full transition-all duration-500 ease-out" 
                              style={{ 
                                width: strength.width,
                                backgroundColor: strength.color
                              }} 
                            />
                          </div>
                        </div>

                        {/* Lista de Requisitos */}
                        <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-1.5">
                          <p className="text-[9px] font-black text-slate-500 uppercase mb-2 tracking-widest">Requisitos da Senha:</p>
                          
                          <div className="flex items-center gap-2">
                            {passwordValidation.checks.minLength ? (
                              <Check size={12} className="text-emerald-500" />
                            ) : (
                              <AlertCircle size={12} className="text-slate-300" />
                            )}
                            <span className={`text-[10px] ${passwordValidation.checks.minLength ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                              Mínimo 8 caracteres
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {passwordValidation.checks.hasUppercase ? (
                              <Check size={12} className="text-emerald-500" />
                            ) : (
                              <AlertCircle size={12} className="text-slate-300" />
                            )}
                            <span className={`text-[10px] ${passwordValidation.checks.hasUppercase ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                              Uma letra maiúscula
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {passwordValidation.checks.hasLowercase ? (
                              <Check size={12} className="text-emerald-500" />
                            ) : (
                              <AlertCircle size={12} className="text-slate-300" />
                            )}
                            <span className={`text-[10px] ${passwordValidation.checks.hasLowercase ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                              Uma letra minúscula
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {passwordValidation.checks.hasNumber ? (
                              <Check size={12} className="text-emerald-500" />
                            ) : (
                              <AlertCircle size={12} className="text-slate-300" />
                            )}
                            <span className={`text-[10px] ${passwordValidation.checks.hasNumber ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                              Um número
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {passwordValidation.checks.hasSpecialChar ? (
                              <Check size={12} className="text-emerald-500" />
                            ) : (
                              <AlertCircle size={12} className="text-slate-300" />
                            )}
                            <span className={`text-[10px] ${passwordValidation.checks.hasSpecialChar ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                              Um caractere especial (!@#$%...)
                            </span>
                          </div>

                          {!passwordValidation.checks.notCommon && (
                            <div className="flex items-center gap-2 mt-2 p-2 bg-rose-50 rounded border border-rose-200">
                              <AlertCircle size={12} className="text-rose-500" />
                              <span className="text-[10px] text-rose-600 font-bold">
                                Senha muito comum! Escolha outra.
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Sugestões (se houver) */}
                        {passwordValidation.suggestions.length > 0 && !passwordValidation.isValid && (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                            <p className="text-[9px] font-black text-amber-700 uppercase mb-1">Dicas:</p>
                            {passwordValidation.suggestions.slice(0, 2).map((suggestion, idx) => (
                              <p key={idx} className="text-[10px] text-amber-600 leading-relaxed">• {suggestion}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-500 uppercase">Confirmar Senha</label>
                    <input 
                        type="password" 
                        value={confirmPassword} 
                        onChange={e => setConfirmPassword(e.target.value)} 
                        className={`w-full rounded-lg border-2 bg-white px-3 py-2 text-slate-900 focus:outline-none transition-all ${
                            confirmPassword && password !== confirmPassword ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-indigo-500'
                        }`}
                        placeholder="Repita a senha"
                    />
                    {confirmPassword && password !== confirmPassword && (
                        <p className="text-[10px] text-rose-500 font-bold mt-1 uppercase">As senhas não coincidem</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* COLUNA DIREITA: PERMISSÕES GRANULARES */}
          <div className="lg:col-span-5 space-y-6">
            <div className="h-full rounded-xl border border-slate-200 bg-white flex flex-col overflow-hidden shadow-sm">
              <div className="p-5 border-b border-slate-100 bg-slate-50 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 font-black text-slate-800 uppercase text-xs tracking-widest">
                      <Shield size={16} className="text-emerald-500" /> Permissões de Acesso
                  </h3>
                  <button type="button" onClick={toggleAllPermissions} className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                    {/* Logic for visual check square */}
                    {(() => {
                        const allModules = MENU_ITEMS.map(m => m.id);
                        const isFull = allModules.every(id => formData.permissions?.includes(id));
                        return isFull ? <><Square size={14}/> Desmarcar tudo</> : <><CheckSquare size={14}/> Marcar tudo</>;
                    })()}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Selecione os módulos e ações permitidas.</p>
              </div>
              
              <div className="flex-1 p-4 overflow-y-auto max-h-[600px] space-y-2">
                {MENU_ITEMS.map((item) => {
                  const isModuleSelected = formData.permissions?.includes(item.id);
                  const submodules = SUBMODULES[item.id] || [];
                  const hasSubmodules = submodules.length > 0;
                  const isExpanded = expandedModules.includes(item.id);
                  
                  // Verifica quantos subs estão selecionados para mostrar visualmente
                  const selectedSubsCount = submodules.filter(sub => formData.permissions?.includes(sub.id)).length;
                  const allSubsSelected = hasSubmodules && selectedSubsCount === submodules.length;

                  return (
                    <div key={item.id} className={`rounded-xl border transition-all ${isModuleSelected ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                      
                      {/* HEADER DO MÓDULO */}
                      <div className="flex items-center justify-between p-3">
                        <div 
                            className="flex items-center gap-3 flex-1 cursor-pointer" 
                            onClick={() => togglePermission(item.id)}
                        >
                            <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${isModuleSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                                {isModuleSelected && <Check size={14} />}
                            </div>
                            <div className="flex items-center gap-2">
                                <item.icon size={18} className={isModuleSelected ? 'text-indigo-600' : 'text-slate-400'} />
                                <span className={`text-sm font-bold ${isModuleSelected ? 'text-indigo-900' : 'text-slate-600'}`}>{item.label}</span>
                            </div>
                        </div>

                        {hasSubmodules && (
                            <button 
                                type="button" 
                                onClick={() => toggleModuleExpansion(item.id)}
                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 rounded transition-colors"
                            >
                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                        )}
                      </div>

                      {/* LISTA DE SUBMÓDULOS (EXPANSÍVEL) */}
                      {hasSubmodules && isExpanded && (
                          <div className="border-t border-indigo-100/50 p-2 pl-10 space-y-1 bg-white/50 animate-in slide-in-from-top-1">
                              {submodules.map(sub => {
                                  const isSubSelected = formData.permissions?.includes(sub.id);
                                  return (
                                    <div 
                                        key={sub.id} 
                                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                                        onClick={() => togglePermission(sub.id)}
                                    >
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSubSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300 bg-white'}`}>
                                            {isSubSelected && <Check size={10} />}
                                        </div>
                                        <span className={`text-xs font-medium ${isSubSelected ? 'text-indigo-800' : 'text-slate-600'}`}>{sub.label}</span>
                                    </div>
                                  );
                              })}
                          </div>
                      )}
                      
                      {/* Resumo visual se fechado */}
                      {hasSubmodules && !isExpanded && isModuleSelected && (
                          <div className="px-10 pb-3 text-[10px] text-indigo-500 font-medium">
                              {selectedSubsCount === 0 ? 'Acesso Básico' : (allSubsSelected ? 'Acesso Total' : `${selectedSubsCount} funções selecionadas`)}
                          </div>
                      )}

                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-12 pt-6 border-t border-slate-200 flex justify-end gap-3">
            <button type="button" onClick={() => setViewMode('list')} className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-xs font-bold uppercase tracking-widest text-slate-700 hover:bg-slate-50 transition-colors">Cancelar</button>
            <button type="submit" className="flex items-center gap-2 rounded-xl bg-slate-900 px-8 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-slate-800 shadow-lg transition-all active:scale-95">
                <Save size={18} /> Salvar Usuário
            </button>
          </div>
        </form>
      </SettingsSubPage>
    );
  }

  // --- RENDER LIST ---
  return (
    <SettingsSubPage
      title="Usuários"
      description="Gerencie acesso, tokens de recuperação e permissões de colaboradores."
      icon={Users}
      color="bg-indigo-500"
      onBack={onBack}
    >
      <div className="mb-6 flex items-center justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por nome ou email..." className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none font-medium" />
        </div>
        {isAdmin && (
          <button onClick={handleAddNew} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-indigo-700 shadow-md active:scale-95">
            <Plus size={16} /> Novo Usuário
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <tr>
              <th className="px-6 py-4">Usuário</th>
              <th className="px-6 py-4">Contato</th>
              <th className="px-6 py-4">Permissões</th>
              <th className="px-6 py-4 text-center">Recuperação</th>
              {isAdmin && <th className="px-6 py-4 text-right">Ações</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.length === 0 ? (
              <tr><td colSpan={isAdmin ? 5 : 4} className="px-6 py-10 text-center text-slate-500 italic font-medium">Nenhum usuário encontrado.</td></tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-black text-xs border border-indigo-200">
                        {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{user.firstName} {user.lastName}</div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono"><FileBadge size={10} /> {user.cpf}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium text-xs"><Mail size={12} className="text-slate-400" /> {user.email}</div>
                      <div className="flex items-center gap-1.5 text-slate-500 text-[10px]"><Phone size={12} className="text-slate-400" /> {user.phone}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                     <div className="flex flex-wrap gap-1">
                        {user.permissions.filter(p => !p.includes('.')).slice(0, 3).map(mod => (
                            <span key={mod} className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[9px] font-bold uppercase text-slate-600">
                                {mod}
                            </span>
                        ))}
                        {user.permissions.filter(p => !p.includes('.')).length > 3 && (
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-bold text-slate-500">
                                +{user.permissions.filter(p => !p.includes('.')).length - 3}
                            </span>
                        )}
                     </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {user.allowRecovery ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                            <Check size={10} /> Ativado
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-slate-400 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                            <Lock size={10} /> Bloqueado
                        </span>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={() => handleGenerateToken(user)} 
                            className={`rounded-lg p-2 transition-colors ${user.allowRecovery ? 'text-amber-500 hover:bg-amber-50' : 'text-slate-300 cursor-not-allowed'}`}
                            disabled={!user.allowRecovery}
                            title={user.allowRecovery ? "Gerar Token de Recuperação" : "Recuperação desativada para este usuário"}
                        >
                          <Key size={16} />
                        </button>
                        <button onClick={() => handleEdit(user)} className="rounded-lg p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors" title="Editar">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => setUserToDelete({ id: user.id, name: `${user.firstName} ${user.lastName}` })} className={`rounded-lg p-2 transition-colors ${user.id === '1' ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:bg-red-50 hover:text-red-600'}`} disabled={user.id === '1'} title="Excluir">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ActionConfirmationModal 
        isOpen={!!generatedToken}
        onClose={() => setGeneratedToken(null)}
        onConfirm={() => setGeneratedToken(null)}
        title="Token de Recuperação Gerado"
        description={
            <div className="space-y-4 text-center">
                <p className="text-slate-600 text-sm">O token para <strong>{tokenUserName}</strong> foi gerado com sucesso.</p>
                {/* CORREÇÃO DE CONTRASTE: FUNDO ESCURO COM LETRA BRANCA */}
                <div className="p-5 bg-slate-900 border-2 border-slate-700 rounded-2xl shadow-xl flex items-center justify-center my-4">
                   <p className="text-4xl font-black text-white tracking-[0.3em] font-mono select-all cursor-pointer drop-shadow-md">
                      {generatedToken}
                   </p>
                </div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Copie e envie para o usuário. Válido para uso único.</p>
            </div>
        }
        confirmLabel="Fechar"
        cancelLabel=""
        type="success"
      />

      {/* Modal de Confirmação de Exclusão */}
      <ActionConfirmationModal
        isOpen={userToDelete !== null}
        onConfirm={confirmDelete}
        onCancel={() => setUserToDelete(null)}
        title="Excluir Usuário"
        message={
          <div className="space-y-3">
            <p>Tem certeza que deseja remover o usuário <strong>{userToDelete?.name}</strong>?</p>
            <p className="text-sm text-red-600">Esta ação não pode ser desfeita!</p>
          </div>
        }
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        type="danger"
      />

      {/* Modal de Senha Gerada */}
      <ActionConfirmationModal
        isOpen={generatedPasswordData !== null}
        onConfirm={() => setGeneratedPasswordData(null)}
        onCancel={() => {}}
        title="Usuário Criado com Sucesso"
        message={
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-slate-600 mb-2">Usuário: <strong>{generatedPasswordData?.name}</strong></p>
              <p className="text-sm text-slate-600 mb-3">Email: <strong>{generatedPasswordData?.email}</strong></p>
              <div className="bg-white border-2 border-green-300 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1 uppercase font-semibold">Senha Gerada:</p>
                <p className="text-2xl font-mono font-bold text-green-600 tracking-wider">
                  {generatedPasswordData?.password}
                </p>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-800">
                ⚠️ <strong>Importante:</strong> Copie esta senha e envie para o usuário. No primeiro login, o sistema solicitará a redefinição da senha.
              </p>
            </div>
          </div>
        }
        confirmLabel="Copiar Senha"
        cancelLabel=""
        type="success"
      />
    </SettingsSubPage>
  );
};

export default UsersSettings;
