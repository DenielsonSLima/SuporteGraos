import React from 'react';
import { BadgeDollarSign, CircleDollarSign, Banknote, HandCoins, Landmark, Receipt, History, UserCheck, Play, Edit, Trash2, Link } from 'lucide-react';
import { SectionTitle, SubModule, FieldTable, StatusFlow, ExampleBox, WarningBox, GoldenRule, InfoBox } from '../HelpSharedComponents';

export const HelpFinancial: React.FC = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6">
        <SectionTitle title="Módulos Financeiros (Central)" icon={BadgeDollarSign} />
        
        <p className="text-slate-600 mb-8 leading-relaxed font-medium">
            O Financeiro centraliza a tesouraria e as obrigações do sistema. Ele é regido pelas tabelas `financial_entries` (títulos a pagar/receber) e `financial_transactions` (dinheiro real movimentado nas contas).
        </p>

        {/* 1. CONTAS A PAGAR */}
        <div className="p-6 bg-red-50/30 rounded-3xl border border-red-100 space-y-4">
            <div className="flex items-center gap-3">
                <CircleDollarSign className="text-red-500" size={20} />
                <h3 className="font-black text-slate-900 uppercase text-sm">1. Contas a Pagar (Obrigações)</h3>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Títulos que a empresa deve quitar para produtores, transportadoras, corretores ou despesas administrativas.
            </p>
            <ul className="text-xs text-slate-600 list-disc pl-5 space-y-1 font-medium">
                <li><strong>Como lançar:</strong> São geradas **automaticamente** a partir de cargas descarregadas (grão e frete), comissões de corretores e despesas.</li>
                <li><strong>Como pagar/baixar:</strong> Na tela de Contas a Pagar, selecione o título, clique em **Pagar** (ícone de $), escolha a conta bancária de origem, a data do pagamento, o valor (permite parciais) e confirme.</li>
                <li><strong>Como editar/apagar:</strong> Para alterar valores originais ou cancelar a obrigação, deve-se editar ou apagar o módulo de origem (Carga correspondente na Logística ou Despesa no Caixa). Títulos pagos não podem ser excluídos antes do estorno da baixa.</li>
            </ul>
        </div>

        {/* 2. CONTAS A RECEBER */}
        <div className="p-6 bg-emerald-50/30 rounded-3xl border border-emerald-100 space-y-4">
            <div className="flex items-center gap-3">
                <Banknote className="text-emerald-500" size={20} />
                <h3 className="font-black text-slate-900 uppercase text-sm">2. Contas a Receber (Créditos)</h3>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Valores que a empresa tem a receber das indústrias e compradores de grãos.
            </p>
            <ul className="text-xs text-slate-600 list-disc pl-5 space-y-1 font-medium">
                <li><strong>Como lançar:</strong> Geradas **automaticamente** a partir de cargas finalizadas na Logística com base no Peso de Destino e preço de venda.</li>
                <li><strong>Como receber/baixar:</strong> Localize o título pendente, clique em **Receber**, selecione a conta bancária de destino do dinheiro, preencha o valor e a data e confirme.</li>
                <li><strong>Como editar/apagar:</strong> Editadas ou estornadas através da alteração ou exclusão das pesagens/redirecionamentos da Carga correspondente no módulo de Logística.</li>
            </ul>
        </div>

        {/* 3. ADIANTAMENTOS */}
        <div className="p-6 bg-purple-50/30 rounded-3xl border border-purple-100 space-y-4">
            <div className="flex items-center gap-3">
                <HandCoins className="text-purple-500" size={20} />
                <h3 className="font-black text-slate-900 uppercase text-sm">3. Adiantamentos (Saldos Antecipados)</h3>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Controla dinheiro antecipado a fornecedores/produtores ou recebido de clientes antes da entrega física dos grãos.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 text-xs">
                    <strong className="text-orange-800 uppercase block mb-1">Concedidos (Given)</strong>
                    Você adianta dinheiro ao produtor rural. Ele fica com saldo devedor que será compensado na liquidação das cargas físicas.
                </div>
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200 text-xs">
                    <strong className="text-indigo-800 uppercase block mb-1">Recebidos (Taken)</strong>
                    O cliente te paga antecipadamente. Você fica com saldo devedor em grãos que será compensado conforme entregar as cargas.
                </div>
            </div>
            <ul className="text-xs text-slate-600 list-disc pl-5 space-y-1 font-medium">
                <li><strong>Como lançar:</strong> Acesse **Caixa** → **Adiantamentos**, selecione o parceiro, informe se é concedido ou recebido, preencha o valor e a conta bancária e salve.</li>
                <li><strong>Como compensar/liquidar:</strong> Ao pagar um pedido de compra ou receber uma venda, o sistema lista os adiantamentos disponíveis do parceiro para serem deduzidos do montante total.</li>
            </ul>
        </div>

        {/* 4. DESPESAS ADMINISTRATIVAS */}
        <div className="p-6 bg-rose-50/30 rounded-3xl border border-rose-100 space-y-4">
            <div className="flex items-center gap-3">
                <Receipt className="text-rose-500" size={20} />
                <h3 className="font-black text-slate-900 uppercase text-sm">4. Despesas Administrativas</h3>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Gastos corporativos da empresa que não estão ligados diretamente ao frete ou compra de grãos (ex: aluguel, salários, escritórios, impostos).
            </p>
            <ul className="text-xs text-slate-600 list-disc pl-5 space-y-1 font-medium">
                <li><strong>Como lançar:</strong> Acesse **Caixa** → **Despesas**, clique em **+ Nova Despesa**, selecione a categoria do plano de contas, informe data, vencimento, descrição e valor.</li>
                <li><strong>Como editar/apagar:</strong> Clique na despesa na lista. Se não estiver paga, você pode alterar valores ou excluí-la de forma definitiva. Se estiver paga, você precisa estornar o pagamento primeiro.</li>
            </ul>
        </div>

        {/* 5. CONTA DE SÓCIOS */}
        <div className="p-6 bg-cyan-50/30 rounded-3xl border border-cyan-100 space-y-4">
            <div className="flex items-center gap-3">
                <UserCheck className="text-cyan-600" size={20} />
                <h3 className="font-black text-slate-900 uppercase text-sm">5. Conta de Sócios (Haveres/Aportes)</h3>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Gerencia aportes de capital, retiradas de lucros (pró-labore) ou empréstimos pessoais entre a empresa e seus acionistas. Aportes criam créditos, e retiradas criam débitos que afetam o Patrimônio Líquido.
            </p>
        </div>

        <WarningBox text="Toda transação financeira (baixar duplicata, pagar despesa, adiantamento) registra um lançamento irrevogável no Histórico Geral. A exclusão de lançamentos estorna o saldo correspondente da conta bancária." />
    </div>
);

