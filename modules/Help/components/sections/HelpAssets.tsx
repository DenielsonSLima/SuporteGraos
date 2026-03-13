
import React from 'react';
import { Tractor } from 'lucide-react';
import { SectionTitle, FieldTable, StatusFlow, SubModule, ExampleBox } from '../HelpSharedComponents';

export const HelpAssets: React.FC = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4">
        <SectionTitle title="Patrimônio (Bens)" icon={Tractor} />
        <p className="text-slate-600 mb-6 leading-relaxed font-medium">
            Cadastre e controle os ativos imobilizados da empresa: veículos, máquinas agrícolas, imóveis e equipamentos.
        </p>

        <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-4">Campos do Formulário</h3>
        <FieldTable fields={[
            { campo: 'Nome / Modelo', tipo: 'Texto', obs: 'Ex: Caminhão Mercedes Axor 2544' },
            { campo: 'Tipo', tipo: 'Seleção', obs: 'Veículo, Máquina, Imóvel, Equipamento ou Outro' },
            { campo: 'Valor de Aquisição', tipo: 'Moeda', obs: 'Preço de compra' },
            { campo: 'Identificador', tipo: 'Texto', obs: 'Placa, chassi, matrícula ou nº série' },
        ]} />

        <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-4">Ciclo de Status</h3>
        <StatusFlow statuses={['Ativo', 'Vendido', 'Baixa (Write-Off)']} />

        <SubModule name="Venda de Ativos" desc="Ao vender um bem, informe o comprador e o valor. O sistema gera automaticamente os títulos no Contas a Receber." />
        <SubModule name="Baixa por Sinistro (Write-Off)" desc="Para bens roubados ou destruídos, use a opção 'Baixar' para retirar do inventário sem gerar receita." />

        <ExampleBox title="Exemplo: Vendendo um Trator">
            <p>1. Acesse the detalhe do ativo "Trator JD 7200"</p>
            <p>2. Clique em <strong>"Vender"</strong></p>
            <p>3. Valor de venda: R$ 280.000,00</p>
            <p>4. Parcelas: 4x de R$ 70.000,00</p>
        </ExampleBox>
    </div>
);
