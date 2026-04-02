
import { Briefcase } from 'lucide-react';
import { ReportModule } from '../../types';
import { financialIntegrationService } from '../../../../services/financialIntegrationService';
import UniversalReportTemplate from '../../templates/UniversalReportTemplate';
import DefaultFilters from '../../components/DefaultFilters';

const expensesDetailedReport: ReportModule = {
  metadata: {
    id: 'expenses_detailed_report',
    title: 'Relatório de Despesas de Estrutura',
    description: 'Análise detalhada de gastos fixos, variáveis e administrativos.',
    category: 'financial',
    icon: Briefcase,
    needsDateFilter: true
  },
  initialFilters: {
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  },
  FilterComponent: DefaultFilters,
  fetchData: async ({ startDate, endDate }) => {
    const payables = await financialIntegrationService.getPayables();
    
    // Filtra apenas despesas administrativas (exclui compras, fretes e recebíveis)
    const records = payables.filter(r => {
        if (r.subType !== 'admin') return false;
        if (startDate && r.issueDate < startDate) return false;
        if (endDate && r.issueDate > endDate) return false;
        return true;
    });

    const total = records.reduce((acc, r) => acc + r.originalValue, 0);

    return {
      title: 'Relatório Analítico de Despesas',
      subtitle: `Análise de gastos de estrutura de ${startDate} a ${endDate}`,
      columns: [
        { header: 'Data Lanç.', accessor: 'issueDate', format: 'date', width: 'w-24' },
        { header: 'Categoria', accessor: 'category', align: 'left', width: 'w-40' },
        { header: 'Descrição do Gasto', accessor: 'description', align: 'left' },
        { header: 'Beneficiário', accessor: 'entityName', align: 'left' },
        { header: 'Valor (R$)', accessor: 'originalValue', format: 'currency', align: 'right' }
      ],
      rows: records,
      summary: [{ label: 'Total de Despesas no Período', value: total, format: 'currency' }]
    };
  },
  Template: UniversalReportTemplate
};

export default expensesDetailedReport;
