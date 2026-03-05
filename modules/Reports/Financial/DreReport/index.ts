
import { BarChart2 } from 'lucide-react';
import { ReportModule } from '../../types';
import { financialIntegrationService } from '../../../../services/financialIntegrationService';
import { financialService } from '../../../../services/financialService';
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
  fetchData: ({ startDate, endDate }) => {
    const filterFn = (date: string) => (!startDate || date >= startDate) && (!endDate || date <= endDate);

    const payables = financialIntegrationService
      .getPayables()
      .filter((r) => filterFn(r.issueDate || r.dueDate));

    const receivables = financialIntegrationService
      .getReceivables()
      .filter((r) => filterFn(r.issueDate || r.dueDate));

    const standalone = payables.filter((r) => r.subType === 'admin');
    const expenseCats = financialService.getExpenseCategories();

    // 1. RECEITA BRUTA (Vendas)
    const revenue = receivables
      .filter((r) => r.subType === 'sales_order')
      .reduce((acc, r) => acc + r.originalValue, 0);

    // 2. CUSTOS VARIÁVEIS (Deduções Diretas)
    const grainCost = payables
      .filter((r) => r.subType === 'purchase_order')
      .reduce((acc, r) => acc + r.originalValue, 0);

    const freightCost = payables
      .filter((r) => r.subType === 'freight')
      .reduce((acc, r) => acc + r.originalValue, 0);

    const varCommission = payables
      .filter((r) => r.subType === 'commission')
      .reduce((acc, r) => acc + r.originalValue, 0);

    const contributionMargin = revenue - (grainCost + freightCost + varCommission);

    // 3. DESPESAS FIXAS / ESTRUTURA
    const getCatType = (name: string) => expenseCats.find(c => c.subtypes.some(s => s.name === name))?.type || 'administrative';
    
    const fixedCosts = standalone.filter(r => getCatType(r.category) === 'fixed').reduce((acc, r) => acc + r.originalValue, 0);
    const adminCosts = standalone.filter(r => getCatType(r.category) === 'administrative').reduce((acc, r) => acc + r.originalValue, 0);
    const otherCosts = standalone.filter(r => getCatType(r.category) === 'custom').reduce((acc, r) => acc + r.originalValue, 0);

    const netProfit = contributionMargin - (fixedCosts + adminCosts + otherCosts);

    // Estrutura hierárquica para o template
    return {
      title: 'Demonstrativo de Resultado do Exercício (DRE)',
      subtitle: `Competência: ${startDate} a ${endDate}`,
      columns: [], // DRE não usa colunas padrão
      rows: [
        { label: '1. RECEITA BRUTA DE VENDAS', value: revenue, isHeader: true },
        { label: '(-) Custos de Mercadoria (Grãos)', value: -grainCost, indent: true },
        { label: '(-) Custos Logísticos (Fretes)', value: -freightCost, indent: true },
        { label: '(-) Comissões Variáveis', value: -varCommission, indent: true },
        { label: '(=) MARGEM DE CONTRIBUIÇÃO', value: contributionMargin, isTotal: true },
        { label: '2. DESPESAS OPERACIONAIS', value: -(fixedCosts + adminCosts + otherCosts), isHeader: true },
        { label: '(-) Despesas Fixas', value: -fixedCosts, indent: true },
        { label: '(-) Despesas Administrativas', value: -adminCosts, indent: true },
        { label: '(-) Outras Despesas', value: -otherCosts, indent: true },
        { label: '(=) RESULTADO LÍQUIDO (LUCRO/PREJUÍZO)', value: netProfit, isFinal: true }
      ],
      summary: [
          { label: 'Margem de Lucro', value: revenue > 0 ? (netProfit / revenue) * 100 : 0, format: 'number' }
      ]
    };
  },
  Template: Template,
  PdfDocument: PdfDocument
};

export default dreReport;
