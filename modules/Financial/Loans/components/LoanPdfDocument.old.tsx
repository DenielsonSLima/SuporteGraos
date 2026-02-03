import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { LoanRecord, FinancialRecord } from '../../types';
import { settingsService } from '../../../../services/settingsService';
import { bankAccountService } from '../../../../services/bankAccountService';

interface Props {
  loan: LoanRecord;
  history: FinancialRecord[];
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 12,
    fontFamily: 'Helvetica',
    color: '#0f172a',
    backgroundColor: '#ffffff',
    position: 'relative',
  },
  watermarkContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.05,
    zIndex: 0,
  },
  watermarkImage: {
    width: '80%',
    objectFit: 'contain',
    transform: 'rotate(-12deg)',
  },
  content: {
    position: 'relative',
    zIndex: 10,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 950,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 2,
    borderBottomColor: '#1e293b',
    paddingBottom: 24,
    marginBottom: 32,
  },
  headerLeft: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  logo: {
    width: 64,
    height: 64,
  },
  companyInfo: {
    flexDirection: 'column',
  },
  companyName: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  companyDetails: {
    fontSize: 9,
    color: '#475569',
    marginTop: 4,
    lineHeight: 1.4,
  },
  headerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Helvetica',
    marginTop: 4,
  },
  issueDate: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  contractSection: {
    backgroundColor: '#f8fafc',
    padding: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 32,
  },
  contractTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    color: '#475569',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 8,
    marginBottom: 16,
  },
  contractGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 24,
  },
  contractItem: {
    flex: 1,
  },
  contractLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
    marginBottom: 4,
  },
  contractValue: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
  },
  contractValueLarge: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
  },
  valueTaken: {
    color: '#e11d48',
  },
  valueGranted: {
    color: '#059669',
  },
  historySection: {
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingBottom: 4,
    marginBottom: 8,
  },
  table: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
  },
  tableHeaderCell: {
    padding: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#475569',
  },
  tableHeaderCellDate: {
    width: '15%',
  },
  tableHeaderCellDescription: {
    width: '45%',
  },
  tableHeaderCellAccount: {
    width: '20%',
    textAlign: 'center',
  },
  tableHeaderCellValue: {
    width: '20%',
    textAlign: 'right',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tableRowEven: {
    backgroundColor: '#ffffff',
  },
  tableRowOdd: {
    backgroundColor: '#f8fafc',
  },
  tableCell: {
    padding: 8,
  },
  tableCellDate: {
    width: '15%',
  },
  tableCellDescription: {
    width: '45%',
    flexDirection: 'column',
  },
  tableCellAccount: {
    width: '20%',
    textAlign: 'center',
    color: '#64748b',
  },
  tableCellValue: {
    width: '20%',
    textAlign: 'right',
    fontFamily: 'Helvetica-Bold',
  },
  tableCellValueCredit: {
    color: '#059669',
  },
  tableCellValueDebit: {
    color: '#e11d48',
  },
  descriptionMain: {
    fontFamily: 'Helvetica',
  },
  descriptionNote: {
    fontSize: 10,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 2,
  },
  emptyState: {
    padding: 32,
    textAlign: 'center',
    color: '#94a3b8',
    fontStyle: 'italic',
    backgroundColor: '#f8fafc',
  },
  tableFooter: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
  },
  tableFooterLabel: {
    width: '80%',
    padding: 8,
    textAlign: 'right',
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  tableFooterValue: {
    width: '20%',
    padding: 8,
    textAlign: 'right',
    fontFamily: 'Helvetica-Bold',
    color: '#065f46',
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 32,
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
  },
  footerContent: {
    paddingTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 10,
    color: '#94a3b8',
  },
});

