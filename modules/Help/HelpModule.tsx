
import React, { useState } from 'react';
import { 
  HelpCircle, BookOpen, LayoutDashboard, Users, 
  ShoppingCart, TrendingUp, Truck, Tractor, Wallet, BadgeDollarSign, 
  BarChart2, FileText, Settings, ChevronRight
} from 'lucide-react';
import HelpContent from './components/HelpContent';

export type HelpSection = 'intro' | 'partners' | 'purchases' | 'sales' | 'logistics' | 'assets' | 'cashier' | 'financial' | 'performance' | 'reports' | 'settings';

const HelpModule: React.FC = () => {
  const [activeSection, setActiveSection] = useState<HelpSection>('intro');

  const menuItems = [
    { id: 'intro', label: 'Visão Geral / Início', icon: LayoutDashboard },
    { id: 'partners', label: 'Gestão de Parceiros', icon: Users },
    { id: 'purchases', label: 'Pedidos de Compra', icon: ShoppingCart },
    { id: 'sales', label: 'Pedidos de Venda', icon: TrendingUp },
    { id: 'logistics', label: 'Logística & Fretes', icon: Truck },
    { id: 'assets', label: 'Patrimônio (Bens)', icon: Tractor },
    { id: 'cashier', label: 'Fluxo de Caixa', icon: Wallet },
    { id: 'financial', label: 'Módulos Financeiros', icon: BadgeDollarSign },
    { id: 'performance', label: 'Performance & DRE', icon: BarChart2 },
    { id: 'reports', label: 'Relatórios & PDFs', icon: FileText },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in duration-500">
      
      <div className="mb-6 shrink-0">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3 italic uppercase">
          <HelpCircle className="text-primary-600" size={32} />
          Central de Inteligência & Suporte
        </h1>
        <p className="text-slate-500 text-sm font-medium">Documentação oficial e manuais operacionais do sistema.</p>
      </div>

      <div className="flex gap-6 flex-1 min-h-0 overflow-hidden">
        
        {/* Navegação de Tópicos */}
        <div className="w-72 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden shrink-0">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tópicos de Ajuda</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {menuItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id as HelpSection)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${
                  activeSection === item.id 
                    ? 'bg-slate-900 text-white shadow-lg' 
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <item.icon size={18} />
                <span className="truncate">{item.label}</span>
                {activeSection === item.id && <ChevronRight size={14} className="ml-auto opacity-50" />}
              </button>
            ))}
          </div>
        </div>

        {/* Conteúdo do Manual - Agora ocupa todo o espaço restante */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden relative">
          <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
               <BookOpen size={20} className="text-blue-500" />
               <h2 className="font-black text-slate-700 uppercase tracking-widest text-xs">Manual do Usuário v1.8</h2>
            </div>
            <span className="text-[10px] font-black text-primary-600 bg-primary-100 px-3 py-1 rounded-full uppercase">Documentação Oficial</span>
          </div>
          <div className="flex-1 overflow-y-auto p-10 scrollbar-thin scrollbar-thumb-slate-200 max-w-4xl mx-auto w-full">
            <HelpContent section={activeSection} />
          </div>
        </div>

      </div>
    </div>
  );
};

export default HelpModule;
