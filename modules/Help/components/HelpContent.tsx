
import React from 'react';
import { HelpSection } from '../HelpModule';
// Added missing icons: LayoutDashboard, Users, ShoppingCart, Tractor, BadgeDollarSign, BarChart2, FileText, Settings, TrendingUp
import { 
  ArrowRight, CheckCircle2, AlertTriangle, Info, 
  ShieldCheck, Wallet, ShoppingBag, Truck, Package,
  Scale, Zap, LayoutDashboard, Users, ShoppingCart, 
  Tractor, BadgeDollarSign, BarChart2, FileText, Settings, TrendingUp
} from 'lucide-react';

interface Props {
  section: HelpSection;
}

const HelpContent: React.FC<Props> = ({ section }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);

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

  const contentMap: Record<HelpSection, React.ReactNode> = {
    intro: (
      <div className="animate-in fade-in slide-in-from-bottom-4">
        <SectionTitle title="Visão Geral" icon={LayoutDashboard} />
        <p className="text-slate-600 mb-8 leading-relaxed font-medium text-lg">O Suporte Grãos ERP foi projetado para blindar a operação da sua cerealista ou trading, garantindo que cada quilo de grão seja rastreado financeiramente.</p>
        
        <GoldenRule text="O sistema é baseado em competência física: uma dívida só existe após o caminhão ser carregado na fazenda." />

        <StepBox 
          title="Os 4 Pilares da Operação"
          steps={[
            "Cadastro: Organize parceiros por categorias (Produtor, Transportadora, etc) para habilitar visões específicas.",
            "Contratos (Pedidos): Onde se define o preço e o volume máximo negociado.",
            "Execução (Cargas): A alma do sistema. É aqui que os romaneios de origem e destino encontram o custo do frete.",
            "Liquidação (Financeiro): Onde os adiantamentos e saldos são baixados para as contas bancárias reais."
          ]}
        />
      </div>
    ),
    partners: (
      <div className="animate-in fade-in slide-in-from-bottom-4">
        <SectionTitle title="Parceiros & Contatos" icon={Users} />
        <p className="text-slate-600 mb-6">Centralize todos os stakeholders da sua cadeia de suprimentos.</p>
        
        <SubModule name="Busca Inteligente ReceitaWS" desc="Ao cadastrar um CNPJ, clique em Consultar. O sistema preenche automaticamente razão social, endereço e contato, reduzindo erros de digitação." />
        <SubModule name="Ficha 360º (Dossiê)" desc="No card de cada parceiro, há um botão de impressora que gera um dossiê completo: histórico de todas as compras, vendas e o saldo financeiro líquido atualizado." />
        <SubModule name="Gestão de Motoristas" desc="Para transportadoras, cadastre os motoristas e vincule-os a veículos para criar 'Conjuntos'. Isso facilita o lançamento de fretes na logística." />
      </div>
    ),
    purchases: (
      <div className="animate-in fade-in slide-in-from-bottom-4">
        <SectionTitle title="Pedidos de Compra" icon={ShoppingCart} />
        <GoldenRule text="A compra é a base do seu estoque. O preço aqui definido é o seu custo de mercadoria (CMV)." />
        <StepBox 
          title="Fluxo de Contrato de Compra"
          steps={[
            "Defina o volume em sacas (SC) e o valor unitário acordado com o produtor.",
            "O saldo do contrato é baixado automaticamente conforme os romaneios são lançados na Logística.",
            "Utilize a 'Aprovação' para destravar o pagamento ao produtor.",
            "Finalize o pedido apenas quando o volume físico estiver 100% carregado e o financeiro quitado."
          ]}
        />
        <SubModule name="Comissões de Terceiros" desc="Se houver corretor, o sistema permite lançar a comissão e escolher se ela será um custo da empresa ou descontada do produtor." />
      </div>
    ),
    sales: (
      <div className="animate-in fade-in slide-in-from-bottom-4">
        <SectionTitle title="Pedidos de Venda" icon={TrendingUp} />
        <p className="text-slate-600 mb-6">As vendas representam o destino final do grão e a geração de receita.</p>
        <SubModule name="Faturamento por Peso de Destino" desc="Crucial: O valor a receber do cliente (Indústria) é calculado com base no peso confirmado na balança dele, não no carregamento." />
        <SubModule name="Monitoramento de Spread" desc="A tela de detalhes da venda mostra o 'Lucro Real por Carga', subtraindo o custo do grão e o frete logístico." />
      </div>
    ),
    logistics: (
      <div className="animate-in fade-in slide-in-from-bottom-4">
        <SectionTitle title="Logística & Pesagem" icon={Truck} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
           <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 relative overflow-hidden">
              <Scale size={32} className="absolute -right-2 -bottom-2 text-blue-200" />
              <h4 className="font-black text-blue-800 text-xs uppercase mb-2">Peso de Origem</h4>
              <p className="text-xs text-blue-700 font-medium leading-relaxed">Referência para pagar o Produtor. É o volume retirado da fazenda. Define a quebra de transporte.</p>
           </div>
           <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 relative overflow-hidden">
              <Package size={32} className="absolute -right-2 -bottom-2 text-emerald-200" />
              <h4 className="font-black text-emerald-800 text-xs uppercase mb-2">Peso de Destino</h4>
              <p className="text-xs text-emerald-700 font-medium leading-relaxed">Referência para cobrar o Cliente. É o volume que chegou na indústria. Define a receita real.</p>
           </div>
        </div>
        <StepBox 
          title="Gestão do Frete"
          steps={[
            "Lance o adiantamento de frete no momento do carregamento (Gera baixa no banco).",
            "Lance despesas de estrada (ex: vale diesel) que serão descontadas do saldo do motorista.",
            "Configure se o frete é pago sobre o peso carregado ou entregue.",
            "O saldo de frete só fica disponível para pagamento após a inserção do peso de destino."
          ]}
        />
      </div>
    ),
    assets: (
      <div className="animate-in fade-in slide-in-from-bottom-4">
        <SectionTitle title="Patrimônio (Bens)" icon={Tractor} />
        <SubModule name="Ativos Imobilizados" desc="Cadastre veículos, máquinas e imóveis. O sistema mantém o histórico de valor de aquisição para o balanço patrimonial." />
        <SubModule name="Venda de Ativos" desc="Ao vender um trator ou caminhão, o sistema pergunta o número de parcelas e gera automaticamente os títulos no Contas a Receber." />
        <SubModule name="Baixa por Sinistro" desc="Itens roubados ou com perda total podem ser 'Baixados', saindo do inventário sem gerar receita, mantendo apenas o registro histórico." />
      </div>
    ),
    cashier: (
      <div className="animate-in fade-in slide-in-from-bottom-4">
        <SectionTitle title="Fluxo de Caixa" icon={Wallet} />
        <GoldenRule text="O Saldo Real Projetado é a métrica mais importante: (Dinheiro em Banco + O que tenho pra receber) - (O que tenho pra pagar)." />
        <SubModule name="Contas & Disponibilidades" desc="Cadastre cada banco e cofre. Os saldos iniciais de implantação são o ponto de partida para a conciliação mensal." />
        <SubModule name="Conciliação Bancária" desc="Todas as baixas de compras, vendas e despesas devem ser vinculadas a uma conta, garantindo que o saldo no ERP bata com o seu extrato bancário." />
      </div>
    ),
    financial: (
      <div className="animate-in fade-in slide-in-from-bottom-4">
        <SectionTitle title="Módulos Financeiros" icon={BadgeDollarSign} />
        <div className="space-y-6">
          <SubModule name="Adiantamentos (GIVEN vs TAKEN)" desc="Given: Você pagou antes da carga (Ativo). Taken: O cliente te pagou antes da entrega (Passivo)." />
          <SubModule name="Conta Sócios" desc="Sistema de conta-corrente interna. O sócio pode ter saldos acumulados de lucro que são abatidos conforme ele realiza retiradas de caixa." />
          <SubModule name="Empréstimos" desc="Gerencie dívidas bancárias ou capital de giro tomado, monitorando amortizações e saldos devedores residuais." />
        </div>
      </div>
    ),
    performance: (
      <div className="animate-in fade-in slide-in-from-bottom-4">
        <SectionTitle title="Performance & DRE" icon={BarChart2} />
        <StepBox 
          title="Análise de Margem"
          steps={[
            "Spread Operacional: Diferença entre Venda e (Compra + Frete).",
            "Custo de Quebra: O quanto você perdeu em dinheiro por diferença de balança entre fazenda e indústria.",
            "Margem Líquida: O resultado final após pagar todas as despesas de estrutura (aluguel, salários, taxas)."
          ]}
        />
      </div>
    ),
    reports: (
      <div className="animate-in fade-in slide-in-from-bottom-4">
        <SectionTitle title="Relatórios & PDFs" icon={FileText} />
        <SubModule name="Motor de Relatórios" desc="Todos os relatórios permitem filtragem por período e categoria. A exportação gera PDFs profissionais otimizados para papel A4." />
        <SubModule name="Marca D'água" desc="Configure a logomarca e marca d'água em Configurações para que todos os documentos saiam com a identidade visual da sua empresa." />
      </div>
    ),
    settings: (
      <div className="animate-in fade-in slide-in-from-bottom-4">
        <SectionTitle title="Configurações" icon={Settings} />
        <StepBox 
          title="Checklist de Implantação"
          steps={[
            "Dados da Empresa: Preencha o CNPJ e a Razão Social corretamente.",
            "Usuários: Defina quem pode ver o financeiro e quem opera apenas logística.",
            "Bancos: Cadastre as contas e os saldos de abertura do dia atual.",
            "Categorias: Personalize o seu plano de contas para despesas fixas e variáveis."
          ]}
        />
      </div>
    )
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
              Este sistema utiliza criptografia local e auditoria de trilha. Cada alteração financeira gera um log imutável. Para suporte técnico avançado ou customização de módulos, contate a Daitec através da IA assistente ao lado.
            </p>
         </div>
      </div>
    </div>
  );
};

export default HelpContent;
