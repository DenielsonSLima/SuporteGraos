
import React, { useState, useEffect } from 'react';
import { Sprout, Mail, Lock, ArrowRight, Loader2, AlertCircle, MapPin, Clock, Calendar, Quote as QuoteIcon, ArrowLeft, KeyRound, ShieldCheck, UserCheck } from 'lucide-react';
import { authService } from '../../services/authService';
import { userService, UserData } from '../../services/userService';
import { quoteService, Quote } from '../../services/quoteService';
import { settingsService } from '../../services/settingsService';
import { loginScreenService } from '../../services/loginScreenService';
import { User } from '../../types';
import { useToast } from '../../contexts/ToastContext';

interface Props {
  onLoginSuccess: (user: User) => void;
}

const LoginScreen: React.FC<Props> = ({ onLoginSuccess }) => {
  const { addToast } = useToast();
  
  // Login State
  const [email, setEmail] = useState('admin');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Recovery State
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<'token' | 'reset'>('token');
  const [recoveryUser, setRecoveryUser] = useState<UserData | null>(null);
  
  const [recoveryToken, setRecoveryToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // UI Context Data
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location, setLocation] = useState<string>('Localizando...');
  const [dailyQuote, setDailyQuote] = useState<Quote | null>(null);
  const [backgroundImage, setBackgroundImage] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setDailyQuote(quoteService.getDailyQuote());
    
    // Carregar imagem de fundo do loginScreenService (Supabase) ou fallback para settingsService (localStorage)
    const loadBackgroundImage = async () => {
      try {
        const screens = await loginScreenService.loadActiveScreens();
        if (screens && screens.length > 0) {
          // Buscar primeira imagem ativa
          const firstScreen = screens.sort((a, b) => a.sequence_order - b.sequence_order)[0];
          if (firstScreen && (firstScreen.image_url || firstScreen.image_data)) {
            setBackgroundImage(firstScreen.image_url || firstScreen.image_data || '');
          } else {
            // Fallback para settingsService se não houver imagens no Supabase
            setBackgroundImage(settingsService.getActiveLoginImage());
          }
        } else {
          // Fallback para settingsService
          setBackgroundImage(settingsService.getActiveLoginImage());
        }
      } catch (error) {
        console.error('Erro ao carregar imagem de fundo:', error);
        // Fallback em caso de erro
        setBackgroundImage(settingsService.getActiveLoginImage());
      }
    };
    
    loadBackgroundImage();
    
    // Listener para atualização em tempo real das imagens
    const handleLoginScreenUpdate = () => {
      loadBackgroundImage();
    };
    
    window.addEventListener('login_screens:updated', handleLoginScreenUpdate);

    // Use environment variable for IP API if available, or fetch carefully
    // Added AbortController to prevent memory leaks on unmount
    const controller = new AbortController();
    
    fetch('https://ipapi.co/json/', { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        if (data.city && data.region_code) {
          setLocation(`${data.city}, ${data.region_code}`);
        } else {
          setLocation('Brasil');
        }
      })
      .catch(() => {
        setLocation('Acesso Seguro');
      });

    return () => {
      controller.abort();
      window.removeEventListener('login_screens:updated', handleLoginScreenUpdate);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setError('');
    setIsLoading(true);

    try {
      // Simulate network delay for better UX and brute-force mitigation
      await new Promise(resolve => setTimeout(resolve, 800));
      const user = await authService.login(email, password);
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar login. Verifique suas credenciais.');
      // Clear password on error for security
      setPassword(''); 
    } finally {
      setIsLoading(false);
    }
  };

  // Etapa 1: Validar Token
  const handleValidateToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryToken || isLoading) return;
    setError('');
    setIsLoading(true);

    setTimeout(() => {
        const user = userService.getByRecoveryToken(recoveryToken);
        if (user) {
            setRecoveryUser(user);
            setRecoveryStep('reset');
            setError('');
        } else {
            setError('Token inválido ou não encontrado.');
        }
        setIsLoading(false);
    }, 1000);
  };

  // Etapa 2: Resetar Senha
  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryUser || !recoveryToken || isLoading) return;

    if (newPassword !== confirmNewPassword) {
        setError('As senhas não conferem.');
        return;
    }
    
    if (newPassword.length < 6) {
        setError('A senha deve ter no mínimo 6 caracteres.');
        return;
    }

    setIsLoading(true);
    
    setTimeout(() => {
        const success = userService.resetPasswordWithToken(recoveryToken, newPassword);
        
        if (success) {
            addToast('success', 'Senha Redefinida', 'Sua senha foi atualizada com sucesso. Faça login agora.');
            setIsRecovering(false);
            setRecoveryStep('token');
            setRecoveryToken('');
            setNewPassword('');
            setConfirmNewPassword('');
            setRecoveryUser(null);
            setError('');
            // Pre-fill email for convenience
            setEmail(recoveryUser?.email || '');
        } else {
            setError('Falha ao redefinir. Token pode ter expirado.');
        }
        setIsLoading(false);
    }, 1500);
  };

  const formattedTime = currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const formattedDate = currentTime.toLocaleDateString('pt-BR');

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
            <div className="bg-emerald-500 p-1.5 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]">
              <Sprout className="text-white" size={18} />
            </div>
            <span className="text-white font-bold tracking-tight text-sm drop-shadow-md">Suporte Grãos ERP</span>
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
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white mb-4 shadow-lg shadow-emerald-500/30">
                    {isRecovering ? <KeyRound size={24} /> : <Lock size={24} />}
                  </div>
                  <h2 className="text-3xl font-bold text-slate-800 tracking-tight">
                    {isRecovering ? (recoveryStep === 'token' ? 'Token de Acesso' : 'Nova Senha') : 'Bem-vindo'}
                  </h2>
                  <p className="text-slate-600 text-sm mt-1 font-medium">
                    {isRecovering 
                      ? (recoveryStep === 'token' ? 'Insira o código fornecido pelo administrador.' : 'Defina suas novas credenciais.')
                      : 'Acesse o ecossistema Suporte Grãos.'}
                  </p>
                </div>

                {/* --- LÓGICA DE EXIBIÇÃO DE ERRO --- */}
                {error && (
                    <div className="bg-red-50/90 border border-red-200 text-red-600 p-4 rounded-xl flex items-start gap-3 text-sm animate-in fade-in backdrop-blur-sm mb-4 shadow-sm">
                        <AlertCircle className="shrink-0 mt-0.5" size={16} />
                        <span className="font-medium">{error}</span>
                    </div>
                )}

                {isRecovering ? (
                    recoveryStep === 'token' ? (
                        /* ETAPA 1: TOKEN */
                        <form onSubmit={handleValidateToken} className="space-y-4 animate-in fade-in slide-in-from-right-4">
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
                                    value={recoveryToken}
                                    onChange={(e) => setRecoveryToken(e.target.value.toUpperCase())}
                                    className="block w-full px-4 py-3.5 border-2 border-slate-300 bg-white rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-0 focus:border-emerald-500 transition-all font-mono text-center tracking-widest uppercase text-lg"
                                    placeholder="XXXX-XXXX"
                                    autoFocus
                                />
                            </div>

                            <div className="pt-2 flex flex-col gap-3">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-base hover:bg-slate-800 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group"
                                >
                                    {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Validar Token'}
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => { setIsRecovering(false); setError(''); }}
                                    className="w-full bg-white border border-slate-200 text-slate-600 py-3.5 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                                >
                                    <ArrowLeft size={16} /> Voltar para o Login
                                </button>
                            </div>
                        </form>
                    ) : (
                        /* ETAPA 2: NOVA SENHA */
                        <form onSubmit={handleResetPassword} className="space-y-4 animate-in fade-in slide-in-from-right-4">
                            {/* Card de Identificação do Usuário */}
                            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                                    <UserCheck size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Usuário Identificado</p>
                                    <p className="text-sm font-black text-emerald-900">{recoveryUser?.firstName} {recoveryUser?.lastName}</p>
                                    <p className="text-xs text-emerald-700">{recoveryUser?.email}</p>
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
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
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
                                        value={confirmNewPassword}
                                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                                        className={inputClass}
                                        placeholder="Repita a senha"
                                    />
                                </div>
                            </div>

                            <div className="pt-2 flex flex-col gap-3">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-base hover:bg-slate-800 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group"
                                >
                                    {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Confirmar Alteração'}
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => { setRecoveryStep('token'); setError(''); }}
                                    className="w-full bg-white border border-slate-200 text-slate-600 py-3.5 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                                >
                                    <ArrowLeft size={16} /> Voltar
                                </button>
                            </div>
                        </form>
                    )
                ) : (
                    /* FORMULÁRIO DE LOGIN (PADRÃO) */
                    <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in slide-in-from-left-4">
                        
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase ml-1 tracking-wide">Usuário / E-mail</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                                </div>
                                <input
                                type="text"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className={inputClass}
                                placeholder="admin"
                                disabled={isLoading}
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
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={inputClass}
                                placeholder="••••••••"
                                disabled={isLoading}
                                />
                            </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                            <label className="flex items-center gap-2 cursor-pointer group select-none">
                            <div className="relative flex items-center">
                                <input type="checkbox" className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-slate-300 shadow transition-all checked:border-emerald-500 checked:bg-emerald-500 hover:shadow-md" />
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
                                onClick={() => { setIsRecovering(true); setError(''); setRecoveryStep('token'); }}
                                className="text-sm font-bold text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
                            >
                            Esqueci minha senha
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-base hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/30 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4 group"
                        >
                            {isLoading ? (
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
                    © {new Date().getFullYear()} Suporte Grãos Tecnologia.<br/>Todos os direitos reservados.
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
