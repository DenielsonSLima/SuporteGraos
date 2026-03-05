
import React, { useState } from 'react';
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Search,
  Key,
  ShieldCheck,
  FileBadge,
  Mail,
  Phone,
  Check,
  Lock
} from 'lucide-react';
import SettingsSubPage from '../components/SettingsSubPage';
import { ModuleId } from '../../../types';
import { MENU_ITEMS, SUBMODULES } from '../../../constants';
import { useToast } from '../../../contexts/ToastContext';
import ActionConfirmationModal from '../../../components/ui/ActionConfirmationModal';
import { validatePasswordStrength, getStrengthColor, getStrengthLabel } from '../../../utils/passwordValidator';
import { useAddUser, useDeleteUser, useGenerateRecoveryToken, useInactivateUser, useUpdateUser, useUsers } from '../../../hooks/useUsers';
import type { UserData } from '../../../hooks/useUsers';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
import { SkeletonTableRows } from '../../../components/ui/SkeletonTable';
import UserForm from './components/UserForm';

interface Props {
  onBack: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const UsersSettings: React.FC<Props> = ({ onBack }) => {
  const { addToast } = useToast();
  const currentUser = useCurrentUser();
  const isAdmin = currentUser?.role === 'admin';

  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Password State
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [passwordMode, setPasswordMode] = useState<'auto' | 'manual'>('manual');
  const [expandedModules, setExpandedModules] = useState<string[]>([]);

  // Data
  const { data: users = [], isLoading: isLoadingUsers } = useUsers();
  const addUser = useAddUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const inactivateUser = useInactivateUser();
  const generateRecoveryToken = useGenerateRecoveryToken();

  // Token Modal
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [tokenUserName, setTokenUserName] = useState('');

  // Delete Confirmation Modal
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);
  const [userToHardDelete, setUserToHardDelete] = useState<{ id: string; name: string } | null>(null);
  const [userToActivate, setUserToActivate] = useState<UserData | null>(null);

  // Generated Password Modal
  const [generatedPasswordData, setGeneratedPasswordData] = useState<{ name: string; email: string; password: string } | null>(null);

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
    setPasswordMode('manual');
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

