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
    { header: 'Data', width: '12%', render: (row) => date(row.date) },
    { header: 'Nº Pedido', width: '15%', accessor: 'number', align: 'left' },
    { header: 'Fornecedor', width: '28%', accessor: 'partnerName' },
    { header: 'Produto', width: '23%', accessor: 'product' },
    { header: 'Volume', width: '12%', accessor: 'volume', align: 'right' },
    { header: 'Total', width: '10%', align: 'right', render: (row) => currency(row.total) }
  ];

  const totalValue = data.summary?.find(s => s.label === 'Total Comprado')?.value || 0;

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <PdfWatermark />
        <PdfHeader title={data.title} subtitle={data.subtitle} />
        
        <View style={pdfStyles.section}>
          <PdfTable columns={columns} data={data.rows} alternateRows />
        </View>

        <PdfSummary items={[
          { label: 'Total Comprado', value: currency(totalValue), isTotal: true, highlight: 'danger' }
        ]} />

        <PdfFooter />
      </Page>
    </Document>
  );
};

export default PdfDocument;
