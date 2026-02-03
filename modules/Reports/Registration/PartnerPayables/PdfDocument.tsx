import React from 'react';
import { Document, Page, View, Text } from '@react-pdf/renderer';
import { pdfStyles } from '../../../../components/pdf/PdfStyles';
import { PdfHeader } from '../../../../components/pdf/PdfHeader';
import { PdfWatermark } from '../../../../components/pdf/PdfWatermark';
import { PdfFooter } from '../../../../components/pdf/PdfFooter';
import { GeneratedReportData } from '../../types';

const PdfDocument: React.FC<{ data: GeneratedReportData }> = ({ data }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  if (!data || !data.columns || data.columns.length === 0 || !data.rows || data.rows.length === 0) {
    return (
      <Document>
        <Page size="A4" style={pdfStyles.page}>
          <PdfWatermark />
          <PdfHeader title={data?.title || 'Relatório'} subtitle={data?.subtitle || ''} />
          <View style={pdfStyles.section}>
            <Text>Nenhum dado disponível para exibir.</Text>
          </View>
          <PdfFooter />
        </Page>
      </Document>
    );
  }

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <PdfWatermark />
        <PdfHeader title={data.title} subtitle={data.subtitle} />
        
        <View style={pdfStyles.section}>
          {/* Tabela */}
          <View style={{ 
            borderWidth: 1, 
            borderColor: '#cbd5e1',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <View 
              style={{
                flexDirection: 'row',
                borderBottomWidth: 2,
                borderBottomColor: '#1e293b',
                backgroundColor: '#1e293b',
                paddingVertical: 6,
                paddingHorizontal: 8
              }}
            >
              {data.columns.map((col: any, idx: number) => (
                <Text
                  key={`header-${idx}`}
                  style={{ 
                    flex: 1,
                    fontSize: 7,
                    fontWeight: 'bold',
                    color: '#ffffff',
                    textAlign: (col.align || 'left') as any,
                    paddingHorizontal: 4
                  }}
                >
                  {String(col.header || 'Coluna')}
                </Text>
              ))}
            </View>

            {/* Rows */}
            {data.rows.map((row: any, rowIdx: number) => (
              <View
                key={`row-${rowIdx}`}
                style={{
                  flexDirection: 'row',
                  borderBottomWidth: 1,
                  borderBottomColor: '#f1f5f9',
                  backgroundColor: rowIdx % 2 === 0 ? '#ffffff' : '#f8fafc',
                  paddingVertical: 6,
                  paddingHorizontal: 8
                }}
              >
                {data.columns.map((col: any, colIdx: number) => {
                  let cellValue = '-';
                  if (col.accessor && row) {
                    const val = row[col.accessor];
                    if (val !== null && val !== undefined) {
                      if (col.format === 'currency') {
                        cellValue = currency(val);
                      } else if (col.format === 'date') {
                        const dateObj = new Date(val);
                        cellValue = dateObj.toLocaleDateString('pt-BR');
                      } else {
                        cellValue = String(val);
                      }
                    }
                  }
                  
                  return (
                    <Text
                      key={`cell-${rowIdx}-${colIdx}`}
                      style={{ 
                        flex: 1,
                        fontSize: 7,
                        color: '#1e293b',
                        textAlign: (col.align || 'left') as any,
                        paddingHorizontal: 4
                      }}
                    >
                      {cellValue}
                    </Text>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Resumo */}
          {data.summary && data.summary.length > 0 && (
            <View style={{ 
              marginTop: 16, 
              padding: 12, 
              backgroundColor: '#f8fafc', 
              borderTopWidth: 2,
              borderTopColor: '#cbd5e1'
            }}>
              {data.summary.map((item: any, idx: number) => (
                <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: idx < data.summary.length - 1 ? 4 : 0 }}>
                  <Text style={{ 
                    fontSize: 8, 
                    fontWeight: 'bold', 
                    color: '#1e293b'
                  }}>
                    {item.label}
                  </Text>
                  <Text style={{ 
                    fontSize: 8, 
                    fontWeight: 'bold', 
                    color: '#1e293b',
                    textAlign: 'right'
                  }}>
                    {item.format === 'currency' ? currency(item.value) : item.value}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
        
        <PdfFooter />
      </Page>
    </Document>
  );
};

export default PdfDocument;
