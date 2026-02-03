import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { CashierReport } from '../../types';
import { settingsService } from '../../../../services/settingsService';

interface Props {
  report: CashierReport;
  title: string;
}

const styles = StyleSheet.create({
  page: {
    padding: 25,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#0f172a',
  },
  watermark: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    opacity: 0.03,
    width: '60%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottom: 2,
    borderBottomColor: '#1e293b',
    paddingBottom: 12,
    marginBottom: 16,
  },
  logo: {
    width: 48,
    height: 48,
  },
  companyName: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 8,
    color: '#64748b',
    textAlign: 'right',
    marginTop: 3,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    color: '#1e293b',
    marginBottom: 6,
    borderBottom: 1,
    borderBottomColor: '#cbd5e1',
    paddingBottom: 3,
  },
  table: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 3,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    padding: 5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    padding: 5,
  },
  tableCell: {
    fontSize: 7,
  },
  tableCellBold: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    color: '#64748b',
  },
  summaryBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#1e293b',
    borderRadius: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#cbd5e1',
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 25,
    right: 25,
    borderTop: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 7,
    color: '#94a3b8',
  },
});

const CashierPdfDocument: React.FC<Props> = ({ report, title }) => {
  const company = settingsService.getCompanyData();
  const watermark = settingsService.getWatermark();

  const currency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const formatDoc = (doc: string) => {
    if (!doc) return '';
    return doc.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {watermark.imageUrl && (
          <Image src={watermark.imageUrl} style={styles.watermark} />
        )}

        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            {company.logoUrl && <Image src={company.logoUrl} style={styles.logo} />}
            <View>
              <Text style={styles.companyName}>{company.razaoSocial}</Text>
              <Text style={{ fontSize: 7, color: '#64748b', fontFamily: 'Helvetica-Bold' }}>
                CNPJ: {formatDoc(company.cnpj)}
              </Text>
            </View>
          </View>
          <View>
            <Text style={styles.title}>Fechamento de Caixa</Text>
            <Text style={styles.subtitle}>{title}</Text>
          </View>
        </View>

        {/* Total de Ativos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Total de Ativos</Text>
          <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold' }}>
            {currency(report.totalAssets)}
          </Text>
        </View>

        {/* Saldos Bancários */}
        {report.bankBalances.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Saldos Bancários ({report.bankBalances.length})</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCellBold, { width: '70%' }]}>Banco</Text>
                <Text style={[styles.tableCellBold, { width: '30%', textAlign: 'right' }]}>Saldo</Text>
              </View>
              {report.bankBalances.map((balance) => (
                <View key={balance.id} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: '70%' }]}>{balance.bankName}</Text>
                  <Text style={[styles.tableCell, { width: '30%', textAlign: 'right', fontFamily: 'Helvetica-Bold' }]}>
                    {currency(balance.balance)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Resumo Final */}
        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total de Ativos:</Text>
            <Text style={[styles.summaryValue, { color: '#86efac' }]}>{currency(report.totalAssets)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: '#fca5a5' }]}>Total de Passivos:</Text>
            <Text style={[styles.summaryValue, { color: '#fca5a5' }]}>{currency(report.totalLiabilities)}</Text>
          </View>
          <View style={{ borderTop: 1, borderTopColor: '#475569', marginVertical: 6 }} />
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { fontSize: 10 }]}>SALDO LÍQUIDO:</Text>
            <Text style={[styles.summaryValue, { fontSize: 14 }]}>{currency(report.netBalance)}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Sistema: {company.nomeFantasia}
          </Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => (
            `Página ${pageNumber} de ${totalPages}`
          )} fixed />
        </View>
      </Page>
    </Document>
  );
};

export default CashierPdfDocument;
