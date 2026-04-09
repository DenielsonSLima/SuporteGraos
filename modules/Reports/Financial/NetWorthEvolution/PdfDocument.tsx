import React from 'react';
import { Document, Page, View, Text } from '@react-pdf/renderer';
import { pdfStyles } from '../../../../components/pdf/PdfStyles';
import { PdfHeader } from '../../../../components/pdf/PdfHeader';
import { PdfWatermark } from '../../../../components/pdf/PdfWatermark';
import { PdfFooter } from '../../../../components/pdf/PdfFooter';
import { PdfTable } from '../../../../components/pdf/PdfTable';
import { GeneratedReportData } from '../../types';
import { settingsService } from '../../../../services/settingsService';

const PdfDocument: React.FC<{ data: GeneratedReportData }> = ({ data }) => {
  const company = settingsService.getCompanyData();
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(!val || Math.abs(val) < 0.005 ? 0 : val);
  const formatDate = (val: string) => {
    const d = new Date(val);
    d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
    return d.toLocaleDateString('pt-BR');
  };

  const initialBalance = data.summary?.find(s => s.label === 'Saldo Inicial')?.value || 0;
  const finalBalance = data.summary?.find(s => s.label === 'Saldo Final Projetado')?.value || 0;
  const variation = (data.summary?.find(s => s.label === 'Variação no Período')?.value || 0);

  const columns = [
    { 
      header: 'Data/Venc.', 
      accessor: 'date', 
      width: '12%', 
      render: (row: any) => formatDate(row.date) 
    },
    {
      header: 'Histórico do Lançamento',
      accessor: 'description',
      width: '40%',
      render: (row: any) => `${row.description}\n[${row.status === 'realized' ? 'REALIZADO' : 'PENDENTE'}]`
    },
    { 
      header: 'Tipo', 
      accessor: 'type', 
      width: '10%', 
      align: 'center' as const,
      render: (row: any) => row.type === 'IN' ? 'ENTRADA' : 'SAÍDA',
      style: (row: any) => ({ color: row.type === 'IN' ? '#059669' : '#dc2626', fontSize: 7, fontWeight: 'bold' })
    },
    {
      header: 'Valor Op.',
      accessor: 'value',
      width: '18%',
      align: 'right' as const,
      render: (row: any) => `${row.type === 'IN' ? '+' : '-'}${currency(row.value)}`,
      style: (row: any) => ({ color: row.type === 'IN' ? '#059669' : '#dc2626', fontWeight: 'bold' })
    },
    {
      header: 'Saldo Patrimonial',
      accessor: 'balanceAfter',
      width: '20%',
      align: 'right' as const,
      render: (row: any) => currency(row.balanceAfter),
      style: (row: any) => ({
        fontWeight: 'bold',
        color: row.balanceAfter >= 0 ? '#1e293b' : '#dc2626',
        backgroundColor: '#f8fafc'
      })
    }
  ];

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <PdfWatermark />
        <PdfHeader title={data.title} subtitle={data.subtitle} />

        {/* Resumo de Indicadores */}
        <View style={{
          flexDirection: 'row',
          gap: 10,
          marginBottom: 15
        }}>
          <View style={{ flex: 1, backgroundColor: '#1e293b', padding: 10, borderRadius: 6 }}>
            <Text style={{ fontSize: 6, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: 2 }}>Saldo Inicial</Text>
            <Text style={{ fontSize: 12, color: '#ffffff', fontWeight: 'bold' }}>{currency(initialBalance)}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: variation >= 0 ? '#ecfdf5' : '#fef2f2', padding: 10, borderRadius: 6, border: variation >= 0 ? '1px solid #10b981' : '1px solid #ef4444' }}>
            <Text style={{ fontSize: 6, color: variation >= 0 ? '#065f46' : '#991b1b', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: 2 }}>Variação Projetada</Text>
            <Text style={{ fontSize: 12, color: variation >= 0 ? '#059669' : '#dc2626', fontWeight: 'bold' }}>{variation >= 0 ? '+' : ''}{currency(variation)}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#2563eb', padding: 10, borderRadius: 6 }}>
            <Text style={{ fontSize: 6, color: '#bfdbfe', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: 2 }}>Patrimônio Final</Text>
            <Text style={{ fontSize: 12, color: '#ffffff', fontWeight: 'bold' }}>{currency(finalBalance)}</Text>
          </View>
        </View>

        <View style={pdfStyles.section}>
          {data.rows.length === 0 ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ fontSize: 10, color: '#94a3b8', fontStyle: 'italic' }}>
                Nenhuma operação identificada no período.
              </Text>
            </View>
          ) : (
            <PdfTable
              columns={columns}
              data={data.rows}
              alternateRows
            />
          )}
        </View>

        <View style={{ marginTop: 20, alignItems: 'flex-end' }}>
          <View style={{ backgroundColor: '#1e293b', padding: 12, borderRadius: 8, minWidth: 180, borderBottom: '3px solid #2563eb' }}>
            <Text style={{ fontSize: 7, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>Patrimônio Líquido Estimado</Text>
            <Text style={{ fontSize: 16, color: '#ffffff', fontWeight: 'bold', marginTop: 2 }}>{currency(finalBalance)}</Text>
          </View>
        </View>

        <PdfFooter />
      </Page>
    </Document>
  );
};

export default PdfDocument;
