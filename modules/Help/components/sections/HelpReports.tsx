
import React from 'react';
import { FileText } from 'lucide-react';
import { SectionTitle, StepBox, SubModule } from '../HelpSharedComponents';

export const HelpReports: React.FC = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4">
        <SectionTitle title="Relatórios & PDFs" icon={FileText} />
        <p className="text-slate-600 mb-6 leading-relaxed font-medium">
            Central de relatórios gerenciais com <strong>26 modelos</strong> organizados em 5 categorias.
        </p>

        <div className="space-y-6 mb-8">
            <div className="bg-blue-50 p-5 rounded-2xl border border-blue-200">
                <h4 className="font-black text-blue-800 text-xs uppercase mb-3">COMERCIAL</h4>
                <ul className="text-xs text-blue-700 space-y-1.5 font-medium">
                    <li>• Faturamento por Período</li>
                    <li>• Histórico de Compras/Vendas</li>
                </ul>
            </div>
            <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-200">
                <h4 className="font-black text-emerald-800 text-xs uppercase mb-3">LOGÍSTICA</h4>
                <ul className="text-xs text-emerald-700 space-y-1.5 font-medium">
                    <li>• Fretes e Transportes</li>
                    <li>• Fretes Pendentes</li>
                </ul>
            </div>
        </div>

        <StepBox
            title="Como Gerar Relatórios"
            steps={[
                "Escolha a categoria no módulo Relatórios.",
                "Defina os filtros (período, parceiro).",
                "Clique em 'Gerar Relatório'.",
                "Para exportar, clique em 'Exportar PDF'."
            ]}
        />
    </div>
);
