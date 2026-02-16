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

  const passiveTotal = data.summary?.[0]?.value || 0;
  const activeTotal = data.summary?.[1]?.value || 0;

  const columns = [
    { 
      header: 'Entidade / Banco', 
      accessor: 'entityName', 
      width: '25%'
    },
    { 
      header: 'Tipo', 
      accessor: 'typeLabel', 
      width: '15%',
      align: 'center' as const,
      render: (row: any) => row.typeLabel,
      style: (row: any) => ({
        color: row.type === 'taken' ? '#dc2626' : '#059669',
        backgroundColor: row.type === 'taken' ? '#fef2f2' : '#f0fdf4',
        padding: 3,
        borderRadius: 4
      })
    },
    { 
      header: 'Datas', 
      accessor: 'contractDate', 
      width: '20%',
      render: (row: any) => `Início: ${date(row.contractDate)}\nVenc: ${date(row.nextDueDate)}`
    },
    { 
      header: 'Valor Original', 
      accessor: 'totalValue', 
      width: '20%', 
      align: 'right' as const,
      render: (row: any) => `${currency(row.totalValue)}\n${row.rateLabel}`
    },
    { 
      header: 'Saldo Atual', 
      accessor: 'remainingValue', 
      width: '20%', 
      align: 'right' as const,
      render: (row: any) => currency(row.remainingValue),
      style: () => ({ fontWeight: 'bold', color: '#1e293b' })
    }
  ];

  const summaryItems = [
    { label: 'Total a Receber', value: currency(activeTotal), highlight: 'positive' as const },
    { label: 'Total a Pagar', value: currency(passiveTotal), highlight: 'negative' as const }
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
