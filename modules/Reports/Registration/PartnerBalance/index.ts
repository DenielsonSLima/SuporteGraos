
import { Scale } from 'lucide-react';
import { ReportModule } from '../../types';
import { financialIntegrationService } from '../../../../services/financialIntegrationService';
import { advanceService } from '../../../Financial/Advances/services/advanceService';
import Template from './Template';
import PdfDocument from './PdfDocument';
import Filters from '../PartnerReceivables/Filters';

const partnerBalanceReport: ReportModule = {
  metadata: {
    id: 'partner_balance_summary',
    title: 'Extrato Combinado (Saldo)',
    description: 'Encontro de contas (Créditos vs Débitos) por parceiro.',
    category: 'registration',
    icon: Scale,
    needsDateFilter: false
  },
  initialFilters: {
    partnerName: ''
  },
  FilterComponent: Filters,
  fetchData: ({ partnerName }) => {
    // 1. Payables (Debits)
    const payables = financialIntegrationService.getPayables()
      .filter(r => r.status !== 'paid' && ['purchase_order', 'freight', 'commission'].includes(r.subType || ''));
    
    // 2. Receivables (Credits)
    const receivables = financialIntegrationService.getReceivables()
      .filter(r => r.status !== 'paid' && r.subType === 'sales_order');

    // 3. Advances
    const advances = advanceService.getAllTransactions()
      .filter(t => t.status === 'active');

    // Group By Partner
    const map: Record<string, { partner: string, credits: number, debits: number }> = {};

    // Helper to add
    const add = (name: string, type: 'credit' | 'debit', val: number) => {
      if (!map[name]) map[name] = { partner: name, credits: 0, debits: 0 };
      if (type === 'credit') map[name].credits += val;
      else map[name].debits += val;
    };

    payables.forEach(p => add(p.entityName, 'debit', p.originalValue - p.paidValue));
    receivables.forEach(r => add(r.entityName, 'credit', r.originalValue - r.paidValue));
    advances.forEach(a => {
      // Given = Credit (Asset), Taken = Debit (Liability)
      if (a.type === 'given') add(a.partnerName, 'credit', a.value);
      else add(a.partnerName, 'debit', a.value);
    });

    let rows = Object.values(map).map(item => ({
      ...item,
      balance: item.credits - item.debits
    }));

    if (partnerName) {
      rows = rows.filter(r => r.partner.toLowerCase().includes(partnerName.toLowerCase()));
    }

    // Sort by largest net debt or credit
    rows.sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

    const totalCredits = rows.reduce((acc, r) => acc + r.credits, 0);
    const totalDebits = rows.reduce((acc, r) => acc + r.debits, 0);

    return {
      title: 'Extrato de Saldos por Parceiro',
      subtitle: 'Encontro de contas (A Receber vs A Pagar)',
      columns: [
        { header: 'Parceiro', accessor: 'partner', align: 'left' },
        { header: 'Total Créditos (Receber)', accessor: 'credits', format: 'currency', align: 'right' },
        { header: 'Total Débitos (Pagar)', accessor: 'debits', format: 'currency', align: 'right' },
        { header: 'Saldo Líquido', accessor: 'balance', format: 'currency', align: 'right' }
      ],
      rows,
      summary: [
        { label: 'Total Créditos', value: totalCredits, format: 'currency' },
        { label: 'Total Débitos', value: totalDebits, format: 'currency' },
        { label: 'Saldo Geral', value: totalCredits - totalDebits, format: 'currency' }
      ]
    };
  },
  Template: Template,
  PdfDocument: PdfDocument
};

export default partnerBalanceReport;
