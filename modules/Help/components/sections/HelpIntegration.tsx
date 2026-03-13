
import React from 'react';
import { BrainCircuit, ShieldCheck } from 'lucide-react';
import { SectionTitle, GoldenRule } from '../HelpSharedComponents';

export const HelpIntegration: React.FC = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4">
        <SectionTitle title="Mapa de Integração" icon={BrainCircuit} />
        <p className="text-slate-600 mb-6 leading-relaxed font-medium">
            Entenda como todos os módulos se conectam. O sistema é uma cadeia integrada onde cada
            ação gera reflexos automáticos.
        </p>

        <div className="bg-slate-900 text-white p-8 rounded-3xl mb-8 font-mono text-xs leading-loose">
            <p className="text-primary-400 font-black mb-4 text-sm">FLUXO PRINCIPAL</p>
            <p className="text-slate-300">Pedido de Compra {'->'} Conta a Pagar</p>
            <p className="text-slate-500 ml-4">| vincula carga</p>
            <p className="text-slate-300">Logística {'->'} 2 Contas a Pagar (grão + frete)</p>
            <p className="text-slate-500 ml-4">| peso destino confirmado</p>
            <p className="text-slate-300">Pedido de Venda {'->'} Conta a Receber</p>
        </div>

        <GoldenRule text="O frontend nunca faz lógica financeira. Toda a inteligência está em funções SQL transacionais (RPC) no banco de dados." />
    </div>
);
