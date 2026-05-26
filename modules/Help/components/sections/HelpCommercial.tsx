import React from 'react';
import { ShoppingCart, TrendingUp, Play, Edit, Trash2, Link } from 'lucide-react';
import { SectionTitle, GoldenRule, FieldTable, StepBox, StatusFlow, ExampleBox, SubModule, InfoBox, WarningBox } from '../HelpSharedComponents';

export const HelpPurchases: React.FC = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6">
        <SectionTitle title="Pedidos de Compra" icon={ShoppingCart} />
        
        <p className="text-slate-600 mb-6 leading-relaxed font-medium">
            Um Pedido de Compra (PC) representa um contrato de fornecimento firmado com um produtor rural. 
            Ele define a semente comercial, o preço unitário por saca, o volume contratado e a fazenda de origem do produto.
        </p>

        <GoldenRule text="A compra é a base do seu estoque e define o CMV (Custo de Mercadoria Vendida). O preço acordado aqui determinará a margem operacional líquida da sua empresa." />

        {/* COMO LANÇAR */}
        <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl">
            <h4 className="font-black text-slate-800 text-xs uppercase mb-4 flex items-center gap-2">
                <Play size={16} className="text-emerald-600" />
                Como Lançar um Pedido de Compra (PC)
            </h4>
            <div className="text-xs text-slate-600 space-y-3 font-medium">
                <p>1. Vá ao menu <strong>Ped. Compra</strong> e clique em <strong>+ Novo Pedido</strong>.</p>
                <p>2. Selecione o sócio comprador (**Consultor/Comprador**) e o **Produtor Rural** (parceiro).</p>
                <p>3. Escolha o **Tipo de Produto** (Milho, Soja, etc.) e informe a quantidade negociada e o preço por saca (**R$/SC**).</p>
                <p>4. Caso haja intermediação, marque **Tem Corretor?**, selecione o corretor e digite o valor da comissão por saca.</p>
                <p>5. Clique em **Salvar**. O contrato é registrado em status 'Pendente'.</p>
            </div>
        </div>

        {/* COMO EDITAR */}
        <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl">
            <h4 className="font-black text-slate-800 text-xs uppercase mb-4 flex items-center gap-2">
                <Edit size={16} className="text-amber-600" />
                Como Editar Contratos de Compra
            </h4>
            <div className="text-xs text-slate-600 space-y-3 font-medium">
                <p>1. Na lista de pedidos ativos, clique no card do pedido que deseja modificar.</p>
                <p>2. Clique em **Editar** no canto superior.</p>
                <p>3. Você pode renegociar preços, alterar a quantidade estimada de sacas ou ajustar o endereço da fazenda de carregamento.</p>
                <p className="text-amber-700">
                    💡 Observação: Se o pedido já tiver cargas transportadas, você pode ajustar a quantidade total contratada, mas o sistema não permitirá alterar o parceiro vendedor para manter a rastreabilidade fiscal.
                </p>
            </div>
        </div>

        {/* COMO APAGAR */}
        <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl">
            <h4 className="font-black text-slate-800 text-xs uppercase mb-4 flex items-center gap-2">
                <Trash2 size={16} className="text-rose-600" />
                Como Cancelar e Apagar Pedidos de Compra
            </h4>
            <div className="text-xs text-slate-600 space-y-2 font-medium">
                <p>• Clique em **Editar** no pedido e selecione o botão de **Excluir**.</p>
                <p className="text-rose-700 font-bold">
                    ⚠ REGRA DE SEGURANÇA: Se o Pedido de Compra já possuir qualquer carregamento (cargas na Logística), o sistema impedirá a sua exclusão física para evitar que cargas fiquem órfãs. Você deve primeiro excluir todas as cargas daquele pedido na Logística para depois poder excluir o contrato.
                </p>
            </div>
        </div>

        {/* INTERLIGAÇÃO */}
        <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl">
            <h4 className="font-black text-slate-800 text-xs uppercase mb-4 flex items-center gap-2">
                <Link size={16} className="text-indigo-600" />
                Interligação com outros Módulos
            </h4>
            <ul className="text-xs text-slate-600 list-disc pl-5 space-y-1 font-medium">
                <li><strong>Logística:</strong> Quando o caminhão é carregado na fazenda, as sacas líquidas da carga são abatidas do saldo de saca pendente deste Pedido de Compra.</li>
                <li><strong>Financeiro:</strong> Concluir uma carga gera uma conta a pagar para o produtor rural na tabela `financial_entries`. A quitação desta conta é feita na tela de **Caixa** ou no detalhe do próprio contrato.</li>
            </ul>
        </div>

        <FieldTable fields={[
            { campo: 'Número', tipo: 'Automático', obs: 'Gerado como PC-{ano}-{código} sequencial' },
            { campo: 'Parceiro (Fornecedor)', tipo: 'Busca', obs: 'Apenas parceiros com a categoria Produtor Rural ativa' },
            { campo: 'Preço Unitário', tipo: 'Moeda', obs: 'Preço por saca acordado em R$' },
            { campo: 'Corretagem', tipo: 'Opcional', obs: 'Define a comissão do corretor e se o valor é deduzido do produtor rural' },
        ]} />

        <StatusFlow statuses={['Rascunho', 'Pendente', 'Aprovado', 'Em Transporte', 'Concluído']} />
    </div>
);

