
import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { HelpSection } from '../HelpModule';

// Section Components
import { HelpIntro } from './sections/HelpIntro';
import { HelpDashboard } from './sections/HelpDashboard';
import { HelpPartners } from './sections/HelpPartners';
import { HelpPurchases, HelpSales } from './sections/HelpCommercial';
import { HelpLogistics } from './sections/HelpLogistics';
import { HelpAssets } from './sections/HelpAssets';
import { HelpFinancial, HelpCashier } from './sections/HelpFinancial';
import { HelpPerformance } from './sections/HelpPerformance';
import { HelpReports } from './sections/HelpReports';
import { HelpSettings } from './sections/HelpSettings';
import { HelpIntegration } from './sections/HelpIntegration';

interface HelpContentProps {
  section: HelpSection;
}

const HelpContent: React.FC<HelpContentProps> = ({ section }) => {
  const contentMap: Record<HelpSection, React.ReactNode> = {
    intro: <HelpIntro />,
    dashboard: <HelpDashboard />,
    partners: <HelpPartners />,
    purchases: <HelpPurchases />,
    sales: <HelpSales />,
    logistics: <HelpLogistics />,
    assets: <HelpAssets />,
    cashier: <HelpCashier />,
    financial: <HelpFinancial />,
    performance: <HelpPerformance />,
    reports: <HelpReports />,
    settings: <HelpSettings />,
    integration: <HelpIntegration />,
  };

  const activeContent = contentMap[section] || contentMap.intro;

  return (
    <div className="prose prose-slate max-w-none">
      <div className="animate-in fade-in duration-500">
        {activeContent}
      </div>

      <div className="mt-16 p-10 bg-slate-950 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center md:items-start gap-8 shadow-2xl relative overflow-hidden border border-white/5 group">
        <div className="absolute -right-8 -bottom-8 opacity-5 text-emerald-400 rotate-12 group-hover:rotate-0 transition-transform duration-1000">
          <ShieldCheck size={200} />
        </div>

        <div className="p-5 bg-emerald-600 rounded-2xl shadow-xl shadow-emerald-900/20 relative z-10 animate-pulse">
          <ShieldCheck size={32} />
        </div>

        <div className="relative z-10 text-center md:text-left">
          <p className="text-[10px] font-black uppercase text-emerald-400 tracking-[0.3em] mb-3">Protocolo de Integridade & Suporte</p>
          <p className="text-base font-medium text-slate-400 leading-relaxed max-w-2xl">
            Este sistema utiliza padrões bancários de integridade. Cada operação financeira gera um log de auditoria imutável.
            Para suporte técnico imediato, clique no ícone <span className="text-emerald-400 font-bold">DLABS AI</span> no painel lateral
            ou acesse nossa base de conhecimento avançada.
          </p>
          <div className="flex gap-4 mt-6 justify-center md:justify-start">
            <div className="h-1 w-12 bg-emerald-600 rounded-full" />
            <div className="h-1 w-6 bg-slate-800 rounded-full" />
            <div className="h-1 w-3 bg-slate-800 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpContent;
