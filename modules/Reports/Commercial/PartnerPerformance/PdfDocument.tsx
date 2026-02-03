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
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const number = (val: number) => 
    new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(val);

  const columns: PdfTableColumn[] = [
    { header: 'Parceiro', width: '32%', accessor: 'name' },
    { header: 'Tipo', width: '16%', accessor: 'type', align: 'center' },
    { header: 'Nº Pedidos', width: '13%', accessor: 'count', align: 'center' },
    { header: 'Volume (SC)', width: '16%', align: 'right', render: (row) => number(row.volume) },
    { header: 'Total Negociado', width: '23%', align: 'right', render: (row) => currency(row.total) }
  ];

  const totalVal = data.summary?.[0]?.value || 0;

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <PdfWatermark />
        <PdfHeader title={data.title} subtitle={data.subtitle} />
        
        <View style={pdfStyles.section}>
          <PdfTable columns={columns} data={data.rows} alternateRows />
        </View>

        <PdfSummary items={[
          { label: 'Total Negociado', value: currency(totalVal), isTotal: true }
        ]} />

        <PdfFooter />
      </Page>
    </Document>
  );
};

export default PdfDocument;
