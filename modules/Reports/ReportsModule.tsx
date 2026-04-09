
import React, { useState } from 'react';
import {
  Users,
  ShoppingCart,
  Truck,
  DollarSign,
  BarChart2,
  Search,
  FileText,
  ChevronRight,
  Activity,
  Loader2
} from 'lucide-react';
import { ReportCategory } from './types';
import ReportCard from './components/ReportCard';
import ReportScreen from './components/ReportScreen';
import ReportsAnalytics from './components/ReportsAnalytics';
import { REPORT_METADATA } from './registry';
import { useReport } from '../../hooks/useReports';

const CATEGORIES: { id: ReportCategory; label: string; icon: any; color: string; description: string }[] = [
  {
    id: 'commercial',
    label: 'Comercial',
    icon: ShoppingCart,
    color: 'text-blue-600 bg-blue-50 border-blue-100',
    description: 'Vendas, compras e negociações de grãos.'
  },
  {
    id: 'logistics',
    label: 'Logística',
    icon: Truck,
    color: 'text-amber-600 bg-amber-50 border-amber-100',
    description: 'Controle de fretes, rotas e transportadoras.'
  },
  {
    id: 'financial',
    label: 'Financeiro',
    icon: DollarSign,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    description: 'Fluxo de caixa, contas a pagar e receber.'
  },
  {
    id: 'analytics',
    label: 'Indicadores',
    icon: BarChart2,
    color: 'text-violet-600 bg-violet-50 border-violet-100',
    description: 'Análise de performance e KPIs gerenciais.'
  },
  {
    id: 'registration',
    label: 'Cadastros',
    icon: Users,
    color: 'text-slate-600 bg-slate-50 border-slate-200',
    description: 'Listagens de parceiros e contatos.'
  },
];

