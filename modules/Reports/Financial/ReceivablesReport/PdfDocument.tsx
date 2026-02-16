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

  const totalPending = data.summary?.find(s => s.label.includes('Total a Receber'))?.value || 0;

  const columns = [
    { header: 'Vencimento', accessor: 'dueDate', width: '12%', render: (row: any) => date(row.dueDate) },
    { 
      header: 'Cliente / Devedor', 
      accessor: 'entityName', 
      width: '30%',
      render: (row: any) => `${row.entityName}\n${row.description}`
    },
    { header: 'Categoria', accessor: 'category', width: '18%' },
    { 
      header: 'Valor Orig.', 
      accessor: 'originalValue', 
      width: '18%', 
      align: 'right' as const,
      render: (row: any) => currency(row.originalValue),
      style: () => ({ color: '#64748b' })
    },
    { 
      header: 'Saldo a Receber', 
      accessor: 'balance', 
      width: '22%', 
      align: 'right' as const,
      render: (row: any) => currency(row.balance),
      style: () => ({ fontWeight: 'bold', color: '#059669' })
    }
  ];

  const summaryItems = [
    { label: 'Total a Receber', value: currency(totalPending), highlight: 'positive' as const }
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
