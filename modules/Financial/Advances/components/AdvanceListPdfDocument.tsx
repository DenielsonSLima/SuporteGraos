import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { AdvanceTransaction } from '../types';
import { settingsService } from '../../../../services/settingsService';

interface Props {
  transactions: AdvanceTransaction[];
  tab: 'taken' | 'given' | 'history';
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
  summary: {
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: '#0f172a',
    color: '#ffffff',
    padding: 16,
    borderRadius: 12,
    width: 250,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  summaryLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
  },
  summarySubtext: {
    fontSize: 7,
    color: '#64748b',
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    marginTop: 4,
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
    width: '12%',
    textAlign: 'left',
  },
  tableHeaderCellPartner: {
    width: '25%',
    textAlign: 'left',
  },
  tableHeaderCellDescription: {
    width: '30%',
    textAlign: 'left',
  },
  tableHeaderCellStatus: {
    width: '13%',
    textAlign: 'center',
  },
  tableHeaderCellValue: {
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
    width: '12%',
  },
  tableCellPartner: {
    width: '25%',
  },
  tableCellDescription: {
    width: '30%',
    fontSize: 8,
    color: '#475569',
    textTransform: 'uppercase',
  },
  tableCellStatus: {
    width: '13%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableCellValue: {
    width: '20%',
    textAlign: 'right',
    fontFamily: 'Helvetica-Bold',
  },
  partnerName: {
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  partnerType: {
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
  valueTaken: {
    color: '#b45309',
  },
  valueGiven: {
    color: '#3730a3',
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
    width: '80%',
    padding: 12,
    textAlign: 'right',
  },
  tableFooterValue: {
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

const AdvanceListPdfDocument: React.FC<Props> = ({ transactions, tab }) => {
  const company = settingsService.getCompanyData();
  const watermark = settingsService.getWatermark();

  const currency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  
  const dateStr = (val: string) => 
    new Date(val).toLocaleDateString('pt-BR');

  const titles = {
    taken: 'Relatório de Adiantamentos Recebidos (Passivos)',
    given: 'Relatório de Adiantamentos Concedidos (Ativos)',
    history: 'Histórico de Adiantamentos e Acertos de Conta'
  };

  const totalValue = transactions.reduce((acc, t) => acc + t.value, 0);

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
          <View style={styles.summary}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Montante Consolidado</Text>
              <Text style={styles.summaryValue}>{currency(totalValue)}</Text>
              <Text style={styles.summarySubtext}>
                {transactions.length} registros no período
              </Text>
            </View>
          </View>

          {/* Table */}
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.tableHeaderCellDate]}>
                Data
              </Text>
              <Text style={[styles.tableHeaderCell, styles.tableHeaderCellPartner]}>
                Parceiro / Entidade
              </Text>
              <Text style={[styles.tableHeaderCell, styles.tableHeaderCellDescription]}>
                Descrição / Motivo
              </Text>
              <Text style={[styles.tableHeaderCell, styles.tableHeaderCellStatus]}>
                Status
              </Text>
              <Text style={[styles.tableHeaderCell, styles.tableHeaderCellValue]}>
                Valor
              </Text>
            </View>

            {transactions.map((tx, idx) => (
              <View
                key={tx.id}
                style={[
                  styles.tableRow,
                  idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd
                ]}
              >
                <Text style={[styles.tableCell, styles.tableCellDate]}>
                  {dateStr(tx.date)}
                </Text>
                <View style={[styles.tableCell, styles.tableCellPartner]}>
                  <Text style={styles.partnerName}>{tx.partnerName}</Text>
                  {tab === 'history' && (
                    <Text style={styles.partnerType}>
                      {tx.type === 'taken' ? 'Passivo (Recebido)' : 'Ativo (Concedido)'}
                    </Text>
                  )}
                </View>
                <Text style={[styles.tableCell, styles.tableCellDescription]}>
                  {tx.description}
                </Text>
                <View style={[styles.tableCell, styles.tableCellStatus]}>
                  <Text
                    style={[
                      styles.statusBadge,
                      tx.status === 'active' ? styles.statusActive : styles.statusSettled
                    ]}
                  >
                    {tx.status === 'active' ? 'Aberto' : 'Quitado'}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.tableCell,
                    styles.tableCellValue,
                    tx.type === 'taken' ? styles.valueTaken : styles.valueGiven
                  ]}
                >
                  {currency(tx.value)}
                </Text>
              </View>
            ))}

            <View style={styles.tableFooter}>
              <Text style={styles.tableFooterLabel}>Soma dos Lançamentos:</Text>
              <Text style={styles.tableFooterValue}>{currency(totalValue)}</Text>
            </View>
          </View>

          {/* Signatures */}
          <View style={styles.signatures}>
            <View style={styles.signaturesGrid}>
              <View style={styles.signatureBlock}>
                <View style={styles.signatureLine}>
                  <Text style={styles.signatureName}>{company.razaoSocial}</Text>
                  <Text style={styles.signatureRole}>Conferência Interna</Text>
                </View>
              </View>
              <View style={styles.signatureBlock}>
                <View style={styles.signatureLine}>
                  <Text style={styles.signatureName}>Auditoria Financeira</Text>
                  <Text style={styles.signatureRole}>Validação de Saldo</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text>Suporte Grãos ERP - Gestão de Antecipações</Text>
            <Text>Página 1 de 1</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default AdvanceListPdfDocument;
