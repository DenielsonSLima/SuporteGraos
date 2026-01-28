
import React, { useRef, useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { BrainCircuit, X, Minimize2, Maximize2, Trash2, RefreshCw } from 'lucide-react';
import { authService } from '../../services/authService';
import { useToast } from '../../contexts/ToastContext';

// Import Services
import { aiContextCache } from './services/aiContextCache';
import { aiTools, executeToolAction } from './services/aiToolService';

// Import Components
import ChatInterface from './components/ChatInterface';
import FloatingButton from './components/FloatingButton';

const FloatingAssistant: React.FC = () => {
  const { addToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  
  // Messages state with History
  const [messages, setMessages] = useState<{ role: 'user' | 'model' | 'system'; text: string; image?: string }[]>([
    { role: 'model', text: '🤖 Olá! Eu sou o seu assistente virtual do ERP Suporte Grãos. Estou aqui para tirar suas dúvidas, realizar cadastros e consultas. Como posso ajudá-lo?' }
  ]);

  const currentUser = authService.getCurrentUser();
  const userName = currentUser?.name.split(' ')[0] || 'Usuário';

  const handleSendText = async () => {
    if (!input.trim() && !attachment) return;
    
    const userMsg = input.trim();
    const currentAttachment = attachment;
    
    // 1. Add User Message to UI immediately
    const newMessages = [...messages, { role: 'user' as const, text: userMsg, image: currentAttachment || undefined }];
    setMessages(newMessages);
    setInput('');
    setAttachment(null);
    setLoading(true);

    // Resposta imediata para cumprimentos simples (reduz latência percebida)
    const simpleGreetings = [/^oi+e?$/i, /^ol[áa]$/i, /^bom dia$/i, /^boa tarde$/i, /^boa noite$/i];
    const isSimpleGreeting = simpleGreetings.some(rx => rx.test(userMsg)) && !currentAttachment;
    if (isSimpleGreeting) {
      setMessages(prev => [...prev, { role: 'model', text: `Olá, ${userName}! Como posso ajudar?` }]);
      setLoading(false);
      return;
    }

    // Indicador de processamento lento (feedback ao usuário)
    const slowTimer = setTimeout(() => {
      setMessages(prev => [...prev, { role: 'system', text: '⏳ Ainda processando sua solicitação...' }]);
    }, 5000);

    // Cancel previous in-flight request, if any
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      if (!process.env.API_KEY) throw new Error("Chave de API não configurada.");

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // ✅ Usar cache de contexto
      const contextData = aiContextCache.getSystemContext(userName);
      
      // 2. Construct History for API (Context Window) — limitar histórico para reduzir latência
      const limitedMessages = newMessages.slice(Math.max(0, newMessages.length - 8));
      const historyContents = limitedMessages
        .filter(m => m.role !== 'system')
        .map(m => {
           const parts: any[] = [];
           if (m.image) {
               const base64Data = m.image.split(',')[1];
               const mimeType = m.image.split(';')[0].split(':')[1];
               parts.push({ inlineData: { mimeType, data: base64Data } });
           }
           if (m.text) parts.push({ text: m.text });
           return { role: m.role, parts };
        });

      // 3. Call Gemini com streaming + timeout único (Equilíbrio)
      const timeoutMs = 25000;
      const payload = {
        model: 'gemini-3-flash-preview',
        contents: historyContents,
        config: {
           systemInstruction: `Você é a Daitec AI, inteligência central do ERP Suporte Grãos.
           
 CONTEXTO RÁPIDO:
 ${contextData}
           
 COMO AGIR:
 1. **Perguntas sobre dados**: Use o JSON acima para responder (saldos, contas, etc)
 2. **Ações** ("Lance uma despesa", "Cadastre..."): Use TOOLS
 3. **Como fazer**: Ensine passo a passo do menu
 4. **Memória**: Lembre de mensagens anteriores
 
 ESTILO:
 - Concisa (máximo 2 frases)
 - Profissional mas amigável
 - Use **negrito** para destaques`,
            tools: [{ functionDeclarations: aiTools }]
         }
      } as const;

      const useStream = typeof (ai as any).models?.generateContentStream === 'function';
      let finalText = '';
      let toolOutputs: string[] = [];

      const runStream = async () => {
        // placeholder para resposta parcial
        let modelIndex: number | null = null;
        const result = await (ai as any).models.generateContentStream({ ...payload, signal: controller.signal });
        // result pode ser {stream} ou um AsyncIterable diretamente
        const streamIterable: AsyncIterable<any> = (result as any)?.stream && typeof (result as any).stream[Symbol.asyncIterator] === 'function'
          ? (result as any).stream
          : (typeof (result as any)?.[Symbol.asyncIterator] === 'function' ? (result as any) : []);

        for await (const chunk of streamIterable) {
          const chunkText = (chunk as any)?.text || (chunk as any)?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || '';
          if (chunkText) {
            finalText += chunkText;
            setMessages(prev => {
              const updated = [...prev];
              if (modelIndex === null) {
                modelIndex = updated.length;
                updated.push({ role: 'model', text: chunkText });
              } else {
                updated[modelIndex] = { ...updated[modelIndex], text: finalText };
              }
              return updated;
            });
          }

          // Captura functionCalls em streaming, se presentes
          if ((chunk as any)?.functionCalls) {
             for (const fc of (chunk as any).functionCalls) {
                 const result = executeToolAction(fc.name, fc.args, userName);
                 const toolMessage = result.success ? `✅ ${result.message}` : `❌ ${result.message}`;
                 toolOutputs.push(toolMessage);
                 aiContextCache.invalidate();
             }
          }
        }
      };

      const runOnce = async () => {
        const response = await ai.models.generateContent({ ...payload, signal: controller.signal });
        finalText = response.text || '';
        if (response.functionCalls) {
          for (const fc of response.functionCalls) {
              const result = executeToolAction(fc.name, fc.args, userName);
              const toolMessage = result.success ? `✅ ${result.message}` : `❌ ${result.message}`;
              toolOutputs.push(toolMessage);
              aiContextCache.invalidate();
          }
        }
      };

      await Promise.race([
        (async () => {
          if (useStream) {
            try {
              await runStream();
            } catch (streamErr) {
              console.warn('Streaming falhou, usando fallback', streamErr);
              await runOnce();
            }
          } else {
            await runOnce();
          }
        })(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Tempo excedido. Tente novamente.')), timeoutMs))
      ]);

        // 4. Update UI com tool outputs e texto final (se ainda não veio via stream)
        setMessages(prev => {
          const updated = [...prev];
          toolOutputs.forEach(output => {
            updated.push({ role: 'system', text: output });
          });
          const hasModel = updated.some(m => m.role === 'model' && m.text === finalText);
          if (finalText && !hasModel) {
            updated.push({ role: 'model', text: finalText });
          } else if (toolOutputs.length > 0 && !finalText) {
            updated.push({ role: 'model', text: '✅ Tudo certo!' });
          }
          return updated;
        });

     } catch (e: any) {
       console.error(e);
       setMessages(prev => [...prev, { role: 'system' as const, text: `❌ Erro: ${e.message || 'Verifique a conexão.'}` }]);
     } finally {
       clearTimeout(slowTimer);
       setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
          addToast('warning', 'Arquivo Grande', 'Máximo 2MB para envio.');
          return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setAttachment(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // ✅ Função para limpar histórico
  const handleClearHistory = () => {
    setMessages([
      { role: 'model', text: '🤖 Olá! Eu sou o seu assistente virtual do ERP Suporte Grãos. Estou aqui para tirar suas dúvidas, realizar cadastros e consultas. Como posso ajudá-lo?' }
    ]);
    aiContextCache.invalidate();
    addToast('info', 'Histórico Limpo', 'Conversa reiniciada.');
  };

  return (
    <>
      {/* BOTÃO FLUTUANTE */}
      {!isOpen && <FloatingButton onClick={() => setIsOpen(true)} />}
      
      {/* MODO CHAT - JANELA PRINCIPAL */}
      <div 
        className={`
          fixed bottom-6 right-6 z-[9999] bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl overflow-hidden flex flex-col 
          transition-all duration-300 ease-in-out origin-bottom-right
          ${isOpen ? 'opacity-100 scale-100 translate-x-0 pointer-events-auto' : 'opacity-0 scale-90 translate-x-20 pointer-events-none'}
        `}
        style={{
          width: isExpanded ? '600px' : '380px',
          height: isExpanded ? '80vh' : '600px',
          maxHeight: '90vh'
          }}
        >
          
          {/* HEADER */}
          <div className="bg-slate-950/90 backdrop-blur-md px-4 py-3 border-b border-slate-800 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                  <div className="relative">
                      <div className="p-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20"><BrainCircuit size={18} className="text-emerald-400" /></div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-slate-900 animate-pulse"></span>
                  </div>
                  <div>
                      <h3 className="text-sm font-bold text-white leading-none">Daitec AI</h3>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">v2.2 Chat</p>
                  </div>
              </div>
                  <div className="flex items-center gap-1">
                  <button onClick={handleClearHistory} className="p-1.5 text-slate-500 hover:text-rose-500 hover:bg-slate-800 rounded-lg transition-colors" title="Limpar"><RefreshCw size={14}/></button>
                  <button onClick={() => setIsExpanded(!isExpanded)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors hidden sm:block">
                      {isExpanded ? <Minimize2 size={14}/> : <Maximize2 size={14}/>}
                  </button>
                  <button onClick={() => setIsOpen(false)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"><X size={16}/></button>
              </div>
          </div>

          {/* CHAT INTERFACE */}
          <ChatInterface 
              messages={messages} 
              input={input} 
              setInput={setInput} 
              onSend={handleSendText} 
              loading={loading}
              onFileSelect={handleFileSelect}
              attachment={attachment}
              clearAttachment={() => setAttachment(null)}
          />
        </div>
      </>
    );
};

export default FloatingAssistant;
