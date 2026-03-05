import React from 'react';
import {
  Users,
  Save,
  Lock,
  Shield,
  User,
  Unlock,
  Check,
  CheckSquare,
  Square,
  AlertCircle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import SettingsSubPage from '../components/SettingsSubPage';
import { MENU_ITEMS, SUBMODULES } from '../../../constants';
import { validatePasswordStrength } from '../../../utils/passwordValidator';
import type { UserFormProps } from './users.types';

const UserForm: React.FC<UserFormProps> = ({
  editingId,
  formData,
  setFormData,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  showPasswordFields,
  setShowPasswordFields,
  passwordMode,
  setPasswordMode,
  expandedModules,
  onToggleModuleExpansion,
  onTogglePermission,
  onToggleAllPermissions,
  onSave,
  onCancel,
  strength,
  passwordValidation,
}) => {
  return (
    <SettingsSubPage
      title={editingId ? "Editar Usuário" : "Novo Usuário"}
      description="Preencha os dados pessoais, configure a segurança e defina as permissões."
      icon={Users}
      color="bg-indigo-500"
      onBack={onCancel}
    >
      <form onSubmit={onSave} className="grid grid-cols-1 gap-8 lg:grid-cols-12">

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
                <input type="text" required value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} className="w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none font-medium text-sm transition-all" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500 uppercase">Sobrenome</label>
                <input type="text" required value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} className="w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none font-medium text-sm transition-all" />
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
                    setFormData({ ...formData, cpf: formatted });
                  }}
                  placeholder="000.000.000-00"
                  className="w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none font-medium text-sm transition-all"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500 uppercase">Telefone</label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={e => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                    let formatted = '';
                    if (digits.length === 0) {
                      formatted = '';
                    } else if (digits.length <= 2) {
                      formatted = `(${digits}`;
                    } else if (digits.length <= 6) {
                      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
                    } else if (digits.length <= 10) {
                      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
                    } else if (digits.length === 11) {
                      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
                    }
                    setFormData({ ...formData, phone: formatted });
                  }}
                  placeholder="(00) 00000-0000"
                  className="w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none font-medium text-sm transition-all"
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-bold text-slate-500 uppercase">E-mail (Login)</label>
                <input type="text" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none font-medium text-sm transition-all" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500 uppercase">Função</label>
                <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none font-medium text-sm transition-all appearance-none">
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
                    className={`w-full rounded-lg border-2 bg-white px-3 py-2 text-slate-900 focus:outline-none transition-all ${confirmPassword && password !== confirmPassword ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-indigo-500'
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
                <button type="button" onClick={onToggleAllPermissions} className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                  {(() => {
                    const allModules = MENU_ITEMS.map(m => m.id);
                    const isFull = allModules.every(id => formData.permissions?.includes(id));
                    return isFull ? <><Square size={14} /> Desmarcar tudo</> : <><CheckSquare size={14} /> Marcar tudo</>;
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
                const selectedSubsCount = submodules.filter(sub => formData.permissions?.includes(sub.id)).length;
                const allSubsSelected = hasSubmodules && selectedSubsCount === submodules.length;

                return (
                  <div key={item.id} className={`rounded-xl border transition-all ${isModuleSelected ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-100 bg-white hover:border-slate-200'}`}>

                    <div className="flex items-center justify-between p-3">
                      <div
                        className="flex items-center gap-3 flex-1 cursor-pointer"
                        onClick={() => onTogglePermission(item.id)}
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
                          onClick={() => onToggleModuleExpansion(item.id)}
                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 rounded transition-colors"
                        >
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      )}
                    </div>

                    {hasSubmodules && isExpanded && (
                      <div className="border-t border-indigo-100/50 p-2 pl-10 space-y-1 bg-white/50 animate-in slide-in-from-top-1">
                        {submodules.map(sub => {
                          const isSubSelected = formData.permissions?.includes(sub.id);
                          return (
                            <div
                              key={sub.id}
                              className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                              onClick={() => onTogglePermission(sub.id)}
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
          <button type="button" onClick={onCancel} className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-xs font-bold uppercase tracking-widest text-slate-700 hover:bg-slate-50 transition-colors">Cancelar</button>
          <button type="submit" className="flex items-center gap-2 rounded-xl bg-slate-900 px-8 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-slate-800 shadow-lg transition-all active:scale-95">
            <Save size={18} /> Salvar Usuário
          </button>
        </div>
      </form>
    </SettingsSubPage>
  );
};

export default UserForm;
