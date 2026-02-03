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
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const total = data.summary?.[0]?.value || 0;

  const columns = [
    { header: 'Nome do Sócio', accessor: 'name', width: '35%' },
    { header: 'Documento', accessor: 'cpf', width: '20%' },
    { 
      header: 'Pro-Labore Configurado', 
      accessor: 'proLabore', 
      width: '22%', 
      align: 'right' as const,
      render: (row: any) => currency(row.proLabore),
      style: () => ({ color: '#64748b' })
    },
    { 
      header: 'Saldo Disponível', 
      accessor: 'balance', 
      width: '23%', 
      align: 'right' as const,
      render: (row: any) => currency(row.balance),
      style: () => ({ fontWeight: 'bold', fontSize: 9, color: '#1e293b' })
    }
  ];

  const summaryItems = [
    { label: 'Saldo Total Acumulado', value: currency(total), highlight: 'neutral' as const }
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
