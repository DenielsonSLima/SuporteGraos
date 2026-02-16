import React from 'react';
import { Document, Page, View, Text } from '@react-pdf/renderer';
import { pdfStyles } from '../../../../components/pdf/PdfStyles';
import { PdfHeader } from '../../../../components/pdf/PdfHeader';
import { PdfWatermark } from '../../../../components/pdf/PdfWatermark';
import { PdfFooter } from '../../../../components/pdf/PdfFooter';
import { PdfTable } from '../../../../components/pdf/PdfTable';
import { PdfSummary } from '../../../../components/pdf/PdfSummary';
import { GeneratedReportData } from '../../types';

const PdfDocument: React.FC<{ data: GeneratedReportData }> = ({ data }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);
  const date = (val: string) => new Date(val).toLocaleDateString('pt-BR');

  const total = data.summary?.[0]?.value || 0;

  const columns = [
    { header: 'Data', accessor: 'date', width: '12%', render: (row: any) => date(row.date) },
    { 
      header: 'Origem', 
      accessor: 'originAccount', 
      width: '23%',
      style: () => ({ color: '#dc2626' })
    },
    { 
      header: '➜', 
      accessor: 'arrow', 
      width: '6%', 
      align: 'center' as const,
      render: () => '➜',
      style: () => ({ color: '#94a3b8' })
    },
    { 
      header: 'Destino', 
      accessor: 'destinationAccount', 
      width: '23%',
      style: () => ({ color: '#059669' })
    },
    { header: 'Descrição', accessor: 'description', width: '23%' },
    { 
      header: 'Valor', 
      accessor: 'value', 
      width: '13%', 
      align: 'right' as const,
      render: (row: any) => currency(row.value),
      style: () => ({ fontWeight: 'bold' })
    }
  ];

  const summaryItems = [
    { label: 'Volume Total Transferido', value: currency(total), highlight: 'neutral' as const }
  ];

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <PdfWatermark />
        <PdfHeader title={data.title} subtitle={data.subtitle} />
        
        <View style={pdfStyles.section}>
          <PdfTable 
            columns={columns} 
            data={data.rows} 
            alternateRows 
          />
        </View>

        <PdfSummary items={summaryItems} />
        
        <PdfFooter />
      </Page>
    </Document>
  );
};

export default PdfDocument;
