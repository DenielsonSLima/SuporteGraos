
import { purchaseService } from '../../../services/purchaseService';
import { salesService } from '../../../services/salesService';
import { loadingService } from '../../../services/loadingService';
import { financialIntegrationService } from '../../../services/financialIntegrationService';
import { shareholderService } from '../../../services/shareholderService';
import { GeneratedReportData, ReportColumn } from '../types';
import { PARTNER_CATEGORY_IDS } from '../../../constants';

// Helper Formats
const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const number = (val: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(val);
const date = (val: string) => new Date(val).toLocaleDateString('pt-BR');

export const reportService = {
  
  generate: (reportId: string, startDate?: string, endDate?: string): GeneratedReportData => {
    let data: GeneratedReportData = {
      title: 'Relatório',
      subtitle: `Gerado em ${new Date().toLocaleString()}`,
      columns: [],
      rows: []
    };

    // Date Filtering Helper
    const filterByDate = (dateStr: string) => {
      if (!startDate && !endDate) return true;
      const d = new Date(dateStr).getTime();
      const start = startDate ? new Date(startDate).getTime() : 0;
      const end = endDate ? new Date(endDate).getTime() : Infinity;
      return d >= start && d <= end;
    };

    switch (reportId) {
      // --- CADASTROS ---
      case 'partners_list': {
        // Assume importing mock from a service or reusing logic. 
        // For this example, we'll use a mocked fetch from what we know exists in PartnerModule context via imports if possible, 
        // but since services are isolated, we need to ensure PartnerService exists or use a mock here.
        // We will simulate fetching from the mock data we know is in the app structure.
        // Ideally, partnerService should be exported like purchaseService.
        // Using a placeholder data structure for demonstration of the report engine.
        data.title = 'Relatório Geral de Parceiros';
        data.columns = [
          { header: 'Nome / Razão Social', accessor: 'name', align: 'left' },
          { header: 'Documento', accessor: 'document', align: 'center', width: 'w-32' },
          { header: 'Cidade/UF', accessor: 'location', align: 'left' },
          { header: 'Tipo', accessor: 'type', align: 'center', width: 'w-24' }
        ];
        // Mocking data as partnerService is not fully exposed in previous context files provided
        data.rows = [
            { name: 'José da Silva Fazenda', document: '123.456.789-00', location: 'Sinop/MT', type: 'Produtor' },
            { name: 'Agro Industrial Norte', document: '12.345.678/0001-99', location: 'Sinop/MT', type: 'Indústria' },
            { name: 'Rodoviário Expresso', document: '98.765.432/0001-11', location: 'Sorriso/MT', type: 'Transportadora' }
        ]; 
        break;
      }

      // --- COMERCIAL ---
      case 'purchases_history': {
        data.title = 'Histórico de Compras (Entrada de Grãos)';
        data.subtitle = `Período: ${startDate ? date(startDate) : 'Início'} a ${endDate ? date(endDate) : 'Hoje'}`;
        data.columns = [
          { header: 'Data', accessor: 'date', format: 'date', width: 'w-24' },
          { header: 'Nº Pedido', accessor: 'number', width: 'w-28' },
          { header: 'Fornecedor', accessor: 'partnerName' },
          { header: 'Produto', accessor: 'product' },
          { header: 'Volume', accessor: 'volume', align: 'right' },
          { header: 'Valor Total', accessor: 'total', format: 'currency', align: 'right' }
        ];
        
        const records = purchaseService.getAll().filter(p => filterByDate(p.date));
        data.rows = records.map(p => ({
          date: p.date,
          number: p.number,
          partnerName: p.partnerName,
          product: p.items[0]?.productName || 'Grãos',
          volume: `${p.items.reduce((a, b) => a + b.quantity, 0)} ${p.items[0]?.unit || 'SC'}`,
          total: p.totalValue
        }));
        
        const totalVal = records.reduce((acc, r) => acc + r.totalValue, 0);
        data.summary = [{ label: 'Total Comprado', value: totalVal, format: 'currency' }];
        break;
      }

      case 'sales_history': {
        data.title = 'Histórico de Vendas (Saída)';
        data.columns = [
          { header: 'Data', accessor: 'date', format: 'date', width: 'w-24' },
          { header: 'Nº Pedido', accessor: 'number', width: 'w-28' },
          { header: 'Cliente', accessor: 'customerName' },
          { header: 'Produto', accessor: 'productName' },
          { header: 'Quantidade', accessor: 'qty', align: 'right' },
          { header: 'Valor Total', accessor: 'total', format: 'currency', align: 'right' }
        ];
        const records = salesService.getAll().filter(s => filterByDate(s.date));
        data.rows = records.map(s => ({
          ...s,
          qty: s.quantity ? `${s.quantity} SC` : '-',
          total: s.totalValue
        }));
        data.summary = [{ label: 'Total Vendido', value: records.reduce((acc, r) => acc + r.totalValue, 0), format: 'currency' }];
        break;
      }

      // --- LOGÍSTICA ---
      case 'freight_general': {
        data.title = 'Relatório Geral de Fretes e Transportes';
        data.columns = [
          { header: 'Data', accessor: 'date', format: 'date', width: 'w-24' },
          { header: 'Placa', accessor: 'plate', width: 'w-24' },
          { header: 'Transportadora', accessor: 'carrier' },
          { header: 'Origem -> Destino', accessor: 'route' },
          { header: 'Peso (Kg)', accessor: 'weight', format: 'number', align: 'right' },
          { header: 'Valor Frete', accessor: 'value', format: 'currency', align: 'right' }
        ];
        const records = loadingService.getAll().filter(l => filterByDate(l.date));
        data.rows = records.map(l => ({
          date: l.date,
          plate: l.vehiclePlate,
          carrier: l.carrierName,
          route: `${l.supplierName.split(' ')[0]} -> ${l.customerName.split(' ')[0]}`,
          weight: l.weightKg,
          value: l.totalFreightValue
        }));
        data.summary = [
            { label: 'Total Fretes (R$)', value: records.reduce((a,b) => a + b.totalFreightValue, 0), format: 'currency' },
            { label: 'Total Volume (Ton)', value: records.reduce((a,b) => a + b.weightKg, 0) / 1000, format: 'number' }
        ];
        break;
      }

      case 'refusals': {
        data.title = 'Cargas Recusadas e Remanejadas';
        data.columns = [
          { header: 'Data', accessor: 'date', format: 'date' },
          { header: 'Placa', accessor: 'plate' },
          { header: 'Motorista', accessor: 'driver' },
          { header: 'Destino Original', accessor: 'original' },
          { header: 'Novo Destino', accessor: 'new' },
          { header: 'Motivo/Obs', accessor: 'notes' }
        ];
        const records = loadingService.getAll().filter(l => l.status === 'redirected' && filterByDate(l.date));
        data.rows = records.map(l => ({
          date: l.date,
          plate: l.vehiclePlate,
          driver: l.driverName,
          original: l.originalDestination || 'N/D',
          new: l.customerName,
          notes: l.notes || '-'
        }));
        break;
      }

      // --- FINANCEIRO ---
      case 'payables_open': {
        data.title = 'Contas a Pagar (Em Aberto)';
        data.columns = [
          { header: 'Vencimento', accessor: 'dueDate', format: 'date' },
          { header: 'Beneficiário', accessor: 'entityName' },
          { header: 'Descrição', accessor: 'description' },
          { header: 'Categoria', accessor: 'category' },
          { header: 'Valor Original', accessor: 'originalValue', format: 'currency', align: 'right' },
          { header: 'Saldo Devedor', accessor: 'balance', format: 'currency', align: 'right' }
        ];
        const records = financialIntegrationService.getPayables()
            .filter(r => r.status !== 'paid' && filterByDate(r.dueDate));
        
        data.rows = records.map(r => ({ ...r, balance: r.originalValue - r.paidValue }));
        data.summary = [{ label: 'Total a Pagar', value: data.rows.reduce((a,b) => a + b.balance, 0), format: 'currency' }];
        break;
      }

      case 'receivables_open': {
        data.title = 'Contas a Receber (Em Aberto)';
        data.columns = [
          { header: 'Vencimento', accessor: 'dueDate', format: 'date' },
          { header: 'Cliente', accessor: 'entityName' },
          { header: 'Descrição', accessor: 'description' },
          { header: 'Valor Total', accessor: 'originalValue', format: 'currency', align: 'right' },
          { header: 'A Receber', accessor: 'balance', format: 'currency', align: 'right' }
        ];
        const records = financialIntegrationService.getReceivables()
            .filter(r => r.status !== 'paid' && filterByDate(r.dueDate));
        
        data.rows = records.map(r => ({ ...r, balance: r.originalValue - r.paidValue }));
        data.summary = [{ label: 'Total a Receber', value: data.rows.reduce((a,b) => a + b.balance, 0), format: 'currency' }];
        break;
      }

      // --- INDICADORES ---
      case 'avg_price_month': {
        data.title = 'Média de Preço de Compra (Por Mês)';
        data.columns = [
          { header: 'Mês/Ano', accessor: 'month', align: 'left' },
          { header: 'Volume Comprado (SC)', accessor: 'volume', format: 'number', align: 'right' },
          { header: 'Valor Total', accessor: 'total', format: 'currency', align: 'right' },
          { header: 'Preço Médio (R$/SC)', accessor: 'avg', format: 'currency', align: 'right' }
        ];

        // Logic
        const groups: Record<string, { vol: number, money: number }> = {};
        purchaseService.getAll().filter(p => p.status !== 'canceled').forEach(p => {
            const dateObj = new Date(p.date);
            const key = `${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`; // M/YYYY
            if (!groups[key]) groups[key] = { vol: 0, money: 0 };
            
            // Calc volume in SC from items
            const volSc = p.items.reduce((acc, i) => acc + i.quantity, 0); 
            groups[key].vol += volSc;
            groups[key].money += p.totalValue;
        });

        data.rows = Object.entries(groups).map(([key, val]) => ({
            month: key,
            volume: val.vol,
            total: val.money,
            avg: val.vol > 0 ? val.money / val.vol : 0
        })).sort((a,b) => {
            const [m1, y1] = a.month.split('/').map(Number);
            const [m2, y2] = b.month.split('/').map(Number);
            return new Date(y1, m1).getTime() - new Date(y2, m2).getTime();
        });
        break;
      }

      case 'freight_avg_uf': {
        data.title = 'Média de Frete por Estado (UF)';
        data.columns = [
          { header: 'Origem (UF)', accessor: 'uf', align: 'center' },
          { header: 'Cargas Realizadas', accessor: 'count', align: 'center' },
          { header: 'Média R$/Ton', accessor: 'avg', format: 'currency', align: 'right' }
        ];

        const groups: Record<string, { count: number, sumPrice: number }> = {};
        const loadings = loadingService.getAll();
        
        // We need to infer UF from supplier address. 
        // Since Loading type doesn't store UF directly in this version, we look up the Purchase Order.
        loadings.forEach(l => {
            const po = purchaseService.getById(l.purchaseOrderId);
            const uf = po?.partnerState || 'N/D';
            
            if (l.freightPricePerTon > 0) {
                if (!groups[uf]) groups[uf] = { count: 0, sumPrice: 0 };
                groups[uf].count++;
                groups[uf].sumPrice += l.freightPricePerTon;
            }
        });

        data.rows = Object.entries(groups).map(([uf, val]) => ({
            uf,
            count: val.count,
            avg: val.count > 0 ? val.sumPrice / val.count : 0
        }));
        break;
      }
    }

    return data;
  }
};
