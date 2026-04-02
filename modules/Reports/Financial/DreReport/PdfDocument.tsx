import React from 'react';
import { Document, Page, View, Text } from '@react-pdf/renderer';
import { pdfStyles } from '../../../../components/pdf/PdfStyles';
import { PdfHeader } from '../../../../components/pdf/PdfHeader';
import { PdfWatermark } from '../../../../components/pdf/PdfWatermark';
import { PdfFooter } from '../../../../components/pdf/PdfFooter';
import { GeneratedReportData } from '../../types';

const PdfDocument: React.FC<{ data: GeneratedReportData }> = ({ data }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);
  const margin = data.summary?.[0]?.value || 0;

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <PdfWatermark />
        <PdfHeader title={data.title} subtitle={data.subtitle} />
        
        <View style={pdfStyles.section}>
          {/* Tabela DRE */}
          <View style={{ 
            borderWidth: 1, 
            borderColor: '#cbd5e1', 
            borderRadius: 8, 
            overflow: 'hidden' 
          }}>
            {data.rows.map((row: any, idx: number) => {
              const isFixedHeader = row.label === '(-) Despesas Fixas';
              const isAdminHeader = row.label === '(-) Despesas Administrativas';
              const details = (data as any).detailedExpenses || [];

              return (
                <React.Fragment key={idx}>
                  <View 
                    style={{
                      flexDirection: 'row',
                      borderBottomWidth: row.isTotal || row.isFinal ? 2 : 1,
                      borderBottomColor: row.isTotal || row.isFinal ? '#1e293b' : '#f1f5f9',
                      backgroundColor: row.isHeader ? '#1e293b' : row.isFinal ? '#1e3a8a' : row.isTotal ? '#f1f5f9' : idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                      paddingVertical: 8,
                      paddingHorizontal: 12
                    }}
                  >
                    <Text style={{ 
                      flex: 1, 
                      fontSize: row.isFinal ? 10 : 8,
                      fontWeight: row.isHeader || row.isTotal || row.isFinal ? 'bold' : 'normal',
                      color: row.isHeader || row.isFinal ? '#ffffff' : row.indent ? '#64748b' : '#1e293b',
                      fontStyle: row.indent ? 'italic' : 'normal',
                      paddingLeft: row.indent ? 20 : 0
                    }}>
                      {row.label}
                    </Text>
                    <Text style={{ 
                      fontSize: row.isFinal ? 10 : 8,
                      fontWeight: row.isHeader || row.isTotal || row.isFinal ? 'bold' : 'normal',
                      color: row.isHeader || row.isFinal ? '#ffffff' : row.value < 0 ? '#dc2626' : '#1e293b',
                      textAlign: 'right',
                      minWidth: 100
                    }}>
                      {currency(row.value)}
                    </Text>
                  </View>

                  {/* Detalhamento de Despesas no PDF */}
                  {isFixedHeader && details.filter((d: any) => d.type === 'fixed').map((det: any, dIdx: number) => (
                    <View key={`pdf-fix-${dIdx}`} style={{ flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 12, backgroundColor: '#fdfdfd', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                      <Text style={{ flex: 1, fontSize: 6, color: '#94a3b8', fontStyle: 'italic', paddingLeft: 40 }}>{det.label}</Text>
                      <Text style={{ fontSize: 6, color: '#94a3b8', textAlign: 'right', minWidth: 100 }}>{currency(det.value)}</Text>
                    </View>
                  ))}

                  {isAdminHeader && details.filter((d: any) => d.type === 'administrative').map((det: any, dIdx: number) => (
                    <View key={`pdf-adm-${dIdx}`} style={{ flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 12, backgroundColor: '#fdfdfd', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                      <Text style={{ flex: 1, fontSize: 6, color: '#94a3b8', fontStyle: 'italic', paddingLeft: 40 }}>{det.label}</Text>
                      <Text style={{ fontSize: 6, color: '#94a3b8', textAlign: 'right', minWidth: 100 }}>{currency(det.value)}</Text>
                    </View>
                  ))}
                </React.Fragment>
              );
            })}
          </View>

          {/* Margem Líquida */}
          <View style={{ 
            marginTop: 16, 
            padding: 16, 
            backgroundColor: '#f8fafc', 
            borderRadius: 8,
            borderTopWidth: 2,
            borderTopColor: '#cbd5e1',
            alignItems: 'center'
          }}>
            <Text style={{ 
              fontSize: 8, 
              fontWeight: 'bold', 
              color: '#94a3b8', 
              textTransform: 'uppercase',
              marginBottom: 4
            }}>
              Margem Líquida sobre Vendas
            </Text>
            <Text style={{ 
              fontSize: 18, 
              fontWeight: 'bold', 
              color: margin >= 0 ? '#059669' : '#dc2626'
            }}>
              {margin.toFixed(2)}%
            </Text>
          </View>
        </View>
        
        <PdfFooter />
      </Page>
    </Document>
  );
};

export default PdfDocument;
