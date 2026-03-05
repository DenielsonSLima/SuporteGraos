import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import type { Shareholder } from '../../../../services/shareholderService';
import { settingsService } from '../../../../services/settingsService';

interface Props {
  shareholder: Shareholder;
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
    borderBottomColor: '#1e293b',
    paddingBottom: 12,
    marginBottom: 16,
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
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: 1,
    borderBottomColor: '#e2e8f0',
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    color: '#64748b',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableCell: {
    fontSize: 8,
    fontFamily: 'Helvetica',
  },
  tableCellBold: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
  },
  footer: {
    marginTop: 16,
    paddingTop: 8,
    borderTop: 1,
    borderTopColor: '#e2e8f0',
  },
  footerText: {
    fontSize: 7,
    color: '#94a3b8',
    fontFamily: 'Helvetica',
  },
});

const ShareholderPdfDocument: React.FC<Props> = ({ shareholder }) => {
  const company = settingsService.getCompanyData();
  const watermark = settingsService.getWatermark();

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(!val || Math.abs(val) < 0.005 ? 0 : val);
  const date = (val: string) => new Date(val).toLocaleDateString('pt-BR');

  const totalCredits = shareholder.financial.history
    .filter(t => t.type === 'credit')
    .reduce((acc, t) => acc + t.value, 0);

  const totalDebits = shareholder.financial.history
    .filter(t => t.type === 'debit')
    .reduce((acc, t) => acc + t.value, 0);

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
            <Text style={styles.title}>Extrato de Sócio</Text>
            <Text style={styles.subtitle}>{shareholder.name}</Text>
            <Text style={styles.subtitle}>CPF: {shareholder.cpf}</Text>
            <Text style={styles.subtitle}>Emissão: {new Date().toLocaleDateString('pt-BR')}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumo da Conta Corrente</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total de Créditos</Text>
              <Text style={[styles.summaryValue, { color: '#047857' }]}>{currency(totalCredits)}</Text>
              <Text style={{ fontSize: 7, color: '#94a3b8' }}>Pro-labores e aportes</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total de Retiradas</Text>
              <Text style={[styles.summaryValue, { color: '#b91c1c' }]}>{currency(totalDebits)}</Text>
              <Text style={{ fontSize: 7, color: '#94a3b8' }}>Saídas e pagamentos</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Saldo Atual</Text>
              <Text style={[styles.summaryValue, { color: shareholder.financial.currentBalance >= 0 ? '#0f172a' : '#b91c1c' }]}>
                {currency(shareholder.financial.currentBalance)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalhamento de Movimentações</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCellBold, { width: '18%' }]}>Data</Text>
              <Text style={[styles.tableCellBold, { width: '46%' }]}>Descrição</Text>
              <Text style={[styles.tableCellBold, { width: '18%', textAlign: 'center' }]}>Tipo</Text>
              <Text style={[styles.tableCellBold, { width: '18%', textAlign: 'right' }]}>Valor</Text>
            </View>
            {shareholder.financial.history.length === 0 ? (
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: '100%', textAlign: 'center', color: '#94a3b8' }]}>Nenhuma movimentação registrada.</Text>
              </View>
            ) : (
              shareholder.financial.history.map((item, idx) => (
                <View key={item.id || idx} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: '18%' }]}>{date(item.date)}</Text>
                  <Text style={[styles.tableCell, { width: '46%' }]}>{item.description}</Text>
                  <Text style={[styles.tableCell, { width: '18%', textAlign: 'center', color: item.type === 'credit' ? '#047857' : '#b91c1c' }]}>
                    {item.type === 'credit' ? 'Crédito' : 'Débito'}
                  </Text>
                  <Text style={[styles.tableCell, { width: '18%', textAlign: 'right', color: item.type === 'credit' ? '#047857' : '#b91c1c' }]}>
                    {item.type === 'debit' ? '-' : '+'}{currency(item.value)}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Sistema ERP Suporte Grãos • Documento gerado em {new Date().toLocaleString('pt-BR')}</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} fixed />
        </View>
      </Page>
    </Document>
  );
};

export default ShareholderPdfDocument;
