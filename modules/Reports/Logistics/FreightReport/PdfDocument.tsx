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
  const numberInt = (val: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(val);
  const number = (val: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(val);
  const date = (val: string) => new Date(val).toLocaleDateString('pt-BR');

  const totalCost = data.summary?.find(s => s.label.includes('Total Fretes'))?.value || 0;
  const totalVolume = data.summary?.find(s => s.label.includes('Total Volume'))?.value || 0;
  const totalBreakage = data.summary?.find(s => s.label.includes('Total Quebra'))?.value || 0;

  const columns = [
    { header: 'Data', accessor: 'date', width: '10%', render: (row: any) => date(row.date) },
    { 
      header: 'Placa / Transp.', 
      accessor: 'plate', 
      width: '20%',
      render: (row: any) => `${row.plate}\n${row.carrier}`
    },
    { header: 'Rota', accessor: 'route', width: '18%' },
    { 
      header: 'P. Origem (Kg)', 
      accessor: 'weightOrigin', 
      width: '13%', 
      align: 'right' as const,
      render: (row: any) => numberInt(row.weightOrigin)
    },
    { 
      header: 'P. Destino (Kg)', 
      accessor: 'weightDest', 
      width: '13%', 
      align: 'right' as const,
      render: (row: any) => row.weightDest > 0 ? numberInt(row.weightDest) : '-'
    },
    { 
      header: 'Quebra (Kg)', 
      accessor: 'breakage', 
      width: '13%', 
      align: 'right' as const,
      render: (row: any) => row.breakage > 0 ? numberInt(row.breakage) : '-',
      style: (row: any) => row.breakage > 0 ? { color: '#dc2626' } : { color: '#94a3b8' }
    },
    { 
      header: 'Valor Frete', 
      accessor: 'value', 
      width: '13%', 
      align: 'right' as const,
      render: (row: any) => currency(row.value)
    }
  ];

  const summaryItems = [
    { label: 'Volume Total Origem', value: `${number(totalVolume)} TON`, highlight: 'neutral' as const },
    { label: 'Total Quebra', value: `${numberInt(totalBreakage)} KG`, highlight: 'negative' as const },
    { label: 'Custo Frete Total', value: currency(totalCost), highlight: 'neutral' as const }
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
