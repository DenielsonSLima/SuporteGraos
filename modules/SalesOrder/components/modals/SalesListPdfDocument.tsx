import React, { useMemo } from 'react';
import { Document, Page, View, Text } from '@react-pdf/renderer';
import { SalesOrder } from '../../types';
import { pdfStyles } from '../../../../components/pdf/PdfStyles';
import { PdfHeader } from '../../../../components/pdf/PdfHeader';
import { PdfTable, PdfTableColumn } from '../../../../components/pdf/PdfTable';
import { PdfFooter } from '../../../../components/pdf/PdfFooter';
import { PdfWatermark } from '../../../../components/pdf/PdfWatermark';
import { PdfSummary } from '../../../../components/pdf/PdfSummary';

interface Props {
  orders: SalesOrder[];
  title?: string;
  subtitle?: string;
}

const SalesListPdfDocument: React.FC<Props> = ({ 
  orders = [], 
  title = 'Relatório de Pedidos de Venda',
  subtitle = 'Listagem consolidada de contratos de venda de grãos'
}) => {
  const currency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(!val || Math.abs(val) < 0.005 ? 0 : val);

  const num = (val: number, dec = 2) =>
    new Intl.NumberFormat('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(val || 0);

  const dateStr = (val: string) => {
    if (!val) return '-';
    const pureDate = val.split('T')[0];
    const parts = pureDate.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      if (year.length === 4) {
        return `${day}/${month}/${year}`;
      }
    }
    return new Date(val).toLocaleDateString('pt-BR');
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Rascunho';
      case 'pending': return 'Pendente';
      case 'approved': return 'Aberto';
      case 'completed': return 'Finalizado';
      case 'canceled': return 'Cancelado';
      default: return status;
    }
  };

  // ✅ Pré-calcula os valores consolidados de venda
  const totals = useMemo(() => {
    return orders.reduce((acc, order) => {
      const contractQty = Number(order.quantity) || 0;
      const loadedQty = Number(order.deliveredQtySc) || 0;
      const totalValue = Number(order.totalValue) || 0;
      const paidValue = Number(order.paidValue) || 0;
      const discountValue = Number(order.discountValue) || 0;
      const pendingValue = Math.max(0, totalValue - paidValue - discountValue);

      return {
        contractQty: acc.contractQty + contractQty,
        loadedQty: acc.loadedQty + loadedQty,
        totalValue: acc.totalValue + totalValue,
        paidValue: acc.paidValue + paidValue,
        pendingValue: acc.pendingValue + pendingValue
      };
    }, {
      contractQty: 0,
      loadedQty: 0,
      totalValue: 0,
      paidValue: 0,
      pendingValue: 0
    });
  }, [orders]);

  // ✅ Definição de colunas da tabela de vendas
  const columns: PdfTableColumn[] = [
    {
      header: 'Nº Venda',
      width: '8%',
      render: (row) => `#${row.number}`,
      align: 'left'
    },
    {
      header: 'Data',
      width: '8%',
      render: (row) => dateStr(row.date),
      align: 'left'
    },
    {
      header: 'Cliente',
      width: '18%',
      accessor: 'customerName',
      align: 'left'
    },
    {
      header: 'Produto',
      width: '10%',
      accessor: 'productName',
      align: 'left'
    },
    {
      header: 'Contrato',
      width: '9%',
      render: (row) => `${num(Number(row.quantity) || 0, 0)} SC`,
      align: 'right'
    },
    {
      header: 'Entregue',
      width: '9%',
      render: (row) => `${num(Number(row.deliveredQtySc) || 0, 0)} SC`,
      align: 'right'
    },
    {
      header: 'Valor Total',
      width: '10%',
      render: (row) => currency(Number(row.totalValue) || 0),
      align: 'right'
    },
    {
      header: 'Recebido',
      width: '10%',
      render: (row) => currency(Number(row.paidValue) || 0),
      align: 'right'
    },
    {
      header: 'Saldo Aberto',
      width: '10%',
      render: (row) => {
        const total = Number(row.totalValue) || 0;
        const paid = Number(row.paidValue) || 0;
        const disc = Number(row.discountValue) || 0;
        return currency(Math.max(0, total - paid - disc));
      },
      align: 'right'
    },
    {
      header: 'Status',
      width: '8%',
      render: (row) => getStatusLabel(row.status),
      align: 'center'
    }
  ];

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={pdfStyles.page}>
        {/* Marca d'água oficial do sistema */}
        <PdfWatermark />

        {/* Cabeçalho padrão */}
        <PdfHeader 
          title={title} 
          subtitle={subtitle} 
          additionalInfo={[
            { label: 'Total de Vendas', value: String(orders.length) }
          ]}
        />

        {/* Tabela de Dados */}
        <View style={pdfStyles.section}>
          <PdfTable columns={columns} data={orders} alternateRows={true} />
        </View>

        {/* Sumário / Consolidação de Totais */}
        <PdfSummary 
          items={[
            { label: 'Qtd. Total Contratada', value: `${num(totals.contractQty, 0)} SC` },
            { label: 'Qtd. Total Entregue/Carregada', value: `${num(totals.loadedQty, 0)} SC` },
            { label: 'Valor Total Contratos', value: currency(totals.totalValue) },
            { label: 'Total Recebido', value: currency(totals.paidValue), highlight: 'success' },
            { label: 'Saldo Total a Receber', value: currency(totals.pendingValue), isTotal: true, highlight: 'warning' }
          ]}
        />

        {/* Rodapé padrão com numeração de páginas */}
        <PdfFooter />
      </Page>
    </Document>
  );
};

export default SalesListPdfDocument;
