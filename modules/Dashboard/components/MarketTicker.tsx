
import React, { useEffect, useState, useRef, useCallback, useLayoutEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, RefreshCw, Globe } from 'lucide-react';
import { marketService, MarketItem } from '../../../services/marketService';

const MarketTicker: React.FC = () => {
  const [marketData, setMarketData] = useState<MarketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<string>('');

  // Refs para controle de animação
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const positionRef = useRef(0);
  const isPausedRef = useRef(false);
  const speed = 1; // Aumentei para 1px para garantir visibilidade

  // Carregar dados
  const loadData = useCallback(async () => {
    try {
      const data = await marketService.getMarketData();
      // Garantir que temos dados suficientes para o loop (mínimo 4 itens visualmente)
      // Duplicar mais vezes se for pouco dado
      let finalData = data;
      if (data.length > 0 && data.length < 10) {
        finalData = [...data, ...data, ...data]; // Garante preenchimento
      }
      setMarketData(finalData);
      setLastSync(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    } catch (error) {
      console.error('Erro ao carregar dados do mercado:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 120 * 1000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Lógica de Animação
  const animate = useCallback(() => {
    if (contentRef.current && !isPausedRef.current) {
      positionRef.current -= speed;

      // Largura total do conteúdo (que está duplicado na renderização)
      const fullWidth = contentRef.current.scrollWidth;
      // Se fullWidth for 0 (elemento oculto?), não faz nada
      if (fullWidth > 0) {
        // Metade da largura (um set de dados)
        const halfWidth = fullWidth / 2;

        // Reset suave
        if (Math.abs(positionRef.current) >= halfWidth) {
          positionRef.current = 0;
        }

        contentRef.current.style.transform = `translate3d(${positionRef.current}px, 0, 0)`;
      }
    }

    animationRef.current = requestAnimationFrame(animate);
  }, []);

  // Iniciar/Parar animação
  useEffect(() => {
    // Inicia loop
    console.log('🎬 Iniciando animação do ticker...');
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [animate]);

  // Handlers de interação
  const handleMouseEnter = () => {
    isPausedRef.current = true;
  };

  const handleMouseLeave = () => {
    isPausedRef.current = false;
  };

  if (loading && marketData.length === 0) {
    return (
      <div className="relative w-[calc(100%+3rem)] md:w-[calc(100%+4rem)] -ml-6 md:-ml-8 -mt-6 md:-mt-8 mb-8 bg-slate-900 text-white border-b border-slate-800 h-10 flex items-center justify-center z-10 transition-all duration-300">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
          <RefreshCw size={12} className="animate-spin" /> Conectando ao Pregão...
        </span>
      </div>
    );
  }

  // Renderizamos DUAS vezes os dados para permitir o loop perfeito
  // Quando o primeiro set sai da tela, resetamos a posição para 0 instantaneamente
  const displayData = [...marketData, ...marketData];

  return (
    <div
      className="relative w-[calc(100%+3rem)] md:w-[calc(100%+4rem)] -ml-6 md:-ml-8 -mt-6 md:-mt-8 mb-8 bg-slate-950 text-white overflow-hidden whitespace-nowrap border-b border-slate-800 h-10 flex items-center shadow-xl z-20 group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      ref={containerRef}
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

      {/* Ticker Content Container */}
      <div
        ref={contentRef}
        className="inline-block pl-40"
        style={{ transform: 'translate3d(0, 0, 0)' }}
      >
        {displayData.map((item, index) => (
          <div key={`${item.label}-${index}`} className="inline-flex items-center mx-6 py-1 px-3 rounded-lg hover:bg-white/5 transition-colors cursor-default">
            <span className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-tighter">{item.label}</span>
            <span className="text-sm font-mono font-black text-white mr-2">R$ {item.value}</span>
            <div className={`flex items-center text-[10px] font-black px-1.5 py-0.5 rounded ${item.variation > 0 ? 'bg-emerald-500/10 text-emerald-400' :
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
    </div>
  );
};

export default MarketTicker;
