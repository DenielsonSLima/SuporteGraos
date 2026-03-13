
import React from 'react';
import { Gauge } from 'lucide-react';
import { SectionTitle, SubModule, InfoBox } from '../HelpSharedComponents';

export const HelpDashboard: React.FC = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4">
        <SectionTitle title="Dashboard (Painel Principal)" icon={Gauge} />
        <p className="text-slate-600 mb-6 leading-relaxed font-medium">
            O Dashboard é a tela inicial do sistema. Ele consolida os principais KPIs (Indicadores-Chave)
            da operação em tempo real. Não é necessário preencher nada — tudo é calculado automaticamente.
        </p>

        <SubModule name="Ticker de Mercado" desc="Barra no topo mostrando cotações atualizadas de commodities agrícolas (Milho, Soja, etc.), obtidas de APIs de mercado em tempo real." />

        <SubModule name="Resumo Financeiro (5 Cards)" desc="Cards que mostram: Saldo Total em Banco, Total de Receitas do Período, Total de Despesas do Período, Saldo Líquido e Patrimônio Líquido. Os valores são atualizados automaticamente a cada operação." />

        <SubModule name="Gráfico de Patrimônio Líquido" desc="Evolução do patrimônio ao longo do tempo. Mostra visualmente se a empresa está crescendo ou retraindo." />

        <SubModule name="KPIs Operacionais (7 Cards)" desc="Indicadores como: Pedidos de Compra Ativos, Pedidos de Venda Ativos, Total de Cargas no Mês, Quebra Média (%), Volume Comercializado, Fretes Pendentes e Comissões em Aberto." />

        <SubModule name="Listas de Pendências Financeiras" desc="Dois painéis lado a lado: Contas a Pagar Vencidas (vermelho) e Contas a Receber em Atraso (amarelo). Clique em qualquer item para ir direto ao módulo correspondente." />

        <SubModule name="Ranking de Sócios" desc="Painel que mostra o saldo acumulado de cada sócio (créditos - retiradas), ordenado do maior para o menor." />

        <SubModule name="Feed de Atividades" desc="Histórico das últimas ações no sistema (pagamentos, recebimentos, criação de pedidos, etc.) com data, hora e nome do usuário." />

        <InfoBox text="O Dashboard atualiza automaticamente a cada 30 segundos (staleTime: VOLATILE). Não é necessário recarregar a página." />
    </div>
);
