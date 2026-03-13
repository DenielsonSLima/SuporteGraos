
import React from 'react';
import { ShoppingCart, TrendingUp } from 'lucide-react';
import { SectionTitle, GoldenRule, FieldTable, StepBox, StatusFlow, ExampleBox, SubModule, InfoBox, WarningBox } from '../HelpSharedComponents';

export const HelpPurchases: React.FC = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4">
        <SectionTitle title="Pedidos de Compra" icon={ShoppingCart} />
        <GoldenRule text="A compra é a base do seu estoque e define o CMV (Custo de Mercadoria Vendida). O preço aqui determinará o seu spread futuro." />

        <p className="text-slate-600 mb-6 leading-relaxed font-medium">
            Um Pedido de Compra (PC) representa um contrato firmado com um produtor rural ou fornecedor
            para adquirir grãos. Ele define preço, volume e origem do carregamento.
        </p>

        <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-4">Campos do Formulário</h3>

        <div className="mb-6">
            <h4 className="font-bold text-slate-700 text-sm mb-3">Seção 1 — Identificação</h4>
            <FieldTable fields={[
                { campo: 'Número', tipo: 'Automático', obs: 'Gerado como PC-{ano}-{código}. Ex: PC-2026-A3F2' },
                { campo: 'Data', tipo: 'Data', obs: 'Data da negociação / fechamento do acordo' },
                { campo: 'Consultor / Comprador', tipo: 'Seleção', obs: 'Qual sócio está comprando (vem da lista de Sócios)' },
            ]} />
        </div>

        <div className="mb-6">
            <h4 className="font-bold text-slate-700 text-sm mb-3">Seção 2 — Fornecedor & Logística</h4>
            <FieldTable fields={[
                { campo: 'Parceiro (Fornecedor)', tipo: 'Busca', obs: 'Busca entre parceiros com categoria Produtor Rural ou Fornecedor' },
                { campo: 'Documento', tipo: 'Automático', obs: 'Preenchido ao selecionar o parceiro' },
                { campo: 'Cidade / UF', tipo: 'Automático', obs: 'Endereço do parceiro selecionado' },
                { campo: 'Usar endereço cadastrado?', tipo: 'Sim / Não', obs: 'Se "Não", permite informar outro local de carregamento' },
                { campo: 'Local de Carregamento', tipo: 'Cidade + UF + Complemento', obs: 'Ex: Fazenda Boa Vista, Rio Verde - GO' },
                { campo: 'Safra', tipo: 'Automático', obs: 'Gerado: SAFRA/{UF} {ano}. Ex: SAFRA/GO 2026' },
            ]} />
        </div>

        <div className="mb-6">
            <h4 className="font-bold text-slate-700 text-sm mb-3">Seção 3 — Intermediação (Corretor)</h4>
            <FieldTable fields={[
                { campo: 'Tem Corretor?', tipo: 'Checkbox', obs: 'Ativa a seção de intermediação' },
                { campo: 'Corretor', tipo: 'Seleção', obs: 'Parceiro com categoria CORRETOR' },
                { campo: 'Comissão por Saca', tipo: 'Moeda', obs: 'R$/SC que o corretor cobra. Ex: R$ 0,50/SC' },
                { campo: 'Deduzir do Fornecedor?', tipo: 'Checkbox', obs: 'Se marcado, a comissão é descontada do pagamento ao produtor' },
            ]} />
        </div>

        <div className="mb-6">
            <h4 className="font-bold text-slate-700 text-sm mb-3">Seção 4 — Itens do Pedido</h4>
            <FieldTable fields={[
                { campo: 'Produto', tipo: 'Seleção', obs: 'Tipo de grão (cadastrado em Config > Tipos de Produtos)' },
                { campo: 'Quantidade', tipo: 'Número', obs: 'Volume negociado' },
                { campo: 'Unidade', tipo: 'KG / SC / TON', obs: 'Conversão: 1 SC = 60 KG | 1 TON = 1.000 KG' },
                { campo: 'Preço Unitário', tipo: 'Moeda', obs: 'R$ por unidade (R$/SC, R$/KG ou R$/TON)' },
                { campo: 'Total', tipo: 'Calculado', obs: 'Quantidade x Preço Unitário' },
            ]} />
        </div>

        <StepBox
            title="Fluxo Completo de uma Compra"
            steps={[
                "Criar o Pedido: preencha os campos e salve. Status = 'Pendente'. O sistema cria uma obrigação financeira (Conta a Pagar) com status 'aberta'.",
                "Vincular Cargas: na tela de Logística, crie cargas vinculadas a este pedido. O saldo do contrato baixa conforme os romaneios são lançados.",
                "Aprovar (opcional): use o botão 'Aprovar' para sinalizar que este pedido está validado para pagamento.",
                "Pagar: acesse o detalhe do pedido > botão 'Pagar'. Informe a conta bancária e o valor. Pagamentos parciais são permitidos.",
                "Finalizar: quando todo o volume estiver carregado e o financeiro 100% quitado, finalize o pedido."
            ]}
        />

        <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-4">Ciclo de Status</h3>
        <StatusFlow statuses={['Rascunho', 'Pendente', 'Aprovado', 'Em Transporte', 'Concluído']} />

        <ExampleBox title="Exemplo: Comprando 500 SC de Milho">
            <p>1. <strong>Parceiro:</strong> João da Silva (Produtor Rural)</p>
            <p>2. <strong>Consultor:</strong> Carlos (sócio comprador)</p>
            <p>3. <strong>Produto:</strong> Milho em Grãos</p>
            <p>4. <strong>Quantidade:</strong> 500 SC</p>
            <p>5. <strong>Preço:</strong> R$ 68,00/SC</p>
            <p>6. <strong>Total gerado:</strong> R$ 34.000,00</p>
            <p>7. <strong>Corretor:</strong> Marcelo (comissão R$ 0,30/SC = R$ 150,00)</p>
        </ExampleBox>

        <SubModule name="Abas de Visualização" desc="O módulo tem 3 abas: 'Ativos' (pedidos em aberto), 'Finalizados' (histórico de pedidos concluídos) e 'Todos' (visão completa)." />
        <SubModule name="KPIs do Módulo" desc="Cards no topo mostram: Total de Pedidos Ativos, Volume Total Contratado, Valor Total de Compras e % de Execução." />
        <SubModule name="Detalhes do Pedido" desc="Ao clicar em um pedido, abre a tela de detalhes com: Card do Produto, Card Financeiro, Card do Corretor, Tabela de Cargas Vinculadas." />
        <WarningBox text="Nunca exclua um pedido que já tenha cargas vinculadas. Primeiro cancele as cargas na Logística, depois cancele o pedido." />
    </div>
);

