import { FileSpreadsheet } from 'lucide-react';
import { ReportModule } from '../../types';
import Template from './Template';
import PdfDocument from './PdfDocument';
import Filters from './Filters';
import { financialIntegrationService } from '../../../../services/financialIntegrationService';
import { reportsCache } from '../../../../services/reportsCache';

const freightStatementReport: ReportModule = {
  metadata: {
    id: 'freight_statement_report',
    title: 'Extrato Completo de Fretes',
    description: 'Conta corrente com detalhes de pesagem (origem/descarga) e histórico de todos os pagamentos/adiantamentos.',
    category: 'logistics',
    icon: FileSpreadsheet,
    needsDateFilter: true
  },
  initialFilters: {
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
    carrierName: ''
  },
  FilterComponent: Filters,
  fetchData: async ({ startDate, endDate, carrierName }) => {
    const { supabase } = await import('../../../../services/supabase');

    const payables = await financialIntegrationService.getPayables();
    let freightPayables = payables.filter((r) => r.subType === 'freight');

    if (carrierName) {
      freightPayables = freightPayables.filter((r) => r.entityName === carrierName);
    }

    const loadings = await reportsCache.getAllLoadings();
    const loadingMap = new Map();
    loadings.forEach((l: any) => loadingMap.set(l.id, l));

    // Pegar transactions
    const payableIds = freightPayables.map(r => r.id);
    let transactions: any[] = [];
    if (payableIds.length > 0) {
       const chunkSize = 100;
       for (let i = 0; i < payableIds.length; i += chunkSize) {
          const chunk = payableIds.slice(i, i + chunkSize);
          const { data } = await supabase
              .from('financial_transactions')
              .select('id, transaction_date, amount, description, entry_id, type, accounts(account_name)')
              .in('entry_id', chunk);
          if (data) transactions.push(...data);
       }
    }

    // Filtrar fretes do período
    const rows: any[] = [];
    
    freightPayables.forEach(r => {
       const dateRef = r.issueDate || r.dueDate;
       const d = new Date(dateRef).getTime();
       const start = startDate ? new Date(startDate).getTime() : 0;
       const end = endDate ? new Date(endDate).getTime() : Infinity;
       
       if (d >= start && d <= end) {
           const loading = loadingMap.get(r.originId);
           const weightOrigin = loading?.originWeight || 0;
           const weightDest = loading?.destinationWeight || 0;
           const baseCalc = loading?.freightCalculationBase || 'Origem';
           
           const txs = transactions.filter(tx => tx.entry_id === r.id);
           
           rows.push({
               id: r.id,
               date: dateRef,
               carrier: r.entityName,
               driver: loading?.driverName || r.driverName || 'N/A',
               plate: loading?.vehiclePlate || (r as any).plate || 'N/A',
               origin: loading?.originName || 'N/A',
               destination: loading?.destinationName || 'N/A',
               weightOrigin,
               weightDest,
               baseCalc,
               freightValue: r.originalValue || 0,
               freightPaid: r.paidValue || 0,
               balance: r.remainingValue || 0,
               payments: txs.map(tx => ({
                   date: tx.transaction_date,
                   account: tx.accounts?.account_name || 'Caixa/Banco',
                   description: tx.description || (tx.type === 'credit' ? 'Pagamento' : 'Adiantamento'),
                   value: Math.abs(tx.amount)
               })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
           });
       }
    });
    
    rows.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
        title: 'Extrato Completo de Fretes',
        subtitle: `Período: ${startDate ? new Date(startDate+'T12:00:00').toLocaleDateString() : ''} a ${endDate ? new Date(endDate+'T12:00:00').toLocaleDateString() : ''} ${carrierName ? `- ${carrierName}` : ''}`,
        landscape: true,
        rows,
        columns: [
          { header: 'Data', accessor: 'date', format: 'date', width: 'w-24' },
          { header: 'Transportadora', accessor: 'carrier' },
          { header: 'Placa', accessor: 'plate' },
          { header: 'Origem', accessor: 'weightOrigin', format: 'number', align: 'right' },
          { header: 'Descarga', accessor: 'weightDest', format: 'number', align: 'right' },
          { header: 'Base Cálc', accessor: 'baseCalc' },
          { header: 'Valor Frete', accessor: 'freightValue', format: 'currency', align: 'right' },
          { header: 'Adiant/Pago', accessor: 'freightPaid', format: 'currency', align: 'right' },
          { header: 'Saldo', accessor: 'balance', format: 'currency', align: 'right' }
        ],
        summary: [
           { label: 'Total Frete Bruto', value: rows.reduce((a,b) => a + b.freightValue, 0), format: 'currency' },
           { label: 'Total Pago/Adiantado', value: rows.reduce((a,b) => a + b.freightPaid, 0), format: 'currency' },
           { label: 'Saldo Pendente', value: rows.reduce((a,b) => a + b.balance, 0), format: 'currency' }
        ]
    };
  },
  Template: Template,
  PdfDocument: PdfDocument
};

export default freightStatementReport;
