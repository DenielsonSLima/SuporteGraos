
import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, RefreshCw, Globe } from 'lucide-react';
import { marketService, MarketItem } from '../../../services/marketService';

const MarketTicker: React.FC = () => {
  const [marketData, setMarketData] = useState<MarketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<string>('');
  const [isPaused, setIsPaused] = useState(false);

  const loadData = async () => {
    const data = await marketService.getMarketData();
    setMarketData(data);
    setLastSync(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // Atualiza a cada 2 minutos para parecer mais "ao vivo"
    const interval = setInterval(loadData, 120 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading && marketData.length === 0) {
    return (
      <div className="relative w-[calc(100%+3rem)] md:w-[calc(100%+4rem)] -ml-6 md:-ml-8 -mt-6 md:-mt-8 mb-8 bg-slate-900 text-white border-b border-slate-800 h-10 flex items-center justify-center z-10">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
          <RefreshCw size={12} className="animate-spin" /> Conectando ao Pregão...
        </span>
      </div>
    );
  }

  return (
    <div 
      className="relative w-[calc(100%+3rem)] md:w-[calc(100%+4rem)] -ml-6 md:-ml-8 -mt-6 md:-mt-8 mb-8 bg-slate-950 text-white overflow-hidden whitespace-nowrap border-b border-slate-800 h-10 flex items-center shadow-xl z-20"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Label Fixo */}
      <div className="absolute left-0 z-30 bg-slate-950 px-5 h-full flex items-center border-r border-slate-800 shadow-[10px_0_15px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col">
            <div className="flex items-center gap-2">
                <Globe size={14} className="text-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-white uppercase tracking-tighter italic">Mercado ao Vivo</span>
            </div>
            <span className="text-[7px] font-bold text-slate-500 uppercase leading-none">Sinc: {lastSync}</span>
        </div>
      </div>
      
      {/* Ticker Animation Container */}
      <div 
        className="ticker-content inline-block pl-40"
        style={{
          animation: 'ticker 45s linear infinite',
          animationPlayState: isPaused ? 'paused' : 'running'
        }}
      >
        {/* Renderizamos 3 vezes para garantir um loop infinito sem buracos visuais */}
        {[...marketData, ...marketData, ...marketData].map((item, index) => (
          <div key={index} className="inline-flex items-center mx-8 py-1 px-3 rounded-lg hover:bg-white/5 transition-colors cursor-default">
            <span className="text-[10px] font-black text-slate-500 mr-3 uppercase tracking-tighter">{item.label}</span>
            <span className="text-sm font-mono font-black text-white mr-3">R$ {item.value}</span>
            <div className={`flex items-center text-[10px] font-black px-1.5 py-0.5 rounded ${
              item.variation > 0 ? 'bg-emerald-500/10 text-emerald-400' : 
              item.variation < 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-500/10 text-slate-400'
            }`}>
              {item.variation > 0 ? <TrendingUp size={10} className="mr-1" /> : 
               item.variation < 0 ? <TrendingDown size={10} className="mr-1" /> : 
               <Minus size={10} className="mr-1" />}
              {Math.abs(item.variation).toFixed(2)}%
            </div>
          </div>
        ))}
      </div>
      
      <style>{`
        @keyframes ticker {
          0% { 
            transform: translateX(0); 
          }
          100% { 
            transform: translateX(-33.33%); 
          }
        }
      `}</style>
    </div>
  );
};

export default MarketTicker;
