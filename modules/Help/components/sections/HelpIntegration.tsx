import React from 'react';
import { BrainCircuit, Play, Edit, Trash2, Link, ShieldCheck } from 'lucide-react';
import { SectionTitle, GoldenRule } from '../HelpSharedComponents';

export const HelpIntegration: React.FC = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8">
        <SectionTitle title="Mapa de Integração & Ciclo de Vida" icon={BrainCircuit} />
        
        <p className="text-slate-600 leading-relaxed font-medium">
            O **Suporte Grãos ERP** é um sistema de fluxo contínuo. Nenhuma informação existe de forma isolada. 
            Compreender como os módulos se interligam e os impactos de cada ação (lançar, editar e apagar) é fundamental para a saúde operacional da empresa.
        </p>

        {/* 1. FLUXO DE INTEGRAÇÃO */}
        <div className="bg-slate-905 border border-slate-200 rounded-3xl p-6 bg-slate-50">
            <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-4 flex items-center gap-2">
                <Link size={16} className="text-indigo-500" />
                1. Mapa de Interligação dos Módulos
            </h3>
            
            <div className="space-y-4 font-sans text-xs text-slate-600">
                <div className="flex gap-4 items-start">
                    <div className="px-2.5 py-1 bg-indigo-100 text-indigo-800 font-black rounded-lg uppercase text-[9px] shrink-0">Passo 1</div>
                    <div>
                        <strong>Parceiros & Contratos:</strong> Você cadastra o produtor/cliente e lança o **Pedido de Compra (PC)** ou **Pedido de Venda (PV)**. Eles definem os limites de volume (saca/ton) e os preços negociados.
                    </div>
                </div>
                <div className="flex gap-4 items-start">
                    <div className="px-2.5 py-1 bg-indigo-100 text-indigo-800 font-black rounded-lg uppercase text-[9px] shrink-0">Passo 2</div>
                    <div>
                        <strong>Logística (A Execução Física):</strong> Você lança a **Carga (Carregamento)**. Ela obrigatoriamente vincula-se a um Pedido de Compra (origem) e a um Pedido de Venda (destino). É aqui que a mágica acontece: o volume físico é deduzido do saldo dos contratos em tempo real.
                    </div>
                </div>
                <div className="flex gap-4 items-start">
                    <div className="px-2.5 py-1 bg-indigo-100 text-indigo-800 font-black rounded-lg uppercase text-[9px] shrink-0">Passo 3</div>
                    <div>
                        <strong>Financeiro Automático (Contas a Pagar/Receber):</strong> O banco de dados reage ao salvamento da Carga e gera automaticamente **duas contas a pagar** (valor do grão para o produtor + valor do frete para a transportadora) e **uma conta a receber** (valor da venda para a indústria) na tabela `financial_entries`.
                    </div>
                </div>
                <div className="flex gap-4 items-start">
                    <div className="px-2.5 py-1 bg-indigo-100 text-indigo-800 font-black rounded-lg uppercase text-[9px] shrink-0">Passo 4</div>
                    <div>
                        <strong>Caixa & Liquidação:</strong> Na tela de Caixa, o operador realiza o pagamento ou recebimento dessas contas. A ação gera uma linha em `financial_transactions` que abate o saldo pendente da conta bancária real.
                    </div>
                </div>
            </div>
        </div>

        {/* 2. COMO LANÇAR */}
        <div className="space-y-4">
            <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest flex items-center gap-2">
                <Play size={16} className="text-emerald-500" />
                2. Como Lançar Operações Corretamente
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-slate-200 p-5 rounded-2xl">
                    <h4 className="font-black text-slate-800 text-[10px] uppercase mb-2">Pedidos de Compra/Venda</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                        Acesse **Ped. Compra** ou **Ped. Venda**, clique em **+ Novo Pedido**, preencha os dados contratuais (parceiro, volume, grão, preço unitário) e salve. Isso cria a reserva física de volume.
                    </p>
                </div>
                <div className="border border-slate-200 p-5 rounded-2xl">
                    <h4 className="font-black text-slate-800 text-[10px] uppercase mb-2">Logística (Cargas)</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                        Acesse **Logística**, selecione **+ Nova Carga**, e preencha as pesagens de origem (campo). Quando o caminhão descarregar na indústria, edite a carga e informe o peso de destino para calcular quebras e liberar a cobrança da venda.
                    </p>
                </div>
                <div className="border border-slate-200 p-5 rounded-2xl">
                    <h4 className="font-black text-slate-800 text-[10px] uppercase mb-2">Despesas Administrativas</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                        Acesse **Caixa** → **Despesas**, clique em **+ Nova Despesa**, informe a categoria de plano de contas (fixa, variável ou ADM) e a data de vencimento. Isso agenda a conta no financeiro.
                    </p>
                </div>
                <div className="border border-slate-200 p-5 rounded-2xl">
                    <h4 className="font-black text-slate-800 text-[10px] uppercase mb-2">Adiantamentos & Empréstimos</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                        Acesse **Caixa** → **Movimentações** (ou botões rápidos) para lançar Empréstimos Tomados/Concedidos e Adiantamentos a Produtores. O caixa registra a saída e cria o ativo/passivo correspondente automaticamente.
                    </p>
                </div>
            </div>
        </div>

        {/* 3. COMO EDITAR E APAGAR */}
        <div className="space-y-4">
            <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest flex items-center gap-2">
                <Edit size={16} className="text-amber-500" />
                3. Diretrizes para Edição e Exclusão (Segurança de Dados)
            </h3>
            
            <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl text-xs text-amber-900 leading-relaxed">
                    <div className="flex gap-3 items-center font-black uppercase text-[10px] mb-2">
                        <Edit size={16} /> Como Editar:
                    </div>
                    Para corrigir pesagens, motoristas ou datas de carregamentos já criados, acesse a **Logística**, clique na carga e vá em **Edição Estrutural**. Você pode alterar pesos, datas e vincular/desvincular o Frete FOB. O sistema recalcula automaticamente a quebra e atualiza os valores pendentes das contas a pagar e receber vinculadas.
                </div>

                <div className="bg-rose-50 border border-rose-200 p-5 rounded-2xl text-xs text-rose-900 leading-relaxed">
                    <div className="flex gap-3 items-center font-black uppercase text-[10px] mb-2">
                        <Trash2 size={16} /> Como Apagar (Estornos de Segurança):
                    </div>
                    O sistema protege o caixa histórico. Se você excluir uma Carga na Logística ou um Lançamento de Despesa/Receita, o banco de dados executa um **estorno em cascata**: as contas a pagar e receber geradas por aquela carga são removidas, e qualquer transação de caixa vinculada a elas é excluída de forma limpa, estornando o dinheiro para a conta bancária de origem.
                </div>
            </div>
        </div>

        <GoldenRule text="Toda ação operacional gera rastros imutáveis. Edições e exclusões atualizam instantaneamente o DRE de Performance e o Caixa de todos os usuários conectados." />
    </div>
);
