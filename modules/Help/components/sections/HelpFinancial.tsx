
import React from 'react';
import { BadgeDollarSign, CircleDollarSign, Banknote, HandCoins, Landmark, Receipt, History, UserCheck } from 'lucide-react';
import { SectionTitle, SubModule, FieldTable, StatusFlow, ExampleBox, WarningBox, GoldenRule, InfoBox } from '../HelpSharedComponents';

export const HelpFinancial: React.FC = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4">
        <SectionTitle title="Módulos Financeiros (Central)" icon={BadgeDollarSign} />
        <p className="text-slate-600 mb-8 leading-relaxed font-medium">
            O módulo Financeiro consolida 9 sub-módulos que cobrem todas as obrigações e movimentações de dinheiro.
        </p>

        {/* CONTAS A PAGAR */}
        <div className="mb-10 p-6 bg-red-50/30 rounded-3xl border border-red-100">
            <div className="flex items-center gap-3 mb-4">
                <CircleDollarSign className="text-red-500" size={20} />
                <h3 className="font-black text-slate-900 uppercase text-sm">1. Contas a Pagar</h3>
            </div>
            <FieldTable fields={[
                { campo: 'Valor Original', tipo: 'Moeda', obs: 'Valor total da obrigação' },
                { campo: 'Valor Pago', tipo: 'Moeda', obs: 'Quanto já foi liquidado' },
                { campo: 'Status', tipo: 'Badge', obs: 'Pendente / Parcial / Pago / Vencido' },
            ]} />
            <StatusFlow statuses={['Pendente', 'Parcial', 'Pago']} />
            <ExampleBox title="Como pagar uma conta">
                <p>1. Clique no botão de <strong>pagamento</strong> (ícone $)</p>
                <p>2. Selecione a <strong>conta bancária</strong></p>
                <p>3. Informe o <strong>valor</strong></p>
            </ExampleBox>
            <WarningBox text="Contas a Pagar são criadas automaticamente por Compras, Logística, Despesas e Empréstimos." />
        </div>

        {/* CONTAS A RECEBER */}
        <div className="mb-10 p-6 bg-emerald-50/30 rounded-3xl border border-emerald-100">
            <div className="flex items-center gap-3 mb-4">
                <Banknote className="text-emerald-500" size={20} />
                <h3 className="font-black text-slate-900 uppercase text-sm">2. Contas a Receber</h3>
            </div>
            <ExampleBox title="Como registrar um recebimento">
                <p>1. Clique em <strong>"Receber"</strong> na lista</p>
                <p>2. Selecione a <strong>conta bancária</strong> destino</p>
                <p>3. Informe o <strong>valor recebido</strong></p>
            </ExampleBox>
        </div>

        {/* ADIANTAMENTOS */}
        <div className="mb-10 p-6 bg-purple-50/30 rounded-3xl border border-purple-100">
            <div className="flex items-center gap-3 mb-4">
                <HandCoins className="text-purple-500" size={20} />
                <h3 className="font-black text-slate-900 uppercase text-sm">3. Adiantamentos</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-orange-50 p-5 rounded-xl border border-orange-200">
                    <h4 className="font-black text-orange-800 text-xs uppercase mb-2">GIVEN (Concedidos)</h4>
                    <p className="text-xs text-orange-700 font-medium">Você ADIANTOU ao parceiro. Ele te DEVE.</p>
                </div>
                <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-200">
                    <h4 className="font-black text-indigo-800 text-xs uppercase mb-2">TAKEN (Recebidos)</h4>
                    <p className="text-xs text-indigo-700 font-medium">O parceiro te ADIANTOU. Você DEVE a ele.</p>
                </div>
            </div>
        </div>

        {/* DESPESAS */}
        <div className="mb-10 p-6 bg-rose-50/30 rounded-3xl border border-rose-100">
            <div className="flex items-center gap-3 mb-4">
                <Receipt className="text-rose-500" size={20} />
                <h3 className="font-black text-slate-900 uppercase text-sm">4. Despesas Administrativas</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4 font-medium">Gerencie custos operacionais: aluguel, salários, energia, taxas, etc.</p>
            <InfoBox text="Despesas agora são unificadas e totalmente rastreáveis no fluxo de caixa." />
        </div>

        {/* SÓCIOS */}
        <div className="mb-10 p-6 bg-cyan-50/30 rounded-3xl border border-cyan-100">
            <div className="flex items-center gap-3 mb-4">
                <UserCheck className="text-cyan-600" size={20} />
                <h3 className="font-black text-slate-900 uppercase text-sm">5. Conta de Sócios</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4 font-medium">Controla aportes, lucros e retiradas individuais.</p>
        </div>

        {/* HISTÓRICO */}
        <div className="mb-10 p-6 bg-slate-50 rounded-3xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
                <History className="text-slate-600" size={20} />
                <h3 className="font-black text-slate-900 uppercase text-sm">6. Histórico Geral</h3>
            </div>
            <GoldenRule text="O Histórico é o espelho exato da tabela financial_transactions." />
        </div>
    </div>
);

export const HelpCashier: React.FC = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4">
        <SectionTitle title="Fluxo de Caixa" icon={Landmark} />
        <GoldenRule text="Patrimônio Líquido = Total de Ativos - Total de Passivos" />
        <SubModule name="Aba: Fechamento Vigente" desc="Radiografia completa: quem deve pra quem e onde está o dinheiro." />
        <SubModule name="Snapshot (Foto do Mês)" desc="Gera um registro imutável do saldo naquele exato momento." />
    </div>
);
