
import { ReportModule } from '../../types';
import { supabase } from '../../../../services/supabase';
import { authService } from '../../../../services/authService';
import Template from './Template';
import PdfDocument from './PdfDocument';
import DefaultFilters from '../../components/DefaultFilters';

const payablesReport: ReportModule = {
  metadata: {
    id: 'payables_open',
    title: 'Contas a Pagar',
    description: 'Títulos em aberto, vencimentos e fornecedores pendentes.',
    category: 'financial',
    icon: DollarSign,
    needsDateFilter: true
  },
  initialFilters: {
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 2, 0).toISOString().split('T')[0], // +2 months for payables
  },
  FilterComponent: DefaultFilters,
  fetchData: async ({ startDate, endDate }) => {
    const user = authService.getCurrentUser();
    if (!user?.companyId) throw new Error('Empresa não encontrada');

    // SQL-FIRST: Busca registros já filtrados por data no banco
    const { data: result, error } = await supabase.rpc('rpc_report_financial_entries_v1', {
      p_company_id: user.companyId,
      p_type: 'payable',
      p_start_date: startDate,
      p_end_date: endDate
    });

    if (error) {
      console.error('Erro ao buscar contas a pagar via RPC:', error);
      throw error;
    }

    const records = result.records || [];
    const pendingTotal = result.records.reduce((acc: number, r: any) => acc + (r.remainingValue || 0), 0);

    return {
      title: 'Relatório de Contas a Pagar',
      subtitle: `Vencimentos de ${startDate} até ${endDate}`,
      columns: [
        { header: 'Vencimento', accessor: 'due_date', format: 'date' },
        { header: 'Beneficiário', accessor: 'entityName' },
        { header: 'Descrição', accessor: 'description' },
        { header: 'Categoria', accessor: 'category' },
        { header: 'Valor Original', accessor: 'originalValue', format: 'currency', align: 'right' },
        { header: 'Saldo Devedor', accessor: 'balance', format: 'currency', align: 'right' }
      ],
      rows: records.map((r: any) => ({ ...r, balance: r.remainingValue || 0, dueDate: r.due_date })),
      summary: [{ label: 'Total a Pagar', value: pendingTotal, format: 'currency' }]
    };
  },
  Template: Template,
  PdfDocument: PdfDocument
};

export default payablesReport;
