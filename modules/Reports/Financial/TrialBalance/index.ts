
import { Scale } from 'lucide-react';
import { ReportModule } from '../../types';
import { cashierService } from '../../../Cashier/services/cashierService';
import UniversalReportTemplate from '../../templates/UniversalReportTemplate';

const trialBalanceReport: ReportModule = {
  metadata: {
    id: 'trial_balance',
    title: 'Balancete Consolidado',
    description: 'Posição simplificada de Ativos (Direitos) e Passivos (Obrigações).',
    category: 'financial',
    icon: Scale,
    needsDateFilter: false
  },
  initialFilters: {},
  fetchData: async () => {
    const report = await cashierService.getCurrentMonthReport();

    const rows = [
      { cat: 'Ativo Circulante', item: 'Saldos em Bancos/Caixa', val: report.totalBankBalance, type: 'C' },
      { cat: 'Ativo Circulante', item: 'Contas a Receber (Vendas)', val: report.pendingSalesReceipts, type: 'C' },
      { cat: 'Ativo Circulante', item: 'Adiantamentos Concedidos', val: report.advancesGiven, type: 'C' },
      { cat: 'Ativo Não Circulante', item: 'Patrimônio Imobilizado', val: report.totalFixedAssetsValue, type: 'C' },
      { cat: 'Passivo Circulante', item: 'Fornecedores a Pagar', val: report.pendingPurchasePayments, type: 'D' },
      { cat: 'Passivo Circulante', item: 'Fretes a Pagar', val: report.pendingFreightPayments, type: 'D' },
      { cat: 'Passivo Circulante', item: 'Obrigações com Sócios', val: report.shareholderPayables, type: 'D' },
      { cat: 'Passivo Circulante', item: 'Empréstimos/Financ.', val: report.loansTaken, type: 'D' },
    ];

    return {
      title: 'Balancete de Verificação Consolidado',
      subtitle: `Posição Patrimonial em ${new Date().toLocaleDateString()}`,
      columns: [
        { header: 'Grupo Contábil', accessor: 'cat', align: 'left' },
        { header: 'Conta / Descrição', accessor: 'item', align: 'left' },
        { header: 'Natureza', accessor: 'type', align: 'center', width: 'w-20' },
        { header: 'Saldo (R$)', accessor: 'val', format: 'currency', align: 'right' }
      ],
      rows,
      summary: [
        { label: 'Total Ativos', value: report.totalAssets, format: 'currency' },
        { label: 'Total Passivos', value: report.totalLiabilities, format: 'currency' },
        { label: 'Patrimônio Líquido', value: report.netBalance, format: 'currency' }
      ]
    };
  },
  Template: UniversalReportTemplate
};

export default trialBalanceReport;
