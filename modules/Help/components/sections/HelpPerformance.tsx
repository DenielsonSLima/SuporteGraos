
import React from 'react';
import { BarChart2 } from 'lucide-react';
import { SectionTitle, StepBox, SubModule, ExampleBox, InfoBox } from '../HelpSharedComponents';

export const HelpPerformance: React.FC = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4">
        <SectionTitle title="Performance & DRE" icon={BarChart2} />
        <p className="text-slate-600 mb-6 leading-relaxed font-medium">
            Cockpit analítico completo para monitorar a saúde operacional e financeira do negócio.
        </p>

        <StepBox
            title="Análise de Margem"
            steps={[
                "SPREAD OPERACIONAL: Lucro bruto por operação (Venda - Compra - Frete).",
                "CUSTO DE QUEBRA: Valor perdido por diferença de balança. Quebra > 0,25% é crítico.",
                "MARGEM LÍQUIDA: Resultado final após descontar despesas de estrutura."
            ]}
        />

        <SubModule name="DRE — Demonstrativo de Resultado" desc="Receita Bruta (-) Custo do Grão (=) Lucro Bruto (-) Fretes (-) Despesas (=) Lucro Líquido." />

        <ExampleBox title="Exemplo de Leitura do DRE">
            <p>Receita Bruta: R$ 450.000,00</p>
            <p>(-) Custo do Grão (CMV): R$ 340.000,00</p>
            <p>(=) Lucro Bruto: R$ 110.000,00</p>
            <p>(-) Fretes: R$ 36.000,00</p>
            <p>(-) Despesas Admin: R$ 22.000,00</p>
            <p><strong>(=) Lucro Líquido: R$ 47.500,00</strong></p>
        </ExampleBox>

        <InfoBox text="Exporte todo o painel de Performance como PDF clicando no botão 'Exportar PDF'." />
    </div>
);
