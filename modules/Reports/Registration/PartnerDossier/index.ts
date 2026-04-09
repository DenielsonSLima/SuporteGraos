
import { ClipboardList } from 'lucide-react';
import { ReportModule } from '../../types';
import { partnerService } from '../../../../services/partnerService';
import { reportsCache } from '../../../../services/reportsCache';
import { financialIntegrationService } from '../../../../services/financialIntegrationService';
import { advanceService } from '../../../Financial/Advances/services/advanceService';
import Filters from './Filters';
import Template from './Template';
import PdfDocument from './PdfDocument';

const partnerDossierReport: ReportModule = {
  metadata: {
    id: 'partner_dossier',
    title: 'Dossiê do Parceiro',
    description: 'Ficha completa com dados cadastrais, histórico de pedidos, logística e financeiro.',
    category: 'registration',
    icon: ClipboardList,
    needsDateFilter: false
  },
  initialFilters: {
    partnerId: ''
  },
  FilterComponent: Filters,
  fetchData: async ({ partnerId }) => {
    if (!partnerId) {
      return { title: 'Selecione um Parceiro', columns: [], rows: [] };
    }

    const partner = await partnerService.getById(partnerId);
    if (!partner) {
      return { title: 'Parceiro não encontrado', columns: [], rows: [] };
    }

    // --- 1. PURCHASES ---
    const allPurchases = await reportsCache.getAllPurchases();
    const purchases = allPurchases.filter(p => p.partnerId === partnerId && p.status !== 'canceled');
    
    // --- 2. SALES ---
    const allSales = await reportsCache.getAllSales();
    const sales = allSales.filter(s => s.customerId === partnerId && s.status !== 'canceled');

    // --- 3. LOADINGS (As Supplier or Customer or Carrier) ---
    const allLoadings = await reportsCache.getAllLoadings();
    const loadings = allLoadings.filter(l => 
        l.supplierName === partner.name || 
        l.customerName === partner.name || 
        l.carrierId === partnerId
    );

    // --- 4. FINANCIAL SUMMARY ---
    // Calculate pending values
    const allPayables = await financialIntegrationService.getPayables();
    const payables = allPayables.filter(p => p.entityName === partner.name && p.status !== 'paid');

    const allReceivables = await financialIntegrationService.getReceivables();
    const receivables = allReceivables.filter(r => r.entityName === partner.name && r.status !== 'paid');

    const advances = await advanceService.getTransactionsByPartner(partnerId);

    const totalToPay = payables.reduce((acc, p) => acc + (p.remainingValue || 0), 0);
    const totalToReceive = receivables.reduce((acc, r) => acc + (r.remainingValue || 0), 0);
    
    // Advances Net Calculation
    const advancesGiven = advances.filter(a => a.type === 'given' && a.status === 'active').reduce((acc, a) => acc + a.value, 0);
    const advancesTaken = advances.filter(a => a.type === 'taken' && a.status === 'active').reduce((acc, a) => acc + a.value, 0);

    // The data structure passed to rows will be complex, customized for the Dossier Template
    // We pass a single row containing all objects to keep the type signature somewhat valid, 
    // but the template will destructure it.
    const dossierData = {
        partner,
        purchases,
        sales,
        loadings,
        financial: {
            totalToPay,
            totalToReceive,
            advancesGiven,
            advancesTaken,
            netBalance: (totalToReceive + advancesGiven) - (totalToPay + advancesTaken)
        }
    };

    return {
      title: `Dossiê: ${partner.name}`,
      subtitle: `Documento gerado em ${new Date().toLocaleDateString()}`,
      columns: [], // Not used in this custom template
      rows: [dossierData] // Putting everything in one row for the template to parse
    };
  },
  Template: Template,
  PdfDocument: PdfDocument
};

export default partnerDossierReport;
