
import React from 'react';
import { Settings } from 'lucide-react';
import { SectionTitle, StepBox, SubModule, WarningBox } from '../HelpSharedComponents';

export const HelpSettings: React.FC = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4">
        <SectionTitle title="Configurações" icon={Settings} />
        <p className="text-slate-600 mb-6 leading-relaxed font-medium">
            Painel administrativo para configurar todos os parâmetros do sistema.
        </p>

        <StepBox
            title="Checklist de Implantação"
            steps={[
                "EMPRESA: CNPJ, Razão Social e logomarca.",
                "USUÁRIOS: Crie os acessos e níveis de permissão.",
                "CONTAS BANCÁRIAS: Bancos e saldos iniciais.",
                "PLANOS DE CONTAS: Tipos de produtos e despesas."
            ]}
        />

        <SubModule name="Empresa" desc="Dados cadastrais que aparecem nos cabeçalhos dos PDFs." />
        <SubModule name="Usuários" desc="Gestão de acessos e permissões." />
        <SubModule name="Logs e Eventos" desc="Auditoria completa de cada ação no sistema." />

        <WarningBox text="Não altere saldos iniciais após começar a operar o sistema para não desconciliar o financeiro." />
    </div>
);
