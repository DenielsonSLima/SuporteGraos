import React from 'react';
import { Document, Page, View, Text } from '@react-pdf/renderer';
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

  const columns: PdfTableColumn[] = [
    {
      header: 'Parceiro',
      width: '35%',
      accessor: 'partner',
      align: 'left'
    },
    {
      header: 'Créditos (Receber)',
      width: '18%',
      align: 'right',
      render: (row) => currency(row.credits)
    },
    {
      header: 'Débitos (Pagar)',
      width: '18%',
      align: 'right',
      render: (row) => currency(row.debits)
    },
    {
      header: 'Saldo Líquido',
      width: '18%',
      align: 'right',
      render: (row) => currency(Math.abs(row.balance))
    },
    {
      header: 'Situação',
      width: '11%',
      align: 'center',
      render: (row) => {
        if (row.balance > 0) return 'A RECEBER';
        if (row.balance < 0) return 'A PAGAR';
        return 'ZERADO';
      }
    }
  ];

  const tCredits = data.summary?.[0]?.value || 0;
  const tDebits = data.summary?.[1]?.value || 0;
  const tBalance = data.summary?.[2]?.value || 0;

  const summaryItems = [
    { label: 'Total Créditos', value: currency(tCredits), highlight: 'success' as const },
    { label: 'Total Débitos', value: currency(tDebits), highlight: 'danger' as const },
    { 
      label: 'Saldo Geral', 
      value: currency(tBalance), 
      isTotal: true,
      highlight: (tBalance >= 0 ? 'success' : 'danger') as 'success' | 'danger'
    }
  ];

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <PdfWatermark />
        
        <PdfHeader
          title={data.title}
          subtitle={data.subtitle}
        />

        <View style={pdfStyles.section}>
          <PdfTable
            columns={columns}
            data={data.rows}
            alternateRows={true}
          />
        </View>

        <PdfSummary items={summaryItems} />

        <PdfFooter />
      </Page>
    </Document>
  );
};

export default PdfDocument;