  const handleGenerateToken = async (user: UserData) => {
    try {
      const token = await generateRecoveryToken.mutateAsync(user.id);
      setTokenUserName(`${user.firstName} ${user.lastName}`);
      setGeneratedToken(token);
    } catch (error: any) {
      addToast('error', 'Erro', error.message);
    }
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await inactivateUser.mutateAsync(userToDelete.id);
      addToast('success', 'Usuário desativado', 'Usuário desativado com sucesso.');
    } catch (error: any) {
      addToast('error', 'Erro ao desativar', error.message);
    } finally {
      setUserToDelete(null);
    }
  };

  const confirmHardDelete = async () => {
    if (!userToHardDelete) return;
    try {
      await deleteUser.mutateAsync(userToHardDelete.id);
      addToast('success', 'Usuário excluído', 'Usuário removido definitivamente do sistema.');
    } catch (error: any) {
      addToast('error', 'Erro ao excluir', error.message);
    } finally {
      setUserToHardDelete(null);
    }
  };

  const confirmActivate = async () => {
    if (!userToActivate) return;
    try {
      await updateUser.mutateAsync({ ...userToActivate, active: true });
      addToast('success', 'Usuário ativado', 'Usuário ativado com sucesso.');
    } catch (error: any) {
      addToast('error', 'Erro ao ativar', error.message);
    } finally {
      setUserToActivate(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedEmail = (formData.email || '').trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      addToast('error', 'E-mail inválido', 'Informe um endereço válido (ex: usuario@empresa.com).');
      return;
    }

    const emailAlreadyInUse = users.some(u => (
      (u.email || '').toLowerCase() === normalizedEmail && u.id !== editingId
    ));

    if (emailAlreadyInUse) {
      addToast('error', 'E-mail duplicado', 'Já existe um usuário utilizando este e-mail.');
      return;
    }



    try {
      if (editingId) {
        const updateData: any = { ...formData, id: editingId, email: normalizedEmail };
        if (showPasswordFields && password) {
          updateData.password = password;
        }
        await updateUser.mutateAsync(updateData);
      } else {
        const newUser: UserData = {
          ...formData,
          id: Math.random().toString(36).substr(2, 9),
          email: normalizedEmail,
          password: ''
        } as UserData;

        const result = await addUser.mutateAsync({ user: newUser, generatePassword: true });

        // Se gerou senha automática, mostrar modal
        if (result.generatedPassword) {
          setGeneratedPasswordData({
            name: `${formData.firstName} ${formData.lastName}`,
            email: formData.email,
            password: result.generatedPassword
          });
        }
      }
      setViewMode('list');
      addToast('success', 'Usuário Salvo', 'Usuário salvo com sucesso.');
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
      <UserForm
        editingId={editingId}
        formData={formData}
        setFormData={setFormData}
        password={password}
        setPassword={setPassword}
        confirmPassword={confirmPassword}
        setConfirmPassword={setConfirmPassword}
        showPasswordFields={showPasswordFields}
        setShowPasswordFields={setShowPasswordFields}
        passwordMode={passwordMode}
        setPasswordMode={setPasswordMode}
        expandedModules={expandedModules}
        onToggleModuleExpansion={toggleModuleExpansion}
        onTogglePermission={togglePermission}
        onToggleAllPermissions={toggleAllPermissions}
        onSave={handleSave}
        onCancel={() => setViewMode('list')}
        strength={strength}
        passwordValidation={passwordValidation}
      />
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
            {isLoadingUsers ? (
              <SkeletonTableRows rows={5} cols={isAdmin ? 5 : 4} />
            ) : filteredUsers.length === 0 ? (
              <tr><td colSpan={isAdmin ? 5 : 4} className="px-6 py-10 text-center text-slate-500 italic font-medium">Nenhum usuário encontrado.</td></tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className={`transition-colors group ${user.active ? 'hover:bg-slate-50' : 'bg-rose-50/50 opacity-75'}`}>
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
                        {!user.active && (
                          <button
                            onClick={() => setUserToActivate(user)}
                            className={`rounded-lg p-2 transition-colors ${user.id === '1' ? 'text-slate-200 cursor-not-allowed' : 'text-emerald-600 hover:bg-emerald-50'}`}
                            disabled={user.id === '1'}
                            title="Ativar"
                          >
                            <ShieldCheck size={16} />
                          </button>
                        )}
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
                        <button onClick={() => setUserToDelete({ id: user.id, name: `${user.firstName} ${user.lastName}` })} className={`rounded-lg p-2 transition-colors ${user.id === '1' ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:bg-orange-50 hover:text-orange-600'}`} disabled={user.id === '1'} title="Inativar">
                          <Lock size={16} />
                        </button>
                        <button onClick={() => setUserToHardDelete({ id: user.id, name: `${user.firstName} ${user.lastName}` })} className={`rounded-lg p-2 transition-colors ${user.id === '1' ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:bg-red-50 hover:text-red-600'}`} disabled={user.id === '1'} title="Excluir Definitivamente">
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

      {/* Modal de Confirmação de Inativação */}
      <ActionConfirmationModal
        isOpen={userToDelete !== null}
        onConfirm={confirmDelete}
        onCancel={() => setUserToDelete(null)}
        title="Inativar Usuário"
        message={
          <div className="space-y-3">
            <p>Tem certeza que deseja inativar o usuário <strong>{userToDelete?.name}</strong>?</p>
            <p className="text-sm text-orange-600">O usuário perderá acesso ao sistema, mas seus dados permanecerão registrados.</p>
          </div>
        }
        confirmLabel="Inativar"
        cancelLabel="Cancelar"
        type="warning"
      />

      {/* Modal de Confirmação de Exclusão Definitiva */}
      <ActionConfirmationModal
        isOpen={userToHardDelete !== null}
        onConfirm={confirmHardDelete}
        onCancel={() => setUserToHardDelete(null)}
        title="Excluir Usuário Definitivamente"
        message={
          <div className="space-y-3">
            <p>AVISO CRÍTICO: Você está excluindo permanentemente o usuário <strong>{userToHardDelete?.name}</strong>.</p>
            <p className="text-sm text-red-600 font-bold uppercase">Esta ação não pode ser desfeita e removerá o usuário de toda a base de autenticação.</p>
          </div>
        }
        confirmLabel="Excluir Permanentemente"
        cancelLabel="Cancelar"
        type="danger"
      />

      {/* Modal de Ativação */}
      <ActionConfirmationModal
        isOpen={userToActivate !== null}
        onConfirm={confirmActivate}
        onCancel={() => setUserToActivate(null)}
        title="Ativar Usuário"
        message={
          <div className="space-y-3">
            <p>Deseja ativar o usuário <strong>{userToActivate?.firstName} {userToActivate?.lastName}</strong>?</p>
            <p className="text-sm text-emerald-600">O usuário poderá acessar o sistema novamente.</p>
          </div>
        }
        confirmLabel="Ativar"
        cancelLabel="Cancelar"
        type="success"
      />

      {/* Modal de Senha Gerada */}
      <ActionConfirmationModal
        isOpen={generatedPasswordData !== null}
        onConfirm={() => setGeneratedPasswordData(null)}
        onCancel={() => { }}
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