const LoanPdfDocument: React.FC<Props> = ({ loan, history }) => {
  const company = settingsService.getCompanyData();
  const watermark = settingsService.getWatermark();
  const accounts = bankAccountService.getBankAccounts();

  const currency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  
  const dateStr = (val: string) => 
    new Date(val).toLocaleDateString('pt-BR');

  const getBankAccountName = (bankAccountId?: string) => {
    if (!bankAccountId) return '-';
    const account = accounts.find(a => a.id === bankAccountId);
    return account?.bankName || bankAccountId;
  };

  const originalValue = loan.originalValue ?? loan.totalValue;
  const totalPaid = Math.max(0, originalValue - loan.remainingValue);
  const totalPending = loan.remainingValue;

  const totalCredit = history
    .filter(h => h.subType === 'receipt')
    .reduce((acc, h) => acc + (h.paidValue || 0), 0);
  const totalDebit = history
    .filter(h => h.subType !== 'receipt')
    .reduce((acc, h) => acc + (h.paidValue || 0), 0);

  const emissionDate = new Date().toLocaleDateString('pt-BR');
  const emissionTime = new Date().toLocaleTimeString('pt-BR');

  const tableRows = history.map((item, idx) => {
    const isCredit = item.subType === 'receipt';
    return (
      <View
        key={`row-${idx}`}
        style={[
          styles.tableRow,
          idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd
        ]}
      >
        <Text style={[styles.tableCell, styles.tableCellDate]}>
          {dateStr(item.issueDate)}
        </Text>
        <View style={[styles.tableCell, styles.tableCellDescription]}>
          <Text style={styles.descriptionMain}>{item.description}</Text>
          {item.notes && (
            <Text style={styles.descriptionNote}>{item.notes}</Text>
          )}
        </View>
        <Text style={[styles.tableCell, styles.tableCellAccount]}>
          {getBankAccountName(item.bankAccount)}
        </Text>
        <Text style={[
          styles.tableCell,
          styles.tableCellValue,
          isCredit ? styles.tableCellValueCredit : styles.tableCellValueDebit
        ]}>
          {isCredit ? '+' : '-'}{currency(item.paidValue)}
        </Text>
      </View>
    );
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Watermark */}
        {watermark.imageUrl && (
          <View style={styles.watermarkContainer}>
            <Image src={watermark.imageUrl} style={styles.watermarkImage} />
          </View>
        )}

        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {company.logoUrl && (
                <Image src={company.logoUrl} style={styles.logo} />
              )}
              <View style={styles.companyInfo}>
                <Text style={styles.companyName}>{company.razaoSocial}</Text>
                <View style={styles.companyDetails}>
                  <Text>{company.endereco}, {company.numero} - {company.bairro}</Text>
                  <Text>{company.cidade}/{company.uf} - CEP: {company.cep}</Text>
                  <Text>CNPJ: {company.cnpj} {company.ie && `| IE: ${company.ie}`}</Text>
                  <Text>{company.telefone} | {company.email}</Text>
                  {company.site && <Text>{company.site}</Text>}
                </View>
              </View>
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.title}>Extrato de Empréstimo</Text>
              <Text style={styles.subtitle}>
                Ref: Contrato de {loan.type === 'taken' ? 'Tomada' : 'Concessão'}
              </Text>
              <Text style={styles.issueDate}>
                Emissão: {emissionDate}
              </Text>
            </View>
          </View>

          {/* Contract Summary */}
          <View style={styles.contractSection}>
            <Text style={styles.contractTitle}>
              Dados do Contrato - {loan.entityName}
            </Text>
            <View style={styles.contractGrid}>
              <View style={styles.contractItem}>
                <Text style={styles.contractLabel}>Valor do Empréstimo</Text>
                <Text style={styles.contractValue}>{currency(originalValue)}</Text>
              </View>
              <View style={styles.contractItem}>
                <Text style={styles.contractLabel}>Valor Pago</Text>
                <Text style={styles.contractValue}>{currency(totalPaid)}</Text>
              </View>
              <View style={styles.contractItem}>
                <Text style={styles.contractLabel}>Valor Pendente</Text>
                <Text style={styles.contractValue}>{currency(totalPending)}</Text>
              </View>
              <View style={styles.contractItem}>
                <Text style={styles.contractLabel}>Conta Bancária</Text>
                <Text
                  style={[
                    styles.contractValueLarge
                  ]}
                >
                  {getBankAccountName(loan.bankAccount) || '-'}
                </Text>
              </View>
            </View>
            <View style={styles.contractGrid}>
              <View style={styles.contractItem}>
                <Text style={styles.contractLabel}>Data Início</Text>
                <Text style={styles.contractValue}>{dateStr(loan.contractDate)}</Text>
              </View>
              <View style={styles.contractItem}>
                <Text style={styles.contractLabel}>Taxa de Juros</Text>
                <Text style={styles.contractValue}>{loan.interestRate}% a.m.</Text>
              </View>
              <View style={styles.contractItem}>
                <Text style={styles.contractLabel}>Saldo Atual</Text>
                <Text
                  style={[
                    styles.contractValueLarge,
                    loan.type === 'taken' ? styles.valueTaken : styles.valueGranted
                  ]}
                >
                  {currency(loan.remainingValue)}
                </Text>
              </View>
            </View>
          </View>

          {/* Payment History */}
          <View style={styles.historySection}>
            <Text style={styles.historyTitle}>
              Extrato Interno de Movimentações
            </Text>

            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, styles.tableHeaderCellDate]}>
                  Data
                </Text>
                <Text style={[styles.tableHeaderCell, styles.tableHeaderCellDescription]}>
                  Descrição / Nota
                </Text>
                <Text style={[styles.tableHeaderCell, styles.tableHeaderCellAccount]}>
                  Conta
                </Text>
                <Text style={[styles.tableHeaderCell, styles.tableHeaderCellValue]}>
                  Valor
                </Text>
              </View>

              {history.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text>Nenhum pagamento registrado até o momento.</Text>
                </View>
              ) : (
                tableRows
              )}

              <View style={styles.tableFooter}>
                <Text style={styles.tableFooterLabel}>Total Créditos / Débitos:</Text>
                <Text style={styles.tableFooterValue}>
                  {currency(totalCredit)} | {currency(totalDebit)}
                </Text>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.footerContent}>
              <Text>
                Este documento é um demonstrativo simples para controle interno e não substitui comprovantes bancários oficiais.
              </Text>
              <Text>Gerado em {emissionDate} {emissionTime}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default LoanPdfDocument;
