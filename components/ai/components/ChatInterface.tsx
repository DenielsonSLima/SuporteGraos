
import React, { useEffect, useMemo, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { Send, Paperclip, XCircle, Bot, User, CheckCircle2, AlertTriangle } from 'lucide-react';

interface Message {
  role: 'user' | 'model' | 'system';
  text: string;
  image?: string;
}

interface Props {
  messages: Message[];
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  loading: boolean;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  attachment: string | null;
  clearAttachment: () => void;
}

const ChatInterface: React.FC<Props> = ({ 
  messages, input, setInput, onSend, loading, 
  onFileSelect, attachment, clearAttachment
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onSend();
    }
  };

  return (
    <>
      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-5 bg-slate-900 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {messages.map((msg, i) => {
            const isUser = msg.role === 'user';
            const isSystem = msg.role === 'system';
            const isError = msg.text.startsWith('❌');
            
            if (isSystem) {
                return (
                    <div key={i} className="flex justify-center my-2 animate-in fade-in slide-in-from-bottom-1">
                        <div className={`
                             px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide flex items-center gap-2 shadow-sm border
                             ${isError ? 'bg-red-900/30 border-red-500/30 text-red-400' : 'bg-slate-800/50 border-emerald-500/20 text-emerald-400'}
                        `}>
                            {isError ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />} 
                            {msg.text.replace('✅ ', '').replace('❌ ', '')}
                        </div>
                    </div>
                );
            }

            return (
                <div key={i} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} animate-in fade-in slide-in-from-bottom-2`}>
                    <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center shadow-lg border ${
                        isUser 
                        ? 'bg-blue-600 border-blue-500 text-white' 
                        : 'bg-slate-800 border-slate-700 text-emerald-400'
                    }`}>
                        {isUser ? <User size={16} /> : <Bot size={16} />}
                    </div>

                    <div className={`flex flex-col max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                        {msg.image && (
                            <div className="mb-2 rounded-xl overflow-hidden border border-white/10 shadow-md max-w-[200px]">
                                <img src={msg.image} alt="Upload" className="w-full h-auto object-cover" />
                            </div>
                        )}
                        <div className={`px-4 py-3 rounded-2xl text-xs leading-relaxed shadow-sm whitespace-pre-line ${
                            isUser 
                            ? 'bg-blue-600 text-white rounded-tr-none' 
                            : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
                        }`}>
                                                        <div
                                                            dangerouslySetInnerHTML={{
                                                                __html: DOMPurify.sanitize(
                                                                    msg.text
                                                                        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>')
                                                                        .replace(/`([^`]+)`/g, '<code class="bg-black/30 px-1 rounded text-emerald-300 font-mono text-[10px]">$1</code>')
                                                                )
                                                            }}
                                                        />
                        </div>
                    </div>
                </div>
            );
        })}

        {loading && (
            <div className="flex gap-3 animate-pulse">
                 <div className="shrink-0 w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400">
                    <Bot size={16} />
                 </div>
                 <div className="bg-slate-800 border border-slate-700 px-4 py-3 rounded-2xl rounded-tl-none flex gap-1 items-center">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                 </div>
            </div>
        )}
      </div>

      {/* Attachment Preview */}
      {attachment && (
        <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 flex items-center gap-3 animate-in slide-in-from-bottom-2">
            <div className="relative group">
                <img src={attachment} className="h-12 w-12 object-cover rounded-lg border border-slate-600" />
                <button onClick={clearAttachment} className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-0.5 shadow-md hover:bg-rose-600 transition-colors"><XCircle size={12}/></button>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Imagem anexada</span>
        </div>
      )}

      {/* Input Area */}
      <div className="p-3 bg-slate-950 border-t border-slate-800">
        <div className="relative flex items-end gap-2 bg-slate-900 border border-slate-700 rounded-xl p-1.5 focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/20 transition-all shadow-inner">
            <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={onFileSelect} />
            
            <button 
                type="button" 
                onClick={() => fileRef.current?.click()} 
                className={`p-2.5 rounded-lg transition-all mb-0.5 ${attachment ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                title="Anexar imagem"
            >
                <Paperclip size={18} />
            </button>

            <textarea 
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                placeholder="Digite sua mensagem..."
                rows={1}
                className="w-full bg-transparent text-white px-2 py-3 text-sm border-none focus:ring-0 placeholder:text-slate-600 resize-none max-h-32 min-h-[44px] scrollbar-hide"
                style={{ height: 'auto', minHeight: '44px' }}
                onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
                }}
            />

            <button 
                onClick={onSend}
                disabled={(!input.trim() && !attachment) || loading} 
                className={`p-2.5 rounded-lg mb-0.5 transition-all ${
                    input.trim() || attachment 
                    ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg active:scale-95' 
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
            >
                <Send size={18} className={input.trim() ? "ml-0.5" : ""} />
            </button>
        </div>
        <div className="text-[9px] text-slate-600 text-center mt-2 font-medium">
            DLABS AI pode cometer erros. Verifique informações críticas.
        </div>
      </div>
    </>
  );
};

export default ChatInterface;
