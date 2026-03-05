
import React, { useMemo } from 'react';
import logo2 from '../../Logo2.png';
import { Mail, Lock, ArrowRight, Loader2, AlertCircle, MapPin, Clock, Calendar, Quote as QuoteIcon, ArrowLeft, KeyRound, ShieldCheck, UserCheck, Eye, EyeOff } from 'lucide-react';
import { quoteService } from '../../services/quoteService';
import { User } from '../../types';
import { useLoginBackground } from '../../hooks/useLoginBackground';
import { useLoginClock } from '../../hooks/useLoginClock';
import { useLoginForm } from '../../hooks/useLoginForm';
import { usePasswordRecovery } from '../../hooks/usePasswordRecovery';

interface Props {
  onLoginSuccess: (user: User) => void;
}

const LoginScreen: React.FC<Props> = ({ onLoginSuccess }) => {
  // Hooks centralizados — 0 useState no componente
  const backgroundImage = useLoginBackground();
  const { formattedTime, formattedDate, location } = useLoginClock();
  const loginForm = useLoginForm(onLoginSuccess);
  const recovery = usePasswordRecovery(loginForm.setError, loginForm.setEmail);

  const dailyQuote = useMemo(() => quoteService.getDailyQuote(), []);

  // Erro ativo: do login OU da recuperação (depende do modo)
  const activeError = recovery.isRecovering ? recovery.error : loginForm.error;
  const activeLoading = recovery.isRecovering ? recovery.isLoading : loginForm.isLoading;

  // Classe utilitária para inputs garantindo cor escura em fundo claro
  const inputClass = 'block w-full pl-11 pr-4 py-3.5 border border-slate-300 rounded-xl text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all bg-white shadow-sm disabled:bg-slate-100 disabled:text-slate-400';

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center font-sans selection:bg-emerald-500 selection:text-white bg-slate-900">
      
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-[60s] hover:scale-105"
            style={{ 
              backgroundImage: `url('${backgroundImage}')`,
              filter: 'blur(3px)'
            }}
        />
        <div className="absolute inset-0 bg-slate-900/40 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-slate-900/60" />
      </div>

      <div className="absolute top-6 left-6 z-20 animate-in slide-in-from-top-4 duration-700">
         <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full shadow-lg hover:bg-black/50 transition-colors">
            <img 
              src={logo2} 
              alt="Dailabs Logo" 
              className="w-6 h-6 rounded"
            />
            <div className="flex flex-col leading-tight">
              <span className="text-white font-bold tracking-tight text-sm drop-shadow-md">Dailabs</span>
              <span className="text-white/70 text-[10px] font-semibold">Creative AI & Software</span>
            </div>
         </div>
      </div>

      <div className="absolute bottom-6 left-6 z-20 animate-in slide-in-from-bottom-4 duration-700 delay-100 flex flex-col items-start text-white/90">
         <div className="flex items-center gap-4 bg-black/40 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/10 text-sm font-medium shadow-lg hover:bg-black/50 transition-colors cursor-default">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-emerald-400" />
              <span className="font-mono">{formattedTime}</span>
            </div>
            <span className="w-px h-3 bg-white/20" />
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-emerald-400" />
              <span>{formattedDate}</span>
            </div>
            <span className="w-px h-3 bg-white/20" />
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-emerald-400" />
              <span className="whitespace-nowrap">{location}</span>
            </div>
         </div>
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 lg:px-8 grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
        
        <div className="hidden lg:flex flex-col justify-center order-2 lg:order-1">
           {dailyQuote && (
             <div className="group relative overflow-hidden rounded-3xl bg-black/30 backdrop-blur-xl border border-white/10 p-10 shadow-2xl animate-in slide-in-from-left-8 duration-1000 hover:bg-black/40 transition-all">
                <div className="absolute -top-20 -right-20 w-60 h-60 bg-emerald-500/20 rounded-full blur-[80px] pointer-events-none"></div>
                <div className="relative z-10">
                  <div className="mb-6 opacity-80">
                    <QuoteIcon size={48} className="text-emerald-400 fill-emerald-400/20" />
                  </div>
                  <blockquote className="text-3xl md:text-4xl font-medium text-white leading-tight font-serif tracking-tight text-shadow-lg mb-8 drop-shadow-md">
                    "{dailyQuote.text}"
                  </blockquote>
                  <footer className="flex items-center gap-3">
                    <div className="h-0.5 w-8 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
                    <span className="text-emerald-100 font-bold uppercase tracking-widest text-sm shadow-black drop-shadow-sm">
                      {dailyQuote.author}
                    </span>
                  </footer>
                </div>
             </div>
           )}
        </div>

        <div className="flex justify-center lg:justify-end order-1 lg:order-2">
           <div className="w-full max-w-[420px] bg-white/80 backdrop-blur-2xl border border-white/60 rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] p-8 md:p-10 animate-in zoom-in-95 duration-500 relative overflow-hidden">
              
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-50"></div>
              <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

              <div className="relative z-10">
                {/* Header Dinâmico */}
                <div className="mb-8">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white mb-4 shadow-lg shadow-black/20">
                    {recovery.isRecovering ? <KeyRound size={24} /> : <Lock size={24} />}
                  </div>
                  <h2 className="text-3xl font-bold text-slate-800 tracking-tight">
                    {recovery.isRecovering ? (recovery.recoveryStep === 'token' ? 'Token de Acesso' : 'Nova Senha') : 'Bem-vindo'}
                  </h2>
                  <p className="text-slate-600 text-sm mt-1 font-medium whitespace-pre-line">
                    {recovery.isRecovering 
                      ? (recovery.recoveryStep === 'token' ? 'Insira o código fornecido pelo administrador.' : 'Defina suas novas credenciais.')
                      : 'Acesse ao sistema ERP personalizado da\nSuporte Grãos LTDA'}
                  </p>
                </div>

                {/* --- LÓGICA DE EXIBIÇÃO DE ERRO --- */}
                {activeError && (
                    <div className="bg-red-50/90 border border-red-200 text-red-600 p-4 rounded-xl flex items-start gap-3 text-sm animate-in fade-in backdrop-blur-sm mb-4 shadow-sm">
                        <AlertCircle className="shrink-0 mt-0.5" size={16} />
                        <span className="font-medium">{activeError}</span>
                    </div>
                )}

                {recovery.isRecovering ? (
                    recovery.recoveryStep === 'token' ? (
                        /* ETAPA 1: TOKEN */
                        <form onSubmit={recovery.handleValidateToken} className="space-y-4 animate-in fade-in slide-in-from-right-4">
                             <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4">
                                <p className="text-xs text-blue-800 font-medium leading-relaxed">
                                    <ShieldCheck className="inline w-4 h-4 mr-1 -mt-0.5 text-blue-600" />
                                    Para sua segurança, solicite o token de desbloqueio diretamente ao administrador do sistema.
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase ml-1 tracking-wide">Token de Recuperação</label>
                                <input
                                    type="text"
                                    required
                                    value={recovery.recoveryToken}
                                    onChange={(e) => recovery.setRecoveryToken(e.target.value.toUpperCase())}
                                    className="block w-full px-4 py-3.5 border-2 border-slate-300 bg-white rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-0 focus:border-emerald-500 transition-all font-mono text-center tracking-widest uppercase text-lg"
                                    placeholder="XXXX-XXXX"
                                    autoFocus
                                />
                            </div>

                            <div className="pt-2 flex flex-col gap-3">
                                <button
                                    type="submit"
                                    disabled={activeLoading}
                                    className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-base hover:bg-slate-800 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group"
                                >
                                    {activeLoading ? <Loader2 size={20} className="animate-spin" /> : 'Validar Token'}
                                </button>
                                <button 
                                    type="button" 
                                    onClick={recovery.cancelRecovery}
                                    className="w-full bg-white border border-slate-200 text-slate-600 py-3.5 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                                >
                                    <ArrowLeft size={16} /> Voltar para o Login
                                </button>
                            </div>
                        </form>
                    ) : (
                        /* ETAPA 2: NOVA SENHA */
                        <form onSubmit={recovery.handleResetPassword} className="space-y-4 animate-in fade-in slide-in-from-right-4">
                            {/* Card de Identificação do Usuário */}
                            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                                    <UserCheck size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Email Identificado</p>
                                    <p className="text-sm font-black text-emerald-900">{recovery.recoveryUser?.email}</p>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase ml-1 tracking-wide">Nova Senha</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        value={recovery.newPassword}
                                        onChange={(e) => recovery.setNewPassword(e.target.value)}
                                        className={inputClass}
                                        placeholder="Mínimo 6 caracteres"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase ml-1 tracking-wide">Confirmar Senha</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        value={recovery.confirmNewPassword}
                                        onChange={(e) => recovery.setConfirmNewPassword(e.target.value)}
                                        className={inputClass}
                                        placeholder="Repita a senha"
                                    />
                                </div>
                            </div>

                            <div className="pt-2 flex flex-col gap-3">
                                <button
                                    type="submit"
                                    disabled={activeLoading}
                                    className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-base hover:bg-slate-800 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group"
                                >
                                    {activeLoading ? <Loader2 size={20} className="animate-spin" /> : 'Confirmar Alteração'}
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => { recovery.setRecoveryStep('token'); recovery.setError(''); }}
                                    className="w-full bg-white border border-slate-200 text-slate-600 py-3.5 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                                >
                                    <ArrowLeft size={16} /> Voltar
                                </button>
                            </div>
                        </form>
                    )
                ) : (
                    /* FORMULÁRIO DE LOGIN (PADRÃO) */
                    <form onSubmit={loginForm.handleSubmit} className="space-y-5 animate-in fade-in slide-in-from-left-4">
                        
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase ml-1 tracking-wide">E-mail</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                                </div>
                                <input
                                type="text"
                                required
                                value={loginForm.email}
                                onChange={(e) => loginForm.setEmail(e.target.value)}
                                className={inputClass}
                                placeholder="email@dominio.com"
                                disabled={loginForm.isLoading}
                                />
                            </div>
                            </div>

                            <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase ml-1 tracking-wide">Senha</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                                </div>
                                <input
                                type={loginForm.showPassword ? "text" : "password"}
                                required
                                value={loginForm.password}
                                onChange={(e) => loginForm.setPassword(e.target.value)}
                                className={inputClass}
                                placeholder="••••••••"
                                disabled={loginForm.isLoading}
                                />
                                <button
                                    type="button"
                                    onClick={() => loginForm.setShowPassword(!loginForm.showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                                    tabIndex={-1}
                                >
                                    {loginForm.showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                            <label className="flex items-center gap-2 cursor-pointer group select-none">
                            <div className="relative flex items-center">
                                <input
                                  type="checkbox"
                                  checked={loginForm.rememberMe}
                                  onChange={(e) => loginForm.setRememberMe(e.target.checked)}
                                  className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-slate-300 shadow transition-all checked:border-emerald-500 checked:bg-emerald-500 hover:shadow-md"
                                />
                                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" stroke="currentColor" strokeWidth="1">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                </span>
                            </div>
                            <span className="text-sm text-slate-600 group-hover:text-slate-800 transition-colors font-medium">Lembrar-me</span>
                            </label>
                            
                            <button 
                                type="button" 
                                onClick={recovery.startRecovery}
                                className="text-sm font-bold text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
                            >
                            Esqueci minha senha
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={loginForm.isLoading}
                            className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-base hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/30 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4 group"
                        >
                            {loginForm.isLoading ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                <span>Autenticando...</span>
                            </>
                            ) : (
                            <>
                                <span>Acessar Sistema</span>
                                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </>
                            )}
                        </button>
                    </form>
                )}

                <div className="pt-8 text-center border-t border-slate-200/50 mt-8">
                  <p className="text-xs font-medium text-slate-500">
                    © 2026 Suporte Grãos LTDA<br/>Todos os direitos reservado.
                  </p>
                </div>
              </div>
           </div>
        </div>

      </div>

    </div>
  );
};

export default LoginScreen;
