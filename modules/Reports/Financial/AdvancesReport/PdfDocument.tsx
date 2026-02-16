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

  const totalGiven = data.summary?.find(s => s.label.includes('Total Concedido'))?.value || 0;
  const totalTaken = data.summary?.find(s => s.label.includes('Total Recebido'))?.value || 0;

  const columns = [
    { header: 'Data', accessor: 'date', width: '12%', render: (row: any) => date(row.date) },
    { header: 'Parceiro', accessor: 'partnerName', width: '25%' },
    { 
      header: 'Tipo', 
      accessor: 'type', 
      width: '13%', 
      align: 'center' as const,
      render: (row: any) => row.type === 'given' ? 'Concedido' : 'Recebido',
      style: (row: any) => ({
        color: row.type === 'given' ? '#4f46e5' : '#d97706',
        backgroundColor: row.type === 'given' ? '#eef2ff' : '#fef3c7',
        padding: 3,
        borderRadius: 4
      })
    },
    { header: 'Descrição / Motivo', accessor: 'description', width: '25%' },
    { 
      header: 'Status', 
      accessor: 'status', 
      width: '10%', 
      align: 'center' as const,
      render: (row: any) => row.status === 'active' ? 'Aberto' : 'Quitado'
    },
    { 
      header: 'Valor', 
      accessor: 'value', 
      width: '15%', 
      align: 'right' as const,
      render: (row: any) => currency(row.value),
      style: (row: any) => ({ 
        fontWeight: 'bold',
        color: row.type === 'given' ? '#4f46e5' : '#d97706'
      })
    }
  ];

  const summaryItems = [
    { label: 'Total Concedido (Ativo)', value: currency(totalGiven), highlight: 'neutral' as const },
    { label: 'Total Recebido (Passivo)', value: currency(totalTaken), highlight: 'neutral' as const }
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
