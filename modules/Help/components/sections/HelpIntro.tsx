
import React from 'react';
import { LayoutDashboard } from 'lucide-react';
import { SectionTitle, GoldenRule, StepBox } from '../HelpSharedComponents';

export const HelpIntro: React.FC = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4">
        <SectionTitle title="Visão Geral do Sistema" icon={LayoutDashboard} />
        <p className="text-slate-600 mb-6 leading-relaxed font-medium text-lg">
            O <strong>Suporte Grãos ERP</strong> é uma plataforma completa para cerealistas e tradings de grãos.
            Ele gerencia desde o contrato de compra com o produtor até o recebimento pelo cliente,
            passando por logística, fretes, financeiro, patrimônio e relatórios gerenciais.
        </p>

        <GoldenRule text="O sistema é baseado em competência física: uma dívida só existe após o caminhão ser carregado na fazenda. Só financial_transactions move dinheiro real." />

        <StepBox
            title="Os 4 Pilares da Operação"
            steps={[
                "CADASTRO — Organize parceiros por categorias (Produtor Rural, Transportadora, Cliente/Indústria, Corretor) para habilitar os módulos corretos.",
                "CONTRATOS (Pedidos) — Defina preço, volume e condições nos Pedidos de Compra e Venda. Eles representam 'promessas' que serão executadas fisicamente.",
                "EXECUÇÃO (Cargas/Logística) — A alma do negócio. Cada carga conecta um pedido de compra (origem) a um pedido de venda (destino), com pesagem, frete e motorista.",
                "LIQUIDAÇÃO (Financeiro) — Onde os débitos e créditos são efetivamente baixados contra contas bancárias reais. Aqui o caixa se concilia."
            ]}
        />

        <div className="mb-8">
            <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-4">Arquitetura de Dados</h3>
            <p className="text-sm text-slate-600 mb-4 font-medium">Todo o sistema financeiro gira em torno de 3 tabelas centrais:</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100">
                    <h4 className="font-black text-blue-800 text-xs uppercase mb-2">accounts</h4>
                    <p className="text-xs text-blue-700 font-medium">Onde o dinheiro está. São seus bancos, caixas e cofres com saldo real.</p>
                </div>
                <div className="bg-purple-50 p-5 rounded-2xl border border-purple-100">
                    <h4 className="font-black text-purple-800 text-xs uppercase mb-2">financial_entries</h4>
                    <p className="text-xs text-purple-700 font-medium">Obrigações. Contas a pagar (payable) e a receber (receivable). Não movem dinheiro.</p>
                </div>
                <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100">
                    <h4 className="font-black text-emerald-800 text-xs uppercase mb-2">financial_transactions</h4>
                    <p className="text-xs text-emerald-700 font-medium">A VERDADE do dinheiro. Cada linha = dinheiro que entrou ou saiu de uma conta.</p>
                </div>
            </div>
        </div>

        <StepBox
            title="Checklist de Primeiro Uso (Implantação)"
            steps={[
                "Acesse Configurações > Empresa e preencha CNPJ, Razão Social e endereço.",
                "Em Configurações > Contas Bancárias, cadastre todos os seus bancos com o saldo de abertura do dia.",
                "Em Configurações > Sócios, cadastre os sócios da empresa.",
                "Em Configurações > Tipos de Produtos, adicione seus grãos (Milho, Soja, Sorgo, etc.).",
                "Em Configurações > Tipos de Despesas, personalize seu plano de contas.",
                "Em Configurações > Marca D'água, carregue a logomarca para aparecer em PDFs.",
                "Cadastre seus Parceiros (produtores, clientes, transportadoras).",
                "Agora você pode abrir Pedidos de Compra, Venda e operar a Logística!"
            ]}
        />
    </div>
);
