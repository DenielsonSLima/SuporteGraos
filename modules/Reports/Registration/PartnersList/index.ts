
import { Users } from 'lucide-react';
import { ReportModule } from '../../types';
import Template from './Template';
import PdfDocument from './PdfDocument';
import Filters from './Filters';
import { PARTNER_CATEGORY_IDS } from '../../../../constants';

// Mocking partner fetch via existing mock data for demo consistency
// In real app, import { partnerService } from ...
const MOCK_PARTNERS = [
    { id: '1', type: 'PF', categories: ['1'], name: 'José da Silva Fazenda', document: '123.456.789-00', address: { cityName: 'Sinop', stateUf: 'MT' } },
    { id: '2', type: 'PJ', categories: ['2'], name: 'Agro Industrial Norte', document: '12.345.678/0001-99', address: { cityName: 'Sinop', stateUf: 'MT' } },
    { id: '3', type: 'PJ', categories: ['3'], name: 'Rodoviário Expresso', document: '98.765.432/0001-11', address: { cityName: 'Sorriso', stateUf: 'MT' } },
];

const partnersListReport: ReportModule = {
  metadata: {
    id: 'partners_list',
    title: 'Lista Geral de Parceiros',
    description: 'Relatório completo de fornecedores, clientes e transportadoras cadastradas.',
    category: 'registration',
    icon: Users,
    needsDateFilter: false
  },
  initialFilters: {
    type: '',
    categoryId: ''
  },
  FilterComponent: Filters,
  fetchData: ({ type, categoryId }) => {
    // In real app: partnerService.getAll()
    let data = MOCK_PARTNERS;

    if (type) {
      data = data.filter(p => p.type === type);
    }
    if (categoryId) {
      data = data.filter(p => p.categories.includes(categoryId));
    }

    // Map Category IDs to Labels for the report row
    const getCategoryName = (id: string) => {
        if(id === '1') return 'Produtor';
        if(id === '2') return 'Indústria';
        if(id === '3') return 'Transportadora';
        return 'Outros';
    };

    return {
      title: 'Relatório de Parceiros Cadastrados',
      columns: [
        { header: 'Nome / Razão Social', accessor: 'name', align: 'left' },
        { header: 'Documento', accessor: 'document', align: 'center', width: 'w-32' },
        { header: 'Cidade/UF', accessor: 'location', align: 'left' },
        { header: 'Tipo', accessor: 'typeLabel', align: 'center', width: 'w-32' }
      ],
      rows: data.map(p => ({
        ...p,
        location: `${p.address?.cityName || (p.address as any)?.city || 'N/D'}/${p.address?.stateUf || (p.address as any)?.state || '??'}`,    
        typeLabel: getCategoryName(p.categories[0])
      })),
      summary: [{ label: 'Total Parceiros', value: data.length, format: 'number' }],
      subtitle: `Mostrando ${data.length} parceiros cadastrados` // Adicionar subtitle
    };
  },
  Template: Template,
  PdfDocument: PdfDocument
};

export default partnersListReport;
