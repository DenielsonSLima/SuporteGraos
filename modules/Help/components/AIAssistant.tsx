
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
// Added missing icons: AlertTriangle, TrendingUp
import { Send, Loader2, Bot, User, Sparkles, Database, HelpCircle, ArrowRight, MessageSquareCode, BrainCircuit, BarChart3, Wallet, AlertTriangle, TrendingUp } from 'lucide-react';
import { useAIAssistantContext } from '../hooks/useAIAssistantContext';

const AIAssistant: React.FC = () => {
  const { currentUser, getSystemContext } = useAIAssistantContext();
  const userName = currentUser?.name.split(' ')[0] || 'Usuário';
  
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([
    { 
      role: 'model', 
      text: `Olá, ${userName}! Eu sou a DLABS AI. Estou conectada ao seu banco de dados em tempo real. Posso analisar sua saúde financeira, detalhar romaneios ou tirar dúvidas do manual. O que vamos analisar hoje?` 
    }
  ]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (msgOverride?: string) => {
    const userMessage = msgOverride || input.trim();
    if (!userMessage || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);

    try {
      // Corrected: Initialize GoogleGenAI with API key from environment variable as per coding guidelines
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const contextData = getSystemContext();

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: userMessage,
        config: {
          systemInstruction: `Você é a DLABS AI, o cérebro digital do Suporte Grãos ERP. 
          
          SUA MISSÃO:
          1. Ser um consultor estratégico para o usuário ${userName}.
          2. Analisar os dados reais fornecidos no contexto para dar respostas exatas.
          3. Se os dados mostrarem problemas (muita quebra, muito débito), seja proativo e aponte isso.
          
          CONTEXTO ATUAL DO ERP:
          ${contextData}
          
          REGRAS DE PERSONA:
          - Use um tom executivo, confiável, mas moderno.
          - Se o usuário perguntar sobre saldos, consulte os dados de 'socios_em_credito' ou 'contas_pendentes'.
          - Formate respostas longas com tópicos para facilitar a leitura.
          - Nunca invente dados que não estão no contexto JSON.`
        }
      });

      const text = response.text || 'DLABS AI: Tive um problema ao processar essa análise. Tente novamente.';
      setMessages(prev => [...prev, { role: 'model', text }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', text: 'DLABS AI: Estou offline temporariamente. Verifique sua chave de API nas configurações.' }]);
    } finally {
      setLoading(false);
    }
  };

  const QuickAction = ({ icon: Icon, label, onClick }: any) => (
    <button 
        onClick={onClick}
        className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-white/5 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-tighter hover:bg-slate-700 hover:text-emerald-400 transition-all active:scale-95"
    >
        <Icon size={12} /> {label}
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-white/5">
      {/* Header Premium */}
      <div className="px-6 py-6 border-b border-white/5 flex items-center justify-between shrink-0 bg-slate-950/50 backdrop-blur-md">
        <div className="flex items-center gap-4 text-white">
          <div className="relative">
            <div className="p-2.5 bg-emerald-500/20 rounded-2xl border border-emerald-500/30">
                <BrainCircuit size={24} className="text-emerald-400" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            </div>
          </div>
          <div>
            <h3 className="font-black uppercase text-xs tracking-widest text-white leading-none">DLABS AI</h3>
            <p className="text-[9px] text-emerald-500/70 font-black mt-1.5 uppercase tracking-tighter flex items-center gap-1">
                <Sparkles size={10} /> Consultor Estratégico
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-800/50 px-2 py-1 rounded-lg border border-white/5">
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">v2.0</span>
        </div>
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
            <div className={`flex gap-3 max-w-[92%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`shrink-0 w-9 h-9 rounded-2xl flex items-center justify-center shadow-lg border ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white border-blue-400/30' 
                  : 'bg-slate-800 text-emerald-400 border-emerald-500/20'
              }`}>
                {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
              </div>
              <div className={`p-4 rounded-3xl text-xs font-medium leading-relaxed shadow-2xl transition-all ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-slate-800/80 backdrop-blur-sm text-slate-200 rounded-tl-none border border-white/10'
              }`}>
                {msg.text}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start animate-pulse">
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-2xl bg-slate-800 border border-white/5 flex items-center justify-center text-emerald-400">
                <Loader2 size={18} className="animate-spin" />
              </div>
              <div className="bg-slate-800/40 p-4 rounded-3xl rounded-tl-none border border-white/5">
                <div className="flex gap-1.5">
                  <div className="w-1.5 h-1.5 bg-emerald-500/50 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-emerald-500/50 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 bg-emerald-500/50 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input & Quick Actions */}
      <div className="p-4 bg-slate-950/80 backdrop-blur-xl border-t border-white/10 shadow-[0_-15px_40px_rgba(0,0,0,0.4)]">
        
        {/* Sugestões Rápidas */}
        {!loading && (
            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                <QuickAction icon={BarChart3} label="Análise de Saúde" onClick={() => handleSend("Faça uma análise rápida da nossa saúde financeira atual com base nos dados do ERP.")} />
                <QuickAction icon={Wallet} label="Saldos de Sócios" onClick={() => handleSend("Quem são os sócios com maiores saldos a receber hoje?")} />
                <QuickAction icon={AlertTriangle} label="Riscos Logísticos" onClick={() => handleSend("Temos problemas de quebra excessiva nas últimas cargas?")}/>
                <QuickAction icon={HelpCircle} label="Como Lançar" onClick={() => handleSend("Como faço para registrar um adiantamento de frete?")} />
            </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="relative">
          <input 
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={loading}
            placeholder={`O que vamos analisar, ${userName}?`}
            className="w-full bg-slate-800/50 border-2 border-slate-700/50 text-white rounded-2xl py-4 pl-5 pr-14 text-sm focus:ring-0 focus:border-emerald-500 focus:bg-slate-800 transition-all placeholder:text-slate-500 font-bold"
          />
          <button 
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 disabled:opacity-20 disabled:grayscale transition-all shadow-lg active:scale-90"
          >
            <Send size={18} />
          </button>
        </form>
        <div className="mt-4 flex justify-between items-center px-2">
            <div className="flex items-center gap-1.5">
                <Database size={10} className="text-slate-600" />
                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Live Database Sync</span>
            </div>
            <div className="flex items-center gap-1.5">
                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest italic">Powered by DLABS Cloud</span>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/30"></div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
