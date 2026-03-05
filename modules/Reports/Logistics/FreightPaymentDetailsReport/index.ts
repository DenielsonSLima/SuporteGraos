import { Map } from 'lucide-react';
import { ReportModule } from '../../types';
import { financialIntegrationService } from '../../../../services/financialIntegrationService';
import Template from './Template';
import PdfDocument from './PdfDocument';
import Filters from './Filters';

const freightPaymentDetailsReport: ReportModule = {
    metadata: {
        id: 'freight_payments_detailed',
        title: 'Relatório Detalhado de Fretes e Pagamentos',
        description: 'Visualização completa das cargas, pagamentos efetuados e saldos pendentes.',
        category: 'logistics',
        icon: Map,
        needsDateFilter: true
    },
    initialFilters: {
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
        carrierName: ''
    },
    FilterComponent: Filters,
    fetchData: ({ startDate, endDate, carrierName }) => {
        const records = financialIntegrationService
          .getPayables()
          .filter((r) => r.subType === 'freight')
          .filter((r) => {
            const referenceDate = r.issueDate || r.dueDate;
            if (startDate && endDate) {
                const d = new Date(referenceDate).getTime();
                const start = new Date(startDate).getTime();
                const end = new Date(endDate).getTime();
                if (d < start || d > end) return false;
            }
            if (carrierName && r.entityName !== carrierName) return false;
            return true;
        });

        return {
            title: 'Relatório Detalhado de Fretes e Pagamentos',
            subtitle: `Fretes de ${new Date(startDate + 'T12:00:00').toLocaleDateString('pt-BR')} a ${new Date(endDate + 'T12:00:00').toLocaleDateString('pt-BR')}${carrierName ? ` - ${carrierName}` : ''}`,
            landscape: true,
            columns: [
                { header: 'Data', accessor: 'date', format: 'date', width: 'w-24' },
                { header: 'Transportadora', accessor: 'carrier' },
                { header: 'Origem', accessor: 'origin' },
                { header: 'Destino', accessor: 'destination' },
                { header: 'Valor Bruto', accessor: 'freightValue', format: 'currency', align: 'right' },
                { header: 'Total Pago', accessor: 'freightPaid', format: 'currency', align: 'right' },
                { header: 'Saldo Pendente', accessor: 'balance', format: 'currency', align: 'right' }
            ],
            rows: records.map(r => {
                return {
                    id: r.id,
                    date: r.issueDate || r.dueDate,
                    carrier: r.entityName,
                    driver: r.driverName || 'N/A',
                    plate: 'N/A',
                    origin: 'N/A',
                    destination: 'N/A',
                    freightValue: r.originalValue || 0,
                    freightPaid: r.paidValue || 0,
                    balance: r.remainingValue || 0,
                    payments: []
                };
            }),
            summary: [
                { label: 'Total Fretes Bruto', value: records.reduce((a, b) => a + (b.originalValue || 0), 0), format: 'currency' },
                { label: 'Total Fretes Pagos', value: records.reduce((a, b) => a + (b.paidValue || 0), 0), format: 'currency' },
                { label: 'Saldo Pendente', value: records.reduce((a, b) => a + (b.remainingValue || 0), 0), format: 'currency' }
            ]
        };
    },
    Template: Template,
    PdfDocument: PdfDocument
};

export default freightPaymentDetailsReport;