const ReportsModule: React.FC = () => {
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // TanStack Query: lazy loading automático
  const { data: activeReportModule, isLoading: isLoadingReport } = useReport(activeReportId);

  // Se o analytics estiver ativo, mostra tela de analytics
  if (showAnalytics) {
    return (
      <div className="space-y-6 animate-in fade-in pb-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
              <Activity className="text-emerald-600" />
              Análise de Acesso aos Relatórios
            </h1>
            <p className="text-slate-600">Estatísticas de utilização, downloads e usuários mais ativos.</p>
          </div>
          <button
            onClick={() => setShowAnalytics(false)}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Voltar
          </button>
        </div>
        <ReportsAnalytics />
      </div>
    );
  }

  // Se um relatório estiver ativo, mostra a tela do relatório (Drill-down)
  if (activeReportId) {
    if (isLoadingReport) {
      return (
        <div className="flex h-full w-full items-center justify-center p-10 animate-in fade-in duration-500">
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={32} className="animate-spin text-primary-600" />
            <p className="text-slate-500 font-medium">Carregando relatório...</p>
          </div>
        </div>
      );
    }

    if (activeReportModule) {
      return (
        <ReportScreen
          reportModule={activeReportModule}
          reportId={activeReportId}
          onBack={() => {
            setActiveReportId(null);
          }}
        />
      );
    }
  }

  // Mapeamento de títulos e descrições (lightweight, sem carregar módulos)
  const reportInfo: Record<string, { title: string; description: string; icon: any }> = {
    'freight_general': { title: 'Relatório de Fretes e Transportes', description: 'Controle de transportes, pesagens, quebras e custos logísticos.', icon: Truck },
    'freight_open_report': { title: 'Fretes em Aberto (Pendentes)', description: 'Cargas com saldo financeiro a pagar ou ainda em trânsito/descarregamento.', icon: Truck },
    'freight_monthly_history': { title: 'Histórico de Fretes do Mês', description: 'Relatório completo de todas as cargas do mês com volumes e quebras.', icon: Truck },
    'freight_payments_report': { title: 'Pagamentos de Frete (Mês)', description: 'Lista de adiantamentos e pagamentos de saldo realizados no período.', icon: DollarSign },
    'freight_payments_detailed': { title: 'Relatório Detalhado de Fretes e Pagamentos', description: 'Visualização completa das cargas, pagamentos efetuados e saldos pendentes.', icon: Truck },
    'abc_clients': { title: 'Análise ABC de Clientes', description: 'Classificação de clientes por volume de compras.', icon: BarChart2 },
    'abc_states': { title: 'Análise ABC por Estado', description: 'Distribuição de vendas por estado (UF).', icon: BarChart2 },
    'dre': { title: 'DRE - Demonstrativo de Resultados', description: 'Receitas, despesas e resultado líquido do período.', icon: DollarSign },
    'trial_balance': { title: 'Balancete Contábil', description: 'Movimentações detalhadas por categoria de despesa e receita.', icon: DollarSign },
    'account_statement': { title: 'Extrato de Conta Bancária', description: 'Movimentações e saldo de contas bancárias.', icon: DollarSign },
    'payables_report': { title: 'Contas a Pagar', description: 'Títulos em aberto e pagamentos realizados.', icon: DollarSign },
    'receivables_report': { title: 'Contas a Receber', description: 'Títulos a receber em aberto e recebimentos realizados.', icon: DollarSign },
    'transfers_report': { title: 'Transferências Bancárias', description: 'Histórico de transferências entre contas.', icon: DollarSign },
    'loans_report': { title: 'Empréstimos e Financiamentos', description: 'Contratos tomados e concedidos.', icon: DollarSign },
    'advances_report': { title: 'Adiantamentos', description: 'Adiantamentos realizados fora de contratos.', icon: DollarSign },
    'expenses_detailed': { title: 'Despesas Detalhadas', description: 'Lista completa de despesas por categoria.', icon: DollarSign },
    'shareholders_report': { title: 'Movimentações de Sócios', description: 'Extratos e saldos da conta corrente de sócios.', icon: Users },
    'revenue_report': { title: 'Faturamento por Período', description: 'Receitas de vendas consolidadas.', icon: ShoppingCart },
    'purchases_history': { title: 'Histórico de Compras', description: 'Pedidos de compra realizados.', icon: ShoppingCart },
    'sales_history': { title: 'Histórico de Vendas', description: 'Pedidos de venda realizados.', icon: ShoppingCart },
    'partner_performance': { title: 'Desempenho de Parceiros', description: 'Análise de performance de clientes e fornecedores.', icon: Users },
    'partners_list': { title: 'Listagem de Parceiros', description: 'Cadastro completo de clientes e fornecedores.', icon: Users },
    'partner_receivables': { title: 'Contas a Receber por Parceiro', description: 'Títulos em aberto de cada cliente.', icon: Users },
    'partner_payables': { title: 'Contas a Pagar por Parceiro', description: 'Títulos em aberto de cada fornecedor.', icon: Users },
    'partner_balance': { title: 'Saldo por Parceiro', description: 'Balanço consolidado de recebíveis e pagáveis.', icon: Users },
    'partner_dossier': { title: 'Dossiê Completo do Parceiro', description: 'Histórico completo de transações.', icon: Users },
    'net_worth_evolution': { title: 'Dinâmica do Patrimônio Líquido', description: 'Evolução cronológica do saldo consolidado e projeção financeira.', icon: DollarSign }
  };

  // Filtragem usando metadados + info local
  const filteredMetadata = REPORT_METADATA.filter(meta => {
    const term = searchTerm.toLowerCase();
    const info = reportInfo[meta.id];
    if (!info) return false;
    return (
      info.title.toLowerCase().includes(term) ||
      info.description.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">

      {/* Header & Search */}
      <div className="bg-slate-900 text-white p-8 rounded-2xl shadow-lg relative overflow-hidden flex items-start justify-between">
        <div className="relative z-10 max-w-2xl flex-1">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <FileText className="text-emerald-400" />
            Central de Relatórios
          </h1>
          <p className="text-slate-300 mb-6 text-sm">
            Acesse todos os dados do sistema organizados por departamento. Selecione um relatório para visualizar, filtrar e exportar em PDF.
          </p>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="O que você está procurando? (Ex: Vendas, Fretes, Caixa...)"
              className="w-full pl-12 pr-4 py-4 rounded-xl text-slate-900 bg-white shadow-lg focus:outline-none focus:ring-4 focus:ring-emerald-500/30 placeholder:text-slate-400 font-medium"
            />
          </div>
        </div>

        {/* Analytics Button */}
        <button
          onClick={() => setShowAnalytics(true)}
          className="relative z-10 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors shadow-lg"
          title="Estatísticas de Acesso"
        >
          <Activity size={20} />
          <span className="hidden sm:inline">Analytics</span>
        </button>

        {/* Decorative Background */}
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-white/5 to-transparent pointer-events-none"></div>
        <div className="absolute -right-10 -bottom-20 opacity-10">
          <FileText size={300} />
        </div>
      </div>

      {/* Categories Grid */}
      <div className="space-y-10">
        {CATEGORIES.map(category => {
          // Filtra relatórios desta categoria que correspondem à busca
          const categoryReports = filteredMetadata.filter(meta => meta.category === category.id);

          // Se não houver relatórios nesta categoria (devido à busca), não renderiza a seção
          if (categoryReports.length === 0) return null;

          return (
            <div key={category.id} className="animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-3 mb-4 border-b border-slate-200 pb-2">
                <div className={`p-2 rounded-lg border ${category.color}`}>
                  <category.icon size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">{category.label}</h2>
                  <p className="text-xs text-slate-500 hidden sm:block">{category.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {categoryReports.map(meta => {
                  const info = reportInfo[meta.id];
                  if (!info) return null;

                  return (
                    <ReportCard
                      key={meta.id}
                      title={info.title}
                      description={info.description}
                      icon={info.icon}
                      color={category.color}
                      onClick={() => setActiveReportId(meta.id)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

        {filteredMetadata.length === 0 && (
          <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            <Search size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-600">Nenhum relatório encontrado</h3>
            <p className="text-slate-400">Tente buscar por outro termo.</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default ReportsModule;
