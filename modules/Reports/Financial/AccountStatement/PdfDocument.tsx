import React from 'react';
import { Document, Page, View, Text } from '@react-pdf/renderer';
import { pdfStyles } from '../../../../components/pdf/PdfStyles';
import { PdfHeader } from '../../../../components/pdf/PdfHeader';
import { PdfWatermark } from '../../../../components/pdf/PdfWatermark';
import { PdfFooter } from '../../../../components/pdf/PdfFooter';
import { PdfTable } from '../../../../components/pdf/PdfTable';
import { GeneratedReportData } from '../../types';

const PdfDocument: React.FC<{ data: GeneratedReportData }> = ({ data }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  const date = (val: string) => new Date(val).toLocaleDateString('pt-BR');

  const prevBalance = data.summary?.find(s => s.label === 'Saldo Anterior')?.value || 0;
  const finalBalance = data.summary?.find(s => s.label === 'Saldo Final')?.value || 0;
  const credits = data.summary?.find(s => s.label === 'Total Entradas')?.value || 0;
  const debits = data.summary?.find(s => s.label === 'Total Saídas')?.value || 0;

  const columns = [
    { header: 'Data', accessor: 'date', width: '10%', render: (row: any) => date(row.date) },
    { 
      header: 'Histórico / Descrição', 
      accessor: 'description', 
      width: '35%',
      render: (row: any) => `${row.description}\n${row.entity}`
    },
    { header: 'Natureza', accessor: 'category', width: '15%' },
    { 
      header: 'Entrada (+)', 
      accessor: 'credit', 
      width: '13%', 
      align: 'right' as const,
      render: (row: any) => row.credit ? currency(row.credit) : '',
      style: () => ({ color: '#059669' })
    },
    { 
      header: 'Saída (-)', 
      accessor: 'debit', 
      width: '13%', 
      align: 'right' as const,
      render: (row: any) => row.debit ? currency(row.debit) : '',
      style: () => ({ color: '#dc2626' })
    },
    { 
      header: 'Saldo Acum.', 
      accessor: 'balanceAfter', 
      width: '14%', 
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
        
        {/* Box de Saldo Anterior */}
        <View style={{ 
          backgroundColor: '#1e293b', 
          padding: 12, 
          borderRadius: 8, 
          marginBottom: 12,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <View>
            <Text style={{ fontSize: 7, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>
              Saldo Anterior Transportado
            </Text>
            <Text style={{ fontSize: 16, color: '#ffffff', fontWeight: 'bold', marginTop: 2 }}>
              {currency(prevBalance)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 20 }}>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 7, color: '#10b981', textTransform: 'uppercase', fontWeight: 'bold' }}>
                Entradas
              </Text>
              <Text style={{ fontSize: 10, color: '#ffffff', fontWeight: 'bold', marginTop: 2 }}>
                {currency(credits)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.1)', paddingLeft: 20 }}>
              <Text style={{ fontSize: 7, color: '#f87171', textTransform: 'uppercase', fontWeight: 'bold' }}>
                Saídas
              </Text>
              <Text style={{ fontSize: 10, color: '#ffffff', fontWeight: 'bold', marginTop: 2 }}>
                {currency(debits)}
              </Text>
            </View>
          </View>
        </View>

        <View style={pdfStyles.section}>
          {data.rows.length === 0 ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ fontSize: 10, color: '#94a3b8', fontStyle: 'italic' }}>
                Nenhuma movimentação no período.
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

        {/* Saldo Final em Destaque */}
        <View style={{ 
          marginTop: 20, 
          alignItems: 'flex-end' 
        }}>
          <View style={{ 
            backgroundColor: '#1e293b', 
            padding: 16, 
            borderRadius: 12,
            minWidth: 200,
            borderBottomWidth: 4,
            borderBottomColor: '#3b82f6'
          }}>
            <Text style={{ fontSize: 8, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>
              Saldo Final em Conta
            </Text>
            <Text style={{ 
              fontSize: 18, 
              color: finalBalance >= 0 ? '#ffffff' : '#f87171', 
              fontWeight: 'bold', 
              marginTop: 4 
            }}>
              {currency(finalBalance)}
            </Text>
            <Text style={{ fontSize: 6, color: '#64748b', textTransform: 'uppercase', marginTop: 4 }}>
              Conciliado via Sistema Suporte Grãos
            </Text>
          </View>
        </View>
        
        <PdfFooter />
      </Page>
    </Document>
  );
};

export default PdfDocument;
