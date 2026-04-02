
import { BarChart2 } from 'lucide-react';
import { ReportModule } from '../../types';
import { supabase } from '../../../../services/supabase';
import Template from './Template';
import PdfDocument from './PdfDocument';
import DefaultFilters from '../../components/DefaultFilters';

const dreReport: ReportModule = {
  metadata: {
    id: 'dre_gerencial',
    title: 'DRE Gerencial',
    description: 'Demonstrativo de Resultado do Exercício: Lucro Bruto, Margem e Resultado Líquido.',
    category: 'financial',
    icon: BarChart2,
    needsDateFilter: true
  },
  initialFilters: {
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  },
  FilterComponent: DefaultFilters,
  fetchData: async ({ startDate, endDate }) => {
    const { data, error } = await supabase.rpc('rpc_get_dre_report', {
      p_start_date: startDate,
      p_end_date: endDate
    });

    if (error) {
      console.error('Erro ao buscar DRE:', error);
      throw error;
    }

    const {
      revenue,
      grainCost,
      freightCost,
      commissionCost,
      contributionMargin,
      fixedCosts,
      adminCosts,
      otherCosts,
      totalExpenses,
      netProfit,
      profitMargin,
      expenseCategories = []
    } = data;

    // Montagem das linhas do relatório (Frontend Burro)
    const reportRows = [
      { label: '1. RECEITA BRUTA DE VENDAS', value: revenue, isHeader: true },
      { label: '(-) Custos de Mercadoria (Grãos)', value: -grainCost, indent: true },
      { label: '(-) Custos Logísticos (Fretes)', value: -freightCost, indent: true },
      { label: '(-) Comissões Variáveis', value: -commissionCost, indent: true },
      { label: '(=) MARGEM DE CONTRIBUIÇÃO', value: contributionMargin, isTotal: true },
      { label: '2. DESPESAS OPERACIONAIS', value: -totalExpenses, isHeader: true },
      { label: '(-) Despesas Fixas', value: -fixedCosts, indent: true },
      { label: '(-) Despesas Administrativas', value: -adminCosts, indent: true },
      { label: '(-) Outras Despesas', value: -otherCosts, indent: true },
      { label: '(=) RESULTADO LÍQUIDO (LUCRO/PREJUÍZO)', value: netProfit, isFinal: true }
    ];

    // Detalhamento opcional de despesas (Injetado dinamicamente)
    const detailedExpenses = expenseCategories.map((cat: any) => ({
      label: `   • ${cat.name}`,
      value: -cat.value,
      indent: true,
      isSubDetail: true
    }));

    return {
      title: 'Demonstrativo de Resultado do Exercício (DRE)',
      subtitle: `Competência: ${startDate} a ${endDate}`,
      columns: [],
      rows: reportRows,
      detailedExpenses, // Novo campo para o Template usar se quiser
      summary: [
        { label: 'Margem de Lucratividade', value: profitMargin, format: 'number' }
      ]
    };
  },
  Template: Template,
  PdfDocument: PdfDocument
};

export default dreReport;

