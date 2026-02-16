import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { FinancialRecord } from '../../types';
import { settingsService } from '../../../../services/settingsService';

interface Props {
  records: FinancialRecord[];
  groupBy: 'none' | 'month' | 'entity';
  filters: {
    startDate: string;
    endDate: string;
    category: string;
    bank: string;
  };
}

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  watermark: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    opacity: 0.08,
    width: '75%',
    objectFit: 'contain',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: 2,
    borderBottomColor: '#0f172a',
    paddingBottom: 12,
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  logo: {
    width: 48,
    height: 48,
    objectFit: 'contain',
  },
  companyName: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  companyDetail: {
    fontSize: 7,
    color: '#64748b',
    fontFamily: 'Helvetica-Bold',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 8,
    color: '#475569',
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  summaryCard: {
    flex: 1,
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#e2e8f0',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tableCell: {
    fontSize: 7,
    fontFamily: 'Helvetica',
  },
  tableCellBold: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
  },
  footer: {
    marginTop: 10,
    paddingTop: 8,
    borderTop: 1,
    borderTopColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 7,
    color: '#94a3b8',
    fontFamily: 'Helvetica',
  },
});

const FinancialHistoryPdfDocument: React.FC<Props> = ({ records, groupBy, filters }) => {
  const company = settingsService.getCompanyData();
  const watermark = settingsService.getWatermark();

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(!val || Math.abs(val) < 0.005 ? 0 : val);
  const date = (val: string) => new Date(val).toLocaleDateString('pt-BR');

  const totalIn = records.filter(r => ['sales_order', 'loan_granted', 'receipt'].includes(r.subType || '')).reduce((acc, r) => acc + r.paidValue, 0);
  const totalOut = records.filter(r => !['sales_order', 'loan_granted', 'receipt'].includes(r.subType || '')).reduce((acc, r) => acc + r.paidValue, 0);
  const balance = totalIn - totalOut;

  const groupRecords = () => {
    if (groupBy === 'none') return { Geral: records };

    const groups: Record<string, FinancialRecord[]> = {};
    records.forEach(r => {
      let key = '';
      if (groupBy === 'month') {
        key = new Date(r.dueDate).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      } else {
        key = r.entityName || 'Sem Parceiro';
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });

    return groups;
  };

  const groups = groupRecords();

  const renderTable = (data: FinancialRecord[]) => (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableCellBold, { width: '16%' }]}>Data</Text>
        <Text style={[styles.tableCellBold, { width: '34%' }]}>Descrição / Entidade</Text>
        <Text style={[styles.tableCellBold, { width: '18%' }]}>Categoria</Text>
        <Text style={[styles.tableCellBold, { width: '16%', textAlign: 'right' }]}>Valor Orig.</Text>
        <Text style={[styles.tableCellBold, { width: '16%', textAlign: 'right' }]}>Pago/Receb.</Text>
      </View>
      {data.map((r) => {
        const isCredit = ['sales_order', 'loan_granted', 'receipt'].includes(r.subType || '');
        return (
          <View key={r.id} style={styles.tableRow}>
            <Text style={[styles.tableCell, { width: '16%' }]}>{date(r.issueDate)}</Text>
            <Text style={[styles.tableCell, { width: '34%' }]}>{r.description}
              {r.entityName ? `\n${r.entityName}` : ''}
            </Text>
            <Text style={[styles.tableCell, { width: '18%' }]}>{r.category}</Text>
            <Text style={[styles.tableCell, { width: '16%', textAlign: 'right', color: '#64748b' }]}>{currency(r.originalValue)}</Text>
            <Text style={[styles.tableCell, { width: '16%', textAlign: 'right', color: isCredit ? '#047857' : '#b91c1c' }]}>
              {isCredit ? '+' : '-'}{currency(r.paidValue)}
            </Text>
          </View>
        );
      })}
    </View>
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {watermark.imageUrl && (
          <Image src={watermark.imageUrl} style={styles.watermark} />
        )}

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {company.logoUrl && <Image src={company.logoUrl} style={styles.logo} />}
            <View>
              <Text style={styles.companyName}>{company.razaoSocial}</Text>
              <Text style={styles.companyDetail}>{company.endereco}, {company.numero} - {company.bairro}</Text>
              <Text style={styles.companyDetail}>{company.cidade}/{company.uf} - CEP: {company.cep}</Text>
              <Text style={styles.companyDetail}>CNPJ: {company.cnpj} {company.ie ? `| IE: ${company.ie}` : ''}</Text>
              <Text style={styles.companyDetail}>{company.telefone} | {company.email}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.title}>Relatório Financeiro</Text>
            <Text style={styles.subtitle}>Emissão: {new Date().toLocaleString('pt-BR')}</Text>
            {filters.startDate && filters.endDate && (
              <Text style={styles.subtitle}>Período: {date(filters.startDate)} a {date(filters.endDate)}</Text>
            )}
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Entradas</Text>
            <Text style={[styles.summaryValue, { color: '#047857' }]}>{currency(totalIn)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Saídas</Text>
            <Text style={[styles.summaryValue, { color: '#b91c1c' }]}>{currency(totalOut)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Saldo do Período</Text>
            <Text style={[styles.summaryValue, { color: balance >= 0 ? '#0f172a' : '#b91c1c' }]}>{currency(balance)}</Text>
          </View>
        </View>

        {Object.keys(groups).map((key) => {
          const groupRecords = groups[key];
          const groupTotal = groupRecords.reduce((acc, r) => {
            const isCredit = ['sales_order', 'loan_granted', 'receipt'].includes(r.subType || '');
            return acc + (isCredit ? r.paidValue : -r.paidValue);
          }, 0);

          return (
            <View key={key} style={{ marginBottom: 8 }}>
              {groupBy !== 'none' && (
                <View style={styles.groupHeader}>
                  <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold' }}>{key}</Text>
                  <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: groupTotal >= 0 ? '#047857' : '#b91c1c' }}>
                    Saldo: {currency(groupTotal)}
                  </Text>
                </View>
              )}
              {renderTable(groupRecords)}
            </View>
          );
        })}

        <View style={styles.footer}>
          <Text style={styles.footerText}>{company.nomeFantasia} - Sistema Integrado</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} fixed />
        </View>
      </Page>
    </Document>
  );
};

export default FinancialHistoryPdfDocument;
