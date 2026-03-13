import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { LoanRecord } from '../../types';
import { settingsService } from '../../../../services/settingsService';

interface Props {
  loans: LoanRecord[];
  tab: 'taken' | 'granted' | 'history' | 'all';
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 9,
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
    width: '70%',
    objectFit: 'contain',
  },
  content: {
    position: 'relative',
    zIndex: 10,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 2,
    borderBottomColor: '#0f172a',
    paddingBottom: 24,
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  logo: {
    height: 64,
    width: 'auto',
  },
  companyInfo: {
    flexDirection: 'column',
  },
  companyName: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    color: '#0f172a',
  },
  companyDetails: {
    fontSize: 8,
    color: '#475569',
    marginTop: 6,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  headerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    color: '#0f172a',
  },
  generatedDate: {
    fontSize: 7,
    color: '#64748b',
    marginTop: 8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  summaryCardDark: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
  },
  summaryCardLight: {
    backgroundColor: '#f8fafc',
    borderColor: '#0f172a',
    borderWidth: 2,
  },
  summaryLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  summaryLabelDark: {
    color: '#94a3b8',
  },
  summaryLabelLight: {
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
  },
  summaryValueDark: {
    color: '#ffffff',
  },
  summaryValueLight: {
    color: '#0f172a',
  },
  table: {
    width: '100%',
    marginBottom: 'auto',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    textTransform: 'uppercase',
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
  },
  tableHeaderCell: {
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: '#1e293b',
  },
  tableHeaderCellDate: {
    width: '10%',
    textAlign: 'left',
  },
  tableHeaderCellEntity: {
    width: '30%',
    textAlign: 'left',
  },
  tableHeaderCellStatus: {
    width: '12%',
    textAlign: 'center',
  },
  tableHeaderCellOriginal: {
    width: '18%',
    textAlign: 'right',
  },
  tableHeaderCellRate: {
    width: '10%',
    textAlign: 'center',
  },
  tableHeaderCellBalance: {
    width: '20%',
    textAlign: 'right',
    borderRightWidth: 0,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableRowEven: {
    backgroundColor: '#f8fafc',
  },
  tableRowOdd: {
    backgroundColor: '#ffffff',
  },
  tableCell: {
    padding: 10,
    fontFamily: 'Helvetica-Bold',
  },
  tableCellDate: {
    width: '10%',
  },
  tableCellEntity: {
    width: '30%',
  },
  tableCellStatus: {
    width: '12%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableCellOriginal: {
    width: '18%',
    textAlign: 'right',
    color: '#64748b',
  },
  tableCellRate: {
    width: '10%',
    textAlign: 'center',
  },
  tableCellBalance: {
    width: '20%',
    textAlign: 'right',
    fontFamily: 'Helvetica-Bold',
  },
  entityName: {
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  entityType: {
    fontSize: 6,
    color: '#64748b',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    borderWidth: 1,
  },
  statusActive: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    borderColor: '#bfdbfe',
  },
  statusSettled: {
    backgroundColor: '#e2e8f0',
    color: '#475569',
    borderColor: '#cbd5e1',
  },
  balanceTaken: {
    color: '#be123c',
  },
  balanceGranted: {
    color: '#047857',
  },
  tableFooter: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    fontSize: 8,
    borderTopWidth: 2,
    borderTopColor: '#0f172a',
  },
  tableFooterLabel: {
    width: '52%',
    padding: 12,
    textAlign: 'right',
  },
  tableFooterOriginal: {
    width: '18%',
    padding: 12,
    textAlign: 'right',
  },
  tableFooterEmpty: {
    width: '10%',
  },
  tableFooterBalance: {
    width: '20%',
    padding: 12,
    textAlign: 'right',
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
  },
  signatures: {
    marginTop: 40,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  signaturesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 96,
    paddingTop: 16,
  },
  signatureBlock: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
  },
  signatureLine: {
    borderTopWidth: 2,
    borderTopColor: '#0f172a',
    paddingTop: 8,
    width: '100%',
    alignItems: 'center',
  },
  signatureName: {
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    fontSize: 10,
    color: '#0f172a',
  },
  signatureRole: {
    fontSize: 7,
    textTransform: 'uppercase',
    color: '#64748b',
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  footer: {
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
});