export const HelpSales: React.FC = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6">
        <SectionTitle title="Pedidos de Venda" icon={TrendingUp} />
        
        <p className="text-slate-600 mb-6 leading-relaxed font-medium">
            Um Pedido de Venda (PV) representa o contrato de venda de grãos fechado com uma trading, indústria ou comprador final. 
            Ele gerencia o volume comprometido, o preço de venda e a balança do cliente de destino.
        </p>

        <GoldenRule text="O faturamento real da venda e a cobrança do cliente são calculados com base no PESO DE DESTINO (balança de chegada), pois é esse o peso aceito pela indústria compradora." />

        {/* COMO LANÇAR */}
        <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl">
            <h4 className="font-black text-slate-800 text-xs uppercase mb-4 flex items-center gap-2">
                <Play size={16} className="text-emerald-600" />
                Como Lançar um Pedido de Venda (PV)
            </h4>
            <div className="text-xs text-slate-600 space-y-3 font-medium">
                <p>1. Vá ao menu <strong>Ped. Venda</strong> e selecione <strong>+ Novo Pedido</strong>.</p>
                <p>2. Defina o sócio vendedor (**Consultor/Vendedor**) e selecione o **Cliente/Comprador**.</p>
                <p>3. Insira o produto negociado, a quantidade em sacas (SC) e o preço acordado por saca (**R$/SC**).</p>
                <p>4. Defina o local de destino e clique em **Salvar** para registrar o contrato no sistema.</p>
            </div>
        </div>

        {/* COMO EDITAR */}
        <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl">
            <h4 className="font-black text-slate-800 text-xs uppercase mb-4 flex items-center gap-2">
                <Edit size={16} className="text-amber-600" />
                Como Editar Pedidos de Venda
            </h4>
            <div className="text-xs text-slate-600 space-y-3 font-medium">
                <p>1. Acesse o menu **Ped. Venda** e clique no card do contrato desejado.</p>
                <p>2. Clique em **Editar** no topo da tela.</p>
                <p>3. Você pode ajustar o preço de venda, alterar o volume contratado ou atualizar a data prevista do contrato.</p>
                <p className="text-amber-700">
                    💡 Observação: Caso o cliente exija a emissão de PDFs ou extratos atualizados, as modificações de preço são refletidas de forma instantânea nas futuras exportações de relatórios.
                </p>
            </div>
        </div>

        {/* COMO APAGAR */}
        <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl">
            <h4 className="font-black text-slate-800 text-xs uppercase mb-4 flex items-center gap-2">
                <Trash2 size={16} className="text-rose-600" />
                Como Cancelar e Apagar Pedidos de Venda
            </h4>
            <div className="text-xs text-slate-600 space-y-2 font-medium">
                <p>• Clique em **Editar** no pedido e selecione o botão de **Excluir**.</p>
                <p className="text-rose-700 font-bold">
                    ⚠ REGRA DE SEGURANÇA: Se o Pedido de Venda já possuir caminhões vinculados na Logística, a exclusão será bloqueada para evitar que os registros de transporte percam o destino. Você precisará cancelar ou redirecionar os carregamentos correspondentes antes de remover o PV.
                </p>
            </div>
        </div>

        {/* INTERLIGAÇÃO */}
        <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl">
            <h4 className="font-black text-slate-800 text-xs uppercase mb-4 flex items-center gap-2">
                <Link size={16} className="text-indigo-600" />
                Interligação com outros Módulos
            </h4>
            <ul className="text-xs text-slate-600 list-disc pl-5 space-y-1 font-medium">
                <li><strong>Logística:</strong> Cada carga descarregada na indústria abate do saldo de entrega deste Pedido de Venda.</li>
                <li><strong>Financeiro:</strong> Ao confirmar o descarregamento de uma carga na Logística, o sistema cria uma conta a receber em `financial_entries` contra o comprador. O recebimento desse crédito é feito no **Caixa** ou no detalhe da própria venda.</li>
            </ul>
        </div>

        <FieldTable fields={[
            { campo: 'Número', tipo: 'Automático', obs: 'Gerado como PV-{ano}-{código} sequencial' },
            { campo: 'Cliente', tipo: 'Busca', obs: 'Apenas parceiros com a categoria Cliente ou Indústria ativa' },
            { campo: 'Preço Venda', tipo: 'Moeda', obs: 'Preço por saca acordado em R$' },
            { campo: 'Progresso', tipo: 'Visual', obs: 'Barra que mostra a porcentagem do volume total já entregue' },
        ]} />

        <InfoBox text="Você pode redirecionar uma carga em trânsito de um Pedido de Venda para outro na Logística. Os saldos físicos de entrega e faturamento serão atualizados automaticamente entre os dois contratos." />
    </div>
);
