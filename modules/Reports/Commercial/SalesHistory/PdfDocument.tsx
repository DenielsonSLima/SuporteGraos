import React from 'react';
import { Document, Page, View } from '@react-pdf/renderer';
import { pdfStyles } from '../../../../components/pdf/PdfStyles';
import { PdfHeader } from '../../../../components/pdf/PdfHeader';
import { PdfTable, PdfTableColumn } from '../../../../components/pdf/PdfTable';
import { PdfFooter } from '../../../../components/pdf/PdfFooter';
import { PdfWatermark } from '../../../../components/pdf/PdfWatermark';
import { PdfSummary } from '../../../../components/pdf/PdfSummary';
import { GeneratedReportData } from '../../types';

const PdfDocument: React.FC<{ data: GeneratedReportData }> = ({ data }) => {
  const currency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);
  const date = (val: string) => new Date(val).toLocaleDateString('pt-BR');

  const columns: PdfTableColumn[] = [
    { header: 'Data', width: '11%', render: (row) => date(row.date) },
    { header: 'Nº Venda', width: '13%', accessor: 'number', align: 'left' },
    { header: 'Cliente', width: '24%', accessor: 'customerName' },
    { header: 'Produto', width: '20%', accessor: 'productName' },
    { header: 'Qtd.', width: '10%', accessor: 'qty', align: 'right' },
    { header: 'Carregado', width: '10%', accessor: 'loaded', align: 'right' },
    { header: 'Total', width: '12%', align: 'right', render: (row) => currency(row.total) }
  ];

  const totalValue = data.summary?.find(s => s.label === 'Total Vendido')?.value || 0;

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <PdfWatermark />
        <PdfHeader title={data.title} subtitle={data.subtitle} />
        
        <View style={pdfStyles.section}>
          <PdfTable columns={columns} data={data.rows} alternateRows />
        </View>

        <PdfSummary items={[
          { label: 'Total Vendido', value: currency(totalValue), isTotal: true, highlight: 'success' }
        ]} />

        <PdfFooter />
      </Page>
    </Document>
  );
};

export default PdfDocument;
