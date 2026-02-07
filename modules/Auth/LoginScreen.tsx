
import React, { useState, useEffect } from 'react';
import logo2 from '../../Logo2.png';
import { Mail, Lock, ArrowRight, Loader2, AlertCircle, MapPin, Clock, Calendar, Quote as QuoteIcon, ArrowLeft, KeyRound, ShieldCheck, UserCheck, Eye, EyeOff } from 'lucide-react';
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
  const [email, setEmail] = useState(() => {
    if (typeof window === 'undefined') return '';
    const remember = localStorage.getItem('login_remember') === 'true';
    return remember ? (localStorage.getItem('login_email') || '') : '';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('login_remember') === 'true';
  });

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
  const [publicLoginImages] = useState<string[]>([
    '/login-images/login.jpg',
    '/login-images/banner-1.jpg',
    '/login-images/banner-2.jpg',
    '/login-images/banner-3.jpg',
    '/login-images/banner-4.jpg',
    '/login-images/banner-5.jpg',
    '/login-images/banner-6.jpg',
    '/login-images/banner-7.jpg',
    '/login-images/banner-8.jpg',
    '/login-images/banner-9.jpg',
    '/login-images/banner-10.jpg',
    '/login-images/banner-11.jpg',
  ]);

  // Log de montagem (roda APENAS UMA VEZ)
  useEffect(() => {
    console.log('%c[LOGIN_SCREEN] 🎬 Componente MONTADO!', 'background: #1a1a2e; color: #00ff88; font-size: 14px; font-weight: bold;');
    console.log('[LOGIN_SCREEN] ⏰ Timestamp:', new Date().toISOString());
    console.log('[LOGIN_SCREEN] 📋 Props recebidas:', { hasOnLoginSuccess: !!onLoginSuccess });
  }, []); // Array vazio = roda apenas no mount

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

