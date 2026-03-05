
import React from 'react';
import { HelpSection } from '../HelpModule';
import { 
  ArrowRight, CheckCircle2, AlertTriangle, Info, 
  ShieldCheck, Wallet, ShoppingBag, Truck, Package,
  Scale, Zap, LayoutDashboard, Users, ShoppingCart, 
  Tractor, BadgeDollarSign, BarChart2, FileText, Settings, TrendingUp,
  CircleDollarSign, ArrowLeftRight, Landmark, Receipt, UserCheck,
  History, CreditCard, BrainCircuit, HelpCircle, Building2,
  Banknote, PiggyBank, HandCoins, ClipboardList, Gauge
} from 'lucide-react';

interface Props {
  section: HelpSection;
}

const HelpContent: React.FC<Props> = ({ section }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);

  /* ──── COMPONENTES REUTILIZÁVEIS ──── */

  const SectionTitle = ({ title, icon: Icon }: { title: string, icon?: any }) => (
    <div className="mb-8 border-b-4 border-slate-100 pb-4">
        <div className="flex items-center gap-3 mb-2">
            {Icon && <Icon className="text-primary-600" size={24} />}
            <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">{title}</h2>
        </div>
        <div className="h-1.5 w-20 bg-primary-500 rounded-full"></div>
    </div>
  );

  const StepBox = ({ title, steps }: { title: string, steps: string[] }) => (
    <div className="bg-slate-50 rounded-3xl border border-slate-200 p-8 mb-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-5 text-slate-900"><Zap size={64}/></div>
      <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-[0.2em] mb-6 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-primary-500"></div>
        {title}
      </h3>
      <div className="space-y-4">
        {steps.map((s, i) => (
          <div key={i} className="flex gap-4 items-start group">
            <div className="mt-1 flex-shrink-0 w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover:bg-primary-600 group-hover:text-white transition-all shadow-sm">
              {i + 1}
            </div>
            <p className="text-sm font-bold text-slate-600 leading-relaxed">{s}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const GoldenRule = ({ text }: { text: string }) => (
    <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded-r-xl">
        <div className="flex items-center gap-2 text-amber-800 font-black text-[10px] uppercase mb-1">
            <ShieldCheck size={14} /> Regra de Ouro
        </div>
        <p className="text-sm text-amber-900 font-medium italic">"{text}"</p>
    </div>
  );

  const SubModule = ({ name, desc }: { name: string, desc: string }) => (
    <div className="border-l-4 border-slate-200 pl-6 py-4 mb-6 hover:border-primary-500 transition-colors bg-white hover:bg-slate-50 rounded-r-xl group">
      <h4 className="font-black text-slate-800 uppercase text-xs mb-1 group-hover:text-primary-700 transition-colors">{name}</h4>
      <p className="text-sm text-slate-500 font-medium leading-relaxed">{desc}</p>
    </div>
  );

  const ExampleBox = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-6">
      <div className="flex items-center gap-2 text-blue-800 font-black text-[10px] uppercase mb-3">
        <Info size={14} /> {title}
      </div>
      <div className="text-sm text-blue-900 font-medium leading-relaxed space-y-1">{children}</div>
    </div>
  );

  const WarningBox = ({ text }: { text: string }) => (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-xl">
      <div className="flex items-center gap-2 text-red-800 font-black text-[10px] uppercase mb-1">
        <AlertTriangle size={14} /> Atenção
      </div>
      <p className="text-sm text-red-900 font-medium">{text}</p>
    </div>
  );

  const InfoBox = ({ text }: { text: string }) => (
    <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 mb-6 rounded-r-xl">
      <div className="flex items-center gap-2 text-emerald-800 font-black text-[10px] uppercase mb-1">
        <CheckCircle2 size={14} /> Dica
      </div>
      <p className="text-sm text-emerald-900 font-medium">{text}</p>
    </div>
  );

  const FieldTable = ({ fields }: { fields: { campo: string, tipo: string, obs: string }[] }) => (
    <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-100">
          <tr>
            <th className="px-4 py-3 text-left font-black text-[10px] uppercase tracking-wider text-slate-500">Campo</th>
            <th className="px-4 py-3 text-left font-black text-[10px] uppercase tracking-wider text-slate-500">Tipo</th>
            <th className="px-4 py-3 text-left font-black text-[10px] uppercase tracking-wider text-slate-500">Observação</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {fields.map((f, i) => (
            <tr key={i} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3 font-bold text-slate-700">{f.campo}</td>
              <td className="px-4 py-3 text-slate-500">{f.tipo}</td>
              <td className="px-4 py-3 text-slate-500">{f.obs}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const StatusFlow = ({ statuses }: { statuses: string[] }) => (
    <div className="flex items-center gap-2 flex-wrap mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
      {statuses.map((s, i) => (
        <React.Fragment key={i}>
          <span className="px-3 py-1.5 bg-white rounded-lg text-xs font-black text-slate-700 border border-slate-200 shadow-sm">{s}</span>
          {i < statuses.length - 1 && <ArrowRight size={14} className="text-slate-400" />}
        </React.Fragment>
      ))}
    </div>
  );

  /* ───────────────────────────────────────────────────────────────── */
  /* ──── CONTEÚDO POR SEÇÃO                                    ──── */
  /* ───────────────────────────────────────────────────────────────── */

  const contentMap: Record<HelpSection, React.ReactNode> = {

    /* ═══════════════════════════════════════════════════════════════ */
    /*  VISÃO GERAL                                                  */
    /* ═══════════════════════════════════════════════════════════════ */
    intro: (
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
    ),

    /* ═══════════════════════════════════════════════════════════════ */
    /*  DASHBOARD                                                    */
    /* ═══════════════════════════════════════════════════════════════ */
    dashboard: (
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
    ),

    /* ═══════════════════════════════════════════════════════════════ */
    /*  PARCEIROS                                                    */
    /* ═══════════════════════════════════════════════════════════════ */
    partners: (
      <div className="animate-in fade-in slide-in-from-bottom-4">
        <SectionTitle title="Gestão de Parceiros" icon={Users} />
        <p className="text-slate-600 mb-6 leading-relaxed font-medium">
          Centralize todos os stakeholders da sua cadeia: produtores rurais, clientes (indústrias), 
          transportadoras e corretores. Um parceiro pode ter múltiplas categorias simultâneas.
        </p>
        
        <GoldenRule text="Cadastre o parceiro ANTES de criar pedidos. O sistema só permite vincular parceiros já cadastrados nas telas de Compra, Venda e Logística." />

        <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-4">Campos do Formulário de Cadastro</h3>
        <FieldTable fields={[
          { campo: 'Tipo Pessoa', tipo: 'PJ / PF', obs: 'Pessoa Jurídica (CNPJ) ou Física (CPF)' },
          { campo: 'Documento', tipo: 'CNPJ ou CPF', obs: 'Validado automaticamente. Opção "Não informado" para estrangeiros' },
          { campo: 'Categorias', tipo: 'Multi-seleção', obs: 'OBRIGATÓRIO ao menos 1: Produtor Rural, Cliente, Transportadora, Corretor, etc.' },
          { campo: 'Razão Social / Nome', tipo: 'Texto', obs: 'Nome oficial do parceiro' },
          { campo: 'Nome Fantasia', tipo: 'Texto', obs: 'Apenas para PJ — nome comercial' },
          { campo: 'Apelido', tipo: 'Texto', obs: 'Nome curto para uso interno (ex: "Seu João da Fazenda")' },
          { campo: 'Telefone', tipo: 'Telefone', obs: 'Contato principal' },
          { campo: 'E-mail', tipo: 'E-mail', obs: 'Para comunicação' },
          { campo: 'Endereço', tipo: 'CEP + Rua + Nº + Bairro + Cidade + UF', obs: 'Preenchimento automático pelo CEP' },
        ]} />

        <SubModule name="Busca Inteligente por CNPJ (ReceitaWS)" desc="Ao cadastrar um PJ, digite o CNPJ e clique em 'Consultar'. O sistema busca na ReceitaWS e preenche automaticamente: Razão Social, Nome Fantasia, Endereço completo, Telefone e E-mail. Isso evita erros de digitação." />

        <ExampleBox title="Exemplo Prático: Cadastrando um Produtor">
          <p>1. Clique em <strong>+ Novo Parceiro</strong></p>
          <p>2. Selecione <strong>Pessoa Física</strong></p>
          <p>3. Digite o CPF: <strong>123.456.789-00</strong></p>
          <p>4. Categoria: marque <strong>Produtor Rural</strong></p>
          <p>5. Nome: <strong>João da Silva</strong></p>
          <p>6. Apelido: <strong>Seu João</strong></p>
          <p>7. Endereço: Fazenda Boa Vista, Rio Verde - GO</p>
          <p>8. Clique <strong>Salvar</strong></p>
          <p className="mt-2 text-blue-700 italic">→ Agora "Seu João" aparecerá como opção ao criar Pedidos de Compra.</p>
        </ExampleBox>

        <SubModule name="Ficha 360° (Dossiê)" desc="No card de cada parceiro, clique no ícone de impressora. Será gerado um PDF com: dados cadastrais, histórico completo de compras, vendas, fretes e saldo financeiro atualizado." />
        
        <SubModule name="Sub-módulo: Motoristas" desc="Ao acessar o detalhe de uma Transportadora, há a seção de Motoristas. Cadastre nome, CPF, CNH (número e categoria) e vincule a Veículos (placa, modelo, cor). Isso cria 'Conjuntos' usados no lançamento de cargas." />
        
        <SubModule name="Sub-módulo: Veículos" desc="Cadastre a frota da transportadora: placa, marca, modelo, cor e ano. Vincule motoristas aos veículos para agilizar o preenchimento de cargas na Logística." />

        <WarningBox text="Cada CNPJ/CPF é único no sistema. Se tentar cadastrar um documento que já existe, o sistema bloqueará e mostrará o parceiro existente." />

        <InfoBox text="Um mesmo parceiro pode ser simultaneamente Produtor e Cliente. Basta marcar ambas as categorias. Ele aparecerá nas telas de compra E de venda." />
      </div>
    ),

    /* ═══════════════════════════════════════════════════════════════ */
    /*  PEDIDOS DE COMPRA                                            */
    /* ═══════════════════════════════════════════════════════════════ */
    purchases: (
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
          <p className="mt-2 text-blue-700 italic">O sistema cria automaticamente uma Conta a Pagar de R$ 34.000,00 vinculada a este pedido.</p>
        </ExampleBox>

        <SubModule name="Abas de Visualização" desc="O módulo tem 3 abas: 'Ativos' (pedidos em aberto), 'Finalizados' (histórico de pedidos concluídos) e 'Todos' (visão completa). É possível agrupar por Mês, Safra ou Parceiro." />

        <SubModule name="KPIs do Módulo" desc="Cards no topo mostram: Total de Pedidos Ativos, Volume Total Contratado, Valor Total de Compras e % de Execução (volume já carregado vs. contratado)." />

        <SubModule name="Detalhes do Pedido" desc="Ao clicar em um pedido, abre a tela de detalhes com: Card do Produto, Card Financeiro (pago vs. pendente), Card do Corretor (se houver), Tabela de Cargas Vinculadas, KPIs Operacionais e KPIs de Rentabilidade." />

        <WarningBox text="Nunca exclua um pedido que já tenha cargas vinculadas. Primeiro cancele as cargas na Logística, depois cancele o pedido." />
      </div>
    ),

    /* ═══════════════════════════════════════════════════════════════ */
    /*  PEDIDOS DE VENDA                                             */
    /* ═══════════════════════════════════════════════════════════════ */
    sales: (
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
            "Vincular Cargas: Na Logística, ao criar uma carga, selecione este PV como destino. A cada carga vinculada, o volume entregue aumenta.",
            "Confirmar Peso de Destino: Quando a indústria pesar o caminhão, insira o peso de destino na carga. Esse peso define o valor real a receber.",
            "Receber Pagamento: Acesse o detalhe da venda > botão 'Receber'. Informe a conta bancária e o valor recebido.",
            "Finalizar: Quando todas as cargas estiverem entregues e o pagamento completo, finalize a venda."
          ]}
        />

        <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-4">Ciclo de Status</h3>
        <StatusFlow statuses={['Rascunho', 'Pendente', 'Aprovado', 'Concluído', 'Cancelado']} />

        <ExampleBox title="Exemplo: Vendendo 800 SC de Milho para Indústria Alimentar ABC">
          <p>1. <strong>Cliente:</strong> Indústria Alimentar ABC Ltda (CNPJ: 12.345.678/0001-90)</p>
          <p>2. <strong>Produto:</strong> Milho em Grãos</p>
          <p>3. <strong>Quantidade:</strong> 800 SC</p>
          <p>4. <strong>Preço:</strong> R$ 75,00/SC</p>
          <p>5. <strong>Total estimado:</strong> R$ 60.000,00</p>
          <p className="mt-2 text-blue-700 italic">Conta a Receber criada: R$ 60.000,00. O valor final será recalculado pelo peso confirmado na indústria.</p>
        </ExampleBox>

        <SubModule name="Monitoramento de Spread" desc="Na tela de detalhes da venda, o sistema mostra o 'Lucro Real por Carga', que é: Receita da Venda - (Custo do Grão na Compra + Custo do Frete). Isso permite ver a margem líquida em tempo real." />

        <SubModule name="Dados Enriquecidos (Views SQL)" desc="O sistema utiliza Views SQL pré-calculadas que trazem: quantidade já entregue (SC), valor entregue, total de cargas, cargas em trânsito e valor em trânsito. Tudo é calculado no servidor, sem cálculos no frontend." />

        <InfoBox text="Quando uma carga é redirecionada de um PV para outro, o volume entregue é automaticamente redistribuído para o novo destino." />
      </div>
    ),

    /* ═══════════════════════════════════════════════════════════════ */
    /*  LOGÍSTICA & FRETES                                           */
    /* ═══════════════════════════════════════════════════════════════ */
    logistics: (
      <div className="animate-in fade-in slide-in-from-bottom-4">
        <SectionTitle title="Logística, Cargas & Fretes" icon={Truck} />
        <p className="text-slate-600 mb-6 leading-relaxed font-medium">
          Este é o <strong>coração operacional</strong> do sistema. Cada carga conecta um Pedido de Compra 
          (origem/fazenda) a um Pedido de Venda (destino/indústria), com pesagem, frete e motorista.
        </p>

        <GoldenRule text="A diferença entre peso de origem e peso de destino é a QUEBRA de transporte. Quebras acima de 0,25% exigem auditoria interna." />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
           <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 relative overflow-hidden">
              <Scale size={32} className="absolute -right-2 -bottom-2 text-blue-200" />
              <h4 className="font-black text-blue-800 text-xs uppercase mb-2">Peso de Origem</h4>
              <p className="text-xs text-blue-700 font-medium leading-relaxed">Balança da fazenda. É o peso carregado. Referência para PAGAR o Produtor. Define o custo do grão.</p>
           </div>
           <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 relative overflow-hidden">
              <Package size={32} className="absolute -right-2 -bottom-2 text-emerald-200" />
              <h4 className="font-black text-emerald-800 text-xs uppercase mb-2">Peso de Destino</h4>
              <p className="text-xs text-emerald-700 font-medium leading-relaxed">Balança da indústria. É o peso entregue. Referência para COBRAR o Cliente. Define a receita real.</p>
           </div>
        </div>

        <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-4">Campos do Formulário de Carga</h3>

        <div className="mb-4">
          <h4 className="font-bold text-slate-700 text-sm mb-3">Destino da Mercadoria</h4>
          <FieldTable fields={[
            { campo: 'Pedido de Venda (destino)', tipo: 'Busca', obs: 'Selecione o PV ativo para onde a carga vai' },
            { campo: 'Frete FOB?', tipo: 'Checkbox', obs: 'Se marcado, o cliente retira com frete próprio (valor do frete = R$ 0)' },
          ]} />
        </div>

        <div className="mb-4">
          <h4 className="font-bold text-slate-700 text-sm mb-3">Logística de Transporte</h4>
          <FieldTable fields={[
            { campo: 'Transportadora', tipo: 'Seleção', obs: 'Parceiro categoria TRANSPORTADORA (desabilitado se FOB)' },
            { campo: 'Data', tipo: 'Data', obs: 'Data do carregamento' },
            { campo: 'Motorista', tipo: 'Seleção', obs: 'Motorista cadastrado na transportadora selecionada' },
            { campo: 'Placa', tipo: 'Texto', obs: 'Placa do veículo (convertida automaticamente para maiúsculas)' },
            { campo: 'Nº Documento Fiscal', tipo: 'Texto', obs: 'Número da nota fiscal ou romaneio' },
          ]} />
        </div>

        <div className="mb-4">
          <h4 className="font-bold text-slate-700 text-sm mb-3">Pesagem de Origem</h4>
          <FieldTable fields={[
            { campo: 'Peso (KG)', tipo: 'Número', obs: 'Peso bruto da balança de origem. OBRIGATÓRIO > 0' },
            { campo: 'Preço Compra (R$/SC)', tipo: 'Moeda', obs: 'Custo unitário de aquisição, vindo do Pedido de Compra' },
            { campo: 'Peso (SC)', tipo: 'Calculado', obs: 'Peso KG / 60' },
            { campo: 'Peso (TON)', tipo: 'Calculado', obs: 'Peso KG / 1.000' },
            { campo: 'Valor Total Compra', tipo: 'Calculado', obs: 'Peso SC x Preço/SC' },
          ]} />
        </div>

        <div className="mb-4">
          <h4 className="font-bold text-slate-700 text-sm mb-3">Acerto de Frete</h4>
          <FieldTable fields={[
            { campo: 'Preço Frete (R$/TON)', tipo: 'Moeda', obs: 'Valor por tonelada a pagar ao transportador' },
            { campo: 'Valor Total Frete', tipo: 'Calculado', obs: 'Peso TON x Preço/TON' },
            { campo: 'Base do Frete', tipo: 'Origem / Destino', obs: 'Se usa peso de origem ou destino para calcular o frete' },
          ]} />
        </div>

        <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-4">Ciclo de Status da Carga</h3>
        <StatusFlow statuses={['Em Trânsito', 'Descarregando', 'Concluída']} />
        <p className="text-sm text-slate-500 mb-6">A carga começa como "Em Trânsito". Quando o peso de destino é inserido, muda para "Concluída". Se for redirecionada, fica "Redirecionada".</p>

        <StepBox 
          title="Fluxo Completo de uma Carga"
          steps={[
            "Na tela de Logística, clique em '+ Nova Carga'.",
            "Selecione o Pedido de Venda de destino (o Pedido de Compra já está vinculado ao grão).",
            "Informe a transportadora, motorista e placa do veículo.",
            "Preencha o peso de origem (balança da fazenda) e o preço de compra R$/SC.",
            "Preencha o preço do frete R$/TON. O sistema calcula o total automaticamente.",
            "Salve. A carga entra em status 'Em Trânsito' e aparece nas Contas a Pagar (grão + frete).",
            "Quando o caminhão chegar na indústria, insira o Peso de Destino. A carga é 'Concluída'.",
            "A diferença de peso (quebra) é calculada e registrada para análise de performance."
          ]}
        />

        <ExampleBox title="Exemplo Completo: Carga de 30 TON de Milho">
          <p>• <strong>Pedido de Compra:</strong> PC-2026-A3F2 (João da Silva, R$ 68,00/SC)</p>
          <p>• <strong>Pedido de Venda:</strong> PV-2026-B1C7 (Indústria ABC, R$ 75,00/SC)</p>
          <p>• <strong>Transportadora:</strong> TransLog Ltda</p>
          <p>• <strong>Motorista:</strong> Pedro Santos | Placa: ABC-1234</p>
          <p>• <strong>Peso Origem:</strong> 30.000 KG = 500 SC = 30 TON</p>
          <p>• <strong>Preço Compra:</strong> R$ 68,00/SC --- Total: R$ 34.000,00</p>
          <p>• <strong>Frete:</strong> R$ 120,00/TON --- Total: R$ 3.600,00</p>
          <p className="mt-2 font-bold">• Peso Destino (indústria): 29.850 KG = 497,5 SC</p>
          <p>• <strong>Quebra:</strong> 150 KG (0,5%) - acima do limite</p>
          <p>• <strong>Receita Real:</strong> 497,5 SC x R$ 75,00 = R$ 37.312,50</p>
          <p>• <strong>Lucro da Carga:</strong> R$ 37.312,50 - R$ 34.000,00 - R$ 3.600,00 = <strong className="text-red-700">- R$ 287,50</strong></p>
          <p className="mt-2 text-blue-700 italic">A quebra de 0,5% inverteu o spread. Isso aparecerá nos KPIs de Performance.</p>
        </ExampleBox>

        <SubModule name="Abas do Módulo Logística" desc="'Em Aberto' (fretes pendentes de peso destino), 'Financeiro' (fretes com pagamento pendente), 'Histórico' (todas as cargas)." />

        <SubModule name="Gestão de Carga (Tela de Detalhes)" desc="Permite editar transportadora, motorista, placa, preços e redirecionar para outro PV. Aba 'Financeiro do Frete' lança adiantamentos e pagamentos parciais ao motorista." />

        <SubModule name="Redirecionamento de Carga" desc="Se o destino muda após o carregamento, é possível redirecionar a carga para outro Pedido de Venda. O sistema registra o destino original e permite adicionar um 'Custo de Deslocamento' extra ao frete." />

        <WarningBox text="Ao excluir uma carga, todas as transações financeiras vinculadas (adiantamentos, pagamentos de frete) são estornadas automaticamente." />
      </div>
    ),

    /* ═══════════════════════════════════════════════════════════════ */
    /*  PATRIMÔNIO                                                   */
    /* ═══════════════════════════════════════════════════════════════ */
    assets: (
      <div className="animate-in fade-in slide-in-from-bottom-4">
        <SectionTitle title="Patrimônio (Bens)" icon={Tractor} />
        <p className="text-slate-600 mb-6 leading-relaxed font-medium">
          Cadastre e controle os ativos imobilizados da empresa: veículos, máquinas agrícolas, imóveis e equipamentos.
        </p>

        <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-4">Campos do Formulário</h3>
        <FieldTable fields={[
          { campo: 'Nome / Modelo', tipo: 'Texto', obs: 'Ex: Caminhão Mercedes Axor 2544' },
          { campo: 'Tipo', tipo: 'Seleção', obs: 'Veículo, Máquina, Imóvel, Equipamento ou Outro' },
          { campo: 'Valor de Aquisição', tipo: 'Moeda', obs: 'Preço de compra (deve ser > R$ 0)' },
          { campo: 'Data de Aquisição', tipo: 'Data', obs: 'Data em que o bem foi adquirido' },
          { campo: 'Identificador', tipo: 'Texto', obs: 'Placa, chassi, matrícula ou nº série' },
          { campo: 'Descrição / Observações', tipo: 'Textarea', obs: 'Detalhes adicionais do bem' },
        ]} />

        <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-4">Ciclo de Status</h3>
        <StatusFlow statuses={['Ativo', 'Vendido', 'Baixa (Write-Off)']} />

        <SubModule name="Ativos Imobilizados" desc="A aba 'Ativos' lista todos os bens com status 'ativo'. Os KPIs mostram: Valor Total do Patrimônio, Quantidade de Bens e Valor Médio por Bem." />
        
        <SubModule name="Venda de Ativos" desc="Ao vender um bem, informe: Comprador, Valor de Venda, Data e Número de Parcelas. O sistema gera automaticamente os títulos no Contas a Receber." />
        
        <SubModule name="Baixa por Sinistro (Write-Off)" desc="Para bens roubados, destruídos ou com perda total, use a opção 'Baixar'. O bem sai do inventário sem gerar receita, mantendo apenas o registro histórico para contabilidade." />

        <ExampleBox title="Exemplo: Vendendo um Trator">
          <p>1. Acesse o detalhe do ativo "Trator JD 7200" (Valor de aquisição: R$ 350.000,00)</p>
          <p>2. Clique em <strong>"Vender"</strong></p>
          <p>3. Comprador: Fazenda Rio Bonito Ltda</p>
          <p>4. Valor de venda: R$ 280.000,00</p>
          <p>5. Parcelas: 4x de R$ 70.000,00</p>
          <p className="mt-2 text-blue-700 italic">Sistema cria 4 parcelas em Contas a Receber e move o ativo para "Vendido".</p>
        </ExampleBox>

        <SubModule name="Exportar PDF — Dossiê e Lista" desc="Gere um PDF com o dossiê completo de um ativo específico ou a lista completa do patrimônio da empresa." />
      </div>
    ),

    /* ═══════════════════════════════════════════════════════════════ */
    /*  FLUXO DE CAIXA                                               */
    /* ═══════════════════════════════════════════════════════════════ */
    cashier: (
      <div className="animate-in fade-in slide-in-from-bottom-4">
        <SectionTitle title="Fluxo de Caixa (Fechamento Mensal)" icon={Wallet} />
        <GoldenRule text="O Saldo Real Projetado é a métrica mais importante: (Dinheiro em Banco + Contas a Receber) - (Contas a Pagar). Ele mostra quanto você realmente tem." />

        <p className="text-slate-600 mb-6 leading-relaxed font-medium">
          O módulo de Caixa apresenta uma radiografia financeira completa da empresa, separando 
          Ativos (o que você tem e vai receber) de Passivos (o que você deve e vai pagar).
        </p>

        <SubModule name="Aba: Fechamento do Mês Vigente" desc="Apresenta o balanço atualizado do mês corrente, incluindo saldos bancários, pendências e patrimônio líquido. É a principal tela de gestão financeira." />

        <div className="mb-8">
          <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-4">Composição do Relatório de Caixa</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-200">
              <h4 className="font-black text-emerald-800 text-xs uppercase mb-4">ATIVOS (Receitas e Direitos)</h4>
              <ul className="text-xs text-emerald-700 space-y-2 font-medium">
                <li>• Saldos Bancários (cada banco listado)</li>
                <li>• Saldo Inicial do Mês</li>
                <li>• Vendas a Receber (pendentes)</li>
                <li>• Mercadoria em Trânsito (valor estimado)</li>
                <li>• Empréstimos Concedidos a terceiros</li>
                <li>• Adiantamentos Concedidos (Given)</li>
                <li>• Valor dos Ativos Imobilizados</li>
                <li>• Vendas de Ativos a Receber</li>
                <li>• Saldos Devedores de Sócios</li>
              </ul>
            </div>
            <div className="bg-red-50 p-6 rounded-2xl border border-red-200">
              <h4 className="font-black text-red-800 text-xs uppercase mb-4">PASSIVOS (Débitos e Obrigações)</h4>
              <ul className="text-xs text-red-700 space-y-2 font-medium">
                <li>• Compras a Pagar (fornecedores)</li>
                <li>• Fretes a Pagar (transportadoras)</li>
                <li>• Empréstimos Tomados (bancários)</li>
                <li>• Comissões a Pagar (corretores)</li>
                <li>• Adiantamentos Recebidos (Taken)</li>
                <li>• Pro-labore / Lucros a Pagar (Sócios)</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 text-white p-6 rounded-2xl mb-6">
          <h4 className="font-black text-primary-400 text-xs uppercase mb-3">FÓRMULA DO PATRIMÔNIO LÍQUIDO</h4>
          <p className="text-sm font-mono text-slate-300">Patrimônio Líquido = Total de Ativos - Total de Passivos</p>
          <p className="text-xs text-slate-500 mt-2">Calculado via RPC server-side para garantir precisão.</p>
        </div>

        <SubModule name="Aba: Histórico de Meses" desc="Permite acessar os fechamentos de meses anteriores. Cada fechamento pode ser 'congelado' (snapshot) para manter o registro exato do momento do fechamento." />

        <SubModule name="Snapshot (Foto do Mês)" desc="Ao fechar o mês, clique em 'Gerar Snapshot'. Isso salva uma cópia dos saldos daquele momento exato. Depois do snapshot, os valores ficam imutáveis para consulta futura." />

        <SubModule name="Contas e Disponibilidades" desc="Cadastre cada banco e cofre em Configurações > Contas Bancárias. Os saldos iniciais de implantação são o ponto de partida para a conciliação. O saldo é atualizado apenas por transações financeiras." />

        <InfoBox text="A Conciliação Bancária é garantida pelo sistema: todas as baixas (compras, vendas, despesas) são obrigatoriamente vinculadas a uma conta, então o saldo no ERP deve bater com seu extrato bancário." />
      </div>
    ),

    /* ═══════════════════════════════════════════════════════════════ */
    /*  MÓDULOS FINANCEIROS                                          */
    /* ═══════════════════════════════════════════════════════════════ */
    financial: (
      <div className="animate-in fade-in slide-in-from-bottom-4">
        <SectionTitle title="Módulos Financeiros (Central)" icon={BadgeDollarSign} />
        <p className="text-slate-600 mb-8 leading-relaxed font-medium">
          O módulo Financeiro é o <strong>núcleo do sistema</strong>. Ele consolida 9 sub-módulos que cobrem 
          todas as obrigações, movimentações e histórico de dinheiro da empresa.
        </p>

        {/* CONTAS A PAGAR */}
        <div className="mb-10 p-6 bg-red-50/30 rounded-3xl border border-red-100">
          <div className="flex items-center gap-3 mb-4">
            <CircleDollarSign className="text-red-500" size={20} />
            <h3 className="font-black text-slate-900 uppercase text-sm">1. Contas a Pagar</h3>
          </div>
          <p className="text-sm text-slate-600 mb-4 font-medium">Todas as saídas de dinheiro da empresa em um único painel.</p>
          
          <SubModule name="Sub-abas" desc="Fornecedores Abertos (compras), Fretes Abertos (logística), Comissões Abertas (corretores) e Visão Geral (tudo junto)." />
          
          <FieldTable fields={[
            { campo: 'Descrição', tipo: 'Texto', obs: 'Nome do fornecedor ou transportadora' },
            { campo: 'Valor Original', tipo: 'Moeda', obs: 'Valor total da obrigação' },
            { campo: 'Valor Pago', tipo: 'Moeda', obs: 'Quanto já foi liquidado' },
            { campo: 'Valor Restante', tipo: 'Moeda', obs: 'Diferença a pagar' },
            { campo: 'Vencimento', tipo: 'Data', obs: 'Data-limite para pagamento' },
            { campo: 'Status', tipo: 'Badge', obs: 'Pendente / Parcial / Pago / Vencido' },
          ]} />

          <StatusFlow statuses={['Pendente', 'Parcial', 'Pago']} />
          <p className="text-xs text-slate-500 mb-4">Se a data de vencimento passar e não estiver pago, muda para "Vencido".</p>

          <ExampleBox title="Como pagar uma conta">
            <p>1. Localize a conta na lista (filtre por nome ou nº do pedido)</p>
            <p>2. Clique no botão de <strong>pagamento</strong> (ícone $)</p>
            <p>3. Selecione a <strong>conta bancária</strong> de onde sairá o dinheiro</p>
            <p>4. Informe o <strong>valor</strong> (pode ser parcial!)</p>
            <p>5. Confirme. O sistema debita o banco e baixa o título.</p>
          </ExampleBox>

          <WarningBox text="Contas a Pagar são criadas automaticamente pelos módulos de Compra, Logística, Despesas e Empréstimos. Não é necessário criar manualmente." />
        </div>

        {/* CONTAS A RECEBER */}
        <div className="mb-10 p-6 bg-emerald-50/30 rounded-3xl border border-emerald-100">
          <div className="flex items-center gap-3 mb-4">
            <Banknote className="text-emerald-500" size={20} />
            <h3 className="font-black text-slate-900 uppercase text-sm">2. Contas a Receber</h3>
          </div>
          <p className="text-sm text-slate-600 mb-4 font-medium">Todas as entradas esperadas de dinheiro: vendas e receitas de ativos.</p>

          <SubModule name="Sub-abas" desc="Em Aberto (recebíveis pendentes) e Visão Geral (todos, incluindo recebidos)." />

          <ExampleBox title="Como registrar um recebimento">
            <p>1. Localize a venda (filtre por cliente ou nº do pedido)</p>
            <p>2. Clique em <strong>"Receber"</strong></p>
            <p>3. Selecione a <strong>conta bancária</strong> onde entrará o dinheiro</p>
            <p>4. Informe o <strong>valor recebido</strong></p>
            <p>5. Confirme. O sistema credita o banco e baixa o título.</p>
          </ExampleBox>
        </div>

        {/* ADIANTAMENTOS */}
        <div className="mb-10 p-6 bg-purple-50/30 rounded-3xl border border-purple-100">
          <div className="flex items-center gap-3 mb-4">
            <HandCoins className="text-purple-500" size={20} />
            <h3 className="font-black text-slate-900 uppercase text-sm">3. Adiantamentos</h3>
          </div>
          <p className="text-sm text-slate-600 mb-4 font-medium">Controle de valores antecipados entre a empresa e parceiros.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-orange-50 p-5 rounded-xl border border-orange-200">
              <h4 className="font-black text-orange-800 text-xs uppercase mb-2">GIVEN (Concedidos)</h4>
              <p className="text-xs text-orange-700 font-medium">Você ADIANTOU dinheiro ao parceiro. Ele te DEVE. É um ATIVO da empresa.</p>
              <p className="text-xs text-orange-600 mt-2 italic">Ex: Adiantamento de frete ao motorista antes do carregamento.</p>
            </div>
            <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-200">
              <h4 className="font-black text-indigo-800 text-xs uppercase mb-2">TAKEN (Recebidos)</h4>
              <p className="text-xs text-indigo-700 font-medium">O parceiro te ANTECIPOU dinheiro. Você DEVE a ele. É um PASSIVO da empresa.</p>
              <p className="text-xs text-indigo-600 mt-2 italic">Ex: Cliente pagou antes de receber a mercadoria.</p>
            </div>
          </div>

          <SubModule name="Sub-abas" desc="Recebidos Ativos (taken), Concedidos Ativos (given) e Histórico Geral (todos)." />

          <ExampleBox title="Exemplo: Adiantamento de Frete">
            <p>1. Vá em Adiantamentos &gt; <strong>"+ Novo Adiantamento"</strong></p>
            <p>2. Tipo: <strong>Given (Concedido)</strong></p>
            <p>3. Parceiro: <strong>TransLog Ltda</strong> (transportadora)</p>
            <p>4. Valor: <strong>R$ 2.000,00</strong></p>
            <p>5. Conta: <strong>Banco do Brasil</strong></p>
            <p className="mt-2 text-blue-700 italic">R$ 2.000,00 saem do banco. O saldo do adiantamento fica como crédito da empresa contra a transportadora.</p>
            <p className="mt-1 text-blue-700 italic">Quando o frete for pago, o sistema abate automaticamente o adiantamento do valor total.</p>
          </ExampleBox>
        </div>

        {/* CRÉDITOS */}
        <div className="mb-10 p-6 bg-yellow-50/30 rounded-3xl border border-yellow-100">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="text-yellow-600" size={20} />
            <h3 className="font-black text-slate-900 uppercase text-sm">4. Linhas de Crédito</h3>
          </div>
          <p className="text-sm text-slate-600 mb-4 font-medium">Gerencie limites de crédito bancário, como cheque especial, capital de giro aprovado ou outros.</p>

          <FieldTable fields={[
            { campo: 'Nome da Linha', tipo: 'Texto', obs: 'Ex: Capital de Giro Itaú' },
            { campo: 'Limite Total', tipo: 'Moeda', obs: 'Valor total aprovado' },
            { campo: 'Taxa de Juros', tipo: '%', obs: 'Taxa mensal ou anual' },
            { campo: 'Data Início/Fim', tipo: 'Datas', obs: 'Vigência da linha' },
            { campo: 'Valor Utilizado', tipo: 'Moeda', obs: 'Quanto já foi usado' },
            { campo: 'Disponível', tipo: 'Calculado', obs: 'Limite - Utilizado' },
          ]} />

          <InfoBox text="A barra de progresso da linha de crédito muda de cor: Verde (< 50% usado), Amarelo (50-80%) e Vermelho (> 80%)." />
        </div>

        {/* TRANSFERÊNCIAS */}
        <div className="mb-10 p-6 bg-blue-50/30 rounded-3xl border border-blue-100">
          <div className="flex items-center gap-3 mb-4">
            <ArrowLeftRight className="text-blue-500" size={20} />
            <h3 className="font-black text-slate-900 uppercase text-sm">5. Transferências entre Contas</h3>
          </div>
          <p className="text-sm text-slate-600 mb-4 font-medium">Mova dinheiro entre contas bancárias da empresa. Não cria obrigação financeira.</p>

          <FieldTable fields={[
            { campo: 'Conta Origem', tipo: 'Seleção', obs: 'Banco de onde sai o dinheiro' },
            { campo: 'Conta Destino', tipo: 'Seleção', obs: 'Banco para onde vai o dinheiro' },
            { campo: 'Valor', tipo: 'Moeda', obs: 'Quantia a transferir' },
            { campo: 'Descrição', tipo: 'Texto', obs: 'Motivo da transferência' },
            { campo: 'Data', tipo: 'Data', obs: 'Data da movimentação' },
          ]} />

          <ExampleBox title="Exemplo: Transferência entre Bancos">
            <p>1. Conta Origem: <strong>Banco do Brasil C/C 12345</strong> (Saldo: R$ 50.000,00)</p>
            <p>2. Conta Destino: <strong>Caixa Econômica C/C 67890</strong></p>
            <p>3. Valor: <strong>R$ 15.000,00</strong></p>
            <p className="mt-2 text-blue-700 italic">BB debita R$ 15.000. CEF credita R$ 15.000. O patrimônio líquido NÃO muda.</p>
          </ExampleBox>

          <GoldenRule text="Transferências geram 2 transações (OUT na origem + IN no destino) mas NÃO criam financial_entry. São movimentações internas." />
        </div>

        {/* EMPRÉSTIMOS */}
        <div className="mb-10 p-6 bg-amber-50/30 rounded-3xl border border-amber-100">
          <div className="flex items-center gap-3 mb-4">
            <Landmark className="text-amber-600" size={20} />
            <h3 className="font-black text-slate-900 uppercase text-sm">6. Empréstimos</h3>
          </div>
          <p className="text-sm text-slate-600 mb-4 font-medium">Gerencie dívidas bancárias (tomados) ou empréstimos concedidos a terceiros (concedidos).</p>

          <FieldTable fields={[
            { campo: 'Nome / Entidade', tipo: 'Texto', obs: 'Ex: Itaú Capital de Giro' },
            { campo: 'Tipo', tipo: 'Tomado / Concedido', obs: 'Tomado = dívida | Concedido = crédito' },
            { campo: 'Data Contrato', tipo: 'Data', obs: 'Data de assinatura' },
            { campo: 'Valor Original', tipo: 'Moeda', obs: 'Valor total do empréstimo' },
            { campo: 'Taxa de Juros', tipo: '%', obs: 'Taxa do contrato' },
            { campo: 'Parcelas', tipo: 'Número', obs: 'Quantidade de parcelas' },
            { campo: 'Saldo Devedor', tipo: 'Calculado', obs: 'Quanto ainda deve' },
            { campo: 'Próximo Vencimento', tipo: 'Data', obs: 'Data da próxima parcela' },
          ]} />

          <StatusFlow statuses={['Ativo', 'Quitado', 'Inadimplente']} />

          <ExampleBox title="Exemplo: Empréstimo Bancário de Capital de Giro">
            <p>1. Tipo: <strong>Tomado</strong></p>
            <p>2. Entidade: <strong>Banco Itaú</strong></p>
            <p>3. Valor: <strong>R$ 500.000,00</strong></p>
            <p>4. Juros: <strong>1,5% a.m.</strong></p>
            <p>5. Parcelas: <strong>12</strong></p>
            <p className="mt-2 text-blue-700 italic">R$ 500.000 entram na conta indicada. Sistema cria as 12 parcelas em Contas a Pagar.</p>
            <p className="text-blue-700 italic">Para pagar, vá em Contas a Pagar ou no detalhe do empréstimo e baixe cada parcela.</p>
          </ExampleBox>
        </div>

        {/* DESPESAS ADMINISTRATIVAS */}
        <div className="mb-10 p-6 bg-rose-50/30 rounded-3xl border border-rose-100">
          <div className="flex items-center gap-3 mb-4">
            <Receipt className="text-rose-500" size={20} />
            <h3 className="font-black text-slate-900 uppercase text-sm">7. Despesas Administrativas</h3>
          </div>
          <p className="text-sm text-slate-600 mb-4 font-medium">Gerencie custos operacionais: aluguel, salários, energia, materiais, taxas bancárias, etc.</p>

          <SubModule name="Sub-abas" desc="Para Pagar (mês atual), Comprometimento Futuro (próximos meses) e Histórico Consolidado." />

          <FieldTable fields={[
            { campo: 'Categoria', tipo: 'Seleção', obs: 'Tipo de despesa (cadastrado em Config > Tipos de Despesas)' },
            { campo: 'Descrição', tipo: 'Texto', obs: 'Detalhes da despesa' },
            { campo: 'Valor', tipo: 'Moeda', obs: 'Valor da despesa' },
            { campo: 'Favorecido', tipo: 'Texto', obs: 'A quem será pago' },
            { campo: 'Data da Despesa', tipo: 'Data', obs: 'Quando ocorreu' },
            { campo: 'Vencimento', tipo: 'Data', obs: 'Data-limite para pagamento' },
            { campo: 'Parcelas', tipo: 'Número', obs: 'Permite parcelamento automático' },
          ]} />

          <ExampleBox title="Exemplo: Lançando Aluguel de R$ 5.000/mês por 12 meses">
            <p>1. Categoria: <strong>Aluguel</strong></p>
            <p>2. Descrição: <strong>Aluguel do escritório central</strong></p>
            <p>3. Valor: <strong>R$ 5.000,00</strong></p>
            <p>4. Favorecido: <strong>Imobiliária XYZ</strong></p>
            <p>5. Parcelas: <strong>12</strong></p>
            <p className="mt-2 text-blue-700 italic">Sistema gera 12 parcelas de R$ 5.000 com vencimento mensal progressivo.</p>
            <p className="text-blue-700 italic">Cada parcela aparece em "Para Pagar" no mês correspondente.</p>
          </ExampleBox>

          <WarningBox text="Ao excluir uma despesa que já foi paga, o sistema alertará que será necessário estornar o valor. Os pagamentos viram 'reversed'." />
        </div>

        {/* SÓCIOS */}
        <div className="mb-10 p-6 bg-cyan-50/30 rounded-3xl border border-cyan-100">
          <div className="flex items-center gap-3 mb-4">
            <UserCheck className="text-cyan-600" size={20} />
            <h3 className="font-black text-slate-900 uppercase text-sm">8. Conta de Sócios</h3>
          </div>
          <p className="text-sm text-slate-600 mb-4 font-medium">Conta-corrente interna de cada sócio. Controla aportes, créditos de lucro e retiradas.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-200">
              <h4 className="font-black text-emerald-800 text-xs uppercase mb-2">CRÉDITO (Entrada)</h4>
              <p className="text-xs text-emerald-700 font-medium">Lucro distribuído ou pro-labore lançado a favor do sócio. Aumenta o saldo dele.</p>
              <p className="text-xs text-emerald-600 mt-2 italic">Ex: "Crédito de lucro de fevereiro: R$ 20.000"</p>
            </div>
            <div className="bg-red-50 p-5 rounded-xl border border-red-200">
              <h4 className="font-black text-red-800 text-xs uppercase mb-2">RETIRADA (Saída)</h4>
              <p className="text-xs text-red-700 font-medium">Sócio retira dinheiro. O sistema debita da conta bancária e reduz o saldo do sócio.</p>
              <p className="text-xs text-red-600 mt-2 italic">Ex: "Retirada de lucro via PIX: R$ 10.000"</p>
            </div>
          </div>

          <SubModule name="Crédito em Lote" desc="Permite lançar crédito para múltiplos sócios de uma vez (ex: distribuição mensal de lucros). Defina o valor total e o sistema divide conforme a participação societária ou valores individuais." />

          <SubModule name="Extrato Individual" desc="Clique no card do sócio para ver o extrato completo: histórico de todos os créditos e retiradas, com data, descrição e saldo acumulado." />

          <ExampleBox title="Exemplo: Distribuição de Lucro + Retirada">
            <p>1. <strong>Creditar:</strong> Sócio Carlos --- R$ 30.000,00 (Lucros de janeiro)</p>
            <p>2. Saldo do Carlos: <strong>R$ 30.000,00</strong></p>
            <p>3. <strong>Retirada:</strong> Carlos retira R$ 15.000,00 via Banco Itaú</p>
            <p>4. Saldo do Carlos: <strong>R$ 15.000,00</strong></p>
            <p className="mt-2 text-blue-700 italic">R$ 15.000 saem do Itaú. Carlos ainda tem R$ 15.000 de saldo acumulado.</p>
          </ExampleBox>

          <InfoBox text="O saldo do sócio aparece no Dashboard (Ranking de Sócios) e no Fluxo de Caixa como 'Saldos de Sócios a Pagar' (passivo)." />
        </div>

        {/* HISTÓRICO GERAL */}
        <div className="mb-10 p-6 bg-slate-50 rounded-3xl border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <History className="text-slate-600" size={20} />
            <h3 className="font-black text-slate-900 uppercase text-sm">9. Histórico Geral</h3>
          </div>
          <p className="text-sm text-slate-600 mb-4 font-medium">Extrato completo de todas as transações financeiras realizadas. <strong>Somente leitura.</strong></p>

          <SubModule name="Filtros" desc="Geral (tudo), Saídas (pagamentos), Entradas (recebimentos). Busca por texto, intervalo de datas, categoria e agrupamento por mês ou parceiro." />
          
          <SubModule name="Totais" desc="Cards no topo mostram: Total de Entradas, Total de Saídas e Saldo Líquido do período filtrado." />

          <GoldenRule text="O Histórico é um SELECT direto em financial_transactions. Ele é a ÚNICA VERDADE sobre dinheiro que entrou ou saiu. Nunca altera nada." />
        </div>
      </div>
    ),

    /* ═══════════════════════════════════════════════════════════════ */
    /*  PERFORMANCE & DRE                                            */
    /* ═══════════════════════════════════════════════════════════════ */
    performance: (
      <div className="animate-in fade-in slide-in-from-bottom-4">
        <SectionTitle title="Performance & DRE" icon={BarChart2} />
        <p className="text-slate-600 mb-6 leading-relaxed font-medium">
          Cockpit analítico completo para monitorar a saúde operacional e financeira do negócio. 
          Filtro por período: 3M, 6M, 9M, 12M ou Tudo.
        </p>

        <StepBox 
          title="Análise de Margem"
          steps={[
            "SPREAD OPERACIONAL: Diferença entre Preço de Venda e (Preço de Compra + Frete). É o lucro bruto por operação.",
            "CUSTO DE QUEBRA: Quanto você perdeu em dinheiro por diferença de balança entre fazenda e indústria. Quebra > 0,25% é crítico.",
            "MARGEM LÍQUIDA: Resultado final após descontar todas as despesas de estrutura (aluguel, salários, taxas, impostos)."
          ]}
        />

        <SubModule name="KPIs Financeiros" desc="Cards com: Faturamento Bruto, Total de Débitos, Saldo em Bancos e Patrimônio Líquido. Comparação percentual mês a mês." />
        
        <SubModule name="Estatísticas Operacionais" desc="Total de cargas, volume movimentado, média de preço de compra e venda, quebra média e spread médio por saca." />
        
        <SubModule name="Gráfico de Lucro Líquido" desc="Evolução mensal do lucro líquido. Barras verdes = meses positivos, barras vermelhas = meses com prejuízo." />

        <SubModule name="Gráfico de Volumes" desc="Quantidade de sacas compradas vs. vendidas por mês. Permite identificar tendências de crescimento ou retração." />

        <SubModule name="Tendência de Preços" desc="Evolução dos preços médios de compra e venda ao longo do tempo. Útil para negociação estratégica." />

        <SubModule name="Decomposição de Custos" desc="Gráfico que mostra a composição do custo total: grão (compra), frete, despesas administrativas e comissões." />

        <SubModule name="Performance por Safra/UF" desc="Quebre os resultados por safra e estado para identificar quais regiões dão mais lucro." />

        <SubModule name="DRE — Demonstrativo de Resultado" desc="Tabela mensal no formato contábil: Receita Bruta (menos) Custo do Grão = Lucro Bruto (menos) Fretes (menos) Despesas = Lucro Líquido." />

        <ExampleBox title="Exemplo de Leitura do DRE">
          <p><strong>Janeiro/2026:</strong></p>
          <p>Receita Bruta de Vendas: R$ 450.000,00</p>
          <p>(-) Custo do Grão (CMV): R$ 340.000,00</p>
          <p>(=) Lucro Bruto: R$ 110.000,00</p>
          <p>(-) Fretes: R$ 36.000,00</p>
          <p>(-) Comissões: R$ 4.500,00</p>
          <p>(-) Despesas Admin: R$ 22.000,00</p>
          <p><strong>(=) Lucro Líquido: R$ 47.500,00</strong></p>
          <p className="mt-2 text-blue-700 italic">Margem Líquida: 10,5% — saudável para o setor.</p>
        </ExampleBox>

        <InfoBox text="Exporte todo o painel de Performance como PDF clicando no botão 'Exportar PDF' no canto superior direito." />
      </div>
    ),

    /* ═══════════════════════════════════════════════════════════════ */
    /*  RELATÓRIOS                                                   */
    /* ═══════════════════════════════════════════════════════════════ */
    reports: (
      <div className="animate-in fade-in slide-in-from-bottom-4">
        <SectionTitle title="Relatórios & PDFs" icon={FileText} />
        <p className="text-slate-600 mb-6 leading-relaxed font-medium">
          Central de relatórios gerenciais com <strong>26 modelos</strong> organizados em 5 categorias. 
          Todos permitem filtragem por período e exportação em PDF profissional (A4).
        </p>

        <div className="space-y-6 mb-8">
          <div className="bg-blue-50 p-5 rounded-2xl border border-blue-200">
            <h4 className="font-black text-blue-800 text-xs uppercase mb-3">COMERCIAL (4 relatórios)</h4>
            <ul className="text-xs text-blue-700 space-y-1.5 font-medium">
              <li>• <strong>Faturamento por Período:</strong> Receita bruta agrupada por mês, com gráfico de tendência.</li>
              <li>• <strong>Histórico de Compras:</strong> Todos os pedidos de compra com volumes, valores e status.</li>
              <li>• <strong>Histórico de Vendas:</strong> Todos os pedidos de venda com receita e margem.</li>
              <li>• <strong>Desempenho de Parceiros:</strong> Ranking dos parceiros que mais movimentaram.</li>
            </ul>
          </div>

          <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-200">
            <h4 className="font-black text-emerald-800 text-xs uppercase mb-3">LOGÍSTICA (5 relatórios)</h4>
            <ul className="text-xs text-emerald-700 space-y-1.5 font-medium">
              <li>• <strong>Fretes e Transportes:</strong> Todas as cargas com peso, frete e quebra.</li>
              <li>• <strong>Fretes Pendentes:</strong> Cargas sem peso destino confirmado.</li>
              <li>• <strong>Histórico Mensal:</strong> Volume e valor de fretes mês a mês.</li>
              <li>• <strong>Pagamentos de Frete (Mês):</strong> Quanto pagou a cada transportadora no mês.</li>
              <li>• <strong>Detalhado de Fretes e Pagamentos:</strong> Visão completa por carga com adiantamentos, pagamentos e saldos.</li>
            </ul>
          </div>

          <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200">
            <h4 className="font-black text-amber-800 text-xs uppercase mb-3">FINANCEIRO (10 relatórios)</h4>
            <ul className="text-xs text-amber-700 space-y-1.5 font-medium">
              <li>• <strong>DRE:</strong> Demonstrativo de Resultado do Exercício.</li>
              <li>• <strong>Balancete Contábil:</strong> Resumo de débitos e créditos por conta.</li>
              <li>• <strong>Extrato Conta Bancária:</strong> Movimentações de uma conta específica.</li>
              <li>• <strong>Contas a Pagar:</strong> Todas as obrigações com vencimento e status.</li>
              <li>• <strong>Contas a Receber:</strong> Todos os direitos com expectativa de recebimento.</li>
              <li>• <strong>Transferências:</strong> Movimentações entre contas bancárias.</li>
              <li>• <strong>Empréstimos:</strong> Posição de dívidas e amortizações.</li>
              <li>• <strong>Adiantamentos:</strong> Saldos de adiantamentos por parceiro.</li>
              <li>• <strong>Despesas Detalhadas:</strong> Custos por categoria com evolução mensal.</li>
              <li>• <strong>Movimentações de Sócios:</strong> Extratos individuais de aportes e retiradas.</li>
            </ul>
          </div>

          <div className="bg-purple-50 p-5 rounded-2xl border border-purple-200">
            <h4 className="font-black text-purple-800 text-xs uppercase mb-3">INDICADORES (2 relatórios)</h4>
            <ul className="text-xs text-purple-700 space-y-1.5 font-medium">
              <li>• <strong>Análise ABC de Clientes:</strong> Classificação 80/20 dos clientes por faturamento.</li>
              <li>• <strong>Análise ABC por Estado:</strong> Mesma análise segmentada por UF de origem/destino.</li>
            </ul>
          </div>

          <div className="bg-rose-50 p-5 rounded-2xl border border-rose-200">
            <h4 className="font-black text-rose-800 text-xs uppercase mb-3">CADASTROS (5 relatórios)</h4>
            <ul className="text-xs text-rose-700 space-y-1.5 font-medium">
              <li>• <strong>Listagem de Parceiros:</strong> Todos os parceiros por categoria.</li>
              <li>• <strong>Contas a Receber por Parceiro:</strong> Recebíveis agrupados por cliente.</li>
              <li>• <strong>Contas a Pagar por Parceiro:</strong> Obrigações agrupadas por fornecedor.</li>
              <li>• <strong>Saldo por Parceiro:</strong> Posição financeira líquida de cada parceiro.</li>
              <li>• <strong>Dossiê Completo:</strong> Ficha 360 com todo o histórico do parceiro.</li>
            </ul>
          </div>
        </div>

        <StepBox
          title="Como Gerar Qualquer Relatório"
          steps={[
            "Acesse o módulo Relatórios pelo menu lateral.",
            "Escolha a categoria (Comercial, Logística, Financeiro, etc.).",
            "Clique no card do relatório desejado.",
            "Na tela do relatório, defina os filtros: período, categoria, parceiro, etc.",
            "Clique em 'Gerar Relatório'. Os dados são carregados sob demanda (lazy loading).",
            "Para exportar, clique no botão 'Exportar PDF'. O documento é gerado com cabeçalho, marca d'água e formatação profissional A4."
          ]}
        />

        <SubModule name="Motor de Relatórios" desc="Arquitetura modular: cada relatório tem seu próprio filtro, template e documento PDF. Os módulos são carregados sob demanda (lazy loading) para performance. Todos usam componentes PDF padronizados: cabeçalho, rodapé, tabelas e marca d'água." />

        <SubModule name="Marca D'água nos PDFs" desc="Configure em Configurações > Marca D'água. Carregue a logomarca da empresa para que todos os documentos impressos saiam com identidade visual." />
      </div>
    ),

    /* ═══════════════════════════════════════════════════════════════ */
    /*  CONFIGURAÇÕES                                                */
    /* ═══════════════════════════════════════════════════════════════ */
    settings: (
      <div className="animate-in fade-in slide-in-from-bottom-4">
        <SectionTitle title="Configurações" icon={Settings} />
        <p className="text-slate-600 mb-6 leading-relaxed font-medium">
          Painel administrativo com 13 seções para configurar todos os parâmetros do sistema.
        </p>

        <StepBox 
          title="Checklist de Implantação (Ordem Recomendada)"
          steps={[
            "EMPRESA: Preencha CNPJ, Razão Social, endereço e logomarca.",
            "USUÁRIOS: Crie os acessos. Defina quem pode ver o financeiro e quem opera apenas logística.",
            "SÓCIOS: Cadastre os sócios com participação societária.",
            "CONTAS BANCÁRIAS: Cadastre cada banco com agência, conta e saldo de abertura do dia atual.",
            "SALDO INICIAL: Se estiver migrando de outro sistema, defina os saldos iniciais de obrigações.",
            "TIPOS DE PRODUTOS: Adicione os grãos que você comercializa (Milho, Soja, Sorgo, etc.).",
            "TIPOS DE DESPESAS: Personalize o plano de contas (Aluguel, Combustível, Salários, etc.).",
            "TIPOS DE PARCEIROS: Geralmente já vem preenchido (Produtor Rural, Cliente, Transportadora, Corretor).",
            "CIDADES E UF: A base já vem preenchida. Adicione novas cidades se necessário.",
            "MARCA D'ÁGUA: Carregue a logomarca para PDFs.",
            "API E STATUS: Configure chaves de API (se usar integrações externas).",
            "BACKUP: Configure rotinas de backup (recomendado semanal)."
          ]}
        />

        <div className="space-y-4">
          <SubModule name="1. Empresa" desc="Dados cadastrais: CNPJ, Razão Social, Nome Fantasia, endereço completo, telefone, e-mail e logomarca. Esses dados aparecem nos cabeçalhos de todos os PDFs." />
          
          <SubModule name="2. Usuários" desc="Crie e gerencie acessos. Cada usuário tem: nome, e-mail, senha e nível de acesso. O sistema suporta múltiplos níveis de permissão." />
          
          <SubModule name="3. Sócios" desc="Cadastre os sócios da empresa com: nome, participação (%) e dados de contato. Os sócios aparecem como opções ao criar pedidos (Consultor/Comprador/Vendedor) e no módulo Financeiro > Sócios." />

          <SubModule name="4. Tipos de Produtos" desc="Lista de produtos comercializados. Ex: Milho em Grãos, Soja em Grãos, Sorgo, Café, etc. Esses tipos aparecem como opção ao criar pedidos de compra." />

          <SubModule name="5. API e Status" desc="Monitore o status dos serviços: Supabase (banco de dados), Realtime (sync), Auth (autenticação). Configure webhooks e chaves de API para integrações externas." />

          <SubModule name="6. Tipos de Parceiros" desc="Categorias de parceiros: Produtor Rural, Cliente, Indústria, Transportadora, Corretor, Fornecedor. Podem ser personalizadas." />

          <SubModule name="7. Saldo Inicial" desc="Para empresas que estão migrando de outro sistema: insira os saldos de abertura das contas e das obrigações em aberto. Define o 'ponto zero' do ERP." />

          <SubModule name="8. Contas Bancárias" desc="Cadastre cada conta: Nome do banco, titular, agência, número da conta, tipo (corrente/poupança), saldo inicial e se permite saldo negativo." />

          <SubModule name="9. Tipos de Despesas" desc="Plano de contas para despesas. Organize por tipo: Fixas (aluguel, salários), Variáveis (combustível, insumos) e Administrativas (taxas, impostos)." />

          <SubModule name="10. Backup e Restauração" desc="Gere cópias de segurança e restaure dados em caso de necessidade. Recomendação: backup semanal." />

          <SubModule name="11. Cidades e UF" desc="Base de municípios brasileiros. Usada nos cadastros de parceiros e locais de carregamento/descarregamento." />

          <SubModule name="12. Marca D'água PDF" desc="Carregue a logomarca e configure a marca d'água que aparecerá em todos os documentos PDF gerados pelo sistema (relatórios, dossiês, recibos)." />

          <SubModule name="13. Logs e Eventos" desc="Auditoria completa: cada ação no sistema (login, criação, edição, exclusão, pagamento) gera um log com data, hora, usuário e detalhes da operação. Histórico de sessões e eventos do sistema." />
        </div>

        <WarningBox text="Não altere saldos iniciais após começar a operar o sistema. Isso pode desconciliar todo o financeiro. Se precisar ajustar, procure suporte técnico." />
      </div>
    ),

    /* ═══════════════════════════════════════════════════════════════ */
    /*  MAPA DE INTEGRAÇÃO                                           */
    /* ═══════════════════════════════════════════════════════════════ */
    integration: (
      <div className="animate-in fade-in slide-in-from-bottom-4">
        <SectionTitle title="Mapa de Integração entre Módulos" icon={BrainCircuit} />
        <p className="text-slate-600 mb-6 leading-relaxed font-medium">
          Entenda como todos os módulos se conectam. O Suporte Grãos ERP é uma cadeia integrada 
          onde cada ação em um módulo gera reflexos automáticos em outros.
        </p>

        <div className="bg-slate-900 text-white p-8 rounded-3xl mb-8 font-mono text-xs leading-loose">
          <p className="text-primary-400 font-black mb-4 text-sm">FLUXO PRINCIPAL: COMPRA ate VENDA</p>
          <p className="text-slate-300">Parceiro (Produtor) {'->'} Pedido de Compra {'->'} Conta a Pagar</p>
          <p className="text-slate-500 ml-4">| vincula carga</p>
          <p className="text-slate-300">Logística (Carga) {'->'} Peso Origem + Frete {'->'} 2 Contas a Pagar (grão + frete)</p>
          <p className="text-slate-500 ml-4">| peso destino confirmado</p>
          <p className="text-slate-300">Pedido de Venda {'->'} Conta a Receber (peso destino x preço venda)</p>
          <p className="text-slate-500 ml-4">| pagamentos</p>
          <p className="text-slate-300">Contas a Pagar {'->'} pay_entry() {'->'} financial_transaction (OUT) {'->'} Saldo Banco diminui</p>
          <p className="text-slate-300">Contas a Receber {'->'} receive_entry() {'->'} financial_transaction (IN) {'->'} Saldo Banco aumenta</p>
          <p className="mt-4 text-amber-400 font-black">Tudo converge para: financial_transactions</p>
        </div>

        <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-4">Tabela de Reflexos</h3>
        <div className="overflow-hidden rounded-2xl border border-slate-200 mb-8">
          <table className="w-full text-xs">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-4 py-3 text-left font-black uppercase tracking-wider text-slate-500">Ação</th>
                <th className="px-4 py-3 text-left font-black uppercase tracking-wider text-slate-500">Módulo Origem</th>
                <th className="px-4 py-3 text-left font-black uppercase tracking-wider text-slate-500">Reflexo Automático</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              <tr className="hover:bg-slate-50"><td className="px-4 py-3 font-bold text-slate-700">Criar Pedido de Compra</td><td className="px-4 py-3 text-slate-500">Compras</td><td className="px-4 py-3 text-slate-500">Cria Conta a Pagar (payable)</td></tr>
              <tr className="hover:bg-slate-50"><td className="px-4 py-3 font-bold text-slate-700">Criar Pedido de Venda</td><td className="px-4 py-3 text-slate-500">Vendas</td><td className="px-4 py-3 text-slate-500">Cria Conta a Receber (receivable)</td></tr>
              <tr className="hover:bg-slate-50"><td className="px-4 py-3 font-bold text-slate-700">Criar Carga</td><td className="px-4 py-3 text-slate-500">Logística</td><td className="px-4 py-3 text-slate-500">Cria Conta a Pagar (grão + frete)</td></tr>
              <tr className="hover:bg-slate-50"><td className="px-4 py-3 font-bold text-slate-700">Inserir Peso Destino</td><td className="px-4 py-3 text-slate-500">Logística</td><td className="px-4 py-3 text-slate-500">Recalcula Conta a Receber (receita real)</td></tr>
              <tr className="hover:bg-slate-50"><td className="px-4 py-3 font-bold text-slate-700">Pagar uma Conta</td><td className="px-4 py-3 text-slate-500">Financeiro</td><td className="px-4 py-3 text-slate-500">Cria transação OUT + debita banco</td></tr>
              <tr className="hover:bg-slate-50"><td className="px-4 py-3 font-bold text-slate-700">Receber Pagamento</td><td className="px-4 py-3 text-slate-500">Financeiro</td><td className="px-4 py-3 text-slate-500">Cria transação IN + credita banco</td></tr>
              <tr className="hover:bg-slate-50"><td className="px-4 py-3 font-bold text-slate-700">Transferir entre Bancos</td><td className="px-4 py-3 text-slate-500">Financeiro</td><td className="px-4 py-3 text-slate-500">2 transações (OUT origem + IN destino)</td></tr>
              <tr className="hover:bg-slate-50"><td className="px-4 py-3 font-bold text-slate-700">Tomar Empréstimo</td><td className="px-4 py-3 text-slate-500">Empréstimos</td><td className="px-4 py-3 text-slate-500">Transação IN + parcelas em Contas a Pagar</td></tr>
              <tr className="hover:bg-slate-50"><td className="px-4 py-3 font-bold text-slate-700">Crédito a Sócio</td><td className="px-4 py-3 text-slate-500">Sócios</td><td className="px-4 py-3 text-slate-500">Aumenta saldo do sócio (passivo)</td></tr>
              <tr className="hover:bg-slate-50"><td className="px-4 py-3 font-bold text-slate-700">Retirada de Sócio</td><td className="px-4 py-3 text-slate-500">Sócios</td><td className="px-4 py-3 text-slate-500">Transação OUT + debita banco</td></tr>
              <tr className="hover:bg-slate-50"><td className="px-4 py-3 font-bold text-slate-700">Comprar Ativo</td><td className="px-4 py-3 text-slate-500">Patrimônio</td><td className="px-4 py-3 text-slate-500">Cria Conta a Pagar</td></tr>
              <tr className="hover:bg-slate-50"><td className="px-4 py-3 font-bold text-slate-700">Vender Ativo</td><td className="px-4 py-3 text-slate-500">Patrimônio</td><td className="px-4 py-3 text-slate-500">Cria Contas a Receber (parcelas)</td></tr>
              <tr className="hover:bg-slate-50"><td className="px-4 py-3 font-bold text-slate-700">Lançar Despesa</td><td className="px-4 py-3 text-slate-500">Despesas</td><td className="px-4 py-3 text-slate-500">Cria Contas a Pagar (parcelas se houver)</td></tr>
              <tr className="hover:bg-slate-50"><td className="px-4 py-3 font-bold text-slate-700">Adiantamento (Given)</td><td className="px-4 py-3 text-slate-500">Adiantamentos</td><td className="px-4 py-3 text-slate-500">Transação OUT + saldo de crédito</td></tr>
              <tr className="hover:bg-slate-50"><td className="px-4 py-3 font-bold text-slate-700">Redirecionar Carga</td><td className="px-4 py-3 text-slate-500">Logística</td><td className="px-4 py-3 text-slate-500">Redistribui Conta a Receber para novo PV</td></tr>
            </tbody>
          </table>
        </div>

        <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-4">Tempo Real (Realtime)</h3>
        <p className="text-sm text-slate-600 mb-4 font-medium">
          O sistema escuta mudanças em tempo real nas tabelas: financial_transactions, accounts e financial_entries.
        </p>
        <p className="text-sm text-slate-600 mb-6 font-medium">
          Quando qualquer outro usuário faz um pagamento, recebimento ou transferência, <strong>sua tela atualiza automaticamente</strong> em até 30 segundos, 
          sem necessidade de recarregar a página.
        </p>

        <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-4">Segurança das Operações</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-200">
            <h4 className="font-black text-emerald-800 text-xs uppercase mb-2">O sistema FAZ</h4>
            <ul className="text-xs text-emerald-700 space-y-1 font-medium">
              <li>• Transações SQL atômicas (BEGIN/COMMIT)</li>
              <li>• Validação de saldo antes de debitar</li>
              <li>• Validação de status antes de pagar</li>
              <li>• Rollback em caso de falha</li>
              <li>• Log imutável de cada operação</li>
              <li>• RLS (Row Level Security) por empresa</li>
            </ul>
          </div>
          <div className="bg-red-50 p-5 rounded-xl border border-red-200">
            <h4 className="font-black text-red-800 text-xs uppercase mb-2">O sistema NÃO permite</h4>
            <ul className="text-xs text-red-700 space-y-1 font-medium">
              <li>• Update manual de saldo</li>
              <li>• Cálculo financeiro no frontend</li>
              <li>• Ajuste direto em tabelas</li>
              <li>• Operação sem BEGIN/COMMIT</li>
              <li>• Deleção de transações históricas</li>
              <li>• Acesso cross-company (tenant)</li>
            </ul>
          </div>
        </div>

        <GoldenRule text="O frontend NUNCA faz lógica financeira. Ele apenas chama supabase.rpc('pay_entry', {...}). Toda a lógica está no banco de dados em funções SQL transacionais." />
      </div>
    ),
  };

  return (
    <div className="prose prose-slate max-w-none">
      {contentMap[section]}
      
      <div className="mt-16 p-8 bg-slate-900 rounded-[2rem] text-white flex items-start gap-6 shadow-2xl relative overflow-hidden border border-white/5">
         <div className="absolute -right-4 -bottom-4 opacity-10 text-primary-400 rotate-12"><ShieldCheck size={120}/></div>
         <div className="p-4 bg-primary-600 rounded-2xl shadow-lg relative z-10"><ShieldCheck size={28}/></div>
         <div className="relative z-10">
            <p className="text-[10px] font-black uppercase text-primary-400 tracking-[0.2em] mb-2">Protocolo de Integridade</p>
            <p className="text-sm font-medium text-slate-300 leading-relaxed max-w-2xl">
              Este sistema utiliza criptografia local e auditoria de trilha. Cada alteração financeira gera um log imutável. 
              Para suporte técnico avançado, análise de dados ou customização de módulos, utilize o assistente DLABS AI no painel direito 
              ou contate a Daitec diretamente.
            </p>
         </div>
      </div>
    </div>
  );
};

export default HelpContent;