const LoanListPdfDocument: React.FC<Props> = ({ loans, tab }) => {
  const company = settingsService.getCompanyData();
  const watermark = settingsService.getWatermark();

  const currency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(!val || Math.abs(val) < 0.005 ? 0 : val);

  const dateStr = (val: string) =>
    new Date(val).toLocaleDateString('pt-BR');

  const titles: Record<string, string> = {
    all: 'Relatório de Empréstimos Ativos',
    taken: 'Relatório de Empréstimos Tomados (Passivos)',
    granted: 'Relatório de Empréstimos Concedidos (Ativos)',
    history: 'Histórico Consolidado de Contratos de Crédito'
  };

  const totalOriginal = loans.reduce((acc, l) => acc + (l.originalValue ?? l.totalValue), 0);
  const totalBalance = loans.reduce((acc, l) => acc + l.remainingValue, 0);

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
                <Text style={styles.companyDetails}>
                  CNPJ: {company.cnpj} | {company.cidade}/{company.uf}
                </Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.title}>{titles[tab]}</Text>
              <Text style={styles.generatedDate}>
                Gerado em: {new Date().toLocaleString('pt-BR')}
              </Text>
            </View>
          </View>

          {/* Summary */}
          <View style={styles.summaryGrid}>
            <View style={[styles.summaryCard, styles.summaryCardDark]}>
              <Text style={[styles.summaryLabel, styles.summaryLabelDark]}>
                Montante Original Consolidado
              </Text>
              <Text style={[styles.summaryValue, styles.summaryValueDark]}>
                {currency(totalOriginal)}
              </Text>
            </View>
            <View style={[styles.summaryCard, styles.summaryCardLight]}>
              <Text style={[styles.summaryLabel, styles.summaryLabelLight]}>
                Saldo Devedor Atual
              </Text>
              <Text style={[styles.summaryValue, styles.summaryValueLight]}>
                {currency(totalBalance)}
              </Text>
            </View>
          </View>

          {/* Table */}
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.tableHeaderCellDate]}>
                Início
              </Text>
              <Text style={[styles.tableHeaderCell, styles.tableHeaderCellEntity]}>
                Entidade / Banco
              </Text>
              <Text style={[styles.tableHeaderCell, styles.tableHeaderCellStatus]}>
                Status
              </Text>
              <Text style={[styles.tableHeaderCell, styles.tableHeaderCellOriginal]}>
                V. Original
              </Text>
              <Text style={[styles.tableHeaderCell, styles.tableHeaderCellRate]}>
                Taxa
              </Text>
              <Text style={[styles.tableHeaderCell, styles.tableHeaderCellBalance]}>
                Saldo Atual
              </Text>
            </View>

            {loans.map((loan, idx) => (
              <View
                key={loan.id}
                style={[
                  styles.tableRow,
                  idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd
                ]}
              >
                <Text style={[styles.tableCell, styles.tableCellDate]}>
                  {dateStr(loan.contractDate)}
                </Text>
                <View style={[styles.tableCell, styles.tableCellEntity]}>
                  <Text style={styles.entityName}>{loan.entityName}</Text>
                  {(tab === 'history' || tab === 'all') && (
                    <Text style={styles.entityType}>
                      {loan.type === 'taken' ? 'Passivo' : 'Ativo'}
                    </Text>
                  )}
                </View>
                <View style={[styles.tableCell, styles.tableCellStatus]}>
                  <Text
                    style={[
                      styles.statusBadge,
                      loan.status === 'active' ? styles.statusActive : styles.statusSettled
                    ]}
                  >
                    {loan.status === 'active' ? 'Aberto' : 'Liquidado'}
                  </Text>
                </View>
                <Text style={[styles.tableCell, styles.tableCellOriginal]}>
                  {currency(loan.originalValue ?? loan.totalValue)}
                </Text>
                <Text style={[styles.tableCell, styles.tableCellRate]}>
                  {loan.interestRate}%
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    styles.tableCellBalance,
                    loan.type === 'taken' ? styles.balanceTaken : styles.balanceGranted
                  ]}
                >
                  {currency(loan.remainingValue)}
                </Text>
              </View>
            ))}

            <View style={styles.tableFooter}>
              <Text style={styles.tableFooterLabel}>Totais Consolidados:</Text>
              <Text style={styles.tableFooterOriginal}>{currency(totalOriginal)}</Text>
              <Text style={styles.tableFooterEmpty}></Text>
              <Text style={styles.tableFooterBalance}>{currency(totalBalance)}</Text>
            </View>
          </View>

          {/* Signatures */}
          <View style={styles.signatures}>
            <View style={styles.signaturesGrid}>
              <View style={styles.signatureBlock}>
                <View style={styles.signatureLine}>
                  <Text style={styles.signatureName}>{company.razaoSocial}</Text>
                  <Text style={styles.signatureRole}>Departamento Financeiro</Text>
                </View>
              </View>
              <View style={styles.signatureBlock}>
                <View style={styles.signatureLine}>
                  <Text style={styles.signatureName}>Auditoria / Contabilidade</Text>
                  <Text style={styles.signatureRole}>Conferência e Registro</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text>{company.nomeFantasia || 'ERP'} - Relatório Gerencial de Crédito</Text>
            <Text>Página 1 de 1</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default LoanListPdfDocument;