useEffect(() => {
    setDailyQuote(quoteService.getDailyQuote());
    
    // Carregar imagem de fundo com fallback correto
    // Ordem: Supabase → Imagens Públicas → localStorage → Padrão
    const loadBackgroundImage = async () => {
      try {
        // 1. TENTAR SUPABASE (Requer autenticação)
        // Não bloqueia a tela - falha rapidamente se não autenticado
        try {
          const screens = await Promise.race([
            loginScreenService.loadActiveScreens(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1500))
          ]);
          
          if (screens && Array.isArray(screens) && screens.length > 0) {
            const firstScreen = screens[0];
            if (firstScreen?.image_url) {
              console.log('✅ LoginScreen: Usando image_url do Supabase');
              setBackgroundImage(firstScreen.image_url);
              return;
            } else if (firstScreen?.image_data) {
              console.log('✅ LoginScreen: Usando image_data (base64) do Supabase');
              setBackgroundImage(firstScreen.image_data);
              return;
            }
          }
        } catch (supabaseError) {
          console.log('⚠️ LoginScreen: Supabase indisponível (esperado antes do login):', supabaseError);
        }

        // 2. TENTAR IMAGENS PÚBLICAS (Sem autenticação - Prioridade!)
        // Isso resolve o problema de autenticação na tela de login
        if (publicLoginImages && publicLoginImages.length > 0) {
          const now = new Date();
          const dayOfYear = Math.floor(
            (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000
          );
          const imageIndex = dayOfYear % publicLoginImages.length;
          const selectedImage = publicLoginImages[imageIndex];
          
          console.log(`✅ LoginScreen: Usando imagem pública [${imageIndex + 1}/${publicLoginImages.length}]: ${selectedImage}`);
          setBackgroundImage(selectedImage);
          return;
        }

        // 3. FALLBACK: localStorage
        const fallbackImage = settingsService.getActiveLoginImage();
        if (fallbackImage) {
          console.log('✅ LoginScreen: Usando imagem do localStorage');
          setBackgroundImage(fallbackImage);
          return;
        }

        // 4. FALLBACK: Imagem padrão
        console.log('⚠️ LoginScreen: Sem imagem configurada, usando padrão');
        setBackgroundImage('https://images.unsplash.com/photo-1551467013-eb30663473f6?q=80&w=1600');
      } catch (error) {
        console.error('❌ LoginScreen: Erro ao carregar imagem de fundo:', error);
        // Fallback final
        setBackgroundImage('https://images.unsplash.com/photo-1551467013-eb30663473f6?q=80&w=1600');
      }
    };
    
    loadBackgroundImage();
    
    // Listener para atualização em tempo real das imagens
    const handleLoginScreenUpdate = () => {
      console.log('🔄 LoginScreen: Atualizando imagem de fundo...');
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
  }, []); // ✅ Array vazio - roda apenas UMA VEZ no mount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    console.log('\n' + '='.repeat(80));
    console.log('🔐 LOGIN INICIADO');
    console.log('='.repeat(80));
    console.log('📧 Email:', email);
    console.log('🕐 Timestamp:', new Date().toISOString());

    setError('');
    setIsLoading(true);
    console.log('⏳ isLoading definido como true');

    try {
      console.log('⏱️  Aguardando 800ms (delay de UX)...');
      // Simulate network delay for better UX and brute-force mitigation
      await new Promise(resolve => setTimeout(resolve, 800));
      console.log('✅ Delay concluído');
      
      console.log('🔄 Chamando authService.login()...');
      const loginStartTime = performance.now();
      const user = await authService.login(email, password);
      const loginEndTime = performance.now();
      
      console.log('✅ authService.login() sucesso!');
      console.log('⏱️  Tempo de login:', (loginEndTime - loginStartTime).toFixed(2) + 'ms');
      console.log('👤 Usuário autenticado:', user.email);
      console.log('🆔 User ID:', user.id);
      console.log('📍 Role:', user.role);
      
      // Inicializar serviços que dependem de autenticação
      console.log('🔄 Inicializando loginScreenService.startRealtime()...');
      loginScreenService.startRealtime();
      console.log('✅ loginScreenService iniciado');
      
      console.log('[LOGIN_SCREEN] 📤 Preparando para chamar onLoginSuccess()...');
      console.log('[LOGIN_SCREEN] 👤 Usuário para enviar:', user.email);
      console.log('[LOGIN_SCREEN] 🎯 onLoginSuccess é função?', typeof onLoginSuccess === 'function');
      console.log('📤 Chamando onLoginSuccess()...');
      onLoginSuccess(user);
      console.log('[LOGIN_SCREEN] ✅ onLoginSuccess() CHAMADO com sucesso!');
      if (typeof window !== 'undefined') {
        if (rememberMe) {
          localStorage.setItem('login_email', email);
          localStorage.setItem('login_remember', 'true');
        } else {
          localStorage.removeItem('login_email');
          localStorage.removeItem('login_remember');
        }
      }
      console.log('✅ onLoginSuccess() chamado');
      
    } catch (err: any) {
      console.error('❌ Erro ao realizar login:');
      console.error('   Mensagem:', err.message);
      console.error('   Stack:', err.stack);
      const rawMessage = err?.message || 'Erro ao realizar login. Verifique suas credenciais.';
      const isInactive = typeof rawMessage === 'string' && rawMessage.toLowerCase().includes('inativo');
      const message = isInactive ? 'Usuário desativado. Contate o administrador.' : rawMessage;
      setError(message);
      // Clear password on error for security
      setPassword(''); 
    } finally {
      console.log('⏳ isLoading definido como false');
      setIsLoading(false);
      console.log('='.repeat(80) + '\n');
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
                    {isRecovering ? <KeyRound size={24} /> : <Lock size={24} />}
                  </div>
                  <h2 className="text-3xl font-bold text-slate-800 tracking-tight">
                    {isRecovering ? (recoveryStep === 'token' ? 'Token de Acesso' : 'Nova Senha') : 'Bem-vindo'}
                  </h2>
                  <p className="text-slate-600 text-sm mt-1 font-medium whitespace-pre-line">
                    {isRecovering 
                      ? (recoveryStep === 'token' ? 'Insira o código fornecido pelo administrador.' : 'Defina suas novas credenciais.')
                      : 'Acesse ao sistema ERP personalizado da\nSuporte Grãos LTDA'}
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
                                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Email Identificado</p>
                                    <p className="text-sm font-black text-emerald-900">{recoveryUser?.email}</p>
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
                            <label className="text-xs font-bold text-slate-600 uppercase ml-1 tracking-wide">E-mail</label>
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
                                placeholder="email@dominio.com"
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
                                type={showPassword ? "text" : "password"}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={inputClass}
                                placeholder="••••••••"
                                disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                            <label className="flex items-center gap-2 cursor-pointer group select-none">
                            <div className="relative flex items-center">
                                <input
                                  type="checkbox"
                                  checked={rememberMe}
                                  onChange={(e) => setRememberMe(e.target.checked)}
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