export const HelpCashier: React.FC = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6">
        <SectionTitle title="Caixa, Disponibilidades & Patrimônio" icon={Landmark} />
        
        <p className="text-slate-600 mb-6 leading-relaxed font-medium">
            O **Caixa** é a central de tesouraria do sistema. Ele consolida os saldos de todas as contas bancárias reais (incluindo a conta **Terceiros** com suporte a saldos negativos) e calcula o Patrimônio Líquido consolidado.
        </p>

        <GoldenRule text="Patrimônio Líquido = Total de Ativos (Disponibilidades + Duplicatas a Receber + Bens + Adiantamentos Concedidos) - Total de Passivos (Duplicatas a Pagar + Empréstimos Tomados)." />

        <div className="space-y-4">
            <h4 className="font-black text-slate-800 text-xs uppercase mb-2">Funcionalidades do Caixa:</h4>
            <ul className="text-xs text-slate-600 list-disc pl-5 space-y-2 font-medium">
                <li><strong>Contas Bancárias:</strong> Mostra o saldo conciliado de cada conta cadastrada em tempo real. Permite que contas de movimentação sob custódia de terceiros operem com saldos negativos (ex: quando há saques/empréstimos maiores do que os depósitos).</li>
                <li><strong>Snapshots Mensais:</strong> No último dia do mês, o sistema gera uma "Foto" (Snapshot) imutável de fechamento financeiro, congelando saldos, ativos e passivos para auditoria contábil futura.</li>
                <li><strong>Realtime Multi-usuário:</strong> Integra-se com o `financialRealtimeHub`. Se um operador no escritório der baixa em uma conta a receber, o saldo do banco na tela do caixa de todos os computadores é atualizado instantaneamente sem recarregar.</li>
            </ul>
        </div>
    </div>
);
