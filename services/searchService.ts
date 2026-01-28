
import { partnerService } from './partnerService';
import { purchaseService } from './purchaseService';
import { salesService } from './salesService';
import { loadingService } from './loadingService';
import { financialActionService } from './financialActionService';
import { MENU_ITEMS } from '../constants';
import { ModuleId } from '../types';

export type SearchResultType = 'menu' | 'partner' | 'purchase' | 'sales' | 'loading' | 'financial';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  moduleId: ModuleId;
  metadata?: any;
}

export const searchService = {
  // Alterado para async para simular backend real e preparar para migração API
  searchAll: async (term: string): Promise<SearchResult[]> => {
    if (!term || term.length < 2) return [];
    
    // Simula delay de rede (200ms)
    await new Promise(resolve => setTimeout(resolve, 200));

    const query = term.toLowerCase();
    const results: SearchResult[] = [];

    // 1. BUSCA EM MENUS
    MENU_ITEMS.forEach(item => {
      if (item.label.toLowerCase().includes(query) || item.description.toLowerCase().includes(query)) {
        results.push({
          id: `menu-${item.id}`,
          type: 'menu',
          title: item.label,
          subtitle: 'Navegação de Módulo',
          moduleId: item.id
        });
      }
    });

    // 2. BUSCA EM PARCEIROS
    partnerService.getAll().forEach(p => {
      if (p.name.toLowerCase().includes(query) || p.document.includes(query)) {
        results.push({
          id: p.id,
          type: 'partner',
          title: p.name,
          subtitle: `Parceiro • ${p.document}`,
          moduleId: ModuleId.PARTNERS,
          metadata: { partnerId: p.id }
        });
      }
    });

    // 3. BUSCA EM PEDIDOS DE COMPRA
    purchaseService.getAll().forEach(p => {
      if (p.number.toLowerCase().includes(query) || p.partnerName.toLowerCase().includes(query)) {
        results.push({
          id: p.id,
          type: 'purchase',
          title: `Pedido de Compra #${p.number}`,
          subtitle: `Fornecedor: ${p.partnerName} • Safra: ${p.harvest}`,
          moduleId: ModuleId.PURCHASE_ORDER,
          metadata: { orderId: p.id }
        });
      }
    });

    // 4. BUSCA EM PEDIDOS DE VENDA
    salesService.getAll().forEach(s => {
      if (s.number.toLowerCase().includes(query) || s.customerName.toLowerCase().includes(query)) {
        results.push({
          id: s.id,
          type: 'sales',
          title: `Pedido de Venda #${s.number}`,
          subtitle: `Cliente: ${s.customerName} • Valor: ${s.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
          moduleId: ModuleId.SALES_ORDER,
          metadata: { orderId: s.id }
        });
      }
    });

    // 5. BUSCA EM LOGÍSTICA (PLACAS E NFs)
    loadingService.getAll().forEach(l => {
      if (l.vehiclePlate.toLowerCase().includes(query) || l.invoiceNumber?.toLowerCase().includes(query) || l.driverName.toLowerCase().includes(query)) {
        results.push({
          id: l.id,
          type: 'loading',
          title: `Carga Placa ${l.vehiclePlate}`,
          subtitle: `NF: ${l.invoiceNumber || 'S/N'} • Mot: ${l.driverName} • Origem: ${l.supplierName}`,
          moduleId: ModuleId.LOGISTICS,
          metadata: { loadingId: l.id }
        });
      }
    });

    // 6. BUSCA EM FINANCEIRO (DESCRIÇÃO E ENTIDADE)
    financialActionService.getStandaloneRecords().forEach(r => {
      if (r.description.toLowerCase().includes(query) || r.entityName.toLowerCase().includes(query)) {
        results.push({
          id: r.id,
          type: 'financial',
          title: r.description,
          subtitle: `Financeiro • ${r.entityName} • ${r.category}`,
          moduleId: ModuleId.FINANCIAL,
          metadata: { recordId: r.id }
        });
      }
    });

    return results;
  }
};