export const HelpSales: React.FC = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4">
        <SectionTitle title="Pedidos de Venda" icon={TrendingUp} />
        <p className="text-slate-600 mb-6 leading-relaxed font-medium">
            Um Pedido de Venda (PV) representa um contrato de comercialização com um cliente ou indústria.
            Ele define o preço de venda por saca, o volume máximo e o destino (balança do cliente).
        </p>

        <GoldenRule text="O valor a receber do cliente é calculado pelo PESO DE DESTINO (balança da indústria), não pelo peso de origem. Isso é fundamental." />

        <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-4">Campos do Formulário</h3>
        <FieldTable fields={[
            { campo: 'Número', tipo: 'Automático', obs: 'Gerado como PV-{ano}-{código}. Ex: PV-2026-B1C7' },
            { campo: 'Data', tipo: 'Data', obs: 'Data da negociação de venda' },
            { campo: 'Consultor / Vendedor', tipo: 'Seleção', obs: 'Qual sócio vendeu (lista de Sócios)' },
            { campo: 'Cliente', tipo: 'Busca', obs: 'Parceiro com categoria CLIENTE ou INDÚSTRIA' },
            { campo: 'Documento', tipo: 'Automático', obs: 'CNPJ/CPF do cliente selecionado' },
            { campo: 'Cidade / UF', tipo: 'Automático', obs: 'Endereço do cliente' },
            { campo: 'Produto', tipo: 'Texto', obs: 'Ex: Milho em Grãos' },
            { campo: 'Quantidade (est.)', tipo: 'Sacas', obs: 'Estimativa de volume contratado' },
            { campo: 'Preço Unitário', tipo: 'R$/SC', obs: 'Preço de venda negociado' },
            { campo: 'Total', tipo: 'Calculado', obs: 'Quantidade x Preço Unitário' },
        ]} />

        <StepBox
            title="Fluxo Completo de uma Venda"
            steps={[
                "Criar o Pedido de Venda: Defina cliente, preço/SC e volume estimado. O sistema cria uma Conta a Receber.",
                "Vincular Cargas: Na Logística, ao criar uma carga, selecione este PV como destino.",
                "Confirmar Peso de Destino: Quando a indústria pesar o caminhão, insira o peso de destino na carga.",
                "Receber Pagamento: Acesse o detalhe da venda > botão 'Receber'.",
                "Finalizar: Quando todas as cargas estiverem entregues e o pagamento completo, finalize a venda."
            ]}
        />

        <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-4">Ciclo de Status</h3>
        <StatusFlow statuses={['Rascunho', 'Pendente', 'Aprovado', 'Concluído', 'Cancelado']} />

        <ExampleBox title="Exemplo: Vendendo 800 SC de Milho">
            <p>1. <strong>Cliente:</strong> Indústria Alimentar ABC Ltda</p>
            <p>2. <strong>Produto:</strong> Milho em Grãos</p>
            <p>3. <strong>Quantidade:</strong> 800 SC</p>
            <p>4. <strong>Preço:</strong> R$ 75,00/SC</p>
            <p>5. <strong>Total estimado:</strong> R$ 60.000,00</p>
        </ExampleBox>

        <SubModule name="Monitoramento de Spread" desc="Na tela de detalhes da venda, o sistema mostra o 'Lucro Real por Carga', que é: Receita da Venda - (Custo do Grão na Compra + Custo do Frete)." />
        <SubModule name="Dados Enriquecidos (Views SQL)" desc="O sistema utiliza Views SQL pré-calculadas que trazem: quantidade já entregue (SC), valor entregue, total de cargas, etc." />
        <InfoBox text="Quando uma carga é redirecionada de um PV para outro, o volume entregue é automaticamente redistribuído para o novo destino." />
    </div>
);
