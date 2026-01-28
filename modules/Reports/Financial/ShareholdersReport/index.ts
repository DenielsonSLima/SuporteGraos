
import { Users } from 'lucide-react';
import { ReportModule } from '../../types';
import { shareholderService } from '../../../../services/shareholderService';
import Template from './Template';

const shareholdersReport: ReportModule = {
  metadata: {
    id: 'shareholder_summary',
    title: 'Conta Corrente de Sócios',
    description: 'Resumo de saldos, pro-labore e retiradas dos acionistas.',
    category: 'financial',
    icon: Users,
    needsDateFilter: false
  },
  initialFilters: {},
  FilterComponent: undefined,
  fetchData: () => {
    const shareholders = shareholderService.getAll();
    
    const totalBalance = shareholders.reduce((acc, s) => acc + s.financial.currentBalance, 0);

    return {
      title: 'Posição Financeira dos Sócios',
      subtitle: `Saldos acumulados até ${new Date().toLocaleDateString()}`,
      columns: [
        { header: 'Nome do Sócio', accessor: 'name', align: 'left' },
        { header: 'CPF', accessor: 'cpf', align: 'left' },
        { header: 'Pro-Labore Mensal', accessor: 'proLabore', format: 'currency', align: 'right' },
        { header: 'Saldo Atual (A Pagar)', accessor: 'balance', format: 'currency', align: 'right' }
      ],
      rows: shareholders.map(s => ({
        name: s.name,
        cpf: s.cpf,
        proLabore: s.financial.proLaboreValue,
        balance: s.financial.currentBalance
      })),
      summary: [
          { label: 'Total Acumulado (Obrigação)', value: totalBalance, format: 'currency' }
      ]
    };
  },
  Template: Template
};

export default shareholdersReport;
